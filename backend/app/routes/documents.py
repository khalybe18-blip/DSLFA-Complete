import os
import uuid
from flask import Blueprint, request, jsonify, current_app, send_file
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models.document import Document
from app.models.summary import Summary
from app.models.classroom import Classroom
from app import db
from app.access import user_can_read_document, accessible_documents_filter
from app.models.user import User
from app.services.document_parser import extract_text_from_file
from app.services.embedding_service import process_and_embed_document, delete_document_embeddings
from app.services.ai_service import generate_summary

docs_bp = Blueprint('documents', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'pptx', 'txt'}


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _current_user():
    uid = get_jwt_identity()
    return User.query.get(int(uid))


def _require_facilitator(user):
    if not user or user.role not in ['teacher', 'facilitator', 'admin']:
        return jsonify({'message': 'Forbidden: facilitator access required'}), 403
    return None


@docs_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_document():
    user = _current_user()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    # Allow any authenticated user (including students) to upload to their personal library

    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        upload_dir = os.path.join(current_app.root_path, '..', 'uploads')
        os.makedirs(upload_dir, exist_ok=True)

        original_filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{original_filename}"
        file_path = os.path.join(upload_dir, unique_filename)

        file.save(file_path)

        ext = original_filename.rsplit('.', 1)[1].lower()

        new_doc = Document(
            title=original_filename,
            file_type=ext,
            file_path=file_path,
            status='processing',
            class_id=None,
            uploader_id=user.id,
        )

        db.session.add(new_doc)
        db.session.commit()

        try:
            text = extract_text_from_file(file_path)

            metadata = {
                'document_id': new_doc.id, 
                'source': original_filename, 
                'class_id': None,
                'is_visible': True
            }
            process_and_embed_document(text, metadata)

            ai_data = generate_summary(text)

            if ai_data:
                summary_record = Summary(
                    document_id=new_doc.id,
                    overview=ai_data.get('overview', ''),
                    sections=ai_data.get('sections', [])
                )
                db.session.add(summary_record)

            new_doc.status = 'ready'
            db.session.commit()

            return jsonify({
                'message': 'File successfully uploaded and processed',
                'document': new_doc.to_dict()
            }), 201

        except Exception as e:
            new_doc.status = 'failed'
            db.session.commit()
            return jsonify({'message': f'Extraction failed: {str(e)}'}), 500

    return jsonify({'message': 'Allowed file types are pdf, docx, pptx, txt'}), 400


@docs_bp.route('', methods=['GET'])
@jwt_required()
def get_documents():
    user = _current_user()
    if not user:
        return jsonify({'message': 'User not found'}), 404

    documents = Document.query.filter(accessible_documents_filter(user))\
        .order_by(Document.created_at.desc()).all()

    return jsonify({
        'documents': [doc.to_dict() for doc in documents]
    }), 200


@docs_bp.route('/<int:doc_id>/visibility', methods=['PATCH'])
@jwt_required()
def toggle_visibility(doc_id):
    user = _current_user()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    err = _require_facilitator(user)
    if err:
        return err

    document = Document.query.get_or_404(doc_id)
    if document.uploader_id != user.id:
        return jsonify({'message': 'Forbidden'}), 403

    data = request.get_json() or {}
    new_visible = data.get('is_visible', not document.is_visible)
    document.is_visible = new_visible
    db.session.commit()

    # Note: If we wanted to update ChromaDB metadata for existing chunks, we'd need to re-index or update metadata.
    # For now, let's just update the DB. RAG retrieval logic already checks this if we update the RAG filter.
    # Wait, the RAG filter I implemented in embedding_service uses metadata. 
    # So I MUST update ChromaDB metadata if I want RAG to reflect visibility changes immediately.
    
    try:
        from app.services.embedding_service import get_vector_store
        vs = get_vector_store()
        collection = vs._collection
        
        # ChromaDB update requires IDs. Let's fetch IDs for this document.
        chunks = collection.get(
            where={"document_id": int(doc_id)},
            include=["metadatas"]
        )
        
        if chunks['ids']:
            new_metadatas = []
            for meta in chunks['metadatas']:
                updated_meta = {**meta, "is_visible": bool(new_visible)}
                new_metadatas.append(updated_meta)
            
            collection.update(
                ids=chunks['ids'],
                metadatas=new_metadatas
            )
    except Exception as e:
        print(f"Failed to update ChromaDB metadata for doc {doc_id}: {e}")

    return jsonify({'message': f'Visibility set to {new_visible}', 'is_visible': new_visible}), 200


@docs_bp.route('/<int:doc_id>', methods=['DELETE'])
@jwt_required()
def delete_document(doc_id):
    user = _current_user()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    document = Document.query.get(doc_id)
    if not document:
        return jsonify({'message': 'Document not found'}), 404

    if document.uploader_id != user.id:
        err = _require_facilitator(user)
        if err:
            return err

    if not document:
        return jsonify({'message': 'Document not found'}), 404

    if document.uploader_id != user.id:
        if document.class_id is None:
            return jsonify({'message': 'Forbidden'}), 403
        classroom = Classroom.query.get(document.class_id)
        if not classroom or classroom.facilitator_id != user.id:
            return jsonify({'message': 'Forbidden'}), 403

    try:
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
    except Exception as e:
        print(f"Failed to delete file {document.file_path}: {e}")

    delete_document_embeddings(document.id)

    db.session.delete(document)
    db.session.commit()

    return jsonify({'message': 'Document successfully deleted'}), 200


@docs_bp.route('/<int:doc_id>/copy', methods=['POST'])
@jwt_required()
def copy_document_to_personal(doc_id):
    import shutil
    user = _current_user()
    if not user:
        return jsonify({'message': 'User not found'}), 404

    document = Document.query.get(doc_id)
    if not document:
        return jsonify({'message': 'Document not found'}), 404
        
    if not user_can_read_document(user, document):
        return jsonify({'message': 'Access denied'}), 403

    # Generate new file path
    upload_dir = os.path.join(current_app.root_path, '..', 'uploads')
    original_filename = document.title
    unique_filename = f"{uuid.uuid4()}_{original_filename}"
    new_file_path = os.path.join(upload_dir, unique_filename)
    
    try:
        shutil.copy2(document.file_path, new_file_path)
    except Exception as e:
        return jsonify({'message': f'Failed to copy file: {e}'}), 500

    new_doc = Document(
        title=document.title,
        file_type=document.file_type,
        file_path=new_file_path,
        status='processing',
        class_id=None,
        uploader_id=user.id,
    )
    db.session.add(new_doc)
    db.session.commit()
    
    try:
        text = extract_text_from_file(new_file_path)
        metadata = {
            'document_id': new_doc.id, 
            'source': document.title, 
            'class_id': None,
            'is_visible': True
        }
        process_and_embed_document(text, metadata)
        
        # Copy summary if exists
        old_summary = Summary.query.filter_by(document_id=document.id).first()
        if old_summary:
            new_summary = Summary(
                document_id=new_doc.id,
                overview=old_summary.overview,
                sections=old_summary.sections
            )
            db.session.add(new_summary)
            
        new_doc.status = 'ready'
        db.session.commit()
    except Exception as e:
        print(f"Error processing copied document: {e}")
        new_doc.status = 'error'
        db.session.commit()
        
    return jsonify({'message': 'Copied to personal vault', 'document': {'id': new_doc.id, 'title': new_doc.title}}), 200


@docs_bp.route('/<int:doc_id>/file', methods=['GET'])
@jwt_required()
def get_document_file(doc_id):
    user = _current_user()
    if not user:
        return jsonify({'message': 'User not found'}), 404

    document = Document.query.get(doc_id)
    if not document:
        return jsonify({'message': 'Document not found'}), 404

    if not user_can_read_document(user, document):
        return jsonify({'message': 'Access denied'}), 403

    try:
        if os.path.exists(document.file_path):
            mimetype = 'application/octet-stream'
            if document.file_type == 'pdf':
                mimetype = 'application/pdf'
            elif document.file_type == 'txt':
                mimetype = 'text/plain'

            return send_file(document.file_path, mimetype=mimetype, as_attachment=False)
        else:
            return jsonify({'message': 'File not found on disk'}), 404
    except Exception as e:
        return jsonify({'message': f'Failed to serve file: {str(e)}'}), 500
