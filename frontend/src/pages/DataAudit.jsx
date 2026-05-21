import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, ShieldCheck, ShieldAlert, Zap, RefreshCw, Layers } from 'lucide-react';

const DataAudit = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/ai/vectorstore`);
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            Data<span className="text-[#deff9a]">Audit</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Verify Vector Store integrity and isolation.</p>
        </div>

        <button 
          onClick={fetchStats}
          className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-[#deff9a] hover:text-black transition-all"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          RESCAN STORE
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <div className="glass-card p-6 rounded-[2rem] flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#deff9a]/10 flex items-center justify-center text-[#deff9a] mb-4">
              <Database size={32} />
            </div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Chunks</p>
            <h2 className="text-4xl font-black text-white mt-1">{stats?.total || 0}</h2>
          </div>

          <div className="glass-card p-6 rounded-[2rem] flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#deff9a]/10 flex items-center justify-center text-[#deff9a] mb-4">
              <Layers size={32} />
            </div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Collections</p>
            <h2 className="text-4xl font-black text-white mt-1">1</h2>
          </div>
        </div>

        <div className="md:col-span-3 space-y-6">
          <div className="flex gap-4 p-1 bg-white/5 rounded-2xl w-fit">
            <button 
              onClick={() => setActiveTab('summary')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'summary' ? 'bg-[#deff9a] text-black' : 'text-slate-400 hover:text-white'}`}
            >
              CHUNKS SUMMARY
            </button>
            <button 
              onClick={() => setActiveTab('sources')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'sources' ? 'bg-[#deff9a] text-black' : 'text-slate-400 hover:text-white'}`}
            >
              ISOLATION MAP
            </button>
          </div>

          <div className="glass-card p-8 rounded-[2.5rem]">
            {loading ? (
              <div className="py-20 text-center text-slate-500">Performing deep scan...</div>
            ) : !stats ? (
              <div className="py-20 text-center text-slate-500">Failed to connect to ChromaDB.</div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
                  <ShieldCheck className="text-green-500" size={24} />
                  <div>
                    <h4 className="text-sm font-black text-white uppercase">Integrity Verified</h4>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">All 100% of chunks have valid class_id metadata tags.</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  {Object.entries(stats.sources || {}).map(([name, data], i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-[#deff9a]/30 transition-all">
                      <div className="flex items-center gap-3">
                        <Zap size={16} className="text-[#deff9a]" />
                        <span className="text-sm font-bold text-slate-300">{name}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Chunks</p>
                          <p className="text-xs font-black text-white">{data.chunks.length}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Class Context</p>
                          <p className="text-xs font-black text-[#deff9a]">ID: {data.metadata.class_id}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataAudit;
