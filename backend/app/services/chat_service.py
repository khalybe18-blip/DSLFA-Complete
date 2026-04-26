import json
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from app.services.embedding_service import get_vector_store


TUTOR_SYSTEM_PROMPT = """You are DSLFA AI Tutor — an expert, friendly AI study assistant for engineering students.

Your responsibilities:
- Answer academic questions clearly and thoroughly
- Explain complex concepts in simple terms with examples
- When provided with context from the student's uploaded notes, reference that material directly
- If the student's notes contain relevant information, prefer using that over general knowledge
- Provide structured answers: use bullet points, numbered steps, and bold key terms
- If you're unsure, say so — never fabricate information

Guidelines:
- Be concise but complete
- Use analogies for difficult concepts
- Suggest related topics the student should explore
- If context from their notes is provided, mention "Based on your uploaded notes..."
- When the user asks what documents you have access to, list the documents from the context
"""


def get_all_documents_info():
    """
    Returns a list of all unique document names stored in ChromaDB.
    Used to tell the model what docs are available upfront.
    """
    try:
        vectorstore = get_vector_store()
        collection = vectorstore._collection
        
        if collection.count() == 0:
            return []
        
        all_data = collection.get(include=['metadatas'])
        sources = list(set(
            meta.get('source', 'Unknown') for meta in all_data['metadatas']
        ))
        return sources
    except Exception as e:
        print(f"Error getting document list: {e}")
        return []


def retrieve_context(query, top_k=4):
    """
    Searches ChromaDB for relevant document chunks.
    Returns a list of dicts: [{'content': str, 'source': str}]
    """
    vectorstore = get_vector_store()
    collection = vectorstore._collection
    total_chunks = collection.count()
    
    if total_chunks == 0:
        return []
    
    context_chunks = []
    
    # Use standard similarity search to fetch nearest neighbors
    try:
        results = vectorstore.similarity_search(query, k=top_k)
        
        for doc in results:
            context_chunks.append({
                'content': doc.page_content,
                'source': doc.metadata.get('source', 'Unknown document'),
                'score': 1.0 # placeholder
            })
    except Exception as e:
        print(f"RAG similarity search error: {e}")
    
    return context_chunks


def chat_with_tutor(user_message, chat_history=None):
    """
    Main chat function that performs RAG + LLM generation.
    Returns a generator that yields status events and the final response.
    
    Each yielded item is a dict: {'type': 'status'|'sources'|'response', 'data': ...}
    """
    if chat_history is None:
        chat_history = []
    
    # Step 1: Get document inventory
    available_docs = get_all_documents_info()
    
    # Step 2: RAG Retrieval
    yield {'type': 'status', 'data': 'Searching your uploaded documents...'}
    
    context_chunks = retrieve_context(user_message)
    
    if context_chunks:
        sources = list(set(c['source'] for c in context_chunks))
        yield {
            'type': 'sources', 
            'data': {
                'found': True,
                'sources': sources,
                'count': len(context_chunks)
            }
        }
        yield {'type': 'status', 'data': f'Found {len(context_chunks)} relevant passages from {", ".join(sources)}'}
        
        # Build context string from retrieved chunks
        context_text = "\n\n---\n\n".join(
            f"[From: {c['source']} (relevance: {c['score']})]\n{c['content']}" for c in context_chunks
        )
    else:
        yield {
            'type': 'sources', 
            'data': {
                'found': False,
                'sources': [],
                'count': 0
            }
        }
        yield {'type': 'status', 'data': 'No documents found in the vector store.'}
        context_text = None
    
    # Step 3: Build prompt
    yield {'type': 'status', 'data': 'Generating response...'}
    
    # llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.4)
    llm = ChatOllama(model="gemma4:31b-cloud", temperature=0.4)
    
    # Build dynamic system prompt — always include document inventory
    doc_inventory = ""
    if available_docs:
        doc_list = "\n".join(f"  - {doc}" for doc in available_docs)
        doc_inventory = f"""

You currently have access to the following uploaded documents in the student's study library:
{doc_list}

When the student asks what documents you have access to, list these documents.
"""
    
    # Inject Upcoming Reminders into context
    from app.models.reminder import Reminder
    from datetime import datetime
    try:
        reminders = Reminder.query.filter(Reminder.date >= datetime.utcnow()).order_by(Reminder.date.asc()).limit(10).all()
        if reminders:
            reminders_str = "\n".join(f"  - [{r.date.strftime('%Y-%m-%d %H:%M')}] {r.title}: {r.description}" for r in reminders)
            doc_inventory += f"\n\nIMPORTANT: The student has the following set reminders and upcoming exams:\n{reminders_str}\nIf the student asks about exams or schedule, use this information to remind them and tailor your study advice."
    except Exception as e:
        print(f"Error fetching reminders for tutor context: {e}")
    
    if context_text:
        system_content = f"""{TUTOR_SYSTEM_PROMPT}{doc_inventory}

The following context was retrieved from the student's uploaded study materials.
Use this information to answer their question. Always reference the source document by name.

--- STUDENT'S NOTES CONTEXT ---
{context_text}
--- END CONTEXT ---
"""
    else:
        system_content = f"""{TUTOR_SYSTEM_PROMPT}{doc_inventory}

No specific context was found for this question. Answer using your general knowledge.
"""
    
    # Build the messages list from history
    messages = [SystemMessage(content=system_content)]
    
    for msg in chat_history[-10:]:  # Keep last 10 messages for context window
        if msg['role'] == 'user':
            messages.append(HumanMessage(content=msg['content']))
        elif msg['role'] == 'assistant':
            messages.append(AIMessage(content=msg['content']))
    
    # Add the current user message
    messages.append(HumanMessage(content=user_message))
    
    # Step 4: Generate response
    try:
        response = llm.invoke(messages)
        
        yield {
            'type': 'response', 
            'data': {
                'content': response.content,
                'used_rag': bool(context_chunks),
                'sources': list(set(c['source'] for c in context_chunks)) if context_chunks else []
            }
        }
    except Exception as e:
        yield {
            'type': 'error',
            'data': f'Failed to generate response: {str(e)}'
        }
