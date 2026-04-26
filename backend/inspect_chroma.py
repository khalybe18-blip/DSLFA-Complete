"""
ChromaDB Inspector Script
Run this from the backend directory to inspect your vector store:
  python inspect_chroma.py
"""
import os
import sys

# Ensure the app module is importable
sys.path.insert(0, os.path.dirname(__file__))
os.environ['CHROMA_DB_DIR'] = 'chroma_db'

from app.services.embedding_service import get_vector_store


def inspect():
    vs = get_vector_store()
    collection = vs._collection
    
    print("=" * 60)
    print("  DSLFA ChromaDB Inspector")
    print("=" * 60)
    print(f"\n  Collection: {collection.name}")
    print(f"  Total chunks: {collection.count()}")
    print()
    
    if collection.count() == 0:
        print("  [!] Collection is EMPTY. Upload some documents first.")
        return
    
    # Get all data
    all_data = collection.get(include=['documents', 'metadatas'])
    
    # Group by source
    sources = {}
    for doc, meta, doc_id in zip(all_data['documents'], all_data['metadatas'], all_data['ids']):
        source = meta.get('source', 'Unknown')
        if source not in sources:
            sources[source] = []
        sources[source].append({
            'id': doc_id,
            'content': doc,
            'metadata': meta
        })
    
    print(f"  Documents indexed: {len(sources)}")
    print("-" * 60)
    
    for source, chunks in sources.items():
        print(f"\n  📄 {source}  ({len(chunks)} chunks)")
        for i, chunk in enumerate(chunks):
            preview = chunk['content'][:120].replace('\n', ' ').strip()
            print(f"     [{i+1}] {preview}...")
            print(f"         Meta: {chunk['metadata']}")
    
    print("\n" + "=" * 60)


def search(query):
    """Test a similarity search"""
    vs = get_vector_store()
    
    print(f"\n🔍 Searching for: '{query}'\n")
    
    results = vs.similarity_search_with_relevance_scores(query, k=5)
    
    if not results:
        print("  No results found.")
        return
    
    for i, (doc, score) in enumerate(results):
        print(f"  [{i+1}] Score: {score:.4f}")
        print(f"      Source: {doc.metadata.get('source', '?')}")
        preview = doc.page_content[:150].replace('\n', ' ').strip()
        print(f"      Content: {preview}...")
        print()


if __name__ == '__main__':
    if len(sys.argv) > 1:
        query = ' '.join(sys.argv[1:])
        search(query)
    else:
        inspect()
        print("\n  TIP: Run with a query to test search:")
        print("  python inspect_chroma.py 'your search query here'")
