"""
Research Subagent for DSLFA AI Tutor.
Handles external knowledge retrieval via Tavily, Wikipedia, and arXiv.
Supports 'shallow' (Tavily only) and 'deep' (Tavily + Wikipedia + arXiv) modes.
"""
import os
import re
import hashlib


def _get_tavily_client():
    """Lazily initializes and returns a Tavily client."""
    try:
        from tavily import TavilyClient
        api_key = os.environ.get('TAVILY_API_KEY', '')
        if not api_key:
            print("Warning: TAVILY_API_KEY not set in environment.")
            return None
        return TavilyClient(api_key=api_key)
    except ImportError:
        print("Warning: tavily-python not installed.")
        return None


def search_tavily(query, max_results=3):
    """Searches the web using Tavily API.
    Returns a list of source dicts: [{id, origin, topic, content, url}]
    """
    client = _get_tavily_client()
    if not client:
        return []

    try:
        response = client.search(
            query=query,
            search_depth="advanced",
            max_results=max_results,
            include_answer=True
        )

        sources = []
        # Include the AI-generated answer as a synthesized source
        if response.get('answer'):
            sources.append({
                'id': f"tavily_answer_{hashlib.md5(query.encode()).hexdigest()[:8]}",
                'origin': 'tavily',
                'topic': query,
                'content': response['answer'],
                'url': ''
            })

        # Include individual results
        for i, result in enumerate(response.get('results', [])[:max_results]):
            sources.append({
                'id': f"tavily_{i}_{hashlib.md5(result.get('url', '').encode()).hexdigest()[:8]}",
                'origin': 'tavily',
                'topic': result.get('title', query),
                'content': result.get('content', ''),
                'url': result.get('url', '')
            })

        return sources
    except Exception as e:
        print(f"Tavily search error: {e}")
        return []


def search_wikipedia(query, max_results=2):
    """Searches Wikipedia for concept definitions and theory.
    Returns a list of source dicts.
    """
    try:
        import wikipediaapi
    except ImportError:
        print("Warning: wikipedia-api not installed.")
        return []

    try:
        wiki = wikipediaapi.Wikipedia(
            user_agent='DSLFA-StudyOS/1.0 (student-project)',
            language='en'
        )

        # Try direct page lookup first
        page = wiki.page(query)
        if page.exists():
            # Take a meaningful summary (first ~2000 chars)
            summary = page.summary[:2000]
            return [{
                'id': f"wiki_{hashlib.md5(query.encode()).hexdigest()[:8]}",
                'origin': 'wikipedia',
                'topic': page.title,
                'content': summary,
                'url': page.fullurl
            }]

        # If no direct match, try searching with simpler terms
        terms = query.split()
        for length in range(len(terms), 0, -1):
            sub_query = ' '.join(terms[:length])
            page = wiki.page(sub_query)
            if page.exists():
                summary = page.summary[:2000]
                return [{
                    'id': f"wiki_{hashlib.md5(sub_query.encode()).hexdigest()[:8]}",
                    'origin': 'wikipedia',
                    'topic': page.title,
                    'content': summary,
                    'url': page.fullurl
                }]

        return []
    except Exception as e:
        print(f"Wikipedia search error: {e}")
        return []


def search_arxiv(query, max_results=2):
    """Searches arXiv for academic papers on engineering/CS topics.
    Returns a list of source dicts.
    """
    try:
        import arxiv
    except ImportError:
        print("Warning: arxiv not installed.")
        return []

    try:
        client = arxiv.Client()
        search = arxiv.Search(
            query=query,
            max_results=max_results,
            sort_by=arxiv.SortCriterion.Relevance
        )

        sources = []
        for result in client.results(search):
            sources.append({
                'id': f"arxiv_{hashlib.md5(result.entry_id.encode()).hexdigest()[:8]}",
                'origin': 'arxiv',
                'topic': result.title,
                'content': result.summary[:1500],
                'url': result.entry_id
            })

        return sources
    except Exception as e:
        print(f"arXiv search error: {e}")
        return []


def deduplicate_sources(sources):
    """Removes near-duplicate sources based on content similarity heuristic.
    Uses a simple approach: if two sources share >60% of the same words, keep only one.
    """
    if len(sources) <= 1:
        return sources

    unique = []
    seen_content_hashes = set()

    for source in sources:
        # Create a word-level fingerprint
        words = set(re.findall(r'\w{4,}', source['content'].lower()))
        content_hash = frozenset(list(words)[:50])  # Use first 50 long-ish words

        # Check overlap with already seen
        is_dup = False
        for seen in seen_content_hashes:
            if len(words) == 0:
                break
            overlap = len(content_hash & seen) / max(len(content_hash), 1)
            if overlap > 0.6:
                is_dup = True
                break

        if not is_dup:
            unique.append(source)
            seen_content_hashes.add(content_hash)

    return unique


def research(query, depth="shallow"):
    """Main research function. Orchestrates tool calls based on depth.

    Args:
        query: The refined search query from the main tutor agent.
        depth: 'shallow' (Tavily only) or 'deep' (Tavily + Wikipedia + arXiv).

    Returns:
        dict with 'sources' list matching the spec format.
    """
    all_sources = []

    if depth == "shallow":
        all_sources.extend(search_tavily(query, max_results=2))
    elif depth == "deep":
        all_sources.extend(search_tavily(query, max_results=3))
        all_sources.extend(search_wikipedia(query, max_results=2))
        all_sources.extend(search_arxiv(query, max_results=2))
    else:
        # Fallback to shallow
        all_sources.extend(search_tavily(query, max_results=2))

    # Deduplicate overlapping content across sources
    all_sources = deduplicate_sources(all_sources)

    return {
        'sources': all_sources
    }
