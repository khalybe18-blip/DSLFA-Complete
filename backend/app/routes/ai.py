import json
from flask import Blueprint, jsonify, request, Response, stream_with_context
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models.summary import Summary
from app.models.user import User
from app.models.document import Document
from app.models.query_log import QueryLog
from app.services.chat_service import chat_with_tutor
from app.services.embedding_service import get_vector_store
from app.access import user_can_read_document, user_can_access_class_context

ai_bp = Blueprint('ai', __name__)


def _current_user():
    uid = get_jwt_identity()
    return User.query.get(int(uid))


def _require_teacher(user):
    if not user or user.role != 'teacher':
        return jsonify({'message': 'Forbidden: teacher access required'}), 403
    return None


@ai_bp.route('/vectorstore', methods=['GET'])
@jwt_required()
def get_vectorstore_contents():
    """Returns ChromaDB contents — teacher only (sensitive)."""
    user = _current_user()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    err = _require_teacher(user)
    if err:
        return err

    try:
        vs = get_vector_store()
        collection = vs._collection
        total = collection.count()

        if total == 0:
            return jsonify({'total': 0, 'sources': {}}), 200

        all_data = collection.get(include=['documents', 'metadatas'])

        sources = {}
        for doc, meta, chunk_id in zip(all_data['documents'], all_data['metadatas'], all_data['ids']):
            source = meta.get('source', 'Unknown')
            if source not in sources:
                sources[source] = {'metadata': meta, 'chunks': []}
            sources[source]['chunks'].append({
                'id': chunk_id,
                'content': doc,
                'metadata': meta
            })

        return jsonify({
            'total': total,
            'source_count': len(sources),
            'sources': sources
        }), 200
    except Exception as e:
        return jsonify({'message': f'Failed to read vectorstore: {str(e)}'}), 500


@ai_bp.route('/vectorstore/search', methods=['POST'])
@jwt_required()
def search_vectorstore():
    """Similarity search — teacher only."""
    user = _current_user()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    err = _require_teacher(user)
    if err:
        return err

    data = request.get_json()
    query = data.get('query', '')
    top_k = data.get('top_k', 5)

    if not query:
        return jsonify({'message': 'No query provided'}), 400

    try:
        vs = get_vector_store()
        results = vs.similarity_search_with_relevance_scores(query, k=top_k)

        hits = []
        for doc, score in results:
            hits.append({
                'content': doc.page_content,
                'source': doc.metadata.get('source', 'Unknown'),
                'metadata': doc.metadata,
                'score': round(score, 4)
            })

        return jsonify({'query': query, 'results': hits}), 200
    except Exception as e:
        return jsonify({'message': f'Search failed: {str(e)}'}), 500


@ai_bp.route('/summary/<int:doc_id>', methods=['GET'])
@jwt_required()
def get_document_summary(doc_id):
    user = _current_user()
    if not user:
        return jsonify({'message': 'User not found'}), 404

    document = Document.query.get(doc_id)
    if not document or not user_can_read_document(user, document):
        return jsonify({'message': 'Summary not found or access denied'}), 404

    summary = Summary.query.filter_by(document_id=doc_id).first()

    if not summary:
        return jsonify({'message': 'Summary not found or still processing'}), 404

    return jsonify({'summary': summary.to_dict()}), 200


@ai_bp.route('/chat', methods=['POST'])
@jwt_required()
def chat():
    user = _current_user()
    if not user:
        return jsonify({'message': 'User not found'}), 404

    data = request.get_json()

    if not data or not data.get('message'):
        return jsonify({'message': 'No message provided'}), 400

    class_id = data.get('class_id')
    if class_id is None:
        return jsonify({'message': 'class_id is required'}), 400

    try:
        class_id = int(class_id)
    except (TypeError, ValueError):
        return jsonify({'message': 'Invalid class_id'}), 400

    if not user_can_access_class_context(user, class_id):
        return jsonify({'message': 'Access denied for this classroom'}), 403

    user_message = data['message']
    chat_history = data.get('history', [])

    steps = []
    final_response = None

    # Log query for students for analytics
    if user.role == 'student':
        log = QueryLog(student_id=user.id, class_id=class_id, query_text=user_message)
        db.session.add(log)
        
    # Update streak for any chat activity
    user.update_streak()
    db.session.commit()

    for event in chat_with_tutor(user_message, chat_history, class_id=class_id, user_role=user.role):
        if event['type'] in ('status', 'sources'):
            steps.append(event)
        elif event['type'] == 'response':
            final_response = event['data']
        elif event['type'] == 'error':
            return jsonify({'message': event['data']}), 500

    return jsonify({
        'steps': steps,
        'response': final_response
    }), 200


@ai_bp.route('/chat/stream', methods=['POST'])
@jwt_required()
def chat_stream():
    user = _current_user()
    if not user:
        return jsonify({'message': 'User not found'}), 404

    data = request.get_json()

    if not data or not data.get('message'):
        return jsonify({'message': 'No message provided'}), 400

    class_id = data.get('class_id')
    if class_id is None:
        return jsonify({'message': 'class_id is required'}), 400

    try:
        class_id = int(class_id)
    except (TypeError, ValueError):
        return jsonify({'message': 'Invalid class_id'}), 400

    if not user_can_access_class_context(user, class_id):
        return jsonify({'message': 'Access denied for this classroom'}), 403

    user_message = data['message']
    chat_history = data.get('history', [])

    # Log query for students for analytics
    if user.role == 'student':
        log = QueryLog(student_id=user.id, class_id=class_id, query_text=user_message)
        db.session.add(log)
        db.session.commit()

    def generate():
        for event in chat_with_tutor(user_message, chat_history, class_id=class_id, user_role=user.role):
            yield f"data: {json.dumps(event)}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )
