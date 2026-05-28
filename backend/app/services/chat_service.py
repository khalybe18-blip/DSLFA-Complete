"""
DSLFA AI Tutor — Chat Service with LangGraph-orchestrated External Knowledge Integration.

Two-layer system:
  1. Internal ChromaDB (student's personal notes) — always searched
  2. External knowledge (research subagent) — only when toggle is ON and conditions are met

The main tutor agent decides whether to call the research subagent based on:
  - External toggle state
  - Query intent (concept-oriented vs document-specific)
  - Trigger words
  - Internal context quality (similarity score threshold)
  - Session cache (avoid re-fetching already-researched topics)
"""
import re
import json
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from app.services.embedding_service import get_vector_store, get_external_vector_store
from app.services.research_service import research


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

# Trigger words that indicate concept-oriented queries (external search candidates)
EXTERNAL_TRIGGER_WORDS = [
    'explain', 'what is', "what's", 'what are',
    "i don't understand", "i dont understand", "don't get",
    'how does', 'how do', 'why does', 'why do', 'why is',
    'give me an example', 'example of', 'define',
    'difference between', 'compare', 'meaning of',
    'tell me about', 'elaborate', 'in detail'
]

# Phrases that signal document-specific queries (should NOT trigger external search)
DOCUMENT_SPECIFIC_PHRASES = [
    'my notes', 'my document', 'in my', 'from my',
    'what did my notes say', 'according to my', 'uploaded',
    'in the pdf', 'in the file', 'in the document'
]

# Follow-up phrases that should use cache, not re-fetch
FOLLOWUP_PHRASES = [
    'explain that more', 'tell me more', 'elaborate on that',
    'go deeper', 'can you clarify', 'what do you mean',
    'more detail', 'expand on', 'say more'
]

# Internal context quality threshold (below this → external might help)
RELEVANCE_THRESHOLD = 0.75


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
    Returns a list of dicts: [{'content': str, 'source': str, 'score': float}]
    """
    vectorstore = get_vector_store()
    collection = vectorstore._collection
    total_chunks = collection.count()

    if total_chunks == 0:
        return []

    context_chunks = []

    try:
        # Use similarity_search_with_relevance_scores for quality checking
        results = vectorstore.similarity_search_with_relevance_scores(query, k=top_k)

        for doc, score in results:
            context_chunks.append({
                'content': doc.page_content,
                'source': doc.metadata.get('source', 'Unknown document'),
                'score': round(score, 4)
            })
    except Exception as e:
        print(f"RAG similarity search error: {e}")
        # Fallback to basic similarity search
        try:
            results = vectorstore.similarity_search(query, k=top_k)
            for doc in results:
                context_chunks.append({
                    'content': doc.page_content,
                    'source': doc.metadata.get('source', 'Unknown document'),
                    'score': 1.0  # placeholder
                })
        except Exception as e2:
            print(f"RAG fallback search error: {e2}")

    return context_chunks


def retrieve_external_resources_context(query, top_k=3):
    """Searches the external resources ChromaDB collection for relevant chunks.
    These are resources the student explicitly added via the Resources page.
    """
    try:
        vectorstore = get_external_vector_store()
        collection = vectorstore._collection

        if collection.count() == 0:
            return []

        results = vectorstore.similarity_search(query, k=top_k)
        chunks = []
        for doc in results:
            chunks.append({
                'content': doc.page_content,
                'source': doc.metadata.get('source', 'External resource'),
                'origin_url': doc.metadata.get('origin_url', ''),
                'score': 1.0
            })
        return chunks
    except Exception as e:
        print(f"External resources search error: {e}")
        return []


# =====================================================
# External Knowledge Decision Logic
# =====================================================

def _is_concept_query(message):
    """Checks if the message is concept-oriented (good candidate for external search)."""
    msg_lower = message.lower()
    return any(trigger in msg_lower for trigger in EXTERNAL_TRIGGER_WORDS)


def _is_document_specific(message):
    """Checks if the message is asking about a specific document (should NOT trigger external)."""
    msg_lower = message.lower()
    return any(phrase in msg_lower for phrase in DOCUMENT_SPECIFIC_PHRASES)


def _is_followup(message):
    """Checks if the message is a follow-up on a previous topic."""
    msg_lower = message.lower()
    return any(phrase in msg_lower for phrase in FOLLOWUP_PHRASES)


def _internal_context_is_weak(context_chunks):
    """Returns True if internal context quality is below threshold."""
    if not context_chunks:
        return True
    avg_score = sum(c['score'] for c in context_chunks) / len(context_chunks)
    return avg_score < RELEVANCE_THRESHOLD


def _should_call_subagent(message, context_chunks, external_enabled, session_cache):
    """Determines whether the research subagent should be called.

    Returns (should_call: bool, cache_key: str | None, reasoning: list[str])
    """
    reasoning = []

    if not external_enabled:
        reasoning.append("❌ External toggle is OFF — skipping subagent.")
        return False, None, reasoning

    reasoning.append("✅ External toggle is ON.")

    is_doc_specific = _is_document_specific(message)
    if is_doc_specific:
        reasoning.append("❌ Query is document-specific (mentions 'my notes', 'my document', etc.) — skipping subagent.")
        return False, None, reasoning
    reasoning.append("✅ Query is NOT document-specific.")

    is_concept = _is_concept_query(message)
    msg_lower = message.lower()
    matched_triggers = [t for t in EXTERNAL_TRIGGER_WORDS if t in msg_lower]
    if not is_concept:
        reasoning.append(f"❌ No concept trigger words found in query — skipping subagent.")
        return False, None, reasoning
    reasoning.append(f"✅ Concept trigger words matched: {matched_triggers}")

    # Build cache key from the refined query
    cache_key = _refine_query(message).lower().strip()
    reasoning.append(f"🔑 Cache key (refined query): \"{cache_key}\"")

    # Check if we already have this in the session cache
    if cache_key in session_cache:
        reasoning.append(f"⚡ Cache HIT — reusing cached external context for \"{cache_key}\".")
        return False, cache_key, reasoning  # Cache hit — we'll use the cached context
    reasoning.append("🔍 Cache MISS — topic not previously researched this session.")

    # Check if it's a follow-up (use last cached topic)
    is_followup = _is_followup(message)
    if is_followup:
        reasoning.append("↩️ Detected follow-up phrasing — will reuse last cached topic instead of re-fetching.")
        return False, None, reasoning

    # Check internal context quality
    if context_chunks:
        avg_score = sum(c['score'] for c in context_chunks) / len(context_chunks)
        reasoning.append(f"📊 Internal context avg relevance score: {avg_score:.4f} (threshold: {RELEVANCE_THRESHOLD})")
        if avg_score < RELEVANCE_THRESHOLD:
            reasoning.append(f"⚠️ Internal context is WEAK (below {RELEVANCE_THRESHOLD}) — subagent WILL be called.")
        else:
            reasoning.append(f"📗 Internal context is adequate — but subagent will still supplement.")
    else:
        reasoning.append("⚠️ No internal context found at all — subagent WILL be called.")

    weak = _internal_context_is_weak(context_chunks)
    reasoning.append(f"🚀 Decision: CALL subagent (internal_weak={weak})")
    return True, cache_key, reasoning


def _refine_query(raw_message):
    """Rewrites a student's raw message into a clean, search-optimized query.
    Strips filler words and focuses on the core concept.
    """
    # Remove common filler phrases
    refined = raw_message.lower()
    filler_patterns = [
        r"^(hey|hi|hello|please|can you|could you|i want to know|i need to understand)\s*",
        r"^(explain to me|tell me about|what is|what are|how does|why does)\s*",
        r"\b(like|basically|actually|really|just|so|um|uh)\b",
        r"[?.!,]+$",
    ]
    for pattern in filler_patterns:
        refined = re.sub(pattern, ' ', refined)

    refined = ' '.join(refined.split()).strip()

    # If refinement emptied the query, use the original
    if len(refined) < 5:
        refined = raw_message.strip()

    return refined


def _determine_depth(message, chat_history):
    """Determines research depth based on the student's intent.

    Returns 'shallow' or 'deep'.
    """
    msg_lower = message.lower()

    deep_signals = [
        'explain properly', 'in detail', 'detailed explanation',
        'explain thoroughly', 'deep dive', 'comprehensive',
        "i'm confused", "i don't understand", "still don't get",
        'elaborate', 'step by step'
    ]

    if any(signal in msg_lower for signal in deep_signals):
        return 'deep'

    # If the student was already confused (previous messages had questions on same topic)
    if len(chat_history) >= 2:
        last_user = [m for m in chat_history[-4:] if m.get('role') == 'user']
        if len(last_user) >= 2:
            # Multiple questions in a row might mean they're struggling
            return 'deep'

    return 'shallow'


# =====================================================
# Main Chat Function with External Knowledge
# =====================================================

def chat_with_tutor(user_message, chat_history=None, external_enabled=False, session_cache=None):
    """
    Main chat function that performs RAG + optional External Knowledge + LLM generation.
    Returns a generator that yields status events and the final response.

    Each yielded item is a dict: {'type': 'status'|'sources'|'external_sources'|'response', 'data': ...}

    Args:
        user_message: The student's current message.
        chat_history: List of previous messages [{role, content}].
        external_enabled: Whether the external sources toggle is ON.
        session_cache: Dict of {cache_key: external_context_block} for the current session.
    """
    if chat_history is None:
        chat_history = []
    if session_cache is None:
        session_cache = {}

    # Step 1: Get document inventory
    available_docs = get_all_documents_info()

    # Step 2: Internal RAG Retrieval
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

        # Emit debug with internal context quality scores
        avg_score = sum(c['score'] for c in context_chunks) / len(context_chunks) if context_chunks else 0
        yield {
            'type': 'debug',
            'data': {
                'stage': 'internal_rag',
                'title': 'Internal RAG Results',
                'reasoning': [
                    f'📚 Found {len(context_chunks)} chunks from: {", ".join(sources)}',
                    f'📊 Avg relevance score: {avg_score:.4f} (threshold: {RELEVANCE_THRESHOLD})',
                ] + [
                    f'  [{c["source"]}] score={c["score"]:.4f} — {c["content"][:80]}...'
                    for c in context_chunks
                ],
                'result': {
                    'chunk_count': len(context_chunks),
                    'avg_score': round(avg_score, 4),
                    'sources': sources
                }
            }
        }

        context_text = "\n\n---\n\n".join(
            f"[From: {c['source']} (relevance: {c['score']})]\\n{c['content']}" for c in context_chunks
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

    # Step 2b: Check external resources collection (always, if any exist)
    ext_resource_chunks = retrieve_external_resources_context(user_message)
    if ext_resource_chunks:
        ext_sources = list(set(c['source'] for c in ext_resource_chunks))
        yield {'type': 'status', 'data': f'Found {len(ext_resource_chunks)} passages from external resources ({", ".join(ext_sources)})'}

        ext_context_text = "\n\n---\n\n".join(
            f"[From External Resource: {c['source']}]\n{c['content']}" for c in ext_resource_chunks
        )
        if context_text:
            context_text += "\n\n--- EXTERNAL RESOURCES ---\n\n" + ext_context_text
        else:
            context_text = ext_context_text

    # Step 3: External Knowledge Decision (Research Subagent)
    external_context = None
    sources_used = []
    cache_update = {}

    should_call, cache_key, reasoning = _should_call_subagent(
        user_message, context_chunks, external_enabled, session_cache
    )

    # Emit the full decision reasoning as a debug event
    yield {
        'type': 'debug',
        'data': {
            'stage': 'subagent_decision',
            'title': 'External Subagent Decision',
            'reasoning': reasoning,
            'result': {
                'should_call': should_call,
                'cache_key': cache_key
            }
        }
    }

    # Check cache hit first
    if external_enabled and cache_key and cache_key in session_cache:
        yield {'type': 'status', 'data': 'Using cached external knowledge for this topic...'}
        external_context = session_cache[cache_key]
        yield {
            'type': 'external_sources',
            'data': {
                'found': True,
                'cached': True,
                'sources': [{'topic': s['topic'], 'origin': s['origin'], 'url': s.get('url', '')} for s in external_context.get('sources', [])]
            }
        }

    elif should_call:
        # Refine query and determine depth
        refined_query = _refine_query(user_message)
        depth = _determine_depth(user_message, chat_history)

        # Emit debug info for refinement + depth
        yield {
            'type': 'debug',
            'data': {
                'stage': 'query_refinement',
                'title': 'Query Refinement & Depth',
                'reasoning': [
                    f'📝 Raw query: "{user_message}"',
                    f'🔧 Refined query: "{refined_query}"',
                    f'📏 Research depth: {depth}',
                    f'🔍 Tools: {"Tavily only" if depth == "shallow" else "Tavily + Wikipedia + arXiv"}'
                ],
                'result': {'refined_query': refined_query, 'depth': depth}
            }
        }

        yield {'type': 'status', 'data': f'Researching externally ({depth} mode): "{refined_query}"...'}

        try:
            external_context = research(refined_query, depth=depth)

            if external_context and external_context.get('sources'):
                sources_used = external_context['sources']

                # Cache the result for this session
                if cache_key:
                    cache_update[cache_key] = external_context

                # Emit debug with raw subagent results
                yield {
                    'type': 'debug',
                    'data': {
                        'stage': 'subagent_results',
                        'title': 'Subagent Raw Results',
                        'reasoning': [
                            f'📦 Received {len(sources_used)} sources:'
                        ] + [
                            f'  [{s["origin"]}] {s["topic"]} — {len(s["content"])} chars — {s.get("url", "no url")}'
                            for s in sources_used
                        ],
                        'result': {
                            'source_count': len(sources_used),
                            'origins': list(set(s['origin'] for s in sources_used))
                        }
                    }
                }

                yield {
                    'type': 'external_sources',
                    'data': {
                        'found': True,
                        'cached': False,
                        'sources': [{'topic': s['topic'], 'origin': s['origin'], 'url': s.get('url', '')} for s in sources_used]
                    }
                }
                yield {'type': 'status', 'data': f'Found {len(sources_used)} external sources'}
            else:
                yield {
                    'type': 'debug',
                    'data': {
                        'stage': 'subagent_results',
                        'title': 'Subagent Raw Results',
                        'reasoning': ['⚠️ Subagent returned no sources.'],
                        'result': {'source_count': 0}
                    }
                }
                yield {
                    'type': 'external_sources',
                    'data': {'found': False, 'cached': False, 'sources': []}
                }
                yield {'type': 'status', 'data': 'No external sources found for this query.'}
        except Exception as e:
            print(f"Research subagent error: {e}")
            yield {
                'type': 'debug',
                'data': {
                    'stage': 'subagent_error',
                    'title': 'Subagent Error',
                    'reasoning': [f'💥 Research subagent threw an exception: {str(e)}'],
                    'result': {'error': str(e)}
                }
            }
            yield {'type': 'status', 'data': 'External research failed, continuing with internal knowledge.'}

    # Step 4: Build prompt
    yield {'type': 'status', 'data': 'Generating response...'}

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

    # Build external knowledge section for system prompt
    external_knowledge_section = ""
    if external_context and external_context.get('sources'):
        ext_blocks = []
        for src in external_context['sources']:
            citation_tag = f"[Source: {src['origin'].capitalize()} — {src['topic']}]"
            ext_blocks.append(f"{citation_tag}\n{src['content']}")
        external_knowledge_section = "\n\n--- EXTERNAL KNOWLEDGE ---\n" + "\n\n---\n\n".join(ext_blocks) + "\n--- END EXTERNAL KNOWLEDGE ---"

    if context_text:
        system_content = f"""{TUTOR_SYSTEM_PROMPT}{doc_inventory}

The following context was retrieved from the student's uploaded study materials.
Use this information to answer their question. Always reference the source document by name.

--- STUDENT'S NOTES CONTEXT ---
{context_text}
--- END CONTEXT ---
{external_knowledge_section}
"""
    else:
        system_content = f"""{TUTOR_SYSTEM_PROMPT}{doc_inventory}

No specific context was found in the student's notes for this question.{external_knowledge_section}
{"Answer using the external knowledge provided above." if external_knowledge_section else "Answer using your general knowledge."}
"""

    # Add citation instructions if external knowledge is present
    if external_knowledge_section:
        system_content += """
CITATION RULES (IMPORTANT):
- When you use information from external sources, include the citation tag inline in your response.
- Format: [Source: Origin — Topic] (e.g., [Source: Wikipedia — Second Law of Thermodynamics])
- Only cite sources you actually used in your answer, not everything provided.
- Prefer the student's own notes over external sources when both cover the same content.
- Clearly distinguish between "Based on your notes..." and external knowledge.
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

    # Step 5: Generate response
    try:
        response = llm.invoke(messages)

        # Parse out which sources the AI actually cited in the response
        cited_sources = []
        if external_context and external_context.get('sources'):
            for src in external_context['sources']:
                # Check if the source was actually referenced in the response
                if src['topic'].lower() in response.content.lower() or src['origin'] in response.content.lower():
                    cited_sources.append({
                        'origin': src['origin'],
                        'topic': src['topic'],
                        'url': src.get('url', '')
                    })

        yield {
            'type': 'response',
            'data': {
                'content': response.content,
                'used_rag': bool(context_chunks),
                'sources': list(set(c['source'] for c in context_chunks)) if context_chunks else [],
                'used_external': bool(external_context and external_context.get('sources')),
                'external_sources': cited_sources,
                'cache_update': cache_update
            }
        }
    except Exception as e:
        yield {
            'type': 'error',
            'data': f'Failed to generate response: {str(e)}'
        }
