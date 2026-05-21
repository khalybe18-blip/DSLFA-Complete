/**
 * CreateClassroomButton — shown only to teachers.
 * Opens an inline modal to create a new classroom.
 */
import { useState } from 'react';
import { PlusCircle, X, BookOpen, Loader2 } from 'lucide-react';
import { useClassrooms } from '../../hooks/useClassrooms';

export default function CreateClassroomButton({ onSuccess }) {
  const [open, setOpen]         = useState(false);
  const [className, setClassName] = useState('');
  const [subject, setSubject]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');
  const { createClassroom }     = useClassrooms();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!className.trim()) { setError('Class name is required'); return; }
    setSubmitting(true); setError('');
    try {
      const classroom = await createClassroom({ class_name: className.trim(), subject: subject.trim() });
      setOpen(false);
      setClassName(''); setSubject('');
      onSuccess?.(classroom);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create classroom');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        id="create-classroom-btn"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold text-sm shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-200"
      >
        <PlusCircle size={18} />
        Create Classroom
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bento-card w-full max-w-md p-7 relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
                <BookOpen className="text-indigo-600 dark:text-indigo-400" size={22} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">New Classroom</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Class Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="new-class-name"
                  type="text"
                  value={className}
                  onChange={e => setClassName(e.target.value)}
                  placeholder="e.g. Advanced Mathematics"
                  className="ui-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Subject <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="new-class-subject"
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Engineering, Physics…"
                  className="ui-input"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="ui-button w-full shadow-md"
              >
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Creating…</> : 'Create Classroom'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
