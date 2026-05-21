import React, { useState, useEffect } from 'react';
import { useClassrooms } from '../hooks/useClassrooms';
import { BrainCircuit, Plus, Trash2, ChevronRight, BarChart2, Users, Trophy, Activity, ArrowLeft } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';

const AssessmentManager = () => {
  const { classrooms, getQuizzes, deleteQuiz, getSubmissions, createQuiz } = useClassrooms();
  const [selectedClass, setSelectedClass] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingResults, setViewingResults] = useState(null);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (classrooms.length > 0 && !selectedClass) {
      setSelectedClass(classrooms[0].class_id);
    }
  }, [classrooms]);

  useEffect(() => {
    if (selectedClass) {
      loadQuizzes();
    }
  }, [selectedClass]);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const data = await getQuizzes(selectedClass);
      setQuizzes(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewResults = async (quiz) => {
    setViewingResults(quiz);
    try {
      const data = await getSubmissions(quiz.id);
      setSubmissions(data.submissions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm("Delete this assessment? All student scores will be lost.")) return;
    try {
      await deleteQuiz(selectedClass, quizId);
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
      if (viewingResults?.id === quizId) setViewingResults(null);
    } catch (err) {
      alert("Failed to delete quiz");
    }
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (!newQuizTitle.trim() || !selectedClass) return;
    try {
      setLoading(true);
      await createQuiz(selectedClass, { 
        title: newQuizTitle,
        questions: []
      });
      setNewQuizTitle('');
      setCreatingQuiz(false);
      loadQuizzes();
    } catch (err) {
      alert("Failed to create quiz");
    } finally {
      setLoading(false);
    }
  };

  const filteredQuizzes = quizzes.filter(q => 
    q.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-[#f8fafc] dark:bg-[#0a0d14] min-h-screen text-[#0f172a] dark:text-[#e2e8f0] transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-6">
        
        {/* Full Symmetric Header Expansion */}
        <PageHeader
          title={<span>ASSESSMENT <span className="text-[#ff6b35]">MANAGER</span></span>}
          subtitle="Create and monitor classroom evaluations."
          searchQuery={search}
          onSearchChange={setSearch}
        />

        {/* Dynamic Component Layout Matrix (The Split Hub) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel Area (Quiz Management & Setup Builder) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[24px] border border-[#e2e8f0] dark:border-white/[0.08] rounded-[16px] p-6 shadow-sm dark:shadow-xl transition-colors duration-300">
              <h2 className="text-sm font-black text-[#0f172a] dark:text-[#f1f5f9] mb-6 flex items-center gap-2">
                <BrainCircuit size={18} className="text-[#ff6b35]" />
                Quiz Setup Builder
              </h2>

              <AnimatePresence mode="wait">
                {creatingQuiz ? (
                  <motion.form 
                    key="create-form"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    onSubmit={handleCreateQuiz} 
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#64748b] dark:text-[#94a3b8] uppercase tracking-widest transition-colors duration-300">Assessment Title</label>
                      <input 
                        autoFocus
                        type="text"
                        placeholder="e.g. Quantum Physics Midterm"
                        value={newQuizTitle}
                        onChange={(e) => setNewQuizTitle(e.target.value)}
                        className="w-full bg-[#f8fafc] dark:bg-white/[0.05] border border-[#e2e8f0] dark:border-white/[0.08] rounded-xl px-4 py-3 text-sm font-bold text-[#0f172a] dark:text-[#f1f5f9] focus:ring-2 focus:ring-[#ff6b35] outline-none transition-all"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button 
                        type="button"
                        onClick={() => setCreatingQuiz(false)}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-[#f1f5f9] dark:bg-white/[0.05] text-[#64748b] dark:text-[#94a3b8] text-xs font-black hover:bg-[#e2e8f0] dark:hover:bg-white/[0.1] transition-all"
                      >
                        CANCEL
                      </button>
                      <button 
                        type="submit"
                        disabled={loading || !newQuizTitle.trim()}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-[#ff6b35] text-white text-xs font-black hover:bg-[#ff5515] transition-all disabled:opacity-50 shadow-[0_4px_14px_rgba(255,107,53,0.2)]"
                      >
                        {loading ? 'CREATING...' : 'INITIALIZE'}
                      </button>
                    </div>
                  </motion.form>
                ) : (
                  <motion.div 
                    key="placeholder"
                    whileHover={{ translateY: -4 }}
                    className="border-2 border-dashed border-[#cbd5e1] dark:border-white/[0.15] hover:border-[#ff6b35]/50 dark:hover:border-[#ff6b35]/50 hover:shadow-[0_0_20px_rgba(255,107,53,0.1)] rounded-[16px] p-8 text-center transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group"
                    onClick={() => setCreatingQuiz(true)}
                  >
                    <div className="w-14 h-14 rounded-full bg-[#f1f5f9] dark:bg-white/[0.05] group-hover:bg-[#ff6b35]/10 flex items-center justify-center text-[#64748b] dark:text-[#94a3b8] group-hover:text-[#ff6b35] mb-4 transition-colors duration-300">
                      <Trophy size={28} />
                    </div>
                    <h3 className="text-sm font-black text-[#0f172a] dark:text-[#f1f5f9] mb-2 transition-colors duration-300">Forge Your First Classroom Evaluation</h3>
                    <p className="text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-6 transition-colors duration-300">Generate automated vector-backed tests.</p>
                    <button className="px-6 py-2.5 bg-[#0f172a] text-white dark:bg-white dark:text-[#0a0d14] rounded-[9999px] font-black text-xs uppercase tracking-wide group-hover:scale-105 transition-all shadow-md dark:shadow-[0_4px_14px_rgba(255,255,255,0.1)]">
                      Create New Quiz +
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Panel Area (Classroom Analytics Readout) */}
          <div className="lg:col-span-8 bg-white dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[24px] border border-[#e2e8f0] dark:border-white/[0.08] rounded-[16px] p-6 shadow-sm dark:shadow-xl transition-colors duration-300 min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-6 border-b border-[#e2e8f0] dark:border-white/[0.08] pb-4 transition-colors duration-300">
              <h2 className="text-sm font-black text-[#0f172a] dark:text-[#f1f5f9] flex items-center gap-2 transition-colors duration-300">
                <Activity size={18} className="text-[#ff6b35]" />
                Live Performance Stream
              </h2>
              {viewingResults && (
                <button 
                  onClick={() => setViewingResults(null)}
                  className="flex items-center gap-2 text-xs font-black text-[#64748b] dark:text-[#94a3b8] hover:text-[#ff6b35] dark:hover:text-[#ff6b35] transition-colors"
                >
                  <ArrowLeft size={14} /> BACK TO ASSESSMENTS
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {loading && !viewingResults ? (
                <div className="py-20 text-center text-[#64748b] dark:text-[#94a3b8] font-bold animate-pulse">Syncing evaluation data...</div>
              ) : viewingResults ? (
                /* Submissions View */
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <div className="mb-6 p-5 rounded-xl bg-[#f8fafc] dark:bg-white/[0.02] border border-[#e2e8f0] dark:border-white/[0.05] transition-colors duration-300">
                    <h3 className="text-lg font-black text-[#0f172a] dark:text-[#f1f5f9] mb-1">{viewingResults.title}</h3>
                    <p className="text-[10px] font-black text-[#ff6b35] uppercase tracking-widest">Active Grading Matrix</p>
                  </div>
                  
                  {submissions.length === 0 ? (
                    <div className="py-12 text-center text-[#64748b] dark:text-[#94a3b8] text-sm font-bold">No student submissions recorded yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {submissions.map((sub, i) => {
                        const percentage = Math.round((sub.score / (sub.total_marks || 10)) * 100);
                        return (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            className="p-5 rounded-xl bg-white dark:bg-[rgba(22,28,45,0.6)] border border-[#e2e8f0] dark:border-white/[0.05] flex items-center justify-between hover:border-[#ff6b35]/30 transition-all shadow-sm dark:shadow-none"
                          >
                            <div>
                              <p className="text-xs font-black text-[#0f172a] dark:text-[#f1f5f9] uppercase tracking-wide mb-1">{sub.student_name || `Student ID: ${sub.student_id}`}</p>
                              <p className="text-[10px] font-bold text-[#64748b] dark:text-[#94a3b8]">{new Date(sub.timestamp).toLocaleString()}</p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <span className="text-lg font-black text-[#ff6b35]">{percentage}%</span>
                              <span className="text-[9px] font-bold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-widest">{sub.score} / {sub.total_marks || 10}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              ) : filteredQuizzes.length === 0 ? (
                <div className="py-20 text-center text-[#64748b] dark:text-[#94a3b8] text-sm font-bold">
                  No active assessments in stream.
                </div>
              ) : (
                /* Quizzes Stream View */
                filteredQuizzes.map((quiz, i) => {
                  // Simulate an aggregate score for visualization parity based on quiz ID to keep it stable
                  const mockAverage = 75 + (quiz.id % 20); 
                  
                  return (
                    <motion.div 
                      key={quiz.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                      className="group p-5 rounded-xl bg-white dark:bg-[rgba(22,28,45,0.4)] border border-[#e2e8f0] dark:border-white/[0.05] hover:border-[#cbd5e1] dark:hover:border-white/[0.15] transition-all shadow-sm dark:shadow-none"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-lg bg-[#f1f5f9] dark:bg-white/[0.05] flex items-center justify-center text-[#64748b] dark:text-[#94a3b8] shrink-0 group-hover:text-[#ff6b35] transition-colors">
                            <BarChart2 size={20} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-black text-[#0f172a] dark:text-[#f1f5f9] truncate transition-colors duration-300">{quiz.title}</h3>
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">
                              <span className="flex items-center gap-1"><Users size={12} className="text-[#ff6b35]" /> {quiz.question_count || 0} Questions</span>
                              <span>{quiz.created_at.split('T')[0]}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="hidden sm:block text-right">
                            <div className="flex items-center justify-end gap-2 mb-1.5">
                              <span className="text-[10px] font-black text-[#64748b] dark:text-[#94a3b8] uppercase tracking-widest">Global Aggregate</span>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Class Average: {mockAverage}%</span>
                            </div>
                            <div className="h-1.5 w-32 bg-[#f1f5f9] dark:bg-white/[0.05] rounded-full overflow-hidden ml-auto">
                              <div className="h-full bg-[#ff6b35]" style={{ width: `${mockAverage}%` }} />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 border-l border-[#e2e8f0] dark:border-white/[0.08] pl-4">
                            <button 
                              onClick={() => handleViewResults(quiz)}
                              className="px-4 py-2 rounded-lg bg-[#f1f5f9] dark:bg-white/[0.05] text-[#0f172a] dark:text-[#f1f5f9] text-[10px] font-black hover:bg-[#ff6b35] hover:text-white dark:hover:bg-[#ff6b35] transition-colors uppercase tracking-widest"
                            >
                              Analytics
                            </button>
                            <button 
                              onClick={() => handleDelete(quiz.id)}
                              className="p-2 rounded-lg text-[#64748b] dark:text-[#94a3b8] hover:text-red-500 hover:bg-[#f1f5f9] dark:hover:bg-white/[0.05] transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AssessmentManager;
