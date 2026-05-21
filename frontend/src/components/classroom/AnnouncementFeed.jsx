import { useState, useEffect } from 'react';
import { Send, User, Clock, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useClassrooms } from '../../hooks/useClassrooms';

export default function AnnouncementFeed({ classId }) {
  const { isTeacher } = useAuth();
  const { getAnnouncements, postAnnouncement } = useClassrooms();
  const [announcements, setAnnouncements] = useState([]);
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await getAnnouncements(Number(classId));
      setAnnouncements(data);
    } catch (err) {
      console.error('Failed to fetch announcements', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [classId]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setPosting(true);
    try {
      await postAnnouncement(Number(classId), newContent);
      setNewContent('');
      fetchAnnouncements();
    } catch (err) {
      console.error('Failed to post announcement', err);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Post Box — Teacher Only */}
      {isTeacher && (
        <form 
          onSubmit={handlePost}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <User size={20} />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Announce something to your class
            </p>
          </div>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Share an update, link, or note with your students..."
            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] resize-none dark:text-white"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={posting || !newContent.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              {posting ? 'Posting...' : 'Post Announcement'}
              <Send size={16} />
            </button>
          </div>
        </form>
      )}

      {/* Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading stream...</div>
        ) : announcements.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center">
            <div className="bg-white dark:bg-slate-800 w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={24} className="text-slate-400" />
            </div>
            <h4 className="text-slate-800 dark:text-white font-bold mb-1">No announcements yet</h4>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              This is where your class stream lives. Announcements and updates will appear here.
            </p>
          </div>
        ) : (
          announcements.map((a) => (
            <div 
              key={a.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {a.author_name?.[0]?.toUpperCase() ?? 'A'}
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-800 dark:text-white">{a.author_name}</h5>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Clock size={12} />
                      {new Date(a.created_at).toLocaleDateString()} at {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {a.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
