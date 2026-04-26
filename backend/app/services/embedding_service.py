import os
from langchain_community.vectorstores import Chroma
# from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_ollama import OllamaEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

def get_vector_store():
    """Initializes and returns the Chroma vector database client."""
    # Ensure ChromaDB path exists
    persist_directory = os.environ.get('CHROMA_DB_DIR', 'chroma_db')
    os.makedirs(persist_directory, exist_ok=True)
    
    # embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    embeddings = OllamaEmbeddings(model="mxbai-embed-large:latest")

    
    return Chroma(
        collection_name="dslfa_documents",
        embedding_function=embeddings,
        persist_directory=persist_directory
    )

def process_and_embed_document(text, metadata):
    """
    Chunks text and stores embeddings into ChromaDB.
    Expected metadata: {'document_id': int, 'user_id': int, 'source': str}
    """
    if not text:
        raise ValueError("No text provided to embed.")
        
    # Chunking strategy
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
        length_function=len
    )
    
    chunks = text_splitter.split_text(text)
    
    # We must ensure all chunks have identical metadata to associate back to doc
    metadatas = [metadata for _ in chunks]
    
    vectorstore = get_vector_store()
    
    # Add texts to the vector store
    vectorstore.add_texts(texts=chunks, metadatas=metadatas)
    
    return True

def delete_document_embeddings(document_id):
    """
    Deletes all vector chunks associated with a specific document_id from ChromaDB.
    """
    try:
        vectorstore = get_vector_store()
        collection = vectorstore._collection
        
        # We delete from Chroma collection using the where clause matching the metadata
        collection.delete(where={"document_id": int(document_id)})
        return True
    except Exception as e:
        print(f"Failed to delete embeddings for doc {document_id}: {e}")
        return False
