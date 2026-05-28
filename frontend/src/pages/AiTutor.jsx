import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import AIMessage from '../components/AIMessage';
import { 
  Send, Bot, User, Search, Database, Sparkles, 
  FileText, Loader2, AlertCircle, BookOpen, 
  ChevronLeft, Files, Eye, Globe, ToggleLeft, ToggleRight,
  ExternalLink, Zap, Bug, ChevronDown, ChevronUp, MessageSquare, Plus, Trash2, Edit2, Check, X
} from 'lucide-react';

const AiTutor = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState([]);
  const [externalEnabled, setExternalEnabled] = useState(false);
  const [sessionCache, setSessionCache] = useState({});
  const [debugOpen, setDebugOpen] = useState({});  // {stepIndex: bool} for collapsing
  
  // Chat Sessions State
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Document & Sidebar State
  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('history'); // 'history' | 'files'

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, pipelineSteps]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsRes, sessionsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/documents'),
          axios.get('http://localhost:5000/api/ai/chat/sessions')
        ]);
        setDocuments(docsRes.data.documents || []);
        setChatSessions(sessionsRes.data || []);
      } catch (err) { console.error('Failed to fetch data', err); }
      finally { 
        setLoadingDocs(false); 
        setLoadingSessions(false); 
      }
    };
    fetchData();
  }, []);

  const loadSession = async (sessionId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/ai/chat/sessions/${sessionId}`);
      const formattedMessages = res.data.messages.map(m => ({
        role: m.role,
        content: m.content,
        usedRag: m.usedRag,
        sources: m.sources,
        usedExternal: m.usedExternal,
        externalSources: m.externalSources
      }));
      setMessages(formattedMessages);
      setCurrentSessionId(sessionId);
      setSessionCache({});
      setPipelineSteps([]);
    } catch (err) {
      console.error("Failed to load session", err);
    }
  };

  const createNewChat = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/ai/chat/sessions');
      const newSession = res.data;
      setChatSessions([newSession, ...chatSessions]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
      setSessionCache({});
      setPipelineSteps([]);
    } catch (err) {
      console.error("Failed to create new chat", err);
    }
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await axios.delete(`http://localhost:5000/api/ai/chat/sessions/${sessionId}`);
      setChatSessions(chatSessions.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const startEditing = (e, session) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const saveEdit = async (e, sessionId) => {
    e.stopPropagation();
    if (!editTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    try {
      await axios.put(`http://localhost:5000/api/ai/chat/sessions/${sessionId}`, { title: editTitle.trim() });
      setChatSessions(chatSessions.map(s => s.id === sessionId ? { ...s, title: editTitle.trim() } : s));
    } catch (err) {
      console.error("Failed to rename session", err);
    } finally {
      setEditingSessionId(null);
    }
  };

  const cancelEdit = (e) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    let targetSessionId = currentSessionId;
    if (!targetSessionId) {
      try {
        const res = await axios.post('http://localhost:5000/api/ai/chat/sessions');
        targetSessionId = res.data.id;
        setChatSessions([res.data, ...chatSessions]);
        setCurrentSessionId(targetSessionId);
      } catch (err) {
        console.error("Failed to create session on first send", err);
        return;
      }
    }

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setPipelineSteps([]);

    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    const history = newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch('http://localhost:5000/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage, 
          history: history.slice(0, -1),
          externalEnabled,
          sessionCache,
          sessionId: targetSessionId
        })
      });

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
              } else if (event.type === 'external_sources') {
                setPipelineSteps(prev => [...prev, { type: 'external_sources', data: event.data, timestamp: Date.now() }]);
              } else if (event.type === 'debug') {
                setPipelineSteps(prev => [...prev, { type: 'debug', data: event.data, timestamp: Date.now() }]);
              } else if (event.type === 'response') {
                // Update session cache if backend provided updates
                if (event.data.cache_update && Object.keys(event.data.cache_update).length > 0) {
                  setSessionCache(prev => ({ ...prev, ...event.data.cache_update }));
                }
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: event.data.content,
                  usedRag: event.data.used_rag,
                  sources: event.data.sources,
                  usedExternal: event.data.used_external,
                  externalSources: event.data.external_sources || []
                }]);
                setPipelineSteps([]);
              } else if (event.type === 'error') {
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${event.data}`, isError: true }]);
                setPipelineSteps([]);
              }
            } catch (parseErr) { /* Ignore partial JSON */ }
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
      inputRef.current?.focus();
    }
  };



  return (
    <div className="h-[calc(100vh-4rem)] max-w-[1400px] mx-auto w-full p-4 lg:p-6 transition-colors">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        
        {/* LEFT PANEL: Sidebar (Tabs: History & Files) */}
        <div className="lg:col-span-4 lg:flex flex-col h-full hidden lg:visible bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
          <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
            <button 
              onClick={() => { setSidebarTab('history'); setActiveDoc(null); }}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${sidebarTab === 'history' && !activeDoc ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              <MessageSquare size={16} /> Chats
            </button>
            <button 
              onClick={() => setSidebarTab('files')}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${sidebarTab === 'files' || activeDoc ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              <Files size={16} /> Files
            </button>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {activeDoc ? (
              <div className="flex flex-col h-full">
                <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                  <button onClick={() => setActiveDoc(null)} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    <ChevronLeft size={14} /> Back
                  </button>
                  <span className="text-xs font-bold truncate px-2 dark:text-slate-200">{activeDoc.title}</span>
                </div>
                <iframe src={`http://localhost:5000/api/documents/${activeDoc.id}/file`} className="flex-1 w-full border-none bg-slate-100 dark:bg-slate-900" title={activeDoc.title} />
              </div>
            ) : sidebarTab === 'files' ? (
              <div className="p-4 space-y-3 overflow-y-auto h-full">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 px-1">Open a document to read along while you chat.</p>
                {loadingDocs ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
                ) : documents.length === 0 ? (
                  <div className="text-center p-8 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <BookOpen className="mx-auto mb-2 opacity-50" size={24} /><p className="text-sm">No documents uploaded</p>
                  </div>
                ) : (
                  documents.map((doc) => (
                    <button key={doc.id} onClick={() => setActiveDoc(doc)} className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate pr-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">{doc.title}</h4>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mt-1">{doc.file_type} File</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                        <Eye size={14} className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="p-4 space-y-3 overflow-y-auto h-full flex flex-col">
                <button 
                  onClick={createNewChat}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                >
                  <Plus size={16} /> New Chat
                </button>
                <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
                {loadingSessions ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
                ) : chatSessions.length === 0 ? (
                  <div className="text-center p-8 text-slate-400">
                    <MessageSquare className="mx-auto mb-2 opacity-50" size={24} /><p className="text-sm">No chat history</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {chatSessions.map((session) => (
                      <div key={session.id} 
                        onClick={() => { if (editingSessionId !== session.id) loadSession(session.id); }}
                        className={`w-full text-left p-3 rounded-xl border transition-all group flex items-center justify-between gap-2 ${editingSessionId !== session.id ? 'cursor-pointer' : ''} ${currentSessionId === session.id ? 'bg-blue-50 dark:bg-slate-700 border-blue-300 dark:border-slate-500' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                      >
                        {editingSessionId === session.id ? (
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(e, session.id); if (e.key === 'Escape') cancelEdit(e); }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="flex-1 px-2 py-1 text-sm bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-600 rounded outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-slate-200"
                            />
                            <button onClick={(e) => saveEdit(e, session.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded"><Check size={14} /></button>
                            <button onClick={cancelEdit} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><X size={14} /></button>
                          </div>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1">
                              <h4 className={`text-sm font-semibold truncate ${currentSessionId === session.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{session.title}</h4>
                              <span className="text-[10px] text-slate-400 block mt-0.5">{new Date(session.updated_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => startEditing(e, session)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={(e) => deleteSession(e, session.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: AI Tutor Chat */}
        <div className="lg:col-span-8 flex flex-col h-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors relative">
          
          {/* Chat Header with External Toggle */}
          <div className="flex z-10 items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 backdrop-blur block shadow-sm w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Bot className="text-white" size={22} />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Interactive Tutor</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">Powered by local RAG engine</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* External Sources Toggle */}
              <button onClick={() => setExternalEnabled(!externalEnabled)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${externalEnabled ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}>
                {externalEnabled ? <ToggleRight size={16} className="text-violet-600 dark:text-violet-400" /> : <ToggleLeft size={16} />}
                <Globe size={12} />
                <span className="hidden sm:inline">External</span>
              </button>
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Online
              </div>
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
                  I can answer questions using your uploaded notes.{externalEnabled && ' External knowledge is ON — I\'ll research online when needed!'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {['Explain the key concepts from my notes','What topics should I focus on for exams?','Help me summarize chapter 2','Show me a demo of markdown formatting!'].map((suggestion, i) => (
                    <button key={i} onClick={() => setInput(suggestion)} className="text-left px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all">
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
                
                <div className={`min-w-0 ${msg.role === 'user' ? 'max-w-[85%] sm:max-w-[75%] order-first' : 'w-full'}`}>
                  <div className={`px-4 py-3 text-sm leading-relaxed transition-colors shadow-sm ${
                    msg.role === 'user' ? 'bg-blue-600 dark:bg-blue-500 text-white rounded-2xl rounded-br-md' 
                      : msg.isError ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-2xl rounded-bl-md w-full'
                        : 'bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md w-full overflow-x-auto'
                  }`}>
                    {msg.role === 'assistant' ? <AIMessage content={msg.content} externalSources={msg.externalSources} /> : msg.content}
                  </div>
                  
                  {/* Source Badges */}
                  {msg.role === 'assistant' && (msg.usedRag || msg.usedExternal) && (
                    <div className="flex items-center gap-1.5 mt-2 ml-1 flex-wrap">
                      {msg.usedRag && msg.sources?.length > 0 && (<>
                        <Database size={12} className="text-emerald-600 dark:text-emerald-500" />
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider">Notes:</span>
                        {msg.sources.map((src, j) => (
                          <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md text-[10px] uppercase font-bold border border-emerald-100 dark:border-emerald-800">{src}</span>
                        ))}
                      </>)}
                      {msg.usedExternal && msg.externalSources?.length > 0 && (<>
                        <Globe size={12} className="text-violet-600 dark:text-violet-500 ml-2" />
                        <span className="text-[11px] text-violet-700 dark:text-violet-400 font-semibold uppercase tracking-wider">External:</span>
                        {msg.externalSources.map((src, j) => (
                          <a key={j} href={src.url || '#'} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-md text-[10px] uppercase font-bold border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-800/50 transition-colors no-underline">
                            {src.origin} {src.url && <ExternalLink size={8} />}
                          </a>
                        ))}
                      </>)}
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
                      <div key={i}>
                        {/* Regular status/sources/external_sources steps */}
                        {step.type !== 'debug' && (
                          <div className="flex items-start gap-2.5">
                            {step.type === 'status' && step.text.includes('Searching') && <Search size={14} className="text-amber-500 mt-0.5 shrink-0 animate-pulse" />}
                            {step.type === 'status' && step.text.includes('Found') && <Database size={14} className="text-emerald-500 mt-0.5 shrink-0" />}
                            {step.type === 'status' && step.text.includes('No relevant') && <AlertCircle size={14} className="text-slate-400 mt-0.5 shrink-0" />}
                            {step.type === 'status' && step.text.includes('Generating') && <Sparkles size={14} className="text-blue-500 mt-0.5 shrink-0 animate-pulse" />}
                            {step.type === 'status' && step.text.includes('Researching') && <Globe size={14} className="text-violet-500 mt-0.5 shrink-0 animate-pulse" />}
                            {step.type === 'status' && step.text.includes('cached') && <Zap size={14} className="text-amber-500 mt-0.5 shrink-0" />}
                            {step.type === 'sources' && <BookOpen size={14} className="text-emerald-500 mt-0.5 shrink-0" />}
                            {step.type === 'external_sources' && <Globe size={14} className="text-violet-500 mt-0.5 shrink-0" />}
                            <div>
                              {step.type === 'status' && <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{step.text}</span>}
                              {step.type === 'sources' && step.data.found && (
                                <div className="flex flex-wrap gap-1.5">
                                  {step.data.sources.map((src, j) => (
                                    <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md text-[10px] uppercase font-bold border border-emerald-100 dark:border-emerald-800">{src}</span>
                                  ))}
                                </div>
                              )}
                              {step.type === 'external_sources' && step.data.found && (
                                <div className="flex flex-wrap gap-1.5">
                                  {step.data.sources.map((src, j) => (
                                    <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-md text-[10px] uppercase font-bold border border-violet-200 dark:border-violet-800">
                                      {src.origin}: {src.topic} {step.data.cached && '(cached)'}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Debug thought-process panels */}
                        {step.type === 'debug' && (
                          <div className="mt-1 mb-1">
                            <button
                              onClick={() => setDebugOpen(prev => ({ ...prev, [i]: !prev[i] }))}
                              className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-lg bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/50 hover:bg-amber-100/80 dark:hover:bg-amber-900/30 transition-colors"
                            >
                              <Bug size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
                              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex-1">
                                {step.data.title || 'Debug'}
                              </span>
                              {debugOpen[i] ? <ChevronUp size={12} className="text-amber-500" /> : <ChevronDown size={12} className="text-amber-500" />}
                            </button>
                            {debugOpen[i] && (
                              <div className="mt-1 ml-1 pl-3 border-l-2 border-amber-200 dark:border-amber-800/60 space-y-0.5 py-1">
                                {step.data.reasoning?.map((line, k) => (
                                  <p key={k} className="text-[11px] text-amber-800 dark:text-amber-300/90 font-mono leading-relaxed whitespace-pre-wrap">{line}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
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
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                placeholder={externalEnabled ? "Message AI Tutor (External knowledge ON)..." : "Message AI Tutor..."}
                disabled={loading}
                className="flex-1 px-4 py-3 max-h-32 min-h-[48px] resize-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner disabled:opacity-50"
                rows={1}
              />
              <button type="submit" disabled={!input.trim() || loading}
                className="h-12 w-12 shrink-0 flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:hover:translate-y-0 transition-all shadow-md active:scale-95">
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
