import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Send, Bot, User, Search, Database, Sparkles, 
  FileText, Loader2, AlertCircle, BookOpen, 
  ChevronLeft, Files, Eye, X, UploadCloud, Scan, Copy, Library
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserAssets } from '../hooks/useUserAssets';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const AiTutor = () => {
  const { token, refreshUser } = useAuth();
  const { documents, personalDocs, classDocs, loadingDocs, error, searchQuery, setSearchQuery, uploadDocument, copyAssetToPersonalVault } = useUserAssets();
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState([]);
  
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [fileBlobUrl, setFileBlobUrl] = useState(null);

  // Document Viewing State
  const [activeDoc, setActiveDoc] = useState(null);
  
  // Dual-Inflow Library State
  const [personalLibraryOpen, setPersonalLibraryOpen] = useState(false);
  const [classroomLibraryOpen, setClassroomLibraryOpen] = useState(false);
  const [selectedContextDocs, setSelectedContextDocs] = useState([]);

  const toggleDocSelection = (id) => {
    setSelectedContextDocs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pipelineSteps]);

  useEffect(() => {
    if (!token) return;
    axios.get(`${API_BASE}/api/v1/classrooms/`)
      .then((res) => {
        const list = res.data.classrooms || [];
        setClassrooms(list);
        if (list.length === 1) setSelectedClassId(String(list[0].class_id));
      })
      .catch(() => setClassrooms([]));
  }, [token]);

  useEffect(() => {
    if (!activeDoc || !token) {
      setFileBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/documents/${activeDoc.id}/file`, { responseType: 'blob' });
        if (cancelled) return;
        setFileBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(res.data);
        });
      } catch {
        if (!cancelled) {
          setFileBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeDoc, token]);

  const handleTutorUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const docData = await uploadDocument(e.target.files[0]);
      if (docData && docData.document) {
         setSelectedContextDocs(prev => [...prev, docData.document.id]);
      }
    }
    e.target.value = '';
  };

  const handleClassroomImport = async (docId) => {
      const newDoc = await copyAssetToPersonalVault(docId);
      if (newDoc) {
         setSelectedContextDocs(prev => [...prev, newDoc.id]);
         setClassroomLibraryOpen(false);
      }
  };

  // Fetch documents on mount - removed, handled by useUserAssets

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setPipelineSteps([]);

    if (!selectedClassId) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Select a class above so the tutor can search only that class\'s materials.',
          isError: true,
        },
      ]);
      setLoading(false);
      return;
    }

    // Add user message to chat
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    // Build chat history for context (last 10)
    const history = newMessages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      // Use the streaming SSE endpoint (JWT + class-scoped RAG)
      const response = await fetch(`${API_BASE}/api/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userMessage,
          history: history.slice(0, -1),
          class_id: Number(selectedClassId),
        }),
      });

      if (!response.ok) {
        let errText = `Request failed (${response.status})`;
        try {
          const j = await response.json();
          errText = j.message || errText;
        } catch { /* ignore */ }
        setMessages((prev) => [...prev, { role: 'assistant', content: errText, isError: true }]);
        setPipelineSteps([]);
        setLoading(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'status') {
                setPipelineSteps(prev => [...prev, { type: 'status', text: event.data, timestamp: Date.now() }]);
              } else if (event.type === 'sources') {
                setPipelineSteps(prev => [...prev, { type: 'sources', data: event.data, timestamp: Date.now() }]);
              } else if (event.type === 'response') {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: event.data.content,
                  usedRag: event.data.used_rag,
                  sources: event.data.sources
                }]);
                setPipelineSteps([]);
              } else if (event.type === 'error') {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: `Error: ${event.data}`,
                  isError: true
                }]);
                setPipelineSteps([]);
              }
            } catch (parseErr) {
              // Ignore partial JSON
            }
          }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Failed to connect to the AI service. Make sure the backend is running.',
        isError: true
      }]);
      setPipelineSteps([]);
    } finally {
      setLoading(false);
      refreshUser();
      inputRef.current?.focus();
    }
  };

  const cardStyle = "bg-[#ffffff] dark:bg-[rgba(30,41,59,0.45)] dark:backdrop-blur-[16px] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)]";

  return (
    <div className="h-[calc(100vh-4rem)] max-w-[1400px] mx-auto w-full p-4 lg:p-6 transition-colors">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        
        {/* ================================== */}
        {/* LEFT PANEL: Document Source Viewer */}
        {/* ================================== */}
        <div className={`lg:col-span-4 lg:flex flex-col h-full hidden lg:visible ${cardStyle} rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden transition-colors relative`}>
          
          {/* Doc Header */}
          <div className="p-4 border-b border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] bg-[#f8fafc] dark:bg-[rgba(10,13,20,0.5)]">
            {activeDoc ? (
              <button 
                onClick={() => setActiveDoc(null)}
                className="flex items-center gap-1.5 text-sm font-semibold text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-[#f1f5f9] transition-colors"
              >
                <ChevronLeft size={16} /> Back to Files
              </button>
            ) : (
              <h2 className="font-bold text-[#0f172a] dark:text-[#f1f5f9] flex items-center gap-2">
                <Files size={18} className="text-[#64748b] dark:text-[#94a3b8]" /> Tutor Context
              </h2>
            )}
          </div>

          {/* Doc Body */}
          <div className="flex-1 overflow-hidden relative">
            

            {/* Drawer for Personal Library */}
            <AnimatePresence>
              {personalLibraryOpen && !activeDoc && (
                 <motion.div 
                    initial={{ x: '-100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '-100%', opacity: 0 }}
                    transition={{ stiffness: 180, damping: 22 }}
                    className="absolute inset-0 bg-white dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[20px] border-r border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] z-20 flex flex-col"
                 >
                    <div className="p-4 border-b border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] flex justify-between items-center bg-[#f8fafc] dark:bg-[rgba(10,13,20,0.5)]">
                       <h3 className="font-bold text-sm text-[#0f172a] dark:text-[#f1f5f9]">Personal Vault</h3>
                       <button onClick={() => setPersonalLibraryOpen(false)} className="text-[#64748b] hover:text-[#0f172a] dark:hover:text-[#f1f5f9] transition-colors">
                         <X size={16}/>
                       </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                       {personalDocs.map(doc => (
                          <label key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] cursor-pointer hover:bg-[#f8fafc] dark:hover:bg-[rgba(255,255,255,0.05)] transition-colors group">
                             <input 
                                type="checkbox" 
                                checked={selectedContextDocs.includes(doc.id)} 
                                onChange={() => toggleDocSelection(doc.id)}
                                className="accent-[#ff6b35] w-4 h-4 cursor-pointer"
                             />
                             <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-[#0f172a] dark:text-[#f1f5f9] truncate group-hover:text-[#ff6b35] transition-colors">{doc.title}</p>
                                <p className="text-[10px] text-[#64748b] dark:text-[#94a3b8] uppercase font-bold mt-0.5">{doc.file_type}</p>
                             </div>
                          </label>
                       ))}
                       {personalDocs.length === 0 && (
                         <div className="text-center p-8 text-[#64748b] dark:text-[#94a3b8]">
                           <p className="text-sm">No personal notes found.</p>
                         </div>
                       )}
                    </div>
                    {selectedContextDocs.length > 0 && (
                       <div className="p-4 border-t border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] bg-[#f8fafc] dark:bg-[rgba(10,13,20,0.5)]">
                          <button onClick={() => setPersonalLibraryOpen(false)} className="w-full bg-[#ff6b35] text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-[#ff6b35]/20 hover:brightness-110 transition-all">
                             Attach {selectedContextDocs.length} Asset(s)
                          </button>
                       </div>
                    )}
                 </motion.div>
              )}
            </AnimatePresence>

            {/* Drawer for Classroom Import */}
            <AnimatePresence>
              {classroomLibraryOpen && !activeDoc && (
                 <motion.div 
                    initial={{ x: '-100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '-100%', opacity: 0 }}
                    transition={{ stiffness: 180, damping: 22 }}
                    className="absolute inset-0 bg-white dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[20px] border-r border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] z-20 flex flex-col"
                 >
                    <div className="p-4 border-b border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] flex justify-between items-center bg-[#f8fafc] dark:bg-[rgba(10,13,20,0.5)]">
                       <h3 className="font-bold text-sm text-[#0f172a] dark:text-[#f1f5f9]">Import Classroom Notes</h3>
                       <button onClick={() => setClassroomLibraryOpen(false)} className="text-[#64748b] hover:text-[#0f172a] dark:hover:text-[#f1f5f9] transition-colors">
                         <X size={16}/>
                       </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                       {classDocs.map(doc => (
                          <button 
                            key={doc.id} 
                            onClick={() => handleClassroomImport(doc.id)}
                            className="w-full flex items-center justify-between p-3 rounded-xl border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] hover:border-[#ff6b35]/50 hover:bg-[#f8fafc] dark:hover:bg-[rgba(255,255,255,0.05)] transition-colors group"
                          >
                             <div className="min-w-0 flex-1 text-left">
                                <p className="text-sm font-bold text-[#0f172a] dark:text-[#f1f5f9] truncate group-hover:text-[#ff6b35] transition-colors">{doc.title}</p>
                                <p className="text-[10px] text-[#64748b] dark:text-[#94a3b8] uppercase font-bold mt-0.5">{doc.file_type}</p>
                             </div>
                             <Copy size={14} className="text-[#64748b] group-hover:text-[#ff6b35]" />
                          </button>
                       ))}
                       {classDocs.length === 0 && (
                         <div className="text-center p-8 text-[#64748b] dark:text-[#94a3b8]">
                           <p className="text-sm">No classroom notes available to import.</p>
                         </div>
                       )}
                    </div>
                 </motion.div>
              )}
            </AnimatePresence>

            {activeDoc ? (
              <iframe 
                src={fileBlobUrl || 'about:blank'}
                className="w-full h-full border-none bg-white dark:bg-[#0a0d14]"
                title={activeDoc.title}
              />
            ) : (
              <div className="p-4 space-y-6 overflow-y-auto h-full">
                
                {/* Multi-Inflow Ingestion Control Split */}
                <div className="space-y-3">
                  <label className="w-full py-4 px-4 bg-[#f8fafc] dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[20px] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] rounded-2xl flex items-center gap-4 cursor-pointer hover:border-[#ff6b35]/50 group transition-all shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
                     <div className="w-10 h-10 rounded-xl bg-white dark:bg-[rgba(255,255,255,0.05)] flex items-center justify-center shrink-0 border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] group-hover:bg-[#ff6b35]/10 group-hover:border-[#ff6b35]/30 transition-colors">
                       <UploadCloud size={20} className="text-[#64748b] dark:text-[#94a3b8] group-hover:text-[#ff6b35] transition-colors" />
                     </div>
                     <div className="flex-1 text-left min-w-0">
                       <p className="text-sm font-black text-[#0f172a] dark:text-[#f1f5f9] group-hover:text-[#ff6b35] transition-colors flex items-center">
                         <UploadCloud className="w-4 h-4 mr-2" /> Upload from Device
                       </p>
                       <p className="text-[10px] text-[#64748b] dark:text-[#94a3b8] font-bold uppercase tracking-wide mt-0.5">Supports PDF, DOCX, TXT</p>
                     </div>
                     <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleTutorUpload} />
                  </label>

                  <label className="w-full py-4 px-4 bg-[#f8fafc] dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[20px] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] rounded-2xl flex items-center gap-4 cursor-pointer hover:border-[#ff6b35]/50 group transition-all shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
                     <div className="w-10 h-10 rounded-xl bg-white dark:bg-[rgba(255,255,255,0.05)] flex items-center justify-center shrink-0 border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] group-hover:bg-[#ff6b35]/10 group-hover:border-[#ff6b35]/30 transition-colors">
                       <Scan size={20} className="text-[#64748b] dark:text-[#94a3b8] group-hover:text-[#ff6b35] transition-colors" />
                     </div>
                     <div className="flex-1 text-left min-w-0">
                       <p className="text-sm font-black text-[#0f172a] dark:text-[#f1f5f9] group-hover:text-[#ff6b35] transition-colors flex items-center">
                         <FileText className="w-4 h-4 mr-2" /> Add Handwritten Notes
                       </p>
                       <p className="text-[10px] text-[#64748b] dark:text-[#94a3b8] font-bold uppercase tracking-wide mt-0.5">Camera & Photo Upload</p>
                     </div>
                     <input type="file" className="hidden" accept=".png,.jpg,.jpeg" onChange={handleTutorUpload} />
                  </label>

                  <button 
                    onClick={() => setClassroomLibraryOpen(true)}
                    className="w-full py-4 px-4 bg-[#f8fafc] dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[20px] border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] rounded-2xl flex items-center gap-4 cursor-pointer hover:border-[#ff6b35]/50 group transition-all shadow-[0_4px_12px_rgba(0,0,0,0.01)]"
                  >
                     <div className="w-10 h-10 rounded-xl bg-white dark:bg-[rgba(255,255,255,0.05)] flex items-center justify-center shrink-0 border border-[#e2e8f0] dark:border-[rgba(255,255,255,0.08)] group-hover:bg-[#ff6b35]/10 group-hover:border-[#ff6b35]/30 transition-colors">
                       <BookOpen size={20} className="text-[#64748b] dark:text-[#94a3b8] group-hover:text-[#ff6b35] transition-colors" />
                     </div>
                     <div className="flex-1 text-left min-w-0">
                       <p className="text-sm font-black text-[#0f172a] dark:text-[#f1f5f9] group-hover:text-[#ff6b35] transition-colors flex items-center">
                         <Library className="w-4 h-4 mr-2" /> Import via Classroom Notes
                       </p>
                       <p className="text-[10px] text-[#64748b] dark:text-[#94a3b8] font-bold uppercase tracking-wide mt-0.5">Teacher-shared Docs</p>
                     </div>
                  </button>
                  
                  <div className="pt-4 flex justify-center">
                    <button 
                      onClick={() => setPersonalLibraryOpen(true)}
                      className="text-xs font-bold text-[#64748b] dark:text-[#94a3b8] hover:text-[#ff6b35] transition-colors"
                    >
                      Browse existing Personal Vault →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================== */}
        {/* RIGHT PANEL: AI Tutor Chat         */}
        {/* ================================== */}
        <div className={`lg:col-span-8 flex flex-col h-full ${cardStyle} rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden transition-colors relative`}>
          
          {/* Chat Header */}
          <div className="flex z-10 flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur block shadow-sm w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Bot className="text-white" size={22} />
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Interactive Tutor</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">Class-scoped RAG — select a class you teach or are enrolled in</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide shrink-0">Class context</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-2 min-w-0 flex-1 sm:max-w-xs focus:ring-2 focus:ring-blue-500/30 outline-none"
              >
                <option value="">Select a class…</option>
                {classrooms.map((c) => (
                  <option key={c.class_id} value={String(c.class_id)}>
                    {c.class_name} (ID {c.class_id})
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 shrink-0">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Online
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 pb-4 space-y-5 bg-slate-50/50 dark:bg-slate-900/40">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center mb-6">
                  <Sparkles className="text-blue-600 dark:text-blue-400" size={36} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Ask me anything about your studies</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-8">
                  Choose your class above, then ask questions. The tutor only searches materials for that class.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {[
                    'Explain the key concepts from my notes',
                    'What topics should I focus on for exams?',
                    'Help me summarize chapter 2',
                    'Explain this topic like I am 5'
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(suggestion)}
                      className="text-left px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 px-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mt-1">
                    <Bot className="text-white" size={16} />
                  </div>
                )}
                
                <div className={`max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                  <div className={`px-4 py-3 text-sm leading-relaxed transition-colors shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 dark:bg-blue-500 text-white rounded-2xl rounded-br-md' 
                      : msg.isError
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-2xl rounded-bl-md'
                        : 'bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  
                  {/* RAG Source Badge */}
                  {msg.role === 'assistant' && msg.usedRag && msg.sources?.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 ml-1 flex-wrap">
                      <Database size={12} className="text-emerald-600 dark:text-emerald-500" />
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider">Sources:</span>
                      {msg.sources.map((src, j) => (
                        <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md text-[10px] uppercase font-bold border border-emerald-100 dark:border-emerald-800">
                          {src}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center mt-1">
                    <User className="text-slate-600 dark:text-slate-300" size={16} />
                  </div>
                )}
              </div>
            ))}

            {pipelineSteps.length > 0 && (
              <div className="flex gap-3 px-1">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mt-1">
                  <Bot className="text-white" size={16} />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm max-w-[75%]">
                  <div className="space-y-2.5">
                    {pipelineSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        {step.type === 'status' && step.text.includes('Searching') && (
                          <Search size={14} className="text-amber-500 mt-0.5 shrink-0 animate-pulse" />
                        )}
                        {step.type === 'status' && step.text.includes('Found') && (
                          <Database size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                        )}
                        {step.type === 'status' && step.text.includes('No relevant') && (
                          <AlertCircle size={14} className="text-slate-400 mt-0.5 shrink-0" />
                        )}
                        {step.type === 'status' && step.text.includes('Generating') && (
                          <Sparkles size={14} className="text-blue-500 mt-0.5 shrink-0 animate-pulse" />
                        )}
                        {step.type === 'sources' && (
                          <BookOpen size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                        )}
                        
                        <div>
                          {step.type === 'status' && (
                            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{step.text}</span>
                          )}
                          {step.type === 'sources' && step.data.found && (
                            <div className="flex flex-wrap gap-1.5">
                              {step.data.sources.map((src, j) => (
                                <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md text-[10px] uppercase font-bold border border-emerald-100 dark:border-emerald-800">
                                  {src}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {loading && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-2" />
          </div>

          {/* Chat Input Area */}
          <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
            <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-end gap-3 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Message AI Tutor..."
                disabled={loading}
                className="flex-1 px-4 py-3 max-h-32 min-h-[48px] resize-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner disabled:opacity-50"
                rows={1}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="h-12 w-12 shrink-0 flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:hover:translate-y-0 transition-all shadow-md active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} className="ml-1" />}
              </button>
            </form>
            <div className="text-center mt-2">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wide">Press Enter to send, Shift+Enter for new line</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AiTutor;
