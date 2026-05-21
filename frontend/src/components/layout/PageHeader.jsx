import { useState, useRef, useEffect } from 'react';
import { Bell, Search, Sun, Moon, LogOut, Settings, Repeat, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const PageHeader = ({ title, subtitle, children, searchQuery, onSearchChange }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [localQuery, setLocalQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const query = searchQuery !== undefined ? searchQuery : localQuery;
  const setQuery = onSearchChange !== undefined ? onSearchChange : setLocalQuery;

  // Real state for notifications to enable functional 'Mark as read'
  const [notifications, setNotifications] = useState([
    { id: 1, text: '📚 New Material uploaded in Classroom Analytics' },
    { id: 2, text: '🏆 Quiz Studio: Your custom test is ready' }
  ]);

  // Handle outside click to close menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    // Immediate sign out sequence without alert blocking if requested, but let's keep confirm safe
    if (window.confirm("Are you sure you want to sign out?")) {
      logout();
      navigate('/login');
    }
  };

  const handleRoleSwitch = () => {
    const currentPath = window.location.pathname;
    // Hot-swap routing back-and-forth
    if (currentPath.includes('/dashboard') || currentPath.includes('/notes') || currentPath.includes('/quiz')) {
      navigate('/analytics');
    } else {
      navigate('/dashboard');
    }
    setShowProfileMenu(false);
  };

  const handleMarkAllRead = () => {
    setNotifications([]);
  };

  return (
    <div className="flex flex-row items-center justify-between w-full h-16 gap-6 whitespace-nowrap mb-6 pt-1">

      {/* Left — page title */}
      <div className="min-w-0 shrink-0">
        {title && (
          <h1 className="text-2xl font-black tracking-tight truncate text-[#0f172a] dark:text-[#f1f5f9] transition-colors duration-300">{title}</h1>
        )}
        {subtitle && (
          <p className="text-sm text-[#64748b] dark:text-[#94a3b8] font-medium mt-0.5 transition-colors duration-300">{subtitle}</p>
        )}
      </div>

      {/* Right — expanded utility cluster */}
      <div className="flex-1 flex items-center justify-end gap-4 min-w-0">

        {/* Extra slot for page-specific controls */}
        {children}

        {/* Search bar — Expanded max-width */}
        <div className="relative hidden sm:block flex-1 max-w-xl">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b] dark:text-[#94a3b8] pointer-events-none transition-colors duration-300"
          />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search notes, flashcards..."
            className="pl-11 pr-4 py-2.5 w-full bg-white dark:bg-[#111524]
                       border border-[#e2e8f0] dark:border-white/[0.08]
                       rounded-full text-sm font-medium
                       text-[#0f172a] dark:text-[#e2e8f0]
                       placeholder:text-[#64748b] dark:placeholder:text-[#94a3b8]
                       focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/40
                       transition-all shadow-sm duration-300"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4 shrink-0 relative justify-end">
          
          {/* Bell Container */}
          <div className="relative" ref={notifRef}>
            <motion.button 
              whileHover={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ duration: 0.4 }}
              onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
              className="relative p-2.5 bg-white dark:bg-[#111524]
                         border border-[#e2e8f0] dark:border-white/[0.08]
                         text-[#64748b] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:text-white
                         rounded-full transition-colors duration-300 shadow-sm outline-none"
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#ff6b35] rounded-full border-2 border-white dark:border-[#111524]" />
              )}
            </motion.button>

            {/* Notification Popover Matrix */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 5, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-3 w-[320px] max-w-[320px] rounded-2xl bg-[#ffffff] dark:bg-[rgba(15,23,42,0.5)] dark:backdrop-blur-[20px] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] overflow-hidden z-50 transition-colors duration-300"
                >
                  <div className="p-4 border-b border-[#e2e8f0] dark:border-white/[0.08] flex items-center justify-between transition-colors duration-300">
                    <h3 className="text-sm font-black text-[#0f172a] dark:text-[#f1f5f9] transition-colors duration-300">Notifications</h3>
                    <button 
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-[#64748b] dark:text-[#94a3b8] hover:text-[#ff6b35] dark:hover:text-[#ff6b35] uppercase tracking-wider transition-colors duration-300"
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-sm font-bold text-[#64748b] dark:text-[#94a3b8] transition-colors duration-300">All caught up!</p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {notifications.map(n => (
                          <div key={n.id} className="py-2.5 px-3 rounded-xl hover:bg-[#f8fafc] dark:hover:bg-white/[0.02] cursor-pointer transition-colors duration-300">
                            <p className="text-xs font-medium text-[#0f172a] dark:text-[#f1f5f9] leading-snug line-clamp-2 transition-colors duration-300">{n.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sun / Moon toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2.5 bg-white dark:bg-[#111524]
                       border border-[#e2e8f0] dark:border-white/[0.08]
                       text-[#64748b] hover:text-amber-500 dark:text-[#94a3b8] dark:hover:text-amber-400
                       rounded-full transition-all duration-300 shadow-sm
                       hover:bg-amber-50 dark:hover:bg-amber-900/20 outline-none"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* User Profile Avatar Container */}
          <div className="relative" ref={profileRef}>
            <motion.div 
              whileHover={{ scale: 1.06 }}
              onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
              className={`w-10 h-10 rounded-full bg-gradient-to-br from-[#ff6b35]/30 to-[#ff6b35]/10
                          border text-[#ff6b35] flex items-center justify-center
                          text-sm font-black cursor-pointer shrink-0 transition-all duration-300
                          ${showProfileMenu ? 'border-[#ff6b35] shadow-[0_0_15px_rgba(255,107,53,0.4)]' : 'border-[#e2e8f0] dark:border-white/[0.08] shadow-sm hover:border-[#ff6b35] hover:shadow-[0_0_15px_rgba(255,107,53,0.4)]'}`}
            >
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </motion.div>

            {/* Contextual Profile Menu Matrix */}
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 5, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-3 w-[260px] max-w-[260px] rounded-2xl bg-[#ffffff] dark:bg-[rgba(15,23,42,0.5)] dark:backdrop-blur-[20px] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] overflow-hidden z-50 transition-colors duration-300"
                >
                  <div className="p-4 border-b border-[#e2e8f0] dark:border-white/[0.08] transition-colors duration-300">
                    <p className="text-sm font-black text-[#0f172a] dark:text-[#f1f5f9] truncate transition-colors duration-300">{user?.name || 'Administrator'}</p>
                    <p className="text-xs font-medium text-[#64748b] dark:text-[#94a3b8] truncate mt-0.5 transition-colors duration-300">{user?.email || 'admin@studyos.com'}</p>
                  </div>
                  
                  <div className="p-2 space-y-1">
                    <button 
                      onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc] dark:text-[#94a3b8] dark:hover:text-[#f1f5f9] dark:hover:bg-white/[0.05] transition-all duration-300"
                    >
                      <UserIcon size={16} /> User Profile Hub
                    </button>

                    <button 
                      onClick={() => { navigate('/settings'); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc] dark:text-[#94a3b8] dark:hover:text-[#f1f5f9] dark:hover:bg-white/[0.05] transition-all duration-300"
                    >
                      <Settings size={16} /> Account Settings
                    </button>

                    {(user?.role === 'admin' || user?.role === 'teacher') && (
                      <button 
                        onClick={handleRoleSwitch}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[#ff6b35] hover:bg-[#ff6b35]/10 transition-all duration-300"
                      >
                        <Repeat size={16} /> Switch Portal Role
                      </button>
                    )}
                    
                    <div className="h-px bg-[#e2e8f0] dark:bg-white/[0.08] my-1 transition-colors duration-300" />
                    
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[#64748b] dark:text-[#94a3b8] hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-all duration-300"
                    >
                      <LogOut size={16} /> Sign Out Trigger
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PageHeader;
