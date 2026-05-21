import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  Brain, Clock, Trash2, Play, Plus, Trophy, Zap,
  FileText, ChevronRight, Sliders, Timer, Target,
  RotateCcw, CheckCircle2, Sparkles, BookOpen, AlertCircle
} from 'lucide-react';
import QuizSession from '../components/quiz/QuizSession';
import QuizResults from '../components/quiz/QuizResults';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/layout/PageHeader';
import { useUserAssets } from '../hooks/useUserAssets';
import { Search as SearchIcon } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ─── Difficulty Badge Colors ──────────────────────────────────────────────────
const diffColor = (d) => {
  if (d === 'Hard') return 'text-red-500 bg-red-500/10 border-red-500/20';
  if (d === 'Medium') return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
  return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
};

const scoreColor = (s) => {
  if (s >= 80) return 'text-emerald-400';
  if (s >= 50) return 'text-yellow-400';
  return 'text-red-400';
};

export default function QuizDashboard() {
  const { refreshUser } = useAuth();
  const location = useLocation();

  const { filteredDocs: documents, loading: loadingDocs, error: fetchError, searchQuery, setSearchQuery } = useUserAssets();
  
  const [savedQuizzes, setSavedQuizzes] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  // Studio config
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionType, setQuestionType] = useState('mixed');
  const [timeLimit, setTimeLimit] = useState(30);
  const [questionCount, setQuestionCount] = useState(10);

  // State machine: 'studio' | 'generating' | 'playing' | 'results'
  const [quizState, setQuizState] = useState('studio');
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizResults, setQuizResults] = useState(null);

  // Animation state for card-flip transition
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    fetchLibrary();
  }, []);

  // Handle direct-start from Dashboard "Start Now" button
  useEffect(() => {
    if (location.state?.startQuizId && savedQuizzes.length > 0) {
      handleOpenSavedQuiz(location.state.startQuizId);
    }
  }, [location.state, savedQuizzes]);



  const fetchLibrary = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/quiz/library`);
      setSavedQuizzes(res.data.quizzes || []);
    } catch (err) {
      console.error('Failed to fetch quiz library', err);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const toggleDoc = (id) => {
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleForgeQuiz = async () => {
    if (selectedDocIds.length === 0) return;
    // Card-flip then generate
    setIsFlipping(true);
    setTimeout(async () => {
      setQuizState('generating');
      setIsFlipping(false);
      try {
        const res = await axios.post(`${API_BASE}/api/quiz/generate`, {
          documentIds: selectedDocIds,
          preferences: { difficulty, simulationMode: questionType, numQuestions: questionCount, timeLimit }
        });
        setQuizData(res.data.quiz);
        setActiveQuizId(res.data.savedId);
        setUserAnswers({});
        setQuizState('playing');
      } catch (err) {
        console.error('Error generating quiz:', err);
        alert('Failed to generate quiz. Please try again.');
        setQuizState('studio');
      }
    }, 600);
  };

  const handleOpenSavedQuiz = async (quizId) => {
    try {
      const res = await axios.get(`${API_BASE}/api/quiz/library/${quizId}`);
      setQuizData(res.data.quiz.quizData);
      setActiveQuizId(quizId);
      setUserAnswers({});
      setQuizState('playing');
    } catch (err) {
      console.error('Failed to load quiz:', err);
    }
  };

  const handleSubmitQuiz = async (answers, results) => {
    setUserAnswers(answers);
    setQuizResults(results);
    setQuizState('results');
    if (activeQuizId) {
      try {
        await axios.post(`${API_BASE}/api/quiz/library/${activeQuizId}/result`, {
          score: results.score,
          gradedQuestions: results.gradedQuestions,
        });
      } catch (e) { console.error('Failed to save result', e); }
    }
    refreshUser();
  };

  const handleDeleteQuiz = async (quizId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this quiz permanently?')) return;
    try {
      await axios.delete(`${API_BASE}/api/quiz/library/${quizId}`);
      setSavedQuizzes(prev => prev.filter(q => q.id !== quizId));
    } catch (e) { console.error('Failed to delete quiz', e); }
  };

  const handleReset = () => {
    fetchLibrary();
    setQuizState('studio');
    setQuizData(null);
    setUserAnswers({});
    setQuizResults(null);
    setActiveQuizId(null);
  };

  // ─── Playing / Results views ─────────────────────────────────────────────────
  if (quizState === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 animate-in fade-in">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-coral-orange/20 rounded-full animate-spin border-t-coral-orange"></div>
          <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-coral-orange" size={36} />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black mb-2">Forging Your Quiz...</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">AI is analyzing your materials and crafting questions.</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-coral-orange animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>
          ))}
        </div>
      </div>
    );
  }

  if (quizState === 'playing' && quizData) {
    return (
      <QuizSession
        quizData={quizData}
        onSubmit={handleSubmitQuiz}
        onCancel={() => { fetchLibrary(); setQuizState('studio'); }}
      />
    );
  }

  if (quizState === 'results' && quizResults) {
    return (
      <QuizResults
        quizData={quizData}
        results={quizResults}
        answers={userAnswers}
        onRetry={handleReset}
      />
    );
  }

  // ─── Studio View ────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#f8fafc] dark:bg-[#0a0d14] h-[calc(100vh-5rem)] overflow-hidden flex flex-col transition-colors duration-300">
      <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-in fade-in duration-300 h-full flex flex-col overflow-hidden">

      {/* Inline page header with Search Box */}
      <div className="mb-6">
        <PageHeader 
          title="Quiz Studio" 
          subtitle="Forge custom quizzes from your materials or replay saved ones." 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* ─── SPLIT VIEW ─── */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-5 gap-6 transition-all duration-600 ${isFlipping ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
      >
        {/* LEFT: Material Selector (3 cols) */}
        <div className="lg:col-span-3 bento-card overflow-hidden">
          <div className="p-6 border-b border-light-border dark:border-border-gray">
            <h2 className="font-black text-base flex items-center gap-2">
              <FileText size={16} className="text-coral-orange" /> Select Source Materials
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Choose the documents the AI will use to generate questions.</p>
          </div>

          <div className="p-4 max-h-[520px] overflow-y-auto space-y-2">
            {loadingDocs ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-coral-orange border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : fetchError ? (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 rounded-xl text-red-500 text-sm font-bold">
                <AlertCircle size={18} /> {fetchError}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <BookOpen size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="font-bold text-sm">No materials found.</p>
                <p className="text-xs mt-1">Upload documents via the Materials Lab first.</p>
              </div>
            ) : documents.map(doc => (
              <button
                key={doc.id}
                onClick={() => toggleDoc(doc.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 group ${
                  selectedDocIds.includes(doc.id)
                    ? 'border-coral-orange/50 bg-coral-orange/5 dark:bg-coral-orange/10'
                    : 'border-light-border dark:border-border-gray hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-charcoal-gray/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  selectedDocIds.includes(doc.id) ? 'bg-coral-orange/20 text-coral-orange' : 'bg-slate-100 dark:bg-border-gray text-slate-500'
                }`}>
                  {selectedDocIds.includes(doc.id) ? <CheckCircle2 size={20} /> : <FileText size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate">{doc.title}</p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">{doc.file_type}</p>
                </div>
                <ChevronRight size={16} className={`shrink-0 transition-transform ${selectedDocIds.includes(doc.id) ? 'rotate-90 text-coral-orange' : 'text-slate-300'}`} />
              </button>
            ))}
          </div>

          {selectedDocIds.length > 0 && (
            <div className="p-4 border-t border-light-border dark:border-border-gray bg-coral-orange/5">
              <p className="text-xs font-bold text-coral-orange">{selectedDocIds.length} material{selectedDocIds.length > 1 ? 's' : ''} selected</p>
            </div>
          )}
        </div>

        {/* RIGHT: Quiz Forge Config (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bento-card p-6 flex-1">
            <h2 className="font-black text-base flex items-center gap-2 mb-6">
              <Sliders size={16} className="text-coral-orange" /> Quiz Forge
            </h2>

            <div className="space-y-6">
              {/* Difficulty */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <Target size={12} /> Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Easy', 'Medium', 'Hard'].map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        difficulty === d
                          ? d === 'Easy' ? 'bg-emerald-500 border-emerald-500 text-white'
                            : d === 'Medium' ? 'bg-yellow-500 border-yellow-500 text-white'
                            : 'bg-red-500 border-red-500 text-white'
                          : 'border-light-border dark:border-border-gray text-slate-500 hover:border-slate-300'
                      }`}
                    >{d}</button>
                  ))}
                </div>
              </div>

              {/* Question Type */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <Sparkles size={12} /> Question Type
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { val: 'mixed', label: 'Mixed (MCQ + Short)' },
                    { val: 'mcq', label: 'Multiple Choice Only' },
                    { val: 'short_answer', label: 'Short Answer Only' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setQuestionType(opt.val)}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold border text-left transition-all ${
                        questionType === opt.val
                          ? 'border-coral-orange/60 bg-coral-orange/10 text-coral-orange'
                          : 'border-light-border dark:border-border-gray text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Questions: <span className="text-coral-orange">{questionCount}</span>
                </label>
                <input
                  type="range" min={5} max={20} value={questionCount}
                  onChange={e => setQuestionCount(+e.target.value)}
                  className="w-full accent-coral-orange"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1"><span>5</span><span>20</span></div>
              </div>

              {/* Time Limit */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <Timer size={12} /> Time Limit: <span className="text-coral-orange">{timeLimit} min</span>
                </label>
                <input
                  type="range" min={5} max={60} step={5} value={timeLimit}
                  onChange={e => setTimeLimit(+e.target.value)}
                  className="w-full accent-coral-orange"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1"><span>5m</span><span>60m</span></div>
              </div>
            </div>
          </div>

          {/* Forge Button */}
          <button
            onClick={handleForgeQuiz}
            disabled={selectedDocIds.length === 0}
            className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all duration-300 ${
              selectedDocIds.length > 0
                ? 'bg-coral-orange text-white shadow-lg shadow-coral-orange/30 hover:brightness-110 hover:-translate-y-0.5'
                : 'bg-slate-100 dark:bg-charcoal-gray text-slate-400 cursor-not-allowed'
            }`}
          >
            <Zap size={20} /> Forge Quiz
          </button>
        </div>
      </div>

      {/* ─── Saved Quiz Library ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-lg flex items-center gap-2">
            <RotateCcw size={18} className="text-slate-400" /> Your Quiz Library
          </h2>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-charcoal-gray px-3 py-1.5 rounded-full border border-light-border dark:border-border-gray">
            {savedQuizzes.length} saved
          </span>
        </div>

        {loadingLibrary ? (
          <div className="bento-card p-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-coral-orange border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : savedQuizzes.length === 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bento-card p-12 text-center">
          <Trophy size={44} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="font-black text-base text-slate-600 dark:text-slate-400 mb-2">No quizzes yet</h3>
          <p className="text-sm text-slate-400 mb-6">Select materials above and forge your first quiz.</p>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 border border-dashed border-slate-200 dark:border-[#1f2023] px-4 py-2 rounded-xl">
            ↑ Pick materials, configure, then hit Forge
          </div>
        </div>
        <div className="bento-card p-12 text-center hidden md:flex flex-col items-center justify-center">
          <Sparkles size={44} className="text-coral-orange/30 mb-4" />
          <p className="text-xs font-bold text-slate-400 max-w-[200px] leading-relaxed">
            Your AI-forged quizzes will appear here. Each one is saved to your library automatically.
          </p>
        </div>
      </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {savedQuizzes.map(q => (
              <div key={q.id} className="bento-card group hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                {/* Top accent bar */}
                <div className={`h-1 w-full ${q.lastScore >= 80 ? 'bg-emerald-500' : q.lastScore >= 50 ? 'bg-yellow-500' : q.lastScore !== null && q.lastScore !== undefined ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-sm leading-snug flex-1 pr-2">{q.title}</h3>
                    <button
                      onClick={(e) => handleDeleteQuiz(q.id, e)}
                      className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${diffColor(q.difficulty)}`}>{q.difficulty}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-light-border dark:border-border-gray text-slate-500">{q.questionCount} Qs</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-light-border dark:border-border-gray text-slate-500 capitalize">{q.simulationMode}</span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-light-border dark:border-border-gray">
                    <div>
                      {q.lastScore !== null && q.lastScore !== undefined ? (
                        <span className={`text-base font-black ${scoreColor(q.lastScore)}`}>
                          {q.lastScore}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Not attempted</span>
                      )}
                      {q.attemptCount > 0 && (
                        <p className="text-[10px] text-slate-400">{q.attemptCount} attempt{q.attemptCount > 1 ? 's' : ''}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleOpenSavedQuiz(q.id)}
                      className="flex items-center gap-1.5 bg-coral-orange text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:brightness-110 transition-all shadow-sm shadow-coral-orange/20"
                    >
                      <Play size={13} fill="currentColor" />
                      {q.attemptCount > 0 ? 'Retake' : 'Start'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
