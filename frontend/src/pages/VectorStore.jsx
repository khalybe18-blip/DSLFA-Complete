import { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, FileText, Search, Loader2, Hash, ChevronDown, ChevronRight, Zap } from 'lucide-react';

const VectorStore = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSources, setExpandedSources] = useState({});
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/ai/vectorstore');
      setData(response.data);
    } catch (err) {
      setError('Failed to load vector store data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleSource = (source) => {
    setExpandedSources(prev => ({ ...prev, [source]: !prev[source] }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setSearchResults(null);
    
    try {
      const response = await axios.post('http://localhost:5000/api/ai/vectorstore/search', {
        query: searchQuery,
        top_k: 5
      });
      setSearchResults(response.data);
    } catch (err) {
      setError('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.7) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (score >= 0.4) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-lg font-medium">Loading Vector Store...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3 transition-colors">
            <Database className="text-blue-600 dark:text-blue-400" size={28} />
            Vector Store Inspector
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors">Browse and search your ChromaDB embeddings</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-800 dark:text-blue-300 transition-colors">
            {data?.total || 0} chunks
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-800 dark:text-indigo-300 transition-colors">
            {data?.source_count || 0} documents
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}

      {/* Similarity Search */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white transition-colors">
          <Zap className="text-amber-500" size={20} />
          Test Similarity Search
        </h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type a query to test what chunks the RAG retrieves..."
            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-blue-500/40 dark:focus:border-blue-400 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {searching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            Search
          </button>
        </form>
        
        {searchResults && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {searchResults.results.length} results for "<span className="font-medium text-slate-700 dark:text-slate-200">{searchResults.query}</span>"
            </p>
            {searchResults.results.map((hit, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FileText size={14} className="text-slate-400 dark:text-slate-500" />
                      {hit.source}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getScoreColor(hit.score)}`}>
                    Score: {hit.score}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-white dark:bg-slate-800 p-3 rounded border border-slate-100 dark:border-slate-700 transition-colors">
                  {hit.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Chunks */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 transition-colors">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Hash size={18} className="text-slate-400 dark:text-slate-500" />
            Indexed Documents & Chunks
          </h2>
        </div>

        {!data || data.total === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <Database className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No embeddings yet</p>
            <p className="text-sm mt-1">Upload documents in the Notes section to see them here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {Object.entries(data.sources).map(([source, info]) => (
              <div key={source}>
                {/* Source header (clickable) */}
                <button
                  onClick={() => toggleSource(source)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-colors">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-slate-200 transition-colors">{source}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 transition-colors">
                        {info.chunks.length} chunk{info.chunks.length !== 1 ? 's' : ''} • 
                        doc_id: {info.metadata?.document_id || '?'}
                      </p>
                    </div>
                  </div>
                  {expandedSources[source] ? (
                    <ChevronDown size={20} className="text-slate-400 dark:text-slate-500" />
                  ) : (
                    <ChevronRight size={20} className="text-slate-400 dark:text-slate-500" />
                  )}
                </button>

                {/* Expanded chunks */}
                {expandedSources[source] && (
                  <div className="px-4 pb-4 space-y-2">
                    {info.chunks.map((chunk, i) => (
                      <div key={chunk.id} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg p-3 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-slate-400 dark:text-slate-500 transition-colors">
                            Chunk {i + 1} • ID: {chunk.id.slice(0, 12)}...
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 transition-colors">
                            {chunk.content.length} chars
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-white dark:bg-slate-800 p-2.5 rounded border border-slate-100 dark:border-slate-700 max-h-48 overflow-y-auto transition-colors">
                          {chunk.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VectorStore;
