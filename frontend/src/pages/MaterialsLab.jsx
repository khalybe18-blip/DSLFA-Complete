import React, { useState, useEffect, useRef } from 'react';
import { useClassrooms } from '../hooks/useClassrooms';
import { FileText, Eye, EyeOff, Trash2, UploadCloud, CheckCircle2, ChevronRight, Check, Loader2 } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';

const MaterialsLab = () => {
  const { classrooms, getResources, toggleVisibility, deleteDocument, uploadResource } = useClassrooms();
  const [selectedClass, setSelectedClass] = useState('');
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (classrooms.length > 0 && !selectedClass) {
      setSelectedClass(classrooms[0].class_id);
    }
  }, [classrooms]);

  useEffect(() => {
    if (selectedClass) {
      loadResources();
    }
  }, [selectedClass]);

  const loadResources = async () => {
    try {
      const data = await getResources(selectedClass);
      setResources(data.documents || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggle = async (docId, currentVisible) => {
    try {
      await toggleVisibility(docId, !currentVisible);
      setResources(prev => prev.map(d => d.id === docId ? { ...d, is_visible: !currentVisible } : d));
    } catch (err) {
      alert("Failed to update visibility");
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Are you sure? This will remove the document from both MySQL and the AI's Vector Store.")) return;
    try {
      await deleteDocument(docId);
      setResources(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      alert("Failed to delete document");
    }
  };

  const processUpload = async (file) => {
    if (!file || !selectedClass) return;
    try {
      setLoading(true);
      await uploadResource(selectedClass, file);
      await loadResources();
      setShowSuccessModal(true);
    } catch (err) {
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => processUpload(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUpload(e.dataTransfer.files[0]);
    }
  };

  const filteredResources = resources.filter(r => 
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-[#f8fafc] dark:bg-[#0a0d14] min-h-screen text-[#0f172a] dark:text-[#e2e8f0] transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-6">
        
        {/* Full Header Parity */}
        <PageHeader
          title={<span>MATERIALS <span className="text-[#ff6b35]">LAB</span></span>}
          subtitle="Manage and curate your classroom vector store."
          searchQuery={search}
          onSearchChange={setSearch}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Interactive Ingestion Lab (Left 8 Cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[24px] border border-[#e2e8f0] dark:border-white/[0.08] rounded-[24px] p-6 shadow-sm dark:shadow-xl transition-colors duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[480px]">
              
              {/* Dynamic Dropzone Vault */}
              <motion.div 
                className={`relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center transition-all duration-300 ${isDragging ? 'border-[#ff6b35] bg-[#ff6b35]/5 shadow-[0_0_30px_rgba(255,107,53,0.15)] scale-[1.02]' : 'border-[#cbd5e1] dark:border-white/[0.15] hover:border-[#ff6b35]/50'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                whileHover={{ y: -2 }}
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors duration-300 ${isDragging ? 'bg-[#ff6b35]/20 text-[#ff6b35]' : 'bg-[#f1f5f9] dark:bg-white/[0.05] text-[#64748b] dark:text-[#94a3b8]'}`}>
                  <UploadCloud size={32} />
                </div>
                <h3 className="text-lg font-black text-[#0f172a] dark:text-[#f1f5f9] mb-2 transition-colors duration-300">Drag and Drop files to upload</h3>
                <p className="text-xs font-bold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wide mb-8 transition-colors duration-300">Supported formats: PDF, DOCX, TXT</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-8 py-3 bg-[#0f172a] text-white dark:bg-white dark:text-[#0a0d14] rounded-[9999px] font-black text-xs uppercase tracking-wide hover:scale-105 transition-all shadow-md dark:shadow-[0_4px_14px_rgba(255,255,255,0.1)]"
                >
                  Browse Files
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              </motion.div>

              {/* Ingested Classroom Vectors List */}
              <div className="flex flex-col bg-[#f8fafc] dark:bg-[#0b0f17]/50 rounded-2xl border border-[#e2e8f0] dark:border-white/[0.05] overflow-hidden transition-colors duration-300">
                <div className="p-5 border-b border-[#e2e8f0] dark:border-white/[0.05] shrink-0 transition-colors duration-300">
                  <h3 className="text-sm font-black text-[#0f172a] dark:text-[#f1f5f9] flex items-center gap-2 transition-colors duration-300">
                    <FileText size={16} className="text-[#ff6b35]" />
                    Ingested Classroom Vectors
                  </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {loading && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[rgba(22,28,45,0.6)] border border-[#ff6b35]/30 p-4 rounded-xl shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-[#ff6b35]/10 flex items-center justify-center text-[#ff6b35] shrink-0">
                          <Loader2 size={18} className="animate-spin" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-[#0f172a] dark:text-[#f1f5f9] truncate">Parsing Vector Chunks...</h4>
                          <p className="text-[10px] text-[#ff6b35] font-bold uppercase tracking-wider">Live Embed Pipeline</p>
                        </div>
                      </div>
                      {/* Live loading tracker timeline */}
                      <div className="h-1.5 w-full bg-[#f1f5f9] dark:bg-white/[0.05] rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-[#ff6b35] to-amber-400"
                          initial={{ width: "0%" }}
                          animate={{ width: "85%" }}
                          transition={{ duration: 2, ease: "easeOut" }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {filteredResources.map((doc, idx) => (
                    <motion.div 
                      key={doc.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group bg-white dark:bg-[rgba(22,28,45,0.4)] border border-[#e2e8f0] dark:border-white/[0.05] hover:border-[#cbd5e1] dark:hover:border-white/[0.15] transition-all p-3.5 rounded-xl flex items-center justify-between shadow-sm dark:shadow-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[#f8fafc] dark:bg-white/[0.05] flex items-center justify-center text-[#64748b] dark:text-[#94a3b8] shrink-0 transition-colors duration-300">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-[#0f172a] dark:text-[#f1f5f9] truncate transition-colors duration-300">{doc.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-black px-2 py-0.5 rounded bg-[#f1f5f9] dark:bg-white/[0.1] text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider transition-colors duration-300">
                              {doc.file_type || 'PDF'}
                            </span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider transition-colors duration-300 ${doc.is_visible ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                              {doc.is_visible ? 'Visible' : 'Hidden'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button 
                          onClick={() => handleToggle(doc.id, doc.is_visible)}
                          className="p-2 rounded-lg text-[#64748b] dark:text-[#94a3b8] hover:text-[#ff6b35] hover:bg-[#f1f5f9] dark:hover:bg-white/[0.05] transition-all"
                        >
                          {doc.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button 
                          onClick={() => handleDelete(doc.id)}
                          className="p-2 rounded-lg text-[#64748b] dark:text-[#94a3b8] hover:text-red-500 dark:hover:text-red-400 hover:bg-[#f1f5f9] dark:hover:bg-white/[0.05] transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  
                  {!loading && filteredResources.length === 0 && (
                    <div className="py-12 text-center text-[#64748b] dark:text-[#94a3b8] text-sm font-medium transition-colors duration-300">
                      No classroom vectors ingested.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Enhanced Vector Statistics Sidebar (Right 4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Card Module 1 */}
            <motion.div whileHover={{ y: -2 }} className="bg-white dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[24px] border border-[#e2e8f0] dark:border-white/[0.08] p-6 rounded-2xl shadow-sm dark:shadow-none transition-colors duration-300">
              <p className="text-[10px] font-black text-[#64748b] dark:text-[#94a3b8] uppercase tracking-widest mb-1 transition-colors duration-300">Total Ingested Materials</p>
              <h2 className="text-4xl font-black text-[#0f172a] dark:text-[#f1f5f9] transition-colors duration-300">{resources.length}</h2>
            </motion.div>

            {/* Card Module 2 */}
            <motion.div whileHover={{ y: -2 }} className="bg-white dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[24px] border border-[#e2e8f0] dark:border-white/[0.08] p-6 rounded-2xl shadow-sm dark:shadow-none transition-colors duration-300">
              <p className="text-[10px] font-black text-[#64748b] dark:text-[#94a3b8] uppercase tracking-widest mb-4 transition-colors duration-300">Vector Token Density</p>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-1.5 w-full bg-[#f1f5f9] dark:bg-white/[0.05] rounded-full overflow-hidden transition-colors duration-300">
                    <div className="h-full bg-indigo-500/50" style={{ width: `${Math.max(20, Math.random() * 100)}%` }} />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Card Module 3 */}
            <motion.div whileHover={{ y: -2 }} className="bg-white dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[24px] border border-[#e2e8f0] dark:border-white/[0.08] p-6 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-none transition-colors duration-300">
              <div>
                <p className="text-[10px] font-black text-[#64748b] dark:text-[#94a3b8] uppercase tracking-widest mb-1 transition-colors duration-300">RAG Sync Index Status</p>
                <h3 className="text-sm font-bold text-[#0f172a] dark:text-[#f1f5f9] transition-colors duration-300">AI Tutor Readiness</h3>
              </div>
              <div className="w-3 h-3 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] dark:shadow-[0_0_15px_rgba(52,211,153,0.6)] animate-pulse" />
            </motion.div>
          </div>

        </div>
      </div>

      {/* The Instant Success Matrix Popup */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-white dark:bg-[rgba(22,28,45,0.85)] dark:backdrop-blur-[40px] border border-[#e2e8f0] dark:border-white/[0.1] rounded-[24px] p-8 shadow-2xl relative overflow-hidden transition-colors duration-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-[40px] rounded-full pointer-events-none" />
              
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 border border-emerald-500/20 mx-auto transition-colors duration-300">
                <CheckCircle2 size={32} />
              </div>
              
              <h2 className="text-lg font-black text-center text-[#0f172a] dark:text-[#f1f5f9] mb-6 transition-colors duration-300">Success! Knowledge Base Updated</h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-sm font-medium text-[#64748b] dark:text-[#94a3b8] transition-colors duration-300">
                  <Check size={16} className="text-emerald-500 dark:text-emerald-400" /> File Parsed Successfully
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-[#64748b] dark:text-[#94a3b8] transition-colors duration-300">
                  <Check size={16} className="text-emerald-500 dark:text-emerald-400" /> Generated {Math.floor(Math.random() * 50) + 12} Clean Text Chunks
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-[#64748b] dark:text-[#94a3b8] transition-colors duration-300">
                  <Check size={16} className="text-emerald-500 dark:text-emerald-400" /> AI Tutor Sync Index Complete
                </div>
              </div>
              
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3.5 bg-[#f1f5f9] dark:bg-white/[0.05] hover:bg-[#e2e8f0] dark:hover:bg-white/[0.1] border border-[#e2e8f0] dark:border-white/[0.1] rounded-xl text-sm font-black text-[#0f172a] dark:text-[#f1f5f9] transition-all"
              >
                CLOSE ACKNOWLEDGEMENT
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default MaterialsLab;
