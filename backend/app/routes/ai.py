import json
from flask import Blueprint, jsonify, request, Response, stream_with_context
from app.models.summary import Summary
from app.services.chat_service import chat_with_tutor
from app.services.embedding_service import get_vector_store

ai_bp = Blueprint('ai', __name__)


@ai_bp.route('/vectorstore', methods=['GET'])
def get_vectorstore_contents():
    """Returns all documents and chunks stored in ChromaDB, grouped by source."""
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
def search_vectorstore():
    """Test similarity search against ChromaDB directly."""
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
def get_document_summary(doc_id):
    summary = Summary.query.filter_by(document_id=doc_id).first()
    
    if not summary:
        return jsonify({'message': 'Summary not found or still processing'}), 404
        
    return jsonify({'summary': summary.to_dict()}), 200


@ai_bp.route('/chat', methods=['POST'])
def chat():
    """
    Non-streaming chat endpoint. Returns the full response after processing.
    Request body: { "message": "...", "history": [...] }
    Response: { "steps": [...], "response": {...} }
    """
    data = request.get_json()
    
    if not data or not data.get('message'):
        return jsonify({'message': 'No message provided'}), 400
    
    user_message = data['message']
    chat_history = data.get('history', [])
    
    steps = []
    final_response = None
    
    for event in chat_with_tutor(user_message, chat_history):
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
def chat_stream():
    """
    Streaming chat endpoint using Server-Sent Events.
    Each event is a JSON object with 'type' and 'data' fields.
    This lets the frontend show real-time status updates.
    """
    data = request.get_json()
    
    if not data or not data.get('message'):
        return jsonify({'message': 'No message provided'}), 400
    
    user_message = data['message']
    chat_history = data.get('history', [])
    
    def generate():
        for event in chat_with_tutor(user_message, chat_history):
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
