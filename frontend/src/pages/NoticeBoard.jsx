import React, { useState, useEffect } from 'react';
import { useClassrooms } from '../hooks/useClassrooms';
import { Bell, Send, User, Clock, Trash2, Edit3, Target, LayoutTemplate, Calendar, BellRing } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';

const NoticeBoard = () => {
  const { classrooms, getAnnouncements, postAnnouncement } = useClassrooms();
  const [selectedClass, setSelectedClass] = useState('');
  const [notices, setNotices] = useState([]);
  const [heading, setHeading] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (classrooms.length > 0 && !selectedClass) {
      setSelectedClass(classrooms[0].class_id);
    }
  }, [classrooms]);

  useEffect(() => {
    if (selectedClass) {
      loadNotices();
    }
  }, [selectedClass]);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const data = await getAnnouncements(selectedClass);
      setNotices(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim() || !selectedClass) return;
    try {
      // Safely combine heading and content to preserve backend schema which only takes 'content'
      const finalContent = heading.trim() ? `**${heading}**\n\n${content}` : content;
      await postAnnouncement(selectedClass, finalContent);
      setContent('');
      setHeading('');
      loadNotices();
    } catch (err) {
      alert("Failed to post notice");
    }
  };

  const filteredNotices = notices.filter(n => 
    n.content.toLowerCase().includes(search.toLowerCase()) || 
    (n.author_name && n.author_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="bg-[#f8fafc] dark:bg-[#0a0d14] h-[calc(100vh-5rem)] overflow-hidden text-[#0f172a] dark:text-[#e2e8f0] transition-colors duration-300">
      <div className="max-w-[1400px] h-full mx-auto p-6 md:p-8 space-y-6 overflow-y-auto">
        
        {/* Full Head Horizontal Symmetry */}
        <PageHeader
          title={<span>NOTICE <span className="text-[#ff6b35]">BOARD</span></span>}
          subtitle="Broadcast updates to your classroom students."
          searchQuery={search}
          onSearchChange={setSearch}
        />

        {/* Two-Panel Interactive Core Structural Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel Area (The Announcement Composition Studio) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[24px] border border-[#e2e8f0] dark:border-white/[0.08] rounded-[16px] p-6 shadow-sm dark:shadow-xl transition-colors duration-300">
              <h2 className="text-sm font-black text-[#0f172a] dark:text-[#f1f5f9] mb-6 flex items-center gap-2 transition-colors duration-300">
                <Edit3 size={18} className="text-[#ff6b35]" />
                Announcement Composition Studio
              </h2>

              <form onSubmit={handlePost} className="space-y-5">
                {/* Notice Heading Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#64748b] dark:text-[#94a3b8] uppercase tracking-widest transition-colors duration-300 flex items-center gap-1.5">
                    <LayoutTemplate size={12} /> Notice Heading
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Upcoming Midterm Schedule"
                    value={heading}
                    onChange={(e) => setHeading(e.target.value)}
                    className="w-full bg-[#f8fafc] dark:bg-white/[0.05] border border-[#e2e8f0] dark:border-white/[0.08] rounded-xl px-4 py-3 text-sm font-bold text-[#0f172a] dark:text-[#f1f5f9] focus:ring-2 focus:ring-[#ff6b35] outline-none transition-all placeholder:text-[#94a3b8]/50 dark:placeholder:text-[#64748b]/50"
                  />
                </div>

                {/* Target Specific Classroom Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#64748b] dark:text-[#94a3b8] uppercase tracking-widest transition-colors duration-300 flex items-center gap-1.5">
                    <Target size={12} /> Target Classroom
                  </label>
                  <select 
                    value={selectedClass || ''} 
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="appearance-none w-full bg-[#f8fafc] dark:bg-white/[0.05] border border-[#e2e8f0] dark:border-white/[0.08] rounded-xl px-4 py-3 text-sm font-bold text-[#0f172a] dark:text-[#f1f5f9] focus:ring-2 focus:ring-[#ff6b35] outline-none transition-all cursor-pointer"
                  >
                    {classrooms.map(c => (
                      <option key={c.class_id} value={c.class_id} className="dark:bg-[#111214]">{c.class_name}</option>
                    ))}
                  </select>
                </div>

                {/* Main Body Textarea */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#64748b] dark:text-[#94a3b8] uppercase tracking-widest transition-colors duration-300 flex items-center gap-1.5">
                    <Bell size={12} /> Message Body
                  </label>
                  <textarea 
                    placeholder="Type your announcement here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full bg-[#f8fafc] dark:bg-white/[0.05] border border-[#e2e8f0] dark:border-white/[0.08] rounded-xl px-4 py-3 text-sm font-medium text-[#0f172a] dark:text-[#f1f5f9] focus:ring-2 focus:ring-[#ff6b35] outline-none transition-all resize-none h-32 placeholder:text-[#94a3b8]/50 dark:placeholder:text-[#64748b]/50 custom-scrollbar"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <motion.button 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={!content.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-[#ff6b35] text-white rounded-[9999px] text-xs font-black uppercase tracking-wide transition-all disabled:opacity-50 disabled:hover:scale-100 hover:shadow-[0_0_20px_rgba(255,107,53,0.3)]"
                  >
                    <Send size={16} />
                    Broadcast Bulletin
                  </motion.button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Panel Area (Active Broadcast Feed Timeline) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-[rgba(22,28,45,0.45)] dark:backdrop-blur-[24px] border border-[#e2e8f0] dark:border-white/[0.08] rounded-[16px] p-6 shadow-sm dark:shadow-xl transition-colors duration-300 min-h-[500px] flex flex-col">
              
              <div className="flex items-center justify-between mb-6 border-b border-[#e2e8f0] dark:border-white/[0.08] pb-4 transition-colors duration-300">
                <h2 className="text-sm font-black text-[#0f172a] dark:text-[#f1f5f9] flex items-center gap-2 transition-colors duration-300">
                  <BellRing className="w-4 h-4 mr-2 text-[#ff6b35]" />
                  RECENT BROADCASTS
                </h2>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#ff6b35] animate-pulse" />
                  <span className="text-[10px] font-black text-[#64748b] dark:text-[#94a3b8] uppercase tracking-widest">Live Feed</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {loading ? (
                  <div className="py-20 text-center text-[#64748b] dark:text-[#94a3b8] font-bold animate-pulse transition-colors duration-300">
                    Synchronizing feed...
                  </div>
                ) : filteredNotices.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-[#64748b] dark:text-[#94a3b8] transition-colors duration-300">
                    <BellRing size={32} className="mb-4 opacity-20" />
                    <p className="text-sm font-bold">No active bulletins in this stream.</p>
                  </div>
                ) : (
                  filteredNotices.map((notice, i) => {
                    const noticeClass = classrooms.find(c => c.class_id === selectedClass);
                    const classNameLabel = noticeClass ? noticeClass.class_name : 'Classroom';
                    
                    // Simple parse to separate pseudo-heading if we appended it
                    let displayHeading = '';
                    let displayContent = notice.content;
                    if (notice.content.startsWith('**') && notice.content.includes('**\n\n')) {
                      const parts = notice.content.split('**\n\n');
                      displayHeading = parts[0].replace('**', '');
                      displayContent = parts[1];
                    }

                    return (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="group p-5 rounded-xl bg-[#f8fafc] dark:bg-white/[0.02] border border-[#e2e8f0] dark:border-white/[0.05] hover:border-[#cbd5e1] dark:hover:border-white/[0.15] transition-all shadow-sm dark:shadow-none relative"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-white/[0.05] border border-[#e2e8f0] dark:border-white/[0.1] flex items-center justify-center text-[#64748b] dark:text-[#94a3b8] shrink-0 transition-colors duration-300">
                              <User size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-black text-[#0f172a] dark:text-[#f1f5f9] transition-colors duration-300">{notice.author_name || 'Instructor'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="flex items-center gap-1 text-[9px] font-bold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider transition-colors duration-300">
                                  <Calendar size={10} />
                                  {new Date(notice.timestamp).toLocaleDateString()}
                                </span>
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-[#ff6b35]/10 text-[#ff6b35] uppercase tracking-widest">
                                  {classNameLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <button className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-[#64748b] dark:text-[#94a3b8] hover:text-red-500 hover:bg-[#f1f5f9] dark:hover:bg-white/[0.05] transition-all" title="Delete Notice">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        
                        <div className="pl-[52px]">
                          {displayHeading && (
                            <h4 className="text-sm font-black text-[#0f172a] dark:text-[#f1f5f9] mb-1 transition-colors duration-300">{displayHeading}</h4>
                          )}
                          <p className="text-sm text-[#64748b] dark:text-[#94a3b8] leading-relaxed whitespace-pre-wrap transition-colors duration-300">
                            {displayContent}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default NoticeBoard;
