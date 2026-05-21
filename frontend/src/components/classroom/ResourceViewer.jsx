/**
 * ResourceViewer — renders classroom documents for students.
 * Fetches GET /api/v1/classrooms/<class_id>/resources
 */
import { useState, useEffect } from 'react';
import { FileText, FileType, Loader2, AlertCircle, Download } from 'lucide-react';
import axios from 'axios';
import { useClassrooms } from '../../hooks/useClassrooms';

const FILE_COLORS = {
  pdf:  { bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-600 dark:text-red-400'    },
  docx: { bg: 'bg-blue-100 dark:bg-blue-900/30',  text: 'text-blue-600 dark:text-blue-400'  },
  pptx: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
  txt:  { bg: 'bg-slate-100 dark:bg-slate-700',   text: 'text-slate-600 dark:text-slate-300' },
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function ResourceViewer({ classId, className: classNameLabel }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const { getResources }          = useClassrooms();

  useEffect(() => {
    if (!classId) { setLoading(false); return; }
    setLoading(true);
    getResources(classId)
      .then(data => setResources(data.documents || []))
      .catch(e   => setError(e.response?.data?.message || 'Failed to load resources'))
      .finally(() => setLoading(false));
  }, [classId, getResources]);

  const openAuthenticatedFile = async (docId) => {
    try {
      const res = await axios.get(`${API_BASE}/api/documents/${docId}/file`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (e) {
      const msg = e.response?.data?.message || (typeof e.response?.data === 'string' ? e.response.data : null) || 'Could not open file';
      alert(msg);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="animate-spin text-indigo-500" size={28} />
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-3 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
      <AlertCircle size={20} /> <span className="text-sm">{error}</span>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/40">
          <FileType className="text-violet-600 dark:text-violet-400" size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white">Class Resources</h3>
          {classNameLabel && <p className="text-xs text-slate-500">{classNameLabel}</p>}
        </div>
      </div>

      {resources.length === 0 ? (
        <div className="text-center py-10 text-slate-500 dark:text-slate-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No resources uploaded yet.</p>
          <p className="text-xs mt-1">Your teacher will upload study materials here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map(doc => {
            const colors = FILE_COLORS[doc.file_type] || FILE_COLORS.txt;
            return (
              <div
                key={doc.id}
                className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition group"
              >
                <div className={`p-2.5 rounded-xl ${colors.bg} shrink-0`}>
                  <FileText className={colors.text} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{doc.title}</p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">
                    {doc.file_type} · {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                  doc.status === 'ready' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                  doc.status === 'processing' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700' :
                  'bg-slate-100 dark:bg-slate-700 text-slate-500'
                }`}>
                  {doc.status}
                </span>
                <button
                  type="button"
                  title="Open document"
                  onClick={() => openAuthenticatedFile(doc.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition p-1"
                >
                  <Download size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
