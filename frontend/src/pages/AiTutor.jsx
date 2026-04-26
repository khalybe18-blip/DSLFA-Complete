import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Send, Bot, User, Search, Database, Sparkles, 
  FileText, Loader2, AlertCircle, BookOpen, 
  ChevronLeft, Files, Eye
} from 'lucide-react';

const AiTutor = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState([]);
  
  // Document Viewing State
  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pipelineSteps]);

  // Fetch documents on mount
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/documents');
        setDocuments(res.data.documents || []);
      } catch (err) {
        console.error('Failed to fetch documents', err);
      } finally {
        setLoadingDocs(false);
      }
    };
    fetchDocs();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setPipelineSteps([]);

    // Add user message to chat
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    // Build chat history for context (last 10)
    const history = newMessages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      // Use the streaming SSE endpoint
      const response = await fetch('http://localhost:5000/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history: history.slice(0, -1) })
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
      inputRef.current?.focus();
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] max-w-[1400px] mx-auto w-full p-4 lg:p-6 transition-colors">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        
        {/* ================================== */}
        {/* LEFT PANEL: Document Source Viewer */}
        {/* ================================== */}
        <div className="lg:col-span-4 lg:flex flex-col h-full hidden lg:visible bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
          
          {/* Doc Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
            {activeDoc ? (
              <button 
                onClick={() => setActiveDoc(null)}
                className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
              >
                <ChevronLeft size={16} /> Back to Files
              </button>
            ) : (
              <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Files size={18} className="text-blue-500" /> Reference Files
              </h2>
            )}
          </div>

          {/* Doc Body */}
          <div className="flex-1 overflow-hidden relative">
            {activeDoc ? (
              <iframe 
                src={`http://localhost:5000/api/documents/${activeDoc.id}/file`}
                className="w-full h-full border-none bg-slate-100 dark:bg-slate-900"
                title={activeDoc.title}
              />
            ) : (
              <div className="p-4 space-y-3 overflow-y-auto h-full">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 px-1">
                  Open a document below to read along while you chat with our AI Tutor.
                </p>
                {loadingDocs ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
                ) : documents.length === 0 ? (
                  <div className="text-center p-8 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <BookOpen className="mx-auto mb-2 opacity-50" size={24} />
                    <p className="text-sm">No documents uploaded</p>
                  </div>
                ) : (
                  documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setActiveDoc(doc)}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate pr-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {doc.title}
                        </h4>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mt-1">{doc.file_type} File</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                        <Eye size={14} className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================================== */}
        {/* RIGHT PANEL: AI Tutor Chat         */}
        {/* ================================== */}
        <div className="lg:col-span-8 flex flex-col h-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors relative">
          
          {/* Chat Header */}
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
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
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
                  I can answer questions using your uploaded notes. I'll read your context files dynamically!
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
