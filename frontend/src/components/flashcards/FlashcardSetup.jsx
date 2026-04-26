import { useState } from 'react';
import { FileText, Layers, Play, Settings2, Sparkles } from 'lucide-react';

// Vibrant gradient presets for the deck cards
const GRADIENT_PRESETS = [
  'from-violet-500 to-fuchsia-500',
  'from-cyan-500 to-blue-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-purple-500',
];

const FlashcardSetup = ({ documents, loading, error, onGenerate }) => {
  const [selectedDocs, setSelectedDocs] = useState([]);

  const [preferences, setPreferences] = useState({
    count: 10,
    style: 'Mixed',
    difficulty: 'Medium',
  });

  const toggleDoc = (id) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleStart = () => {
    if (selectedDocs.length === 0) {
      alert('Please select at least one document.');
      return;
    }
    onGenerate(selectedDocs, preferences);
  };

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 p-8 text-white shadow-xl">
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-64 h-32 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Layers className="drop-shadow-lg" size={32} />
            <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-sm">Flashcard Studio</h1>
          </div>
          <p className="text-white/80 max-w-lg">
            Turn your notes into beautiful, AI-powered flashcards. Choose your materials, pick a style, and start studying smarter.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Document Picker */}
        <div className="col-span-1 md:col-span-2">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 dark:text-white">
              <FileText className="text-violet-500" size={20} /> Choose Your Materials
            </h2>

            {loading ? (
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 py-6">
                <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                Loading documents...
              </div>
            ) : error ? (
              <p className="text-red-500 font-medium py-4">{error}</p>
            ) : documents.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 py-4">
                No documents found. Upload notes in <span className="font-semibold text-violet-500">My Notes</span> first.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                {documents.map((doc, idx) => (
                  <label
                    key={doc.id}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      selectedDocs.includes(doc.id)
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-500 shadow-sm shadow-violet-200 dark:shadow-violet-900/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedDocs.includes(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                    />
                    {/* Custom checkbox */}
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        selectedDocs.includes(doc.id)
                          ? 'bg-violet-500 border-violet-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selectedDocs.includes(doc.id) && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${GRADIENT_PRESETS[idx % GRADIENT_PRESETS.length]} flex items-center justify-center flex-shrink-0`}>
                      <FileText className="text-white" size={16} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium dark:text-slate-200 truncate">{doc.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {doc.file_type?.toUpperCase()} • {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-5 dark:text-white">
              <Settings2 className="text-fuchsia-500" size={20} /> Deck Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Number of Cards</label>
                <select
                  value={preferences.count}
                  onChange={(e) => setPreferences({ ...preferences, count: parseInt(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                >
                  <option value={5}>5 Cards</option>
                  <option value={10}>10 Cards</option>
                  <option value={15}>15 Cards</option>
                  <option value={20}>20 Cards</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Card Style</label>
                <select
                  value={preferences.style}
                  onChange={(e) => setPreferences({ ...preferences, style: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                >
                  <option>Mixed</option>
                  <option>Definition</option>
                  <option>Concept</option>
                  <option>Formula</option>
                  <option>Cloze Fill-in-the-Blank</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Difficulty</label>
                <select
                  value={preferences.difficulty}
                  onChange={(e) => setPreferences({ ...preferences, difficulty: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                  <option>Mixed</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={selectedDocs.length === 0}
            className="group relative w-full overflow-hidden bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
          >
            <Sparkles size={18} className="group-hover:animate-pulse" />
            Generate Flashcards
            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out skew-x-12" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardSetup;
