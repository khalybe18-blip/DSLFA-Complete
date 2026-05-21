import { Bell, Search, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user } = useAuth();
  
  return (
    <header className="h-16 bg-transparent flex items-center justify-between px-2 z-10 w-full mb-4">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <Menu size={24} />
        </button>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Search notes, flashcards..." 
            className="pl-10 pr-4 py-2 bg-light-card dark:bg-charcoal-gray border border-light-border dark:border-border-gray rounded-full text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-coral-orange transition-all w-64 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
        
        <button className="relative p-2.5 bg-light-card dark:bg-charcoal-gray border border-light-border dark:border-border-gray text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-full transition-colors">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-coral-orange rounded-full border-2 border-light-card dark:border-charcoal-gray"></span>
        </button>
        
        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 border border-light-border dark:border-border-gray text-slate-800 dark:text-white flex items-center justify-center font-bold overflow-hidden cursor-pointer">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
