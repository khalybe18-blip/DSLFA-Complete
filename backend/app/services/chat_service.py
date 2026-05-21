import json
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from app.services.embedding_service import retrieve_context_for_class, list_sources_for_class


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


def chat_with_tutor(user_message, chat_history=None, class_id=None, user_role='student'):
    """
    Main chat function that performs class-scoped RAG + LLM generation.
    ``class_id`` must be set; callers must verify the user may access this class.

    Returns a generator that yields status events and the final response.

    Each yielded item is a dict: {'type': 'status'|'sources'|'response', 'data': ...}
    """
    if chat_history is None:
        chat_history = []

    if class_id is None:
        yield {'type': 'error', 'data': 'class_id is required for the AI tutor'}
        return

    cid = int(class_id)

    # Step 1: Document inventory for this classroom only (Chroma metadata filter)
    available_docs = list_sources_for_class(cid)

    # Step 2: Class-scoped RAG retrieval (strict Chroma filter)
    yield {'type': 'status', 'data': 'Searching class materials...'}

    raw_chunks = retrieve_context_for_class(user_message, cid, user_role=user_role, top_k=4)
    context_chunks = [{**c, 'score': 1.0} for c in raw_chunks]

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
        yield {'type': 'status', 'data': 'No class materials matched this question in the vector store.'}
        context_text = None

    # Step 3: Build prompt
    yield {'type': 'status', 'data': 'Generating response...'}

    llm = ChatOllama(model="gemma4:31b-cloud", temperature=0.4)

    doc_inventory = ""
    if available_docs:
        doc_list = "\n".join(f"  - {doc}" for doc in available_docs)
        doc_inventory = f"""

You currently have access to the following materials for this class (class-scoped):
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

The following context was retrieved from this class's study materials.
Use this information to answer their question. Always reference the source document by name.

--- CLASS MATERIALS CONTEXT ---
{context_text}
--- END CONTEXT ---
"""
    else:
        system_content = f"""{TUTOR_SYSTEM_PROMPT}{doc_inventory}

No specific context was found for this question in this class's materials. Answer using your general knowledge.
"""

    messages = [SystemMessage(content=system_content)]

    for msg in chat_history[-10:]:
        if msg['role'] == 'user':
            messages.append(HumanMessage(content=msg['content']))
        elif msg['role'] == 'assistant':
            messages.append(AIMessage(content=msg['content']))

    messages.append(HumanMessage(content=user_message))

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
