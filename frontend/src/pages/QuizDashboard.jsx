import { useState, useEffect } from 'react';
import axios from 'axios';
import { Brain, BrainCircuit, Clock, Trash2, Play, Plus, Trophy, RotateCcw } from 'lucide-react';
import QuizSetup from '../components/quiz/QuizSetup';
import QuizSession from '../components/quiz/QuizSession';
import QuizResults from '../components/quiz/QuizResults';

const QuizDashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Library
  const [savedQuizzes, setSavedQuizzes] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  // States: 'library', 'setup', 'generating', 'playing', 'results'
  const [quizState, setQuizState] = useState('library');
  const [activeQuizId, setActiveQuizId] = useState(null);
  
  const [quizData, setQuizData] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizResults, setQuizResults] = useState(null);

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
      const response = await axios.get('http://localhost:5000/api/quiz/library');
      setSavedQuizzes(response.data.quizzes || []);
    } catch (error) {
      console.error('Failed to fetch quiz library', error);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleGenerateQuiz = async (selectedDocIds, preferences) => {
    setQuizState('generating');
    try {
      const response = await axios.post('http://localhost:5000/api/quiz/generate', {
        documentIds: selectedDocIds,
        preferences: preferences
      });
      setQuizData(response.data.quiz);
      setActiveQuizId(response.data.savedId);
      setUserAnswers({});
      setQuizState('playing');
    } catch (error) {
      console.error('Error generating quiz:', error);
      alert('Failed to generate quiz. Please try again.');
      setQuizState('library');
    }
  };

  const handleOpenSavedQuiz = async (quizId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/quiz/library/${quizId}`);
      setQuizData(response.data.quiz.quizData);
      setActiveQuizId(quizId);
      setUserAnswers({});
      setQuizState('playing');
    } catch (error) {
      console.error('Failed to load quiz:', error);
      alert('Failed to load quiz.');
    }
  };

  const handleSubmitQuiz = async (answers, results) => {
    setUserAnswers(answers);
    setQuizResults(results);
    setQuizState('results');

    // Save results to backend
    if (activeQuizId) {
      try {
        await axios.post(`http://localhost:5000/api/quiz/library/${activeQuizId}/result`, {
          score: results.score,
          gradedQuestions: results.gradedQuestions,
        });
      } catch (e) {
        console.error('Failed to save quiz result', e);
      }
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Delete this quiz permanently?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/quiz/library/${quizId}`);
      setSavedQuizzes(prev => prev.filter(q => q.id !== quizId));
    } catch (e) {
      console.error('Failed to delete quiz', e);
    }
  };

  const handleRetry = () => {
    fetchLibrary();
    setQuizState('library');
    setQuizData(null);
    setUserAnswers({});
    setQuizResults(null);
    setActiveQuizId(null);
  };

  // ─── Score color helper ───
  const scoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 transition-colors">

      {/* ═══ LIBRARY VIEW ═══ */}
      {quizState === 'library' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold dark:text-white transition-colors">Quiz Studio</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors">Your generated quizzes & past attempts</p>
            </div>
            <button
              onClick={() => setQuizState('setup')}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all"
            >
              <Plus size={18} /> New Quiz
            </button>
          </div>

          {loadingLibrary ? (
            <div className="text-center py-16 text-slate-500 dark:text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading your quizzes...
            </div>
          ) : savedQuizzes.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors">
              <BrainCircuit className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
              <h3 className="text-lg font-semibold dark:text-white mb-1">No quizzes yet</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Generate your first quiz from your uploaded notes.</p>
              <button
                onClick={() => setQuizState('setup')}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Create First Quiz
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedQuizzes.map((q) => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 dark:text-white truncate">{q.title}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">{q.difficulty}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium">{q.simulationMode}</span>
                        <span className="text-xs text-slate-400">{q.questionCount} Qs</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteQuiz(q.id); }}
                      className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-4 text-sm">
                      {q.lastScore !== null && q.lastScore !== undefined ? (
                        <span className={`font-bold ${scoreColor(q.lastScore)}`}>
                          <Trophy size={14} className="inline mr-1" />{q.lastScore}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Not attempted</span>
                      )}
                      {q.attemptCount > 0 && (
                        <span className="text-xs text-slate-400">{q.attemptCount} attempt{q.attemptCount > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleOpenSavedQuiz(q.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      <Play size={14} fill="currentColor" /> {q.attemptCount > 0 ? 'Retake' : 'Start'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 mt-3">Created {new Date(q.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ SETUP VIEW ═══ */}
      {quizState === 'setup' && (
        <div>
          <button onClick={() => setQuizState('library')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
            ← Back to Library
          </button>
          <QuizSetup 
            documents={documents} 
            loading={loadingDocs} 
            error={fetchError}
            onGenerate={handleGenerateQuiz} 
          />
        </div>
      )}

      {/* ═══ GENERATING ═══ */}
      {quizState === 'generating' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-900 rounded-full animate-spin border-t-blue-600 dark:border-t-blue-500"></div>
            <Brain className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400" size={32} />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold dark:text-white transition-colors">Crafting Your Quiz...</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 transition-colors">Analyzing your notes and generating questions.</p>
          </div>
        </div>
      )}

      {/* ═══ PLAYING ═══ */}
      {quizState === 'playing' && quizData && (
        <QuizSession 
          quizData={quizData} 
          onSubmit={handleSubmitQuiz} 
          onCancel={() => { fetchLibrary(); setQuizState('library'); }}
        />
      )}

      {/* ═══ RESULTS ═══ */}
      {quizState === 'results' && quizResults && (
        <QuizResults 
          quizData={quizData} 
          results={quizResults} 
          answers={userAnswers} 
          onRetry={handleRetry} 
        />
      )}
    </div>
  );
};

export default QuizDashboard;
