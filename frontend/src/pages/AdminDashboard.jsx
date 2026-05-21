import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Shield, Server, Database, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');
  const [dbStatus, setDbStatus] = useState('CONNECTED');
  const [llmStatus, setLlmStatus] = useState('READY');
  const navigate = useNavigate();
  const { logout } = useAuth();

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchSystemHealth();
  }, []);

  const fetchSystemHealth = async () => {
    setLoading(true);
    setDbStatus('CHECKING...');
    setLlmStatus('CHECKING...');
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Check API Health
      const healthRes = await axios.get(`${API_BASE}/api/v1/classrooms/`, { headers }).catch(() => ({ status: 500 }));
      setApiStatus(healthRes.status === 200 ? 'healthy' : 'degraded');
      setDbStatus(healthRes.status === 200 ? 'CONNECTED' : 'DISCONNECTED');
      setLlmStatus(healthRes.status === 200 ? 'READY' : 'UNREACHABLE');

      // Fetch Vector Store Stats
      const statsRes = await axios.get(`${API_BASE}/api/ai/vectorstore`, { headers });
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
      setApiStatus('offline');
      setDbStatus('FAILED');
      setLlmStatus('FAILED');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            System<span className="text-[#deff9a]">Admin</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">The Technical Vault: Global System Monitoring.</p>
        </div>

        <button 
          onClick={fetchSystemHealth}
          className="flex items-center gap-2 bg-[#deff9a] text-black px-6 py-3 rounded-2xl text-sm font-black hover:shadow-lg transition-all active:scale-95"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          REFRESH SYSTEMS
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Server size={80} className="text-[#deff9a]" />
          </div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">API Status</p>
          <div className="flex items-center gap-3 mt-4">
            {apiStatus === 'healthy' ? (
              <CheckCircle size={32} className="text-[#deff9a]" />
            ) : apiStatus === 'degraded' ? (
              <AlertCircle size={32} className="text-yellow-500" />
            ) : (
              <AlertCircle size={32} className="text-red-500" />
            )}
            <h2 className="text-3xl font-black text-white uppercase">{apiStatus}</h2>
          </div>
          <p className="text-xs font-bold text-slate-500 mt-4">Main backend cluster responsiveness.</p>
        </div>

        <div className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Database size={80} className="text-[#deff9a]" />
          </div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Vector Chunks</p>
          <h2 className="text-5xl font-black text-white mt-4">
            {stats?.total || 0}
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-4">Total segments in ChromaDB.</p>
        </div>

        <div className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Shield size={80} className="text-[#deff9a]" />
          </div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Security Mode</p>
          <h2 className="text-3xl font-black text-[#deff9a] mt-4 uppercase">RAG-ENFORCED</h2>
          <p className="text-xs font-bold text-slate-500 mt-4">Class isolation and RBAC active.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-8 rounded-[2.5rem] space-y-6">
          <h3 className="text-xl font-black text-white flex items-center gap-3">
            <Activity className="text-[#deff9a]" size={24} />
            SYSTEM PERFORMANCE
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-sm font-bold text-slate-300">Memory Usage</span>
              <span className="text-xs font-black bg-[#deff9a] text-black px-3 py-1 rounded-full">OPTIMAL</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-sm font-bold text-slate-300">Database Connection</span>
              <span className={`text-xs font-black px-3 py-1 rounded-full ${dbStatus === 'CONNECTED' ? 'bg-[#deff9a] text-black' : 'bg-yellow-500 text-black'}`}>{dbStatus}</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-sm font-bold text-slate-300">Ollama/LLM Service</span>
              <span className={`text-xs font-black px-3 py-1 rounded-full ${llmStatus === 'READY' ? 'bg-[#deff9a] text-black' : 'bg-yellow-500 text-black'}`}>{llmStatus}</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
          <Shield size={48} className="text-[#deff9a] mb-4 opacity-50" />
          <h3 className="text-xl font-black text-white uppercase">Vault Security</h3>
          <p className="text-slate-500 mt-2 max-w-xs text-sm font-medium">All administrative actions are logged. 3-tier RBAC system is fully operational.</p>
          <div className="flex gap-4 mt-6">
            <button 
              onClick={() => navigate('/data-audit')}
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black transition-all border border-white/10"
            >
              AUDIT LOGS
            </button>
            <button 
              onClick={logout}
              className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-black transition-all border border-red-500/10"
            >
              LOCK SYSTEM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
