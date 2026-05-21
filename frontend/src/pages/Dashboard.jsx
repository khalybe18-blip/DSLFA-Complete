import { useState, useEffect } from 'react';
import axios from 'axios';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, TrendingUp, BookOpen,
  MoreHorizontal, X, Trophy, Sparkles, Zap,
  MessageSquare, Flame
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import JoinClassroom from '../components/classroom/JoinClassroom';
import PageHeader from '../components/layout/PageHeader';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [recentDecks, setRecentDecks] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [studentData, setStudentData] = useState({
    teachers: [], files_available: 0, completed_quizzes: 0, avg_score: 0, daily_queries: []
  });
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const fetchAll = async () => {
      try {
        const [docsRes, quizRes, deckRes, dashRes] = await Promise.all([
          axios.get(`${API_BASE}/api/documents`, { headers }).catch(() => ({ data: { documents: [] } })),
          axios.get(`${API_BASE}/api/quiz/library`, { headers }).catch(() => ({ data: { quizzes: [] } })),
          axios.get(`${API_BASE}/api/flashcards/library`, { headers }).catch(() => ({ data: { decks: [] } })),
          axios.get(`${API_BASE}/api/auth/student-dashboard`, { headers }).catch(() => ({ data: {} }))
        ]);
        setRecentNotes(docsRes.data.documents || []);
        setRecentQuizzes(quizRes.data.quizzes || []);
        setRecentDecks(deckRes.data.decks || []);
        setStudentData({
          teachers:          dashRes.data.teachers          || [],
          files_available:   dashRes.data.files_available   || 0,
          completed_quizzes: dashRes.data.completed_quizzes || 0,
          avg_score:         dashRes.data.avg_score         || 0,
          daily_queries:     dashRes.data.daily_queries      || []
        });
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      }
    };
    fetchAll();
  }, [user]);

  const totalNotes  = recentNotes.length;
  const totalDecks  = recentDecks.length;
  
  // Real dynamic streak calculations
  const activityLogs = user?.activityLogs || user?.activity_logs || [];
  
  const getLocalDateString = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculateStreak = (logs) => {
    if (!logs || logs.length === 0) return 0;
    const sorted = [...new Set(logs)].sort((a, b) => new Date(b) - new Date(a));
    let streak = 0;
    const today = new Date();
    const todayStr = getLocalDateString(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    let checkStr = sorted.includes(todayStr) ? todayStr : (sorted.includes(yesterdayStr) ? yesterdayStr : null);
    if (!checkStr) return 0;

    let checkDate = new Date(checkStr + "T00:00:00");
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] === getLocalDateString(checkDate)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        const sortedDate = new Date(sorted[i] + "T00:00:00");
        if (sortedDate < checkDate) break;
      }
    }
    return streak;
  };

  const dynamicStreakDays = calculateStreak(activityLogs);
  
  const last28Days = [...Array(28)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    return getLocalDateString(d);
  });

  // Rings offset calculations
  const outerOffset  = 264 - (264 * Math.min(studentData.files_available   / 10, 1));
  const middleOffset = 188 - (188 * Math.min(studentData.completed_quizzes / 10, 1));
  const innerOffset  = 113 - (113 * Math.min(totalDecks                    /  5, 1));

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">

      {/* ── Restored Inline compact page header ─────────────────────────── */}
      <PageHeader
        title={`${greeting}, ${user?.name?.split(' ')[0] || 'Learner'} 👋`}
        subtitle="Let's learn something new today!"
      />

      {/* ══ ROW 1 — Academic Summary Index & Quick Actions ══════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Academic Summary Index (2/3) */}
        <div className="md:col-span-2 bento-card p-6 flex flex-col justify-between min-h-[130px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-coral-orange/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Academic Summary Index</h2>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="group cursor-default hover:-translate-y-1 transition-all">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Active Classrooms</p>
                <p className="text-3xl font-black text-slate-800 dark:text-slate-100 group-hover:text-coral-orange transition-colors">{studentData.teachers.length}</p>
              </div>
              <div className="border-l border-slate-100 dark:border-border-gray pl-4 group cursor-default hover:-translate-y-1 transition-all">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">AI Tutor Sessions</p>
                <p className="text-3xl font-black text-slate-800 dark:text-slate-100 group-hover:text-coral-orange transition-colors">{studentData.daily_queries?.reduce((acc, q) => acc + (q.count || 0), 0) || 0}</p>
              </div>
              <div className="border-l border-slate-100 dark:border-border-gray pl-4 group cursor-default hover:-translate-y-1 transition-all">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Forged Quiz Accuracy</p>
                <p className="text-3xl font-black text-slate-800 dark:text-slate-100 group-hover:text-coral-orange transition-colors">{studentData.avg_score}%</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 mt-2">
              <span className="flex items-center gap-1 bg-coral-orange/10 text-coral-orange px-2 py-1 rounded-md"><Flame size={13} /> {dynamicStreakDays} day streak</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span>{totalNotes} materials</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span>{recentQuizzes.length} quizzes taken</span>
            </div>
          </div>
        </div>

        {/* Quick Actions (1/3) */}
        <div className="bento-card p-6 flex flex-col justify-between gap-3">
          <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quick Actions</h2>
          <button
            onClick={() => navigate('/tutor')}
            className="w-full flex items-center gap-3 px-4 py-3 bg-coral-orange text-white rounded-xl font-bold text-sm hover:brightness-110 hover:scale-[1.02] transition-all duration-200 shadow-sm shadow-coral-orange/30"
          >
            <MessageSquare size={17} /> Chat with AI Tutor
          </button>
          <button
            onClick={() => navigate('/quizzes')}
            className="w-full flex items-center gap-3 px-4 py-3 border border-light-border dark:border-border-gray rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-charcoal-gray/80 hover:scale-[1.02] transition-all duration-200"
          >
            <Trophy size={17} className="text-coral-orange" /> Take Quick Quiz
          </button>
        </div>

      </div>

      {/* ══ ROW 2 — Keep Learning | Activity Streak | Learn Tracking ═ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Card 1 — Keep Learning (1/3) */}
        <div className="bento-card p-6 flex flex-col justify-between relative overflow-hidden
                        bg-white dark:bg-[#111214]
                        border border-[#e2e8f0] dark:border-[#1f2023]">
          {/* ambient glows */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-coral-orange/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -top-8 -left-8 w-24 h-24 bg-coral-orange/8 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <BookOpen size={26} className="text-coral-orange mb-4" />
            <h3 className="text-lg font-black leading-snug mb-2">
              Keep Learning New Things Everyday
            </h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Join a classroom and unlock AI-powered lessons curated for your learning goals.
            </p>
          </div>

          <button
            onClick={() => setShowJoinModal(true)}
            className="relative z-10 mt-6 w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900
                       px-4 py-3 rounded-xl text-sm font-bold
                       inline-flex items-center justify-center gap-2
                       hover:opacity-90 hover:scale-[1.02] transition-all shadow-sm"
          >
            Join Classroom +
          </button>
        </div>

        {/* Card 2 — Activity Streak (1/3) */}
        <div className="bg-white dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[24px] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] p-6 rounded-[16px] flex flex-col transition-colors duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black text-sm text-[#0f172a] dark:text-[#f1f5f9] transition-colors duration-300">Activity Streak</h3>
            <Flame size={18} className="text-[#ff6b35]" />
          </div>

          <div className="flex items-end gap-1.5 mb-1 text-[#0f172a] dark:text-[#f1f5f9] transition-colors duration-300">
            <span className="text-5xl font-black">{dynamicStreakDays}</span>
            <span className="text-sm font-bold text-[#64748b] dark:text-[#94a3b8] mb-2 transition-colors duration-300">Days</span>
          </div>
          <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] font-medium mb-6 transition-colors duration-300">Consecutive study streak</p>

          {/* 4 × 7 dot matrix */}
          <div className="grid grid-cols-7 gap-2.5 w-full mt-auto justify-items-center">
            {last28Days.map((dateStr) => {
              const isActive = activityLogs.includes(dateStr);
              const dateObj = new Date(dateStr + "T00:00:00");
              const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
              
              return (
                <div key={dateStr} className="relative group cursor-pointer">
                  <div
                    className={`w-8 h-8 rounded-[6px] transition-all duration-300 ${
                      isActive
                        ? 'bg-[#ff6b35] hover:brightness-110 shadow-sm shadow-[#ff6b35]/20'
                        : 'bg-[#f1f5f9] dark:bg-[#1d2436] hover:bg-[#e2e8f0] dark:hover:bg-[#2a3449]'
                    }`}
                  />
                  
                  {/* Floating Tooltip Capsule */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-[#0f172a] dark:bg-white text-white dark:text-[#0f172a] text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 shadow-lg transform group-hover:-translate-y-1">
                    {formattedDate}: <span className="font-medium opacity-90">{isActive ? "Active Study Session" : "No Activity recorded"}</span>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0f172a] dark:border-t-white" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3 — Learn Tracking / Rings (1/3) */}
        <div className="bento-card p-6
                        bg-white dark:bg-[#111214]
                        border border-[#e2e8f0] dark:border-[#1f2023]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black text-sm">Learn Tracking</h3>
            <MoreHorizontal size={14} className="text-slate-400" />
          </div>

          {/* Concentric rings */}
          <div className="flex justify-center items-center py-4">
            <div className="relative flex justify-center items-center w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" className="stroke-slate-100 dark:stroke-[#1f2023]" strokeWidth="7" />
                <circle cx="50" cy="50" r="42" fill="none" className="stroke-coral-orange transition-all duration-1000" strokeWidth="7" strokeDasharray="264" strokeDashoffset={outerOffset} strokeLinecap="round" />
                <circle cx="50" cy="50" r="30" fill="none" className="stroke-slate-100 dark:stroke-[#1f2023]" strokeWidth="7" />
                <circle cx="50" cy="50" r="30" fill="none" className="stroke-yellow-400 transition-all duration-1000" strokeWidth="7" strokeDasharray="188" strokeDashoffset={middleOffset} strokeLinecap="round" />
                <circle cx="50" cy="50" r="18" fill="none" className="stroke-slate-100 dark:stroke-[#1f2023]" strokeWidth="7" />
                <circle cx="50" cy="50" r="18" fill="none" className="stroke-pink-500 transition-all duration-1000" strokeWidth="7" strokeDasharray="113" strokeDashoffset={innerOffset} strokeLinecap="round" />
              </svg>
              <div className="absolute text-center">
                <p className="text-xl font-black">{studentData.avg_score}%</p>
                <p className="text-[9px] font-bold text-slate-400">Overall</p>
              </div>
            </div>
          </div>

          {/* 3-chip legend */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { color: 'bg-coral-orange', label: 'Materials', val: studentData.files_available },
              { color: 'bg-yellow-400',   label: 'Quizzes',   val: studentData.completed_quizzes },
              { color: 'bg-pink-500',     label: 'Decks',     val: totalDecks },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 dark:bg-obsidian-black/60 border border-[#e2e8f0] dark:border-[#1f2023]">
                <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <p className="text-sm font-black">{item.val}</p>
                <p className="text-[9px] font-bold text-slate-500 text-center">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Avg score sub-row */}
          <div className="mt-4 pt-4 border-t border-[#e2e8f0] dark:border-[#1f2023] flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Avg Quiz Score</p>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">
              <TrendingUp size={12} /> {studentData.avg_score}%
            </div>
          </div>
        </div>

      </div>

      {/* ══ ROW 3 — Your Teachers (full-width) ═══════════════════════ */}
      <div className="bento-card p-6
                      bg-white dark:bg-[#111214]
                      border border-[#e2e8f0] dark:border-[#1f2023]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-base">Your Teachers</h3>
          <NavLink
            to="/classrooms"
            className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-[#1f2023] px-3 py-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            View all classrooms
          </NavLink>
        </div>

        {studentData.teachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Sparkles size={32} className="text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-bold text-slate-500">Not enrolled in any classes yet.</p>
            <button
              onClick={() => setShowJoinModal(true)}
              className="mt-4 text-xs font-bold text-coral-orange border border-coral-orange/40 px-4 py-2 rounded-xl hover:bg-coral-orange hover:text-white transition-all"
            >
              Join a Classroom
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {studentData.teachers.map((teacher, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-[#e2e8f0] dark:border-[#1f2023] hover:bg-slate-50 dark:hover:bg-[#1f2023]/40 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-coral-orange/20 to-coral-orange/5 border border-coral-orange/20 flex items-center justify-center text-coral-orange text-xs font-black shrink-0">
                  {teacher.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold truncate">{teacher.name}</h4>
                  <p className="text-[10px] text-slate-500 capitalize font-medium">{teacher.role || 'Facilitator'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Join Classroom Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowJoinModal(false)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-coral-orange transition-colors"
            >
              <X size={24} />
            </button>
            <JoinClassroom onSuccess={() => {
              setShowJoinModal(false);
              window.location.reload();
            }} />
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
