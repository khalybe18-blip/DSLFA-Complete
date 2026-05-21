import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-obsidian-black text-slate-900 dark:text-slate-100 font-sans transition-colors p-4 md:p-6 gap-6">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent transition-colors">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
