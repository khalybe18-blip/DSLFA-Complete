import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Bell, Plus, Trash2, Clock, MapPin, X } from 'lucide-react';

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/reminders');
      setReminders(res.data.reminders || []);
    } catch (e) {
      console.error('Error fetching reminders', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title || !date || !time) return;

    // Combine date and time into ISO string
    const combinedDate = new Date(`${date}T${time}`).toISOString();

    try {
      const res = await axios.post('http://localhost:5000/api/reminders', {
        title,
        date: combinedDate,
        description
      });
      setReminders([...reminders, res.data.reminder].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setIsAdding(false);
      setTitle('');
      setDate('');
      setTime('');
      setDescription('');
    } catch (e) {
      console.error('Failed to add reminder', e);
      alert('Failed to add reminder');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this reminder?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/reminders/${id}`);
      setReminders(reminders.filter(r => r.id !== id));
    } catch (e) {
      console.error('Failed to delete', e);
    }
  };

  // Group reminders into Overdue, Today, Upcoming
  const now = new Date();
  const sortedReminders = reminders.reduce((acc, r) => {
    const d = new Date(r.date);
    if (d < now) acc.past.push(r);
    else acc.upcoming.push(r);
    return acc;
  }, { upcoming: [], past: [] });

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 transition-colors">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold dark:text-white flex items-center gap-3">
            <Calendar className="text-blue-500" size={32} />
            Exam & Event Reminders
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track your upcoming exams and study milestones. The AI Tutor automatically sees these!</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} /> Add Event
        </button>
      </div>

      {/* Add Form Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                <Bell size={18} className="text-blue-500" /> New Reminder
              </h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Event Title (e.g. Math Final)</label>
                <input 
                  type="text" required value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  placeholder="Subject or exam name..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input 
                    type="date" required value={date} onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm dark:text-slate-200 focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time</label>
                  <input 
                    type="time" required value={time} onChange={e => setTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm dark:text-slate-200 focus:ring-2 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes (Optional)</label>
                <textarea 
                  value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm dark:text-slate-200 focus:ring-2 focus:ring-blue-500 resize-none h-24"
                  placeholder="Chapters 1-5, room 402..."
                ></textarea>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2.5 font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-colors">Save Event</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lists */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>
      ) : reminders.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Calendar className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-semibold dark:text-white mb-1">No upcoming exams</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Add your exam dates to help the AI tutor tailor your study plan.</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Upcoming Section */}
          {sortedReminders.upcoming.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Bell size={18} className="text-emerald-500" /> Upcoming
              </h2>
              <div className="space-y-3">
                {sortedReminders.upcoming.map((r, i) => {
                  const d = new Date(r.date);
                  const isSoon = (d - now) < (7 * 24 * 60 * 60 * 1000); // Less than 7 days
                  
                  return (
                    <div key={r.id} className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
                      {isSoon && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-xl"></div>}
                      
                      <div className="flex-shrink-0 w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col items-center justify-center text-blue-700 dark:text-blue-400">
                        <span className="text-xs font-bold uppercase">{d.toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-xl font-black leading-none mt-1">{d.getDate()}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0 pt-1">
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg truncate flex items-center gap-2">
                          {r.title}
                          {isSoon && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] uppercase font-bold tracking-wider">Soon</span>}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1.5"><Clock size={14}/> {d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        {r.description && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700">{r.description}</p>}
                      </div>
                      
                      <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past Section */}
          {sortedReminders.past.length > 0 && (
            <div className="space-y-4 pt-4">
              <h2 className="text-lg font-bold text-slate-400 flex items-center gap-2">
                <Clock size={18} /> Past Events
              </h2>
              <div className="space-y-3 opacity-60">
                {sortedReminders.past.map(r => {
                  const d = new Date(r.date);
                  return (
                    <div key={r.id} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-slate-400 font-mono text-xs w-24">{d.toLocaleDateString()}</div>
                        <h3 className="font-medium text-slate-600 dark:text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600">{r.title}</h3>
                      </div>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default Reminders;
