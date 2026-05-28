import { NavLink } from 'react-router-dom';
import { Home, BookOpen, FileText, BrainCircuit, Database, MessageSquare, Bell, Globe } from 'lucide-react';

const Sidebar = () => {
  const routes = [
    { name: 'Dashboard', path: '/', icon: <Home size={20} /> },
    { name: 'My Notes', path: '/notes', icon: <FileText size={20} /> },
    { name: 'Flashcards', path: '/flashcards', icon: <BookOpen size={20} /> },
    { name: 'Quizzes', path: '/quizzes', icon: <BrainCircuit size={20} /> },
    { name: 'Reminders', path: '/reminders', icon: <Bell size={20} /> },
    { name: 'AI Tutor', path: '/tutor', icon: <MessageSquare size={20} /> },
    { name: 'Resources', path: '/resources', icon: <Globe size={20} /> },
    { name: 'Vector Store', path: '/vectorstore', icon: <Database size={20} /> },
  ];

  return (
    <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex z-10 transition-colors">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">DSLFA</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Study OS</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {routes.map((route) => (
          <NavLink
            key={route.name}
            to={route.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`
            }
          >
            {route.icon}
            {route.name}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg flex items-center gap-3 transition-colors">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-indigo-500/20 flex items-center justify-center text-blue-700 dark:text-indigo-400 font-bold">
            S
          </div>
          <div>
            <p className="text-sm font-medium dark:text-slate-200">Student</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Free Plan</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
