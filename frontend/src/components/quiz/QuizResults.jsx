import { Award, RotateCcw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const QuizResults = ({ quizData, results, onRetry }) => {
  const { score, gradedQuestions, correctCount, totalCount } = results;

  // Determine message based on score
  let message = "Good effort!";
  let color = "text-amber-500";
  if (score >= 80) {
    message = "Excellent Job!";
    color = "text-emerald-500";
  } else if (score < 50) {
    message = "Needs review, keep practicing.";
    color = "text-red-500";
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Score Header Card */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm text-center transition-colors">
        <Award className={`w-16 h-16 mx-auto mb-4 ${color}`} />
        <h1 className="text-3xl font-bold dark:text-white mb-2 transition-colors">{message}</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
          You completed the <span className="font-semibold text-slate-700 dark:text-slate-200">{quizData.quizTitle}</span>.
        </p>
        
        <div className="flex justify-center items-center gap-8 mb-8">
          <div className="text-center">
            <p className="text-5xl font-black text-slate-800 dark:text-white mb-1">{score}%</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Final Score</p>
          </div>
          <div className="w-px h-16 bg-slate-200 dark:bg-slate-700"></div>
          <div className="text-center">
            <p className="text-5xl font-black text-slate-800 dark:text-white mb-1">{correctCount}<span className="text-2xl text-slate-300 dark:text-slate-600">/{totalCount}</span></p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Correct</p>
          </div>
        </div>

        <button 
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all"
        >
          <RotateCcw size={18} /> Make Another Quiz
        </button>
      </div>

      {/* Breakdown Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold dark:text-white mb-6">Detailed Review</h2>
        
        {gradedQuestions.map((q, i) => (
          <div key={q.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm transition-colors">
            <div className="flex items-start gap-4 mb-4">
              <div className="mt-1">
                {q.isCorrect === true && <CheckCircle className="text-emerald-500" size={24} />}
                {q.isCorrect === false && <XCircle className="text-red-500" size={24} />}
                {q.isCorrect === 'review_needed' && <AlertTriangle className="text-amber-500" size={24} />}
              </div>
              
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Question {i + 1}</span>
                <p className="text-lg font-medium text-slate-800 dark:text-slate-200">{q.text}</p>
                
                <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 mb-1">Your Answer:</p>
                      <p className={`font-medium ${
                        q.isCorrect === true ? 'text-emerald-600 dark:text-emerald-400' 
                        : q.isCorrect === false ? 'text-red-600 dark:text-red-400' 
                        : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {q.userAnswer || <span className="italic text-slate-400">Skipped</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 mb-1">Correct Answer:</p>
                      <p className="font-medium text-emerald-600 dark:text-emerald-400">
                        {q.correctAnswer}
                      </p>
                    </div>
                  </div>
                </div>

                {q.explanation && (
                  <div className="mt-4 text-sm text-slate-600 dark:text-slate-400 bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <span className="font-semibold text-blue-700 dark:text-blue-400">Explanation: </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
};

export default QuizResults;
