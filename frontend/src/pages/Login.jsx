import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogIn, Loader2, MessageSquare, Settings, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // 3D Parallax state
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) / (rect.width / 2));
    y.set((e.clientY - centerY) / (rect.height / 2));
  };

  const springConfig = { stiffness: 120, damping: 20 };
  const rotateX = useSpring(useTransform(y, [-1, 1], [2.5, -2.5]), springConfig);
  const rotateY = useSpring(useTransform(x, [-1, 1], [-2.5, 2.5]), springConfig);

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE}/api/auth/login`, {
        email,
        password
      });
      
      login(response.data.user, response.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#0a0d14] text-[#e2e8f0] p-4 sm:p-8"
      onMouseMove={handleMouseMove}
      style={{ perspective: 1200 }}
    >
      
      {/* Dynamic Background: The Central Fluid Mesh */}
      <motion.div 
        className="absolute w-[800px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-40 blur-[80px]"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #6366f1 40%, #a855f7 60%, #ff6b35 100%)'
        }}
        animate={{ 
          borderRadius: ["40% 60% 70% 30%", "60% 40% 30% 70%", "40% 60% 70% 30%"],
          rotate: [0, 90, 180, 360]
        }}
        transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#0a0d14] via-transparent to-[#0a0d14] pointer-events-none" />

      {/* 3D Perspective Container wrapping the entire cockpit */}
      <motion.div 
        className="max-w-5xl w-full z-10 flex flex-col gap-10"
        style={{ rotateX, rotateY }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        
        {/* Main Semantic Heading & CTA */}
        <motion.div variants={itemVariants} className="text-center flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 text-[#f1f5f9]">
            Your Personal <span className="text-[#ff6b35]">AI Study OS</span>
          </h1>
          <p className="text-[#94a3b8] text-base font-medium mb-6 max-w-2xl">
            An AI-first educational workspace utilizing scoped RAG technology...
          </p>
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(255, 107, 53, 0.25)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => document.getElementById('email-input')?.focus()}
            className="relative px-8 py-3.5 bg-white text-[#0a0d14] rounded-[9999px] font-black text-sm uppercase tracking-wide transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] overflow-hidden group"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,107,53,0.3)_0%,_transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <span className="relative z-10">Start Learning for Free</span>
          </motion.button>
        </motion.div>

        {/* Integrated Bento Cockpit */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left Column: Student-Centric HUD Features (8 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card A: The AI Tutor Node */}
              <motion.div 
                variants={itemVariants}
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.1 }}
                className="border border-white/[0.08] hover:border-[#ff6b35]/20 hover:shadow-[0_0_20px_rgba(255,107,53,0.05)] transition-all p-6 rounded-3xl flex flex-col gap-3 relative overflow-hidden"
                style={{ background: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full pointer-events-none" />
                <div className="flex items-center gap-3 mb-2 relative z-10">
                  <div className="w-10 h-10 bg-[#ff6b35]/10 rounded-full flex items-center justify-center border border-[#ff6b35]/20">
                    <MessageSquare className="text-[#ff6b35]" size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-[#e2e8f0]">AI Tutor Sync</h3>
                </div>
                <div className="border border-white/[0.08] p-3 rounded-xl relative z-10" style={{ background: 'rgba(15, 23, 42, 0.2)' }}>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    <span className="text-indigo-400 font-bold">💬 AI Tutor:</span> Found answer in <span className="text-emerald-400 font-medium">'Introduction to AI'</span> PDF. Generating contextual response...
                  </p>
                </div>
              </motion.div>

              {/* Card B: The Quiz Studio Forge */}
              <motion.div 
                variants={itemVariants}
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.3 }}
                className="border border-white/[0.08] hover:border-[#ff6b35]/20 hover:shadow-[0_0_20px_rgba(255,107,53,0.05)] transition-all p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden"
                style={{ background: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none" />
                <div className="flex items-center gap-2 mb-4 text-xs font-bold text-[#94a3b8] relative z-10">
                  <Settings size={16} className="text-emerald-400" />
                  <span>Quiz Forge Node</span>
                </div>
                <div className="flex flex-col gap-2 relative z-10 mb-4">
                  <div className="flex justify-between items-center px-3 py-2 rounded-lg border border-white/[0.08]" style={{ background: 'rgba(15, 23, 42, 0.2)' }}>
                    <span className="text-[10px] text-[#94a3b8] uppercase font-bold">Difficulty</span>
                    <span className="text-[10px] text-emerald-400 font-black">Medium</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 rounded-lg border border-white/[0.08]" style={{ background: 'rgba(15, 23, 42, 0.2)' }}>
                    <span className="text-[10px] text-[#94a3b8] uppercase font-bold">Parameters</span>
                    <span className="text-[10px] text-indigo-300 font-black">Mixed • 10 Qs</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-400 relative z-10 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Quiz Verification: 92% Accuracy Matrix
                </div>
              </motion.div>
            </div>

            {/* Card C: The Academic Index */}
            <motion.div 
              variants={itemVariants}
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 0.5 }}
              className="border border-white/[0.08] hover:border-[#ff6b35]/20 hover:shadow-[0_0_20px_rgba(255,107,53,0.05)] transition-all p-6 rounded-3xl relative overflow-hidden"
              style={{ background: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 blur-[50px] rounded-full pointer-events-none" />
              <div className="flex items-center gap-2 mb-6 text-xs font-bold text-[#94a3b8] relative z-10">
                <BookOpen size={16} className="text-amber-400" />
                <span>Academic Summary Index</span>
              </div>
              <div className="grid grid-cols-3 gap-4 relative z-10">
                <div className="p-4 rounded-2xl border border-white/[0.08]" style={{ background: 'rgba(15, 23, 42, 0.2)' }}>
                  <p className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest mb-2">Active Classrooms</p>
                  <p className="text-3xl font-black text-[#e2e8f0]">1</p>
                </div>
                <div className="p-4 rounded-2xl border border-white/[0.08]" style={{ background: 'rgba(15, 23, 42, 0.2)' }}>
                  <p className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest mb-2">Total AI Sessions</p>
                  <p className="text-3xl font-black text-[#e2e8f0]">4</p>
                </div>
                <div className="p-4 rounded-2xl border border-white/[0.08]" style={{ background: 'rgba(15, 23, 42, 0.2)' }}>
                  <p className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest mb-2">Quizzes Forged</p>
                  <p className="text-3xl font-black text-[#e2e8f0]">2</p>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Right Column: Integrated Secure Portal (5 cols) */}
          <motion.div 
            variants={itemVariants}
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 0.2 }}
            className="lg:col-span-5 border border-white/[0.08] hover:border-[#ff6b35]/20 hover:shadow-[0_0_20px_rgba(255,107,53,0.05)] transition-all rounded-3xl relative overflow-hidden flex flex-col h-full"
            style={{ background: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
          >
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#ff6b35]/30 to-transparent" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#ff6b35]/10 blur-[60px] rounded-full pointer-events-none" />
            
            <div className="p-8 pb-4 border-b border-white/[0.08] relative z-10">
              <h2 className="text-xl font-black tracking-tight text-[#e2e8f0] flex items-center gap-3">
                <LogIn className="text-[#ff6b35]" size={20} />
                Secure Portal
              </h2>
              <p className="mt-2 text-[#94a3b8] text-xs font-bold uppercase tracking-widest">Workspace Authentication Node</p>
            </div>
            
            <div className="p-8 flex-1 flex flex-col justify-center relative z-10">
              <form className="space-y-5" onSubmit={handleLogin}>
                {error && (
                  <div className="bg-red-500/10 text-red-500 p-4 rounded-xl text-sm border border-red-500/20 font-bold">
                    {error}
                  </div>
                )}
                
                <div>
                  <label className="block text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-2">Email Address</label>
                  <input
                    id="email-input"
                    type="email"
                    required
                    className="w-full px-4 py-3.5 border border-white/[0.08] rounded-xl focus:ring-1 focus:ring-[#ff6b35] focus:border-[#ff6b35] outline-none transition-all text-[#e2e8f0] font-medium placeholder:text-[#475569] shadow-inner"
                    style={{ background: 'rgba(15, 23, 42, 0.2)' }}
                    placeholder="name@institution.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-2">Password</label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3.5 border border-white/[0.08] rounded-xl focus:ring-1 focus:ring-[#ff6b35] focus:border-[#ff6b35] outline-none transition-all text-[#e2e8f0] font-medium placeholder:text-[#475569] shadow-inner"
                    style={{ background: 'rgba(15, 23, 42, 0.2)' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(255, 107, 53, 0.2)" }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex justify-center items-center gap-2 py-4 px-4 rounded-[9999px] text-sm font-black text-white bg-[#ff6b35] hover:bg-[#ff5515] transition-all disabled:opacity-50 mt-2 shadow-[0_4px_14px_rgba(255,107,53,0.2)]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      AUTHENTICATING...
                    </>
                  ) : 'LAUNCH WORKSPACE'}
                </motion.button>
              </form>
              
              <div className="mt-auto pt-8 text-center border-t border-white/[0.08]">
                <Link to="/register" className="text-[11px] font-black text-[#94a3b8] uppercase tracking-widest hover:text-[#ff6b35] transition-colors">
                  New student? Register Identity
                </Link>
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
};

export default Login;

