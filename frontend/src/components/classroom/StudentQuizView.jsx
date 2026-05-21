/**
 * StudentQuizView — read-only quiz list and detail for enrolled students.
 * Correct answers are omitted server-side for the student role.
 */
import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, ChevronDown, ChevronUp, Loader2, BookOpen } from 'lucide-react';
import { useClassrooms } from '../../hooks/useClassrooms';

export default function StudentQuizView({ classId }) {
  const { getQuizzes, getQuiz } = useClassrooms();
  const [quizzes, setQuizzes] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      setQuizzes(await getQuizzes(classId));
    } catch {
      setQuizzes([]);
    } finally {
      setLoadingList(false);
    }
  }, [classId, getQuizzes]);

  useEffect(() => {
    if (classId) loadList();
  }, [classId, loadList]);

  const toggleExpand = async (quizId) => {
    if (expandedId === quizId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(quizId);
    setLoadingDetail(true);
    setDetail(null);
    try {
      const q = await getQuiz(classId, quizId);
      setDetail(q);
    } catch {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  if (loadingList) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-indigo-500" size={28} />
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center text-slate-500">
        <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No quizzes posted yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/40">
          <ClipboardList className="text-violet-600 dark:text-violet-400" size={20} />
        </div>
        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Class Quizzes</h3>
      </div>

      <div className="space-y-3">
        {quizzes.map((q) => (
          <div key={q.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40 transition"
              onClick={() => toggleExpand(q.id)}
            >
              <div>
                <p className="font-semibold text-sm text-slate-800 dark:text-white">{q.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{q.question_count} questions</p>
              </div>
              {expandedId === q.id ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
            </button>

            {expandedId === q.id && (
              <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3 space-y-4">
                {loadingDetail && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="animate-spin text-indigo-500" size={22} />
                  </div>
                )}
                {!loadingDetail && detail && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Answers are not shown here. Complete the quiz on paper or as directed by your instructor.
                    </p>
                    {(detail.questions || []).map((question, idx) => (
                      <div key={question.id ?? idx} className="rounded-lg border border-slate-100 dark:border-slate-700 p-3 bg-slate-50/80 dark:bg-slate-900/40">
                        <p className="text-xs font-bold text-slate-400 mb-1">Q{idx + 1}</p>
                        <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{question.text}</p>
                        {question.question_type === 'mcq' && question.options?.length > 0 && (
                          <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                            {question.options.map((opt, oi) => (
                              <li key={oi}><span className="font-mono font-bold mr-1">{String.fromCharCode(65 + oi)}.</span>{opt}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
