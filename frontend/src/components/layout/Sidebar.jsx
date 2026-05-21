import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, BookOpen, FileText, BrainCircuit, 
  Database, MessageSquare, Bell, Users, LogOut,
  Shield, Lock, HelpCircle, Settings,
  Sparkles, Trophy, X, Megaphone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = () => {
  const { user, logout, isTeacher, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);

  const studentRoutes = [
    { name: 'AI Tutor', path: '/tutor', icon: <Sparkles size={18} />, highlight: true },
    { name: 'Dashboard', path: '/student-dashboard', icon: <Home size={18} /> },
    { name: 'Classroom', path: '/classrooms', icon: <BookOpen size={18} /> },
    { name: 'Quiz Studio', path: '/quizzes', icon: <Trophy size={18} /> },
    { name: 'My Notes', path: '/notes', icon: <BrainCircuit size={18} /> },
    { name: 'Reminders', path: '/reminders', icon: <Bell size={18} /> },
  ];

  const teacherRoutes = [
    { name: 'Analytics', path: '/analytics', icon: <Home size={18} /> },
    { name: 'Classrooms', path: '/classrooms', icon: <Users size={18} /> },
    { name: 'Materials Lab', path: '/materials-lab', icon: <FileText size={18} /> },
    { name: 'Assessment Manager', path: '/assessment-manager', icon: <BrainCircuit size={18} /> },
    { name: 'Notice Board', path: '/notice-board', icon: <Megaphone size={18} /> },
    { name: 'AI Tutor', path: '/tutor', icon: <Sparkles size={18} />, highlight: true },
  ];

  const adminRoutes = [
    { name: 'System Monitor', path: '/admin', icon: <Shield size={18} /> },
    { name: 'The Vault', path: '/data-audit', icon: <Lock size={18} /> },
    { name: 'Vector Intelligence', path: '/vectorstore', icon: <Database size={18} /> },
  ];

  let mainRoutes = [];
  if (isAdmin) {
    mainRoutes = [...adminRoutes];
  } else if (isTeacher) {
    mainRoutes = [...teacherRoutes];
  } else {
    mainRoutes = [...studentRoutes];
  }

  const hoverClass = 'hover:bg-[#f1f5f9] dark:hover:bg-[rgba(255,255,255,0.05)]';

  return (
    <>
      <div className="w-[260px] bg-white dark:bg-[#0a0d14] border-r border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] flex-col hidden md:flex z-10 transition-colors shadow-sm relative">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[0.8rem] bg-[#ff6b35] flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#ff6b35]/20">
            <MessageSquare size={20} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-[#0f172a] dark:text-[#f1f5f9] leading-tight tracking-wide">Eduhive</h1>
            <p className="text-[10px] text-[#64748b] dark:text-[#94a3b8] font-bold mt-0.5">{isAdmin ? 'Admin' : isTeacher ? 'Facilitator' : 'Student Dashboard'}</p>
          </div>
        </div>
        
        <div className="flex-1 px-4 overflow-y-auto space-y-6 mt-2">
          <div>
            <p className="text-[10px] font-bold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-widest mb-3 px-2">Main Menu</p>
            <nav className="space-y-1.5">
              {mainRoutes.map((route) => (
                <NavLink
                  key={route.name}
                  to={route.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-300 ${
                      isActive 
                        ? 'bg-[#ff6b35] text-white shadow-lg shadow-[#ff6b35]/20' 
                        : route.highlight
                          ? `text-[#ff6b35] bg-[#ff6b35]/10 hover:bg-[#ff6b35]/20`
                          : `text-[#64748b] dark:text-[#94a3b8] ${hoverClass} hover:text-[#0f172a] dark:hover:text-[#f1f5f9]`
                    }`
                  }
                >
                  {route.icon}
                  {route.name}
                  {route.highlight && !mainRoutes.find(r => r.path === route.path) && (
                    <span className="ml-auto text-[9px] font-black bg-[#ff6b35] text-white px-1.5 py-0.5 rounded-full">AI</span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {(!isAdmin) && (
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-[#64748b] dark:text-[#94a3b8] mb-3 px-2">Other Menu</p>
              <nav className="space-y-1.5">
                <div>
                  <button
                    onClick={() => setHelpOpen(!helpOpen)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-300 ${helpOpen ? 'text-[#0f172a] dark:text-[#f1f5f9] bg-[#f1f5f9] dark:bg-[rgba(255,255,255,0.05)]' : `text-[#64748b] dark:text-[#94a3b8] ${hoverClass} hover:text-[#0f172a] dark:hover:text-[#f1f5f9]`}`}
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle size={18} />
                      Help Center
                    </div>
                  </button>
                  <AnimatePresence>
                    {helpOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ stiffness: 180, damping: 22 }}
                        className="overflow-hidden relative ml-4 mt-1 border-l-2 border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)]"
                      >
                        <div className="pl-3 py-2 flex flex-col gap-2">
                          <button className="text-left text-xs font-bold text-[#64748b] dark:text-[#94a3b8] hover:text-[#ff6b35] transition-colors">Documentation</button>
                          <button className="text-left text-xs font-bold text-[#64748b] dark:text-[#94a3b8] hover:text-[#ff6b35] transition-colors">Contact Admin</button>
                          <button className="text-left text-xs font-bold text-[#64748b] dark:text-[#94a3b8] hover:text-[#ff6b35] transition-colors">Submit Ticket</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-300 ${
                      isActive 
                        ? 'bg-[#ff6b35] text-white shadow-lg shadow-[#ff6b35]/20' 
                        : `text-[#64748b] dark:text-[#94a3b8] ${hoverClass} hover:text-[#0f172a] dark:hover:text-[#f1f5f9]`
                    }`
                  }
                >
                  <Settings size={18} />
                  Settings
                </NavLink>
              </nav>
            </div>
          )}
        </div>
        
        <div className="p-4 mt-auto">
          <button 
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold text-[#64748b] dark:text-[#94a3b8] hover:text-[#ff6b35] ${hoverClass} transition-colors group`}
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            Sign Out
          </button>
        </div>
      </div>


    </>
  );
};

export default Sidebar;
