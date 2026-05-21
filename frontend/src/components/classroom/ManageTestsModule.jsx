/**
 * ManageTestsModule — teacher-only quiz builder for a classroom.
 *
 * Features:
 *  - Lists existing classroom quizzes
 *  - "Create Quiz" form with dynamic question add/delete
 *  - State-synced to Quizzes schema (title, bloom_distribution, questions[])
 *  - DELETE cascade is handled server-side; UI removes from list on success
 */
import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Plus, Trash2, ChevronDown, ChevronUp,
  Save, Loader2, BookOpen, AlertCircle, X
} from 'lucide-react';
import { useClassrooms } from '../../hooks/useClassrooms';

const BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
const BLOOM_COLORS = {
  remember:  'bg-gray-200 text-gray-700',
  understand:'bg-blue-200 text-blue-700',
  apply:     'bg-green-200 text-green-700',
  analyze:   'bg-yellow-200 text-yellow-700',
  evaluate:  'bg-orange-200 text-orange-700',
  create:    'bg-purple-200 text-purple-700',
};

const EMPTY_QUESTION = () => ({
  text: '', question_type: 'mcq', options: ['', '', '', ''],
  correct_answer: '', bloom_level: 'remember', marks: 1,
});

export default function ManageTestsModule({ classId }) {
  const { createQuiz, getQuizzes, deleteQuiz } = useClassrooms();

  const [quizzes, setQuizzes]     = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [expandedQuiz, setExpandedQuiz] = useState(null);

  // Form state
  const [title, setTitle]       = useState('');
  const [questions, setQuestions] = useState([EMPTY_QUESTION()]);

  const loadQuizzes = useCallback(async () => {
    setLoadingList(true);
    try { setQuizzes(await getQuizzes(classId)); }
    catch { setQuizzes([]); }
    finally { setLoadingList(false); }
  }, [classId]);

  useEffect(() => { if (classId) loadQuizzes(); }, [classId, loadQuizzes]);

  // ── Question helpers ──────────────────────────────────────────────────────

  const addQuestion = () => setQuestions(qs => [...qs, EMPTY_QUESTION()]);

  const removeQuestion = (idx) =>
    setQuestions(qs => qs.filter((_, i) => i !== idx));

  const updateQuestion = (idx, field, value) =>
    setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, [field]: value } : q));

  const updateOption = (qIdx, optIdx, value) =>
    setQuestions(qs => qs.map((q, i) =>
      i === qIdx ? { ...q, options: q.options.map((o, j) => j === optIdx ? value : o) } : q
    ));

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Quiz title is required'); return; }
    if (questions.some(q => !q.text.trim())) {
      setError('All questions must have text'); return;
    }
    setSaving(true); setError('');
    try {
      const bloomDist = BLOOM_LEVELS.reduce((acc, lvl) => {
        acc[lvl] = questions.filter(q => q.bloom_level === lvl).length;
        return acc;
      }, {});

      const quiz = await createQuiz(classId, {
        title: title.trim(),
        bloom_distribution: bloomDist,
        questions: questions.map(q => ({
          text: q.text,
          question_type: q.question_type,
          options: q.question_type === 'mcq' ? q.options.filter(Boolean) : null,
          correct_answer: q.correct_answer,
          bloom_level: q.bloom_level,
          marks: q.marks,
        })),
      });

      setQuizzes(prev => [quiz, ...prev]);
      setShowForm(false);
      setTitle(''); setQuestions([EMPTY_QUESTION()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm('Delete this quiz? All questions will be permanently removed.')) return;
    try {
      await deleteQuiz(classId, quizId);
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
    } catch {
      alert('Failed to delete quiz');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40">
            <ClipboardList className="text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">Manage Tests</h3>
        </div>
        <button
          id="new-quiz-btn"
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? 'Cancel' : 'New Quiz'}
        </button>
      </div>

      {/* Quiz creation form */}
      {showForm && (
        <form onSubmit={handleSave} className="space-y-5 border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Quiz Title <span className="text-red-500">*</span>
            </label>
            <input
              id="quiz-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Chapter 3 — Thermodynamics MCQ"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Questions ({questions.length})
            </p>

            {questions.map((q, idx) => (
              <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 bg-white dark:bg-slate-800 relative">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <textarea
                    id={`q-text-${idx}`}
                    rows={2}
                    value={q.text}
                    onChange={e => updateQuestion(idx, 'text', e.target.value)}
                    placeholder="Enter question text…"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition"
                  />
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(idx)}
                      className="shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      title="Remove question">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pl-9">
                  {/* Type */}
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 mb-1 block">Type</label>
                    <select
                      value={q.question_type}
                      onChange={e => updateQuestion(idx, 'question_type', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="mcq">MCQ</option>
                      <option value="truefalse">True/False</option>
                      <option value="short">Short Answer</option>
                      <option value="long">Long Answer</option>
                    </select>
                  </div>
                  {/* Bloom Level */}
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 mb-1 block">Bloom's Level</label>
                    <select
                      value={q.bloom_level}
                      onChange={e => updateQuestion(idx, 'bloom_level', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                    >
                      {BLOOM_LEVELS.map(l => <option key={l} value={l} className="capitalize">{l}</option>)}
                    </select>
                  </div>
                  {/* Marks */}
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 mb-1 block">Marks</label>
                    <input
                      type="number" min="1" max="100"
                      value={q.marks}
                      onChange={e => updateQuestion(idx, 'marks', Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* Correct Answer (non-MCQ) */}
                  {q.question_type !== 'mcq' && (
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 mb-1 block">Answer / Key</label>
                      <input
                        value={q.correct_answer}
                        onChange={e => updateQuestion(idx, 'correct_answer', e.target.value)}
                        placeholder="Model answer…"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* MCQ options */}
                {q.question_type === 'mcq' && (
                  <div className="pl-9 grid grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 w-4">{String.fromCharCode(65 + oi)}.</span>
                        <input
                          value={opt}
                          onChange={e => updateOption(idx, oi, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                          className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                    <div className="col-span-2">
                      <label className="text-[11px] font-medium text-slate-500 mb-1 block">Correct Answer</label>
                      <select
                        value={q.correct_answer}
                        onChange={e => updateQuestion(idx, 'correct_answer', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select correct option…</option>
                        {q.options.map((opt, oi) => opt && (
                          <option key={oi} value={opt}>{String.fromCharCode(65 + oi)}. {opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button type="button" onClick={addQuestion}
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
              <Plus size={15} /> Add Question
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-500 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              <AlertCircle size={15} /> {error}
            </p>
          )}

          <button
            type="submit" id="save-quiz-btn" disabled={saving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-all"
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Save size={16} /> Save Quiz</>}
          </button>
        </form>
      )}

      {/* Quiz list */}
      {loadingList ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <BookOpen size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No quizzes yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 transition"
                onClick={() => setExpandedQuiz(expandedQuiz === quiz.id ? null : quiz.id)}
              >
                <div className="flex items-center gap-3">
                  <ClipboardList size={18} className="text-blue-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-slate-800 dark:text-white">{quiz.title}</p>
                    <p className="text-xs text-slate-500">{quiz.question_count} questions</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(quiz.id); }}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    title="Delete quiz"
                  >
                    <Trash2 size={15} />
                  </button>
                  {expandedQuiz === quiz.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </div>

              {expandedQuiz === quiz.id && quiz.bloom_distribution && (
                <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Bloom's Distribution</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(quiz.bloom_distribution)
                      .filter(([, count]) => count > 0)
                      .map(([level, count]) => (
                        <span key={level} className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${BLOOM_COLORS[level] || 'bg-slate-100 text-slate-600'}`}>
                          {level}: {count}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
