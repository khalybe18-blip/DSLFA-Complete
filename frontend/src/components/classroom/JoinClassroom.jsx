/**
 * JoinClassroom — rendered for students only.
 * Accepts a class_code and calls POST /api/v1/classrooms/join.
 */
import { useState } from 'react';
import { Hash, LogIn, Loader2, CheckCircle } from 'lucide-react';
import { useClassrooms } from '../../hooks/useClassrooms';

export default function JoinClassroom({ onSuccess }) {
  const [code, setCode]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const { joinClassroom }         = useClassrooms();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError('Please enter a class code'); return; }
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const result = await joinClassroom(trimmed);
      setSuccess(`Joined "${result.classroom.class_name}" successfully!`);
      setCode('');
      onSuccess?.(result.classroom);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join classroom');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bento-card p-6 w-full">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
          <LogIn className="text-emerald-600 dark:text-emerald-400" size={20} />
        </div>
        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Join a Classroom</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="join-class-code"
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Enter class code (e.g. AB12CD34)"
            maxLength={20}
            className="ui-input font-mono tracking-widest uppercase"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 border border-red-200 dark:border-red-800">
            {error}
          </p>
        )}
        {success && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
            <CheckCircle size={14} /> {success}
          </p>
        )}

        <button
          type="submit"
          id="join-class-submit"
          disabled={submitting}
          className="ui-button w-full shadow-md hover:shadow-emerald-500/20"
        >
          {submitting ? <><Loader2 size={15} className="animate-spin" /> Joining…</> : <><LogIn size={15} /> Join Classroom</>}
        </button>
      </form>
    </div>
  );
}
