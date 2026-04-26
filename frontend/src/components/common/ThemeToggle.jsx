import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative p-2 rounded-full transition-colors flex items-center justify-center overflow-hidden
        ${isDark ? 'hover:bg-slate-800 text-yellow-300' : 'hover:bg-slate-100 text-slate-600'}
      `}
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{
          rotate: isDark ? -180 : 0,
          opacity: isDark ? 0 : 1,
          scale: isDark ? 0.5 : 1
        }}
        transition={{ duration: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
        className="absolute"
      >
        <Sun size={20} />
      </motion.div>

      <motion.div
        initial={false}
        animate={{
          rotate: isDark ? 0 : 180,
          opacity: isDark ? 1 : 0,
          scale: isDark ? 1 : 0.5
        }}
        transition={{ duration: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
        className={isDark ? 'relative' : 'absolute'}
      >
        <Moon size={20} className="fill-current" />
      </motion.div>
    </button>
  );
};

export default ThemeToggle;
