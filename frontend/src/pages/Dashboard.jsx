import { useState, useEffect } from 'react';
import axios from 'axios';
import { NavLink } from 'react-router-dom';
import { BrainCircuit, BookOpen, FileText, Calendar, Flame, ArrowRight, Quote, Bell } from 'lucide-react';

const MOTIVATIONAL_QUOTES = [
  "The secret of getting ahead is getting started. – Mark Twain",
  "It always seems impossible until it's done. – Nelson Mandela",
  "Don't let what you cannot do interfere with what you can do. – John Wooden",
  "Strive for progress, not perfection. – Unknown",
  "Success is the sum of small efforts, repeated day in and day out. – Robert Collier",
  "The future belongs to those who believe in the beauty of their dreams. – Eleanor Roosevelt",
  "Education is the most powerful weapon which you can use to change the world. – Nelson Mandela",
  "There are no shortcuts to any place worth going. – Beverly Sills",
  "Focus on your goal. Don't look in any direction but ahead. – Unknown",
  "You don't have to be great to start, but you have to start to be great. – Zig Ziglar",
  "The expert in anything was once a beginner. – Helen Hayes",
  "A little progress each day adds up to big results. – Unknown",
  "Believe you can and you're halfway there. – Theodore Roosevelt",
  "What you do today can improve all your tomorrows. – Ralph Marston",
  "Your limitation—it's only your imagination."
];

const Dashboard = () => {
  const [greeting, setGreeting] = useState('');
  const [quote, setQuote] = useState('');
  const [prompt, setPrompt] = useState('');
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [recentDecks, setRecentDecks] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Generate timeline for streak representation
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIndex = (new Date().getDay() + 6) % 7; // Monday is 0

  useEffect(() => {
    // 1. Time-based Greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning, Aharnish!');
    else if (hour < 18) setGreeting('Good afternoon, Aharnish!');
    else setGreeting('Good evening, Aharnish!');

    // Alternate prompts
    setPrompt(Math.random() > 0.5 ? "What shall we study today?" : "What do you wanna explore today?");

    // 2. Quote that changes every hour (seeded by current hour number to be stable for the whole hour)
    const hourSeed = Math.floor(Date.now() / (1000 * 60 * 60));
    setQuote(MOTIVATIONAL_QUOTES[hourSeed % MOTIVATIONAL_QUOTES.length]);

    // 3. Fetch Library Data & Reminders
    const fetchRecentActivity = async () => {
      try {
        const [docsRes, quizRes, deckRes, remRes] = await Promise.all([
          axios.get('http://localhost:5000/api/documents').catch(() => ({ data: { documents: [] } })),
          axios.get('http://localhost:5000/api/quiz/library').catch(() => ({ data: { quizzes: [] } })),
          axios.get('http://localhost:5000/api/flashcards/library').catch(() => ({ data: { decks: [] } })),
          axios.get('http://localhost:5000/api/reminders').catch(() => ({ data: { reminders: [] } }))
        ]);

        // Just grab top 3 for dashboard
        setRecentNotes(docsRes.data.documents.slice(0, 3));
        setRecentQuizzes(quizRes.data.quizzes.slice(0, 3));
        setRecentDecks(deckRes.data.decks.slice(0, 3));
        
        // Filter upcoming reminders
        const now = new Date();
        const upcoming = remRes.data.reminders.filter(r => new Date(r.date) >= now);
        setUpcomingReminders(upcoming.slice(0, 2)); // Top 2
      } catch (e) {
        console.error("Error fetching library for dashboard:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentActivity();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 transition-colors">
      
      {/* 1. Hero Section & Greeting */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2 relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 p-8 sm:p-10 text-white shadow-xl flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 drop-shadow-md">{greeting}</h1>
            <p className="text-blue-100 text-lg md:text-xl font-medium mb-8">{prompt}</p>
          </div>

          <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 flex gap-4 items-start shadow-lg">
            <Quote className="text-blue-200 shrink-0 mt-1" size={24} />
            <p className="font-medium text-blue-50 leading-relaxed italic pr-2">
              "{quote.split(' – ')[0]}" <br/><span className="text-sm text-blue-200 mt-2 block not-italic">— {quote.split(' – ')[1] || 'Aharnish'}</span>
            </p>
          </div>
        </div>

        {/* 2. Right Sidebar Context (Reminders & Streak) */}
        <div className="col-span-1 space-y-6">
          
          {/* Consistency Streak & Calendar */}
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-8 flex flex-col items-center justify-center transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <div className="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 p-2 rounded-xl">
                <Flame size={24} fill="currentColor" />
              </div>
            </div>
            
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-2">Current Streak</h3>
            <div className="text-6xl font-black text-slate-800 dark:text-white mb-2 tracking-tighter">
              5<span className="text-2xl text-slate-400 dark:text-slate-500 font-medium tracking-normal ml-1">days</span>
            </div>
            <p className="text-sm font-medium text-emerald-500 dark:text-emerald-400 mb-8">You're on fire! Keep it up!</p>

            <div className="w-full flex justify-between px-2">
              {days.map((day, idx) => {
                const isPast = idx < todayIndex;
                const isToday = idx === todayIndex;
                return (
                  <div key={day} className="flex flex-col items-center gap-2">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isPast || isToday 
                        ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-md shadow-orange-500/30' 
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                      } ${(isToday) ? 'ring-4 ring-orange-500/20' : ''}`}
                    >
                      {(isPast || isToday) ? '✓' : ''}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                      {day}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Upcoming Reminders Mini-widget */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Bell className="text-red-500" size={18} /> Next Up
              </h3>
              <NavLink to="/reminders" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View All</NavLink>
            </div>
            
            {loading ? (
              <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div></div></div>
            ) : upcomingReminders.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming exams. You're all clear!</p>
            ) : (
              <div className="space-y-3">
                {upcomingReminders.map(r => {
                  const d = new Date(r.date);
                  return (
                    <div key={r.id} className="flex gap-3 items-start">
                      <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex flex-col justify-center items-center shrink-0">
                        <span className="text-[10px] uppercase font-bold leading-none">{d.toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-sm font-black leading-none">{d.getDate()}</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{r.title}</h4>
                        <p className="text-[10px] text-slate-500">{d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 3. Recent Activity Library */}
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3 pt-6">
        <Calendar className="text-blue-500" /> Recent Activity
      </h2>
      
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Recent Quizzes */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                <BrainCircuit className="text-blue-500" size={20} /> Quizzes
              </h3>
              <NavLink to="/quizzes" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                See all <ArrowRight size={12} />
              </NavLink>
            </div>
            <div className="flex-1 space-y-3">
              {recentQuizzes.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No quizzes attended yet.</p>
              ) : recentQuizzes.map(q => (
                <NavLink to="/quizzes" key={q.id} className="block p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">{q.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">{q.difficulty}</span>
                    <span className="text-[10px] text-slate-400">• {q.lastScore !== null ? `${q.lastScore}% Score` : 'Unattempted'}</span>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Recent Flashcards */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                <BookOpen className="text-violet-500" size={20} /> Flashcards
              </h3>
              <NavLink to="/flashcards" className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1">
                See all <ArrowRight size={12} />
              </NavLink>
            </div>
            <div className="flex-1 space-y-3">
              {recentDecks.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No flashcards viewed yet.</p>
              ) : recentDecks.map(d => (
                <NavLink to="/flashcards" key={d.id} className="block p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400">{d.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/50">{d.cardCount} cards</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{d.masteredCount} mastered</span>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Recent Uploads */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                <FileText className="text-emerald-500" size={20} /> Raw Notes
              </h3>
              <NavLink to="/notes" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                See all <ArrowRight size={12} />
              </NavLink>
            </div>
            <div className="flex-1 space-y-3">
              {recentNotes.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No study materials uploaded.</p>
              ) : recentNotes.map(n => (
                <NavLink to="/notes" key={n.id} className="block p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{n.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{n.file_type} Document</p>
                </NavLink>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default Dashboard;
