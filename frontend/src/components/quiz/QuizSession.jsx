import { useState } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

const QuizSession = ({ quizData, onSubmit, onCancel }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const questions = quizData.questions || [];
  
  if (questions.length === 0) return <div>No questions generated.</div>;

  const currentQ = questions[currentIndex];

  const handleAnswerSelect = (val) => {
    setAnswers({ ...answers, [currentQ.id]: val });
  };

  const isLastQuestion = currentIndex === questions.length - 1;

  const handleNext = () => {
    if (!isLastQuestion) setCurrentIndex(curr => curr + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(curr => curr - 1);
  };

  const handleFinish = () => {
    // Grade the quiz
    let correctCount = 0;
    const gradedResults = questions.map(q => {
      const uA = answers[q.id];
      const isCorrect = uA && uA.toString().trim().toLowerCase() === q.correctAnswer.toString().trim().toLowerCase();
      if (isCorrect) correctCount++;
      
      // For short answers, strict matching might fail, so usually we'd mark it manually or AI grade
      // For MVP we just do strict matching or mark it 'pending review' if it's a short answer
      const actualFormatCorrect = q.type === 'short' ? 'review_needed' : isCorrect;

      return {
        ...q,
        userAnswer: uA,
        isCorrect: actualFormatCorrect
      };
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);

    onSubmit(answers, {
      score: finalScore,
      gradedQuestions: gradedResults,
      correctCount,
      totalCount: questions.length
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Header / Progress bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold dark:text-white transition-colors">{quizData.quizTitle || 'Your Quiz'}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Question {currentIndex + 1} of {questions.length}</p>
        </div>
        <button onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          Cancel Quiz
        </button>
      </div>

      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-8">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        ></div>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
        <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold text-xs rounded-full uppercase tracking-wide mb-4">
          {currentQ.type}
        </span>
        
        <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100 mb-6 leading-relaxed">
          {currentQ.text}
        </h3>

        <div className="space-y-3">
          {(currentQ.type === 'mcq' || currentQ.type === 'tf') && currentQ.options && currentQ.options.map((opt, i) => (
            <label 
              key={i}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                answers[currentQ.id] === opt 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500' 
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <input 
                type="radio" 
                name={`q-${currentQ.id}`} 
                value={opt}
                checked={answers[currentQ.id] === opt}
                onChange={() => handleAnswerSelect(opt)}
                className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <span className="text-slate-700 dark:text-slate-200 font-medium">{opt}</span>
            </label>
          ))}

          {currentQ.type === 'short' && (
            <textarea
              className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 dark:text-slate-200 transition-colors"
              placeholder="Type your answer here..."
              value={answers[currentQ.id] || ''}
              onChange={(e) => handleAnswerSelect(e.target.value)}
            />
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          <ArrowLeft size={18} /> Previous
        </button>
        
        {isLastQuestion ? (
          <button
            onClick={handleFinish}
            className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-md shadow-green-500/20 transition-colors"
          >
            Submit Quiz <CheckCircle2 size={18} />
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-colors"
          >
            Next <ArrowRight size={18} />
          </button>
        )}
      </div>

    </div>
  );
};

export default QuizSession;
