import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Upload, FileText, Trash2, Search, Loader2, Download, User as UserIcon, Edit3, X, FolderClosed, BookOpen, CloudUpload, FolderPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserAssets } from '../hooks/useUserAssets';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const Notes = () => {
  const { user } = useAuth();
  const { 
    personalDocs, 
    classDocs, 
    loading, 
    uploading, 
    error, 
    setError,
    searchQuery, 
    setSearchQuery, 
    uploadDocument, 
    deleteDocument,
    renameDocument,
    copyAssetToPersonalVault
  } = useUserAssets();

  const [file, setFile] = useState(null);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'classroom'
  const [editingTitle, setEditingTitle] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    const success = await uploadDocument(file);
    if (success) {
      setFile(null);
      document.getElementById('note-file-upload').value = '';
    }
  };

  const handleDelete = async (id) => {
    await deleteDocument(id);
  };

  const handleDownload = async (id, title) => {
    try {
      const res = await axios.get(`${API_BASE}/api/documents/${id}/file`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', title);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to download document');
    }
  };

  const handleTitleSave = async (id) => {
    await renameDocument(id, editTitleValue);
    setEditingTitle(null);
  };

  const cardStyle = "bg-white dark:bg-[rgba(30,41,59,0.45)] dark:backdrop-blur-[16px] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)]";

  return (
    <div className="bg-[#f8fafc] dark:bg-[#0a0d14] h-[calc(100vh-theme(spacing.16))] w-full overflow-hidden flex flex-col p-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col overflow-hidden space-y-6">
        
        {/* Header & Search & Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] pb-4">
          <div>
            <h1 className="text-3xl font-black text-[#0f172a] dark:text-[#f1f5f9] tracking-tight transition-colors">My Notes</h1>
            <p className="text-sm text-[#64748b] dark:text-[#94a3b8] font-medium mt-1 transition-colors">Manage your personal learning assets and classroom resources.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] dark:text-[#94a3b8]" size={16} />
              <input 
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#f1f5f9] dark:bg-[rgba(10,13,20,0.5)] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] rounded-xl py-2 pl-9 pr-4 text-sm font-bold text-[#0f172a] dark:text-[#f1f5f9] placeholder:text-[#64748b] dark:placeholder:text-[#94a3b8] focus:outline-none focus:border-[#ff6b35] transition-colors"
              />
            </div>
            <div className="flex bg-[#f1f5f9] dark:bg-[#111524] p-1.5 rounded-2xl border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] transition-colors">
              <button 
              onClick={() => setActiveTab('personal')}
              className={`relative flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 z-10 ${activeTab === 'personal' ? 'text-white' : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-[#f1f5f9]'}`}
            >
              {activeTab === 'personal' && (
                <motion.div layoutId="activeTabNote" className="absolute inset-0 bg-[#ff6b35] rounded-xl -z-10 shadow-md shadow-[#ff6b35]/20" transition={{ stiffness: 180, damping: 22 }} />
              )}
              <FolderClosed className={`w-4 h-4 mr-2 ${activeTab === 'personal' ? 'text-white' : 'text-currentColor'}`} /> Personal Library
            </button>
            <button 
              onClick={() => setActiveTab('classroom')}
              className={`relative flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 z-10 ${activeTab === 'classroom' ? 'text-white' : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-[#f1f5f9]'}`}
            >
              {activeTab === 'classroom' && (
                <motion.div layoutId="activeTabNote" className="absolute inset-0 bg-[#ff6b35] rounded-xl -z-10 shadow-md shadow-[#ff6b35]/20" transition={{ stiffness: 180, damping: 22 }} />
              )}
              <BookOpen className={`w-4 h-4 mr-2 ${activeTab === 'classroom' ? 'text-white' : 'text-currentColor'}`} /> Classroom Notes
            </button>
          </div>
        </div>
      </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm border border-red-100 dark:border-red-900/50 flex items-center justify-between font-bold">
            {error}
            <button onClick={() => setError('')} className="hover:text-red-800 dark:hover:text-red-200"><X size={16} /></button>
          </div>
        )}

        <div className="relative w-full flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            
            {/* Section A: Personal Library Panel */}
            {activeTab === 'personal' && (
              <motion.div
                key="personal"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ stiffness: 180, damping: 22 }}
                className="w-full h-full flex flex-col space-y-6 absolute top-0 left-0"
              >
                {/* Interactive Dropzone Vault */}
                <div className={`${cardStyle} shadow-[0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none p-6 shrink min-h-[160px] rounded-[16px] transition-colors duration-300 overflow-y-auto custom-scrollbar`}>
                  <h2 className="text-lg font-black text-[#0f172a] dark:text-[#f1f5f9] mb-4 transition-colors">Ingest Personal Notes & Handwritten Scans</h2>
                  <form onSubmit={handleUpload}>
                    <label 
                      className={`relative flex flex-col items-center justify-center w-full px-4 py-12 border-2 border-dashed rounded-[16px] cursor-pointer transition-all duration-300 overflow-hidden group
                      ${file ? 'border-[#ff6b35] bg-[#ff6b35]/5 dark:bg-[#ff6b35]/10' : 'border-[#cbd5e1] dark:border-[rgba(255,255,255,0.15)] hover:border-[#ff6b35] hover:bg-[#ff6b35]/5 bg-[#f8fafc] dark:bg-[#0a0d14]'}`}
                    >
                      <motion.div 
                        animate={file ? { y: [0, -8, 0] } : {}} 
                        transition={{ repeat: Infinity, duration: 2 }}
                        className={`p-4 rounded-full mb-4 transition-colors ${file ? 'bg-[#ff6b35] text-white' : 'bg-white dark:bg-[#111524] text-[#94a3b8] group-hover:text-[#ff6b35] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)]'}`}
                      >
                        <CloudUpload size={32} />
                      </motion.div>
                      
                      {file ? (
                        <p className="text-sm font-black text-[#ff6b35]">{file.name}</p>
                      ) : (
                        <div className="text-center">
                          <p className="text-base font-black text-[#0f172a] dark:text-[#f1f5f9] transition-colors">Drag & Drop files here or click to browse</p>
                          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-2 font-medium transition-colors">(Supports PDFs, raw text files, and handwritten image notes up to 20MB)</p>
                        </div>
                      )}
                      <input id="note-file-upload" type="file" className="hidden" accept=".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg" onChange={handleFileChange} />
                    </label>

                    <AnimatePresence>
                      {file && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                          animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          className="flex justify-end"
                        >
                          <button
                            type="submit"
                            disabled={uploading}
                            className="bg-[#ff6b35] text-white px-8 py-3 rounded-xl font-bold text-sm hover:brightness-110 flex items-center gap-2 shadow-lg shadow-[#ff6b35]/20 transition-all disabled:opacity-70"
                          >
                            {uploading ? <><Loader2 size={18} className="animate-spin" /> Processing Asset...</> : 'Upload Asset to Vault'}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                </div>

                {/* File Grid */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <h3 className="text-lg font-black text-[#0f172a] dark:text-[#f1f5f9] mb-4 transition-colors shrink-0">Your Asset Vault</h3>
                  {loading ? (
                    <div className="flex justify-center p-12 text-[#ff6b35]"><Loader2 size={32} className="animate-spin" /></div>
                  ) : personalDocs.length === 0 ? (
                    <div className={`${cardStyle} border-dashed p-12 rounded-3xl flex flex-col items-center justify-center text-center transition-colors`}>
                      <FileText size={48} className="text-[#cbd5e1] dark:text-[rgba(255,255,255,0.1)] mb-4" />
                      <p className="text-[#0f172a] dark:text-[#f1f5f9] font-black">No personal assets match</p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto pr-2 pb-6 custom-scrollbar">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {personalDocs.map(doc => (
                        <div key={doc.id} className={`${cardStyle} shadow-[0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none rounded-2xl overflow-hidden flex flex-col group transition-all duration-300 hover:border-[#ff6b35]/50`}>
                          {/* Visual Thumbnail Layer */}
                          <div className="h-32 bg-[#f8fafc] dark:bg-[rgba(10,13,20,0.5)] border-b border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] relative flex items-center justify-center transition-colors">
                            <FileText size={40} className="text-[#cbd5e1] dark:text-[rgba(255,255,255,0.1)]" />
                            <div className="absolute top-3 left-3 bg-white dark:bg-[#111524] px-2 py-1 rounded-md text-[10px] font-black text-[#ff6b35] uppercase border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] shadow-sm">
                              {doc.file_type}
                            </div>
                            <button 
                              onClick={() => handleDelete(doc.id)}
                              className="absolute top-3 right-3 p-1.5 bg-white/80 dark:bg-black/50 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-500/20 backdrop-blur-sm"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="p-5 flex-1 flex flex-col justify-between">
                            <div>
                              {editingTitle === doc.id ? (
                                <div className="flex gap-2">
                                  <input 
                                    autoFocus
                                    value={editTitleValue}
                                    onChange={(e) => setEditTitleValue(e.target.value)}
                                    onBlur={() => handleTitleSave(doc.id)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleTitleSave(doc.id)}
                                    className="flex-1 bg-[#f1f5f9] dark:bg-[#0a0d14] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.1)] px-2 py-1 rounded-md text-sm font-bold text-[#0f172a] dark:text-[#f1f5f9] focus:outline-none focus:border-[#ff6b35]"
                                  />
                                </div>
                              ) : (
                                <h4 className="font-bold text-[#0f172a] dark:text-[#f1f5f9] text-sm line-clamp-1 group-hover:text-[#ff6b35] transition-colors flex items-center justify-between cursor-pointer" onClick={() => { setEditingTitle(doc.id); setEditTitleValue(doc.title); }}>
                                  {doc.title} <Edit3 size={14} className="opacity-0 group-hover:opacity-100 text-[#cbd5e1] hover:text-[#ff6b35]" />
                                </h4>
                              )}
                              <p className="text-[10px] text-[#64748b] dark:text-[#94a3b8] font-bold mt-2 uppercase tracking-wide">
                                {new Date(doc.created_at).toLocaleDateString()} • {doc.status}
                              </p>
                            </div>
                            <div className="mt-4 flex gap-2">
                               <Link 
                                 to={`/summary/${doc.id}`}
                                 className="flex-1 text-center py-2 bg-[#f8fafc] dark:bg-[#111524] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-bold text-[#0f172a] dark:text-[#f1f5f9] hover:bg-[#e2e8f0] dark:hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                               >
                                 Summary
                               </Link>
                               <button 
                                 onClick={() => handleDownload(doc.id, doc.title)}
                                 className="p-2 bg-[#f8fafc] dark:bg-[#111524] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] rounded-xl text-[#64748b] dark:text-[#94a3b8] hover:text-[#ff6b35] transition-colors"
                               >
                                 <Download size={16} />
                               </button>
                            </div>
                        </div>
                      </div>
                      ))}
                    </div>
                  </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Section B: Classroom Notes Panel */}
            {activeTab === 'classroom' && (
              <motion.div
                key="classroom"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ stiffness: 180, damping: 22 }}
                className="w-full h-full flex flex-col absolute top-0 left-0"
              >
                <div className={`${cardStyle} shadow-[0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none p-6 rounded-3xl transition-colors duration-300 flex-1 flex flex-col overflow-hidden`}>
                  <h2 className="text-lg font-black text-[#0f172a] dark:text-[#f1f5f9] mb-6 transition-colors shrink-0">Classroom Broadcasted Notes</h2>
                  
                  <div className="flex-1 overflow-y-auto pr-2 pb-6">
                  {loading ? (
                    <div className="flex justify-center p-12 text-[#ff6b35]"><Loader2 size={32} className="animate-spin" /></div>
                  ) : classDocs.length === 0 ? (
                    <div className={`${cardStyle} border-dashed p-12 rounded-2xl flex flex-col items-center justify-center text-center transition-colors`}>
                      <FileText size={48} className="text-[#cbd5e1] dark:text-[rgba(255,255,255,0.1)] mb-4" />
                      <p className="text-[#0f172a] dark:text-[#f1f5f9] font-black">No classroom notes match</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {classDocs.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-4 bg-[#f8fafc] dark:bg-[#111524] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] rounded-2xl group hover:border-[#ff6b35]/40 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white dark:bg-[#0a0d14] rounded-xl flex items-center justify-center border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] shrink-0">
                              <FileText size={20} className="text-[#ff6b35]" />
                            </div>
                            <div>
                              <h4 className="font-bold text-[#0f172a] dark:text-[#f1f5f9] text-sm transition-colors line-clamp-1">{doc.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-[#64748b] dark:text-[#94a3b8] bg-white dark:bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded border border-[#e2e8f0] dark:border-transparent">
                                  <UserIcon size={10} /> Facilitator Upload
                                </span>
                                <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8] font-medium">{new Date(doc.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => copyAssetToPersonalVault(doc.id)}
                              className="px-4 py-2 flex items-center justify-center bg-white dark:bg-[rgba(255,255,255,0.05)] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] rounded-xl text-xs font-bold text-[#0f172a] dark:text-[#f1f5f9] hover:text-[#ff6b35] dark:hover:text-[#ff6b35] hover:border-[#ff6b35]/30 transition-all shadow-sm group"
                            >
                              <FolderPlus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" /> Drop in Personal Library
                            </button>
                            <button 
                              onClick={() => handleDownload(doc.id, doc.title)}
                              className="w-10 h-10 flex items-center justify-center bg-[#ff6b35] text-white rounded-xl shadow-lg shadow-[#ff6b35]/20 hover:brightness-110 transition-all"
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                </div>
              </motion.div>
            )}
            
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Notes;
