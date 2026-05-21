import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Users, BookOpen, Layers, Award, 
  ChevronLeft, ChevronRight, 
  MoreVertical, X, Plus, UploadCloud, Calendar as CalendarIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useClassrooms } from '../hooks/useClassrooms';
import PageHeader from '../components/layout/PageHeader';

const TeacherAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { classrooms, fetchClassrooms } = useClassrooms();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeClassId, setActiveClassId] = useState('all');
  
  const [showCoursesModal, setShowCoursesModal] = useState(false);
  const [hoveredDate, setHoveredDate] = useState(null);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  useEffect(() => {
    loadDashboard();
  }, [activeClassId]);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/teacher/dashboard?class_id=${activeClassId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  // Calendar Engine
  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const calendarDays = Array(firstDayOfMonth).fill(null).concat([...Array(daysInMonth)].map((_, i) => i + 1));

  // Map events to dates
  const eventsByDate = {};
  if (data?.upcoming_events) {
    data.upcoming_events.forEach(evt => {
      const d = new Date(evt.date);
      if (d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
        if (!eventsByDate[d.getDate()]) eventsByDate[d.getDate()] = [];
        eventsByDate[d.getDate()].push(evt);
      }
    });
  }

  // Chart Engine
  const chartDays = [...Array(10)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (9 - i));
    return d;
  });
  const engagementMap = {};
  data?.daily_engagement?.forEach(e => { engagementMap[e.day] = e.students; });
  const engagementVals = chartDays.map(d => engagementMap[d.toISOString().split('T')[0]] || 0);
  const maxEngagement = Math.max(...engagementVals, 10);

  if (loading && !data) {
    return (
      <div className="py-20 flex justify-center min-h-screen items-center">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in">
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-bold flex items-center justify-between">
          {error || "Failed to load"}
          <button onClick={loadDashboard} className="underline hover:text-red-400">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] dark:bg-obsidian-black min-h-screen text-slate-800 dark:text-slate-100 transition-colors">
      <div className="max-w-[1400px] mx-auto p-6 md:p-8">

        {/* ── Inline compact page header ── */}
        <PageHeader
          title={`Good ${new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, ${user?.name?.split(' ')[0] || 'Teacher'}`}
          subtitle="Welcome to your Facilitator Hub"
        />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-stretch">
        
        {/* Main Content (Left 3 columns) */}
        <div className="xl:col-span-3 flex flex-col gap-6 min-w-0">
          
          {/* Header — classroom selector only (greeting moved to PageHeader) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div className="inline-block relative">
              <select 
                value={activeClassId} 
                onChange={(e) => setActiveClassId(e.target.value)}
                className="appearance-none bg-white dark:bg-charcoal-gray border border-[#e2e8f0] dark:border-[#1f2023] text-sm font-bold text-slate-700 dark:text-white py-2 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer"
              >
                <option value="all">All Classrooms</option>
                {classrooms.map(c => (
                  <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <ChevronRight size={14} className="rotate-90" />
              </div>
            </div>
          </div>

          {/* Top 4 Metrics Cards — equal height, translate-y lift */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Students */}
            <div className="bento-card p-6 flex flex-col justify-between min-h-[140px] group
                            hover:-translate-y-1 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700/50
                            transition-all duration-300 cursor-pointer">
              <div className="flex justify-between items-start">
                <div className="bg-[#EAFBF3] dark:bg-emerald-900/20 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <Users size={20} />
                </div>
                <MoreVertical size={16} className="text-slate-300 dark:text-slate-600" />
              </div>
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Total Students</p>
                <h2 className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{data.total_students}</h2>
              </div>
            </div>

            {/* Total Materials */}
            <div
              onClick={() => navigate('/materials-lab')}
              className="bento-card p-6 flex flex-col justify-between min-h-[140px] group
                         hover:-translate-y-1 hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700/50
                         transition-all duration-300 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="bg-[#FFF4EB] dark:bg-orange-900/20 p-2.5 rounded-xl text-orange-600 dark:text-orange-400">
                  <BookOpen size={20} />
                </div>
                <MoreVertical size={16} className="text-slate-300 dark:text-slate-600" />
              </div>
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Total Materials</p>
                <h2 className="text-4xl font-black text-orange-600 dark:text-orange-400">{data.total_materials}</h2>
              </div>
            </div>

            {/* Active Courses */}
            <div
              onClick={() => setShowCoursesModal(true)}
              className="bento-card p-6 flex flex-col justify-between min-h-[140px] group
                         hover:-translate-y-1 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700/50
                         transition-all duration-300 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="bg-[#EDF2FE] dark:bg-blue-900/20 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                  <Layers size={20} />
                </div>
                <MoreVertical size={16} className="text-slate-300 dark:text-slate-600" />
              </div>
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Active Courses</p>
                <h2 className="text-4xl font-black text-blue-600 dark:text-blue-400">{data.total_classes}</h2>
              </div>
            </div>

            {/* Performance Index */}
            <div className="bento-card p-6 flex flex-col justify-between min-h-[140px] group
                            hover:-translate-y-1 hover:shadow-md hover:border-pink-300 dark:hover:border-pink-700/50
                            transition-all duration-300 cursor-pointer">
              <div className="flex justify-between items-start">
                <div className="bg-[#FDF0F3] dark:bg-pink-900/20 p-2.5 rounded-xl text-pink-600 dark:text-pink-400">
                  <Award size={20} />
                </div>
                <MoreVertical size={16} className="text-slate-300 dark:text-slate-600" />
              </div>
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Performance Index</p>
                <h2 className="text-4xl font-black text-pink-600 dark:text-pink-400">{data.avg_performance}%</h2>
              </div>
            </div>
          </div>

          {/* Daily Engagement Tracker */}
          <div className="bg-white dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[24px] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.06)] rounded-[16px] p-6 transition-colors duration-300 w-full">    
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-black">Daily Engagement Tracker</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Last 10 days — AI Tutor &amp; Quiz Activity</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <div className="w-3 h-3 rounded-full bg-[#E5A822]"></div> Activity
              </div>
            </div>
            
            <div className="h-64 flex items-end justify-between gap-2 relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-full border-b border-dashed border-slate-200 dark:border-slate-800 h-0 flex items-center justify-start relative">
                    <span className="absolute -left-8 text-[10px] text-slate-400 font-medium">
                      {Math.round((maxEngagement / 4) * (4 - i))}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="w-full flex justify-between items-end h-full pl-6 z-10">
                {engagementVals.map((val, i) => {
                  const heightPerc = Math.max((val / maxEngagement) * 100, 5); 
                  return (
                    <div key={i} className="flex flex-col items-center h-full justify-end group">
                      <div className="flex items-end gap-1 mb-3">
                        <div 
                          className="w-4 sm:w-6 bg-[#E5A822] rounded-t-sm transition-all duration-300 group-hover:brightness-110"
                          style={{ height: `${heightPerc}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{chartDays[i].getDate()}-{chartDays[i].toLocaleString('default', { month: 'short' })}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Student Performance Table */}
          <div className="bg-white dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[24px] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.06)] rounded-[16px] p-6 flex-1 flex flex-col transition-colors duration-300 w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-[#0f172a] dark:text-[#f1f5f9] transition-colors duration-300">Student Submissions</h3>
              <div className="flex gap-2">
                <select className="bg-slate-50 dark:bg-[#08090a] border border-slate-200 dark:border-[#1f2023] rounded-full px-4 py-1.5 text-xs font-bold outline-none">
                  <option>All Classes</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs font-bold text-slate-500 border-b border-slate-100 dark:border-[#1f2023]">
                  <tr>
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Class</th>
                    <th className="pb-3">Grade</th>
                    <th className="pb-3 text-right">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_submissions.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-12">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <BookOpen size={32} className="text-slate-300 dark:text-slate-600 mb-3" />
                          <p className="font-bold">No recent submissions found</p>
                          <p className="text-xs">Students haven't submitted any quizzes recently.</p>
                        </div>
                      </td>
                    </tr>
                  ) : data.recent_submissions.map((sub, i) => (
                    <tr key={i} className="border-b border-slate-50 dark:border-[#1f2023]/50 last:border-0 hover:bg-slate-50 dark:hover:bg-[#1f2023]/20 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                            {sub.student_name ? sub.student_name[0].toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className="font-bold">{sub.student_name}</p>
                            <p className="text-[10px] text-slate-500">Submitted today</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 font-medium text-slate-600 dark:text-slate-300">{sub.class_name}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          sub.grade === 'Grade A' ? 'text-[#E5A822]' : 
                          sub.grade === 'Grade B' ? 'text-emerald-500' : 'text-slate-500'
                        }`}>
                          {sub.grade}
                        </span>
                      </td>
                      <td className="py-4 text-right font-black">{sub.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="xl:col-span-1 flex flex-col gap-6 items-stretch justify-start w-full max-w-[360px] mx-auto xl:mx-0">
          
          {/* Quick-Action Suite — lift hover on entire card */}
          <div className="bg-[#E5A822] border-0 p-6 rounded-[16px] text-white relative overflow-hidden
                          shadow-lg shadow-[#E5A822]/25
                          hover:-translate-y-1 hover:shadow-xl hover:shadow-[#E5A822]/40
                          transition-all duration-300 group w-full shrink-0">
            <h2 className="text-lg font-black mb-5 relative z-10 leading-tight">Teacher Quick-Action Suite</h2>
            <div className="flex flex-col gap-3 relative z-10">
              <button
                onClick={() => navigate('/assessment-manager')}
                className="bg-white text-[#E5A822] px-4 py-2.5 rounded-xl text-sm font-bold
                           flex justify-center items-center gap-2
                           hover:bg-slate-50 hover:scale-[1.02] transition-all duration-200 shadow-sm"
              >
                <Plus size={16} /> Create Quiz
              </button>
              <button
                onClick={() => navigate('/materials-lab')}
                className="bg-black/20 text-white px-4 py-2.5 rounded-xl text-sm font-bold
                           flex justify-center items-center gap-2 border border-white/20
                           hover:bg-black/30 hover:scale-[1.02] transition-all duration-200"
              >
                <UploadCloud size={16} /> Drop Material
              </button>
            </div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 border-[12px] border-white/20 rounded-full pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-44 h-44 border-[2px] border-white/10 rounded-full pointer-events-none" />
          </div>

          {/* Dynamic Sticky Calendar */}
          <div className="bg-white dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[24px] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.06)] rounded-[16px] p-6 transition-colors duration-300 w-full shrink-0">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-sm text-[#0f172a] dark:text-[#f1f5f9] transition-colors duration-300">{currentMonth}</h3>
              <div className="flex gap-2 text-slate-400">
                <ChevronLeft size={16} className="cursor-pointer hover:text-slate-800" />
                <ChevronRight size={16} className="cursor-pointer hover:text-slate-800" />
              </div>
            </div>
            
            <div className="grid grid-cols-7 text-center text-xs gap-y-4">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="font-bold text-slate-400">{d}</div>
              ))}
              
              {calendarDays.map((d, i) => {
                const hasEvent = d && eventsByDate[d];
                const isToday = d === today.getDate();
                
                return (
                  <div key={i} className="relative flex justify-center items-center">
                    {d ? (
                      <div 
                        onMouseEnter={() => hasEvent && setHoveredDate(d)}
                        onMouseLeave={() => setHoveredDate(null)}
                        className={`w-8 h-8 flex items-center justify-center rounded-full font-medium cursor-pointer transition-colors ${
                          isToday ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 
                          hasEvent ? 'hover:bg-slate-100 dark:hover:bg-charcoal-gray/50' : ''
                        }`}
                      >
                        {d}
                        {hasEvent && (
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#E5A822]"></div>
                        )}
                      </div>
                    ) : <div />}
                    
                    {/* Sticky Note Overlay */}
                    {hoveredDate === d && hasEvent && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-[#fffbd1] dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 p-3 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 pointer-events-none">
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-t-[#fffbd1] dark:border-t-yellow-900 border-l-transparent border-r-transparent"></div>
                        <p className="text-yellow-800 dark:text-yellow-100 text-[11px] font-bold mb-1">Sticky Note - {d} {today.toLocaleString('default', { month: 'short' })}</p>
                        {eventsByDate[d].map((evt, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-xs text-yellow-900 dark:text-yellow-50 font-medium">
                            <span className="mt-1">•</span> {evt.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Events List */}
          <div className="bg-white dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[24px] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.06)] rounded-[16px] p-6 flex-1 flex flex-col transition-colors duration-300 w-full">
            <h3 className="font-bold text-sm text-[#0f172a] dark:text-[#f1f5f9] mb-4 transition-colors duration-300">Upcoming Events</h3>
            <div className="flex-1 flex flex-col space-y-3">
              {!data.upcoming_events || data.upcoming_events.length === 0 ? (
                <div className="flex-1 w-full rounded-xl border border-dashed border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] bg-[#f8fafc] dark:bg-[rgba(15,23,42,0.2)] p-6 flex flex-col items-center justify-center text-center transition-colors duration-300">
                  <CalendarIcon size={24} className="text-[#64748b] dark:text-[#94a3b8] mb-3" />
                  <p className="text-sm font-bold text-[#64748b] dark:text-[#94a3b8]">Your calendar is clear!</p>
                </div>
              ) : data.upcoming_events.map((evt, i) => (
                <div key={i} className="bg-light-canvas dark:bg-obsidian-black p-4 rounded-2xl border border-light-border dark:border-border-gray flex justify-between items-center group cursor-pointer hover:border-[#E5A822]/50 transition-colors">
                  <div>
                    <p className="text-[10px] font-bold text-[#E5A822] mb-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E5A822]"></span> {new Date(evt.date).toLocaleDateString()}
                    </p>
                    <p className="font-bold text-sm">{evt.title}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
      
      </div>{/* /max-w */}

      {/* Active Courses Modal */}
      {showCoursesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bento-card w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Active Courses summary</h2>
              <button onClick={() => setShowCoursesModal(false)} className="text-slate-400 hover:text-slate-800 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {classrooms.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No active classrooms managed.</p>
              ) : classrooms.map((c) => (
                <div key={c.class_id} className="p-4 border border-slate-100 dark:border-[#1f2023] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500/10 text-blue-500 p-2 rounded-lg">
                      <Layers size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{c.class_name}</h3>
                      <p className="text-xs text-slate-500">ID: {c.class_id}</p>
                    </div>
                  </div>
                  <button onClick={() => { setActiveClassId(c.class_id); setShowCoursesModal(false); }} className="text-xs font-bold text-blue-500 hover:underline">
                    View Data
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>

  );
};


export default TeacherAnalytics;

