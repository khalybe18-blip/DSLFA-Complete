import json
from flask import Blueprint, jsonify, request, Response, stream_with_context
from app import db
from app.models.summary import Summary
from app.models.chat import ChatSession, ChatMessage
from app.services.chat_service import chat_with_tutor
from app.services.embedding_service import get_vector_store
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage

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
    Request body: { "message": "...", "history": [...], "externalEnabled": bool, "sessionCache": {...} }
    Response: { "steps": [...], "response": {...} }
    """
    data = request.get_json()
    
    if not data or not data.get('message'):
        return jsonify({'message': 'No message provided'}), 400
    
    user_message = data['message']
    chat_history = data.get('history', [])
    external_enabled = data.get('externalEnabled', False)
    session_cache = data.get('sessionCache', {})
    
    steps = []
    final_response = None
    
    for event in chat_with_tutor(user_message, chat_history, external_enabled, session_cache):
        if event['type'] in ('status', 'sources', 'external_sources'):
            steps.append(event)
        elif event['type'] == 'response':
            final_response = event['data']
        elif event['type'] == 'error':
            return jsonify({'message': event['data']}), 500
    
    return jsonify({
        'steps': steps,
        'response': final_response
    }), 200


@ai_bp.route('/chat/sessions', methods=['GET'])
def get_chat_sessions():
    """Returns a list of all chat sessions sorted by newest first."""
    sessions = ChatSession.query.order_by(ChatSession.updated_at.desc()).all()
    return jsonify([session.to_dict() for session in sessions]), 200

@ai_bp.route('/chat/sessions', methods=['POST'])
def create_chat_session():
    """Creates a new empty chat session."""
    session = ChatSession()
    db.session.add(session)
    db.session.commit()
    return jsonify(session.to_dict()), 201

@ai_bp.route('/chat/sessions/<int:session_id>', methods=['GET'])
def get_chat_session(session_id):
    """Returns a specific chat session with all its messages."""
    session = ChatSession.query.get(session_id)
    if not session:
        return jsonify({'message': 'Session not found'}), 404
        
    messages = ChatMessage.query.filter_by(session_id=session.id).order_by(ChatMessage.created_at.asc()).all()
    
    return jsonify({
        'session': session.to_dict(),
        'messages': [msg.to_dict() for msg in messages]
    }), 200

@ai_bp.route('/chat/sessions/<int:session_id>', methods=['DELETE'])
def delete_chat_session(session_id):
    """Deletes a specific chat session and its messages."""
    session = ChatSession.query.get(session_id)
    if not session:
        return jsonify({'message': 'Session not found'}), 404
        
    db.session.delete(session)
    db.session.commit()
    return jsonify({'message': 'Session deleted'}), 200

@ai_bp.route('/chat/sessions/<int:session_id>', methods=['PUT'])
def update_chat_session(session_id):
    """Updates a chat session (e.g. renaming the title)."""
    session = ChatSession.query.get(session_id)
    if not session:
        return jsonify({'message': 'Session not found'}), 404
        
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided'}), 400
        
    if 'title' in data:
        session.title = data['title']
        
    session.updated_at = db.func.now()
    db.session.commit()
    return jsonify(session.to_dict()), 200

def _auto_name_session(session_id):
    """Uses LLM to generate a short title for the chat session based on its first messages."""
    try:
        session = ChatSession.query.get(session_id)
        if not session:
            return
            
        messages = ChatMessage.query.filter_by(session_id=session.id).order_by(ChatMessage.created_at.asc()).limit(4).all()
        if not messages:
            return
            
        llm = ChatOllama(model="gemma4:31b-cloud", temperature=0.3)
        prompt = [
            SystemMessage(content="You are a helpful assistant. Generate a very short (max 4 words), concise, and descriptive title for this conversation. Respond ONLY with the title, no quotes, no extra text.")
        ]
        
        for msg in messages:
            if msg.role == 'user':
                prompt.append(HumanMessage(content=msg.content))
            else:
                prompt.append(SystemMessage(content=msg.content)) # Using SystemMessage for assistant to avoid strict role alternation requirements if any
                
        response = llm.invoke(prompt)
        title = response.content.strip().replace('"', '')
        
        if title:
            session.title = title
            db.session.commit()
            
    except Exception as e:
        print(f"Failed to auto-name session {session_id}: {e}")

@ai_bp.route('/chat/stream', methods=['POST'])
def chat_stream():
    """
    Streaming chat endpoint using Server-Sent Events.
    Each event is a JSON object with 'type' and 'data' fields.
    This lets the frontend show real-time status updates.

    Request body: { "message": "...", "history": [...], "externalEnabled": bool, "sessionCache": {...}, "sessionId": int }
    """
    data = request.get_json()
    
    if not data or not data.get('message'):
        return jsonify({'message': 'No message provided'}), 400
    
    user_message = data['message']
    chat_history = data.get('history', [])
    external_enabled = data.get('externalEnabled', False)
    session_cache = data.get('sessionCache', {})
    session_id = data.get('sessionId')
    
    # If a session ID is provided, save the user message immediately
    if session_id:
        try:
            session = ChatSession.query.get(session_id)
            if session:
                user_msg_db = ChatMessage(session_id=session.id, role='user', content=user_message)
                db.session.add(user_msg_db)
                session.updated_at = db.func.now()
                db.session.commit()
        except Exception as e:
            print(f"Failed to save user message to DB: {e}")
    
    def generate():
        final_assistant_msg = None
        for event in chat_with_tutor(user_message, chat_history, external_enabled, session_cache):
            if event['type'] == 'response':
                final_assistant_msg = event['data']
            yield f"data: {json.dumps(event)}\n\n"
            
        # After streaming is complete, save the assistant's response to the DB
        if session_id and final_assistant_msg:
            try:
                session = ChatSession.query.get(session_id)
                if session:
                    assistant_msg_db = ChatMessage(
                        session_id=session.id,
                        role='assistant',
                        content=final_assistant_msg.get('content', ''),
                        used_rag=final_assistant_msg.get('used_rag', False),
                        sources=final_assistant_msg.get('sources', []),
                        used_external=final_assistant_msg.get('used_external', False),
                        external_sources=final_assistant_msg.get('external_sources', [])
                    )
                    db.session.add(assistant_msg_db)
                    session.updated_at = db.func.now()
                    db.session.commit()
                    
                    # Auto-name the session if it's the first exchange (2 messages: 1 user, 1 assistant)
                    # We trigger it in a fire-and-forget manner here (or synchronously since it's the end of the stream)
                    msg_count = ChatMessage.query.filter_by(session_id=session.id).count()
                    if msg_count == 2:
                        _auto_name_session(session.id)
                        
            except Exception as e:
                print(f"Failed to save assistant message to DB: {e}")
                
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )

