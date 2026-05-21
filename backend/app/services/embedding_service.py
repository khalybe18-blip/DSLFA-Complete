import os
from langchain_community.vectorstores import Chroma
# from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_ollama import OllamaEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter


def get_vector_store():
    """Initializes and returns the Chroma vector database client."""
    persist_directory = os.environ.get('CHROMA_DB_DIR', 'chroma_db')
    os.makedirs(persist_directory, exist_ok=True)

    # embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    embeddings = OllamaEmbeddings(model="mxbai-embed-large:latest")

    return Chroma(
        collection_name="dslfa_documents",
        embedding_function=embeddings,
        persist_directory=persist_directory
    )


def process_and_embed_document(text: str, metadata: dict) -> bool:
    """
    Chunks text and stores embeddings into ChromaDB.

    Required metadata keys:
        document_id (int)  — DB primary key for the document
        source      (str)  — human-readable filename
    Optional:
        class_id    (int)  — set when document belongs to a classroom;
                             enables class-scoped RAG retrieval
    """
    if not text:
        raise ValueError("No text provided to embed.")

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
        length_function=len
    )

    chunks = text_splitter.split_text(text)
    # Ensure class_id is always present in metadata (None → -1 sentinel)
    enriched_metadata = {
        **metadata, 
        'class_id': int(metadata.get('class_id') or -1),
        'is_visible': bool(metadata.get('is_visible', True))
    }
    metadatas = [enriched_metadata for _ in chunks]

    vectorstore = get_vector_store()
    vectorstore.add_texts(texts=chunks, metadatas=metadatas)
    return True


def delete_document_embeddings(document_id: int) -> bool:
    """
    Deletes all vector chunks associated with a specific document_id from ChromaDB.
    """
    try:
        vectorstore = get_vector_store()
        collection = vectorstore._collection
        collection.delete(where={"document_id": int(document_id)})
        return True
    except Exception as e:
        print(f"Failed to delete embeddings for doc {document_id}: {e}")
        return False


def list_sources_for_class(class_id: int, limit: int = 400) -> list:
    """
    Unique source filenames for chunks tagged with this class_id (for tutor inventory).
    """
    vectorstore = get_vector_store()
    collection = vectorstore._collection
    if collection.count() == 0:
        return []
    try:
        try:
            data = collection.get(
                where={"class_id": int(class_id)},
                include=["metadatas"],
                limit=limit,
            )
        except TypeError:
            data = collection.get(
                where={"class_id": int(class_id)},
                include=["metadatas"],
            )
        metas = data.get("metadatas") or []
        return sorted({m.get("source", "Unknown") for m in metas if m})
    except Exception as e:
        print(f"list_sources_for_class error class_id={class_id}: {e}")
        return []


def retrieve_context_for_class(query: str, class_id: int, user_role: str = 'student', top_k: int = 4) -> list:
    """
    Class-scoped RAG retrieval.
    Only returns chunks whose metadata.class_id matches the given classroom.
    Students only see 'is_visible=True' content; Facilitators see everything.
    """
    vectorstore = get_vector_store()
    collection = vectorstore._collection

    if collection.count() == 0:
        return []

    try:
        # Chroma where-filter: only vectors tagged with this class_id
        # Students: filter by is_visible=True
        # Facilitators: ignore is_visible filter
        filter_query = {"class_id": int(class_id)}
        if user_role not in ['facilitator', 'teacher', 'admin']:
            filter_query = {
                "$and": [
                    {"class_id": int(class_id)},
                    {"is_visible": True}
                ]
            }

        results = vectorstore.similarity_search(
            query,
            k=top_k,
            filter=filter_query
        )
        return [
            {'content': doc.page_content, 'source': doc.metadata.get('source', 'Unknown')}
            for doc in results
        ]
    except Exception as e:
        print(f"Class-scoped RAG error for class_id={class_id}: {e}")
        return []
