import os
import uuid
from flask import Blueprint, request, jsonify, current_app, send_file
from werkzeug.utils import secure_filename
from app.models.document import Document
from app.models.summary import Summary
from app import db
from app.services.document_parser import extract_text_from_file
from app.services.embedding_service import process_and_embed_document, delete_document_embeddings
from app.services.ai_service import generate_summary

docs_bp = Blueprint('documents', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'pptx', 'txt'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@docs_bp.route('/upload', methods=['POST'])
def upload_document():
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        # Ensure uploads dir exists
        upload_dir = os.path.join(current_app.root_path, '..', 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Secure filename and add uuid to avoid collisions
        original_filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{original_filename}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        file.save(file_path)
        
        # Determine file type
        ext = original_filename.rsplit('.', 1)[1].lower()
        
        # Save to database
        new_doc = Document(
            title=original_filename,
            file_type=ext,
            file_path=file_path,
            status='processing'
        )
        
        db.session.add(new_doc)
        db.session.commit()
        
        # Extract text and process with AI
        try:
            text = extract_text_from_file(file_path)
            
            # 1. Embed document in ChromaDB
            metadata = {'document_id': new_doc.id, 'source': original_filename}
            process_and_embed_document(text, metadata)
            
            # 2. Generate Summary
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
def get_documents():
    documents = Document.query.order_by(Document.created_at.desc()).all()
    
    return jsonify({
        'documents': [doc.to_dict() for doc in documents]
    }), 200

@docs_bp.route('/<int:doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    document = Document.query.get(doc_id)
    
    if not document:
        return jsonify({'message': 'Document not found'}), 404
        
    try:
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
    except Exception as e:
        print(f"Failed to delete file {document.file_path}: {e}")
        
    # Also delete vectors from ChromaDB
    delete_document_embeddings(document.id)
        
    db.session.delete(document)
    db.session.commit()
    
    return jsonify({'message': 'Document successfully deleted'}), 200

@docs_bp.route('/<int:doc_id>/file', methods=['GET'])
def get_document_file(doc_id):
    document = Document.query.get(doc_id)
    if not document:
        return jsonify({'message': 'Document not found'}), 404
        
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
