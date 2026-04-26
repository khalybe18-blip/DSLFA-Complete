import { Bell, Search, Menu } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

const Navbar = () => {
  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-10 w-full transition-colors">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <Menu size={24} />
        </button>
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Search notes, flashcards..." 
            className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-blue-500/40 dark:focus:border-blue-500 transition-all w-64 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <ThemeToggle />
        
        <button className="relative p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
        </button>
        
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-bold shadow-sm shadow-blue-500/30 cursor-pointer">
          S
        </div>
      </div>
    </header>
  );
};

export default Navbar;
