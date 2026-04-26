import { useState, useEffect } from 'react';
import axios from 'axios';
import { Layers, Sparkles, Plus, Trash2, BookOpen, Play, Eye } from 'lucide-react';
import FlashcardSetup from '../components/flashcards/FlashcardSetup';
import FlashcardViewer from '../components/flashcards/FlashcardViewer';

// Vibrant gradient presets for library cards
const DECK_GRADIENTS = [
  'from-violet-500 to-fuchsia-500',
  'from-cyan-500 to-blue-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-purple-500',
];

const FlashcardDashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Library
  const [savedDecks, setSavedDecks] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  // States: 'library', 'setup', 'generating', 'viewing'
  const [pageState, setPageState] = useState('library');
  const [deckData, setDeckData] = useState(null);
  const [activeDeckId, setActiveDeckId] = useState(null);

  useEffect(() => {
    fetchDocuments();
    fetchLibrary();
  }, []);

  const fetchDocuments = async () => {
    try {
      setFetchError('');
      const response = await axios.get('http://localhost:5000/api/documents');
      if (response.data && response.data.documents) {
        setDocuments(response.data.documents);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Failed to fetch documents', error);
      setFetchError(`Network Error: Make sure backend is running. (${error.message})`);
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchLibrary = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/flashcards/library');
      setSavedDecks(response.data.decks || []);
    } catch (error) {
      console.error('Failed to fetch flashcard library', error);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleGenerate = async (selectedDocIds, preferences) => {
    setPageState('generating');
    try {
      const response = await axios.post('http://localhost:5000/api/flashcards/generate', {
        documentIds: selectedDocIds,
        preferences: preferences,
      });
      setDeckData(response.data.deck);
      setActiveDeckId(response.data.savedId);
      setPageState('viewing');
    } catch (error) {
      console.error('Error generating flashcards:', error);
      alert('Failed to generate flashcards. Please try again.');
      setPageState('library');
    }
  };

  const handleOpenSavedDeck = async (deckId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/flashcards/library/${deckId}`);
      setDeckData(response.data.deck.deckData);
      setActiveDeckId(deckId);
      setPageState('viewing');
    } catch (error) {
      console.error('Failed to load deck:', error);
      alert('Failed to load flashcard deck.');
    }
  };

  const handleDeleteDeck = async (deckId) => {
    if (!window.confirm('Delete this flashcard deck permanently?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/flashcards/library/${deckId}`);
      setSavedDecks(prev => prev.filter(d => d.id !== deckId));
    } catch (e) {
      console.error('Failed to delete deck', e);
    }
  };

  const handleExit = () => {
    fetchLibrary();
    setPageState('library');
    setDeckData(null);
    setActiveDeckId(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 transition-colors">

      {/* ═══ LIBRARY VIEW ═══ */}
      {pageState === 'library' && (
        <div className="space-y-6">
          {/* Hero header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 p-8 text-white shadow-xl">
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-64 h-32 bg-white/5 rounded-full blur-3xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Layers className="drop-shadow-lg" size={32} />
                  <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-sm">Flashcard Studio</h1>
                </div>
                <p className="text-white/80 max-w-lg">
                  Your AI-generated flashcard decks. Study, track progress, and master your material.
                </p>
              </div>
              <button
                onClick={() => setPageState('setup')}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold rounded-xl transition-all border border-white/20"
              >
                <Plus size={18} /> New Deck
              </button>
            </div>
          </div>

          {loadingLibrary ? (
            <div className="text-center py-16 text-slate-500 dark:text-slate-400">
              <div className="w-8 h-8 border-3 border-violet-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading your decks...
            </div>
          ) : savedDecks.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors">
              <BookOpen className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
              <h3 className="text-lg font-semibold dark:text-white mb-1">No flashcard decks yet</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Generate your first deck from your uploaded notes.</p>
              <button
                onClick={() => setPageState('setup')}
                className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-fuchsia-700 transition-all shadow-lg shadow-violet-500/25"
              >
                Create First Deck
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedDecks.map((deck, idx) => (
                <div
                  key={deck.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all group"
                >
                  {/* Color strip header */}
                  <div className={`h-2 bg-gradient-to-r ${DECK_GRADIENTS[idx % DECK_GRADIENTS.length]}`} />
                  
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 dark:text-white truncate">{deck.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{deck.subject}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteDeck(deck.id); }}
                        className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-medium">{deck.cardCount} cards</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">{deck.difficulty}</span>
                      {deck.masteredCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                          {deck.masteredCount} mastered
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    {deck.cardCount > 0 && (
                      <div className="mt-3">
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full bg-gradient-to-r ${DECK_GRADIENTS[idx % DECK_GRADIENTS.length]} transition-all`}
                            style={{ width: `${Math.round((deck.masteredCount / deck.cardCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4">
                      <p className="text-xs text-slate-400">{new Date(deck.createdAt).toLocaleDateString()}</p>
                      <button
                        onClick={() => handleOpenSavedDeck(deck.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-xl text-sm font-medium hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                      >
                        <Eye size={14} /> Study
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ SETUP VIEW ═══ */}
      {pageState === 'setup' && (
        <div>
          <button onClick={() => setPageState('library')} className="text-sm text-violet-600 dark:text-violet-400 hover:underline mb-4 inline-block">
            ← Back to Library
          </button>
          <FlashcardSetup
            documents={documents}
            loading={loadingDocs}
            error={fetchError}
            onGenerate={handleGenerate}
          />
        </div>
      )}

      {/* ═══ GENERATING ═══ */}
      {pageState === 'generating' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="relative">
            <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-violet-300/40 dark:border-violet-600/30 animate-ping" />
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-violet-500/30">
              <Layers className="text-white animate-bounce" size={36} />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold dark:text-white transition-colors">
              Crafting Your Flashcards...
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm transition-colors">
              Analyzing your notes and generating smart study cards. This may take a moment.
            </p>
          </div>
        </div>
      )}

      {/* ═══ VIEWING ═══ */}
      {pageState === 'viewing' && deckData && (
        <FlashcardViewer deck={deckData} onExit={handleExit} />
      )}
    </div>
  );
};

export default FlashcardDashboard;
