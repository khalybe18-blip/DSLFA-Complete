"""
Resources Blueprint — Handles external resource ingestion (URLs and PDFs).
Resources are stored in a SEPARATE ChromaDB collection from personal notes.
"""
import os
import uuid
import requests
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from app import db
from app.models.external_resource import ExternalResource
from app.services.document_parser import extract_text_from_file
from app.services.embedding_service import (
    process_and_embed_external,
    delete_external_resource_embeddings
)

resources_bp = Blueprint('resources', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt'}


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _extract_text_from_url(url):
    """Fetches a URL and extracts readable text content."""
    try:
        headers = {
            'User-Agent': 'DSLFA-StudyOS/1.0 (student-project)'
        }
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        content_type = resp.headers.get('Content-Type', '')

        if 'application/pdf' in content_type:
            # Save temp PDF and extract
            upload_dir = os.path.join(current_app.root_path, '..', 'uploads', 'external')
            os.makedirs(upload_dir, exist_ok=True)
            temp_path = os.path.join(upload_dir, f"{uuid.uuid4()}.pdf")
            with open(temp_path, 'wb') as f:
                f.write(resp.content)
            text = extract_text_from_file(temp_path)
            os.remove(temp_path)
            return text

        # For HTML content, strip tags to get plain text
        from html.parser import HTMLParser

        class HTMLTextExtractor(HTMLParser):
            def __init__(self):
                super().__init__()
                self.result = []
                self._skip = False
                self._skip_tags = {'script', 'style', 'nav', 'header', 'footer'}

            def handle_starttag(self, tag, attrs):
                if tag in self._skip_tags:
                    self._skip = True

            def handle_endtag(self, tag):
                if tag in self._skip_tags:
                    self._skip = False

            def handle_data(self, data):
                if not self._skip:
                    text = data.strip()
                    if text:
                        self.result.append(text)

            def get_text(self):
                return '\n'.join(self.result)

        extractor = HTMLTextExtractor()
        extractor.feed(resp.text)
        text = extractor.get_text()

        if len(text) < 50:
            return None

        return text

    except Exception as e:
        print(f"URL extraction error for {url}: {e}")
        return None


@resources_bp.route('/add-url', methods=['POST'])
def add_url_resource():
    """Ingest an external URL: fetch content, chunk, embed into external collection."""
    data = request.get_json()
    url = data.get('url', '').strip()
    title = data.get('title', '').strip()

    if not url:
        return jsonify({'message': 'No URL provided'}), 400

    if not title:
        title = url[:100]

    # Create resource record
    resource = ExternalResource(
        title=title,
        source_type='url',
        origin_url=url,
        status='processing'
    )
    db.session.add(resource)
    db.session.commit()

    try:
        text = _extract_text_from_url(url)
        if not text:
            resource.status = 'failed'
            db.session.commit()
            return jsonify({'message': 'Could not extract text from URL'}), 400

        metadata = {
            'resource_id': resource.id,
            'source': title,
            'origin_url': url
        }
        chunk_count = process_and_embed_external(text, metadata)

        resource.status = 'ready'
        resource.chunk_count = chunk_count
        db.session.commit()

        return jsonify({
            'message': 'Resource added successfully',
            'resource': resource.to_dict()
        }), 201

    except Exception as e:
        resource.status = 'failed'
        db.session.commit()
        return jsonify({'message': f'Processing failed: {str(e)}'}), 500


@resources_bp.route('/upload', methods=['POST'])
def upload_pdf_resource():
    """Upload an external PDF and embed into the external collection."""
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        upload_dir = os.path.join(current_app.root_path, '..', 'uploads', 'external')
        os.makedirs(upload_dir, exist_ok=True)

        original_filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{original_filename}"
        file_path = os.path.join(upload_dir, unique_filename)
        file.save(file_path)

        resource = ExternalResource(
            title=original_filename,
            source_type='pdf',
            file_path=file_path,
            status='processing'
        )
        db.session.add(resource)
        db.session.commit()

        try:
            text = extract_text_from_file(file_path)
            metadata = {
                'resource_id': resource.id,
                'source': original_filename,
                'origin_url': ''
            }
            chunk_count = process_and_embed_external(text, metadata)

            resource.status = 'ready'
            resource.chunk_count = chunk_count
            db.session.commit()

            return jsonify({
                'message': 'Resource uploaded and processed',
                'resource': resource.to_dict()
            }), 201

        except Exception as e:
            resource.status = 'failed'
            db.session.commit()
            return jsonify({'message': f'Processing failed: {str(e)}'}), 500

    return jsonify({'message': 'Allowed file types are pdf, docx, txt'}), 400


@resources_bp.route('', methods=['GET'])
def list_resources():
    """List all external resources."""
    resources = ExternalResource.query.order_by(ExternalResource.created_at.desc()).all()
    return jsonify({
        'resources': [r.to_dict() for r in resources]
    }), 200


@resources_bp.route('/<int:resource_id>', methods=['DELETE'])
def delete_resource(resource_id):
    """Delete an external resource and its embeddings."""
    resource = ExternalResource.query.get(resource_id)
    if not resource:
        return jsonify({'message': 'Resource not found'}), 404

    # Delete file from disk if it's a PDF
    if resource.file_path:
        try:
            if os.path.exists(resource.file_path):
                os.remove(resource.file_path)
        except Exception as e:
            print(f"Failed to delete file {resource.file_path}: {e}")

    # Delete from ChromaDB
    delete_external_resource_embeddings(resource.id)

    db.session.delete(resource)
    db.session.commit()

    return jsonify({'message': 'Resource deleted'}), 200


@resources_bp.route('/<int:resource_id>/toggle', methods=['PATCH'])
def toggle_resource(resource_id):
    """Toggle whether an external resource is active for the current session."""
    resource = ExternalResource.query.get(resource_id)
    if not resource:
        return jsonify({'message': 'Resource not found'}), 404

    data = request.get_json()
    resource.is_active = data.get('is_active', not resource.is_active)
    db.session.commit()

    return jsonify({
        'message': 'Resource toggled',
        'resource': resource.to_dict()
    }), 200
