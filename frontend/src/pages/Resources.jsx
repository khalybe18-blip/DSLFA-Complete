import { useState, useEffect } from 'react';
import axios from 'axios';
import { Globe, Upload, Loader2, Trash2, ExternalLink, FileText, Link2, CheckCircle, XCircle, ToggleLeft, ToggleRight } from 'lucide-react';

const Resources = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchResources = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/resources');
      setResources(res.data.resources || []);
    } catch (err) { console.error('Failed to fetch resources', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchResources(); }, []);

  const handleAddUrl = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const res = await axios.post('http://localhost:5000/api/resources/add-url', { url: urlInput, title: titleInput || urlInput });
      setResources(prev => [res.data.resource, ...prev]);
      setUrlInput(''); setTitleInput('');
      setSuccess('Resource added and processed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add resource');
      setTimeout(() => setError(''), 5000);
    } finally { setSubmitting(false); }
  };

  const handleUploadPdf = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setError(''); setSuccess('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('http://localhost:5000/api/resources/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResources(prev => [res.data.resource, ...prev]);
      setSuccess('PDF uploaded and processed!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
      setTimeout(() => setError(''), 5000);
    } finally { setUploading(false); e.target.value = ''; }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/resources/${id}`);
      setResources(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error('Delete failed', err); }
  };

  const handleToggle = async (id, currentState) => {
    try {
      const res = await axios.patch(`http://localhost:5000/api/resources/${id}/toggle`, { is_active: !currentState });
      setResources(prev => prev.map(r => r.id === id ? res.data.resource : r));
    } catch (err) { console.error('Toggle failed', err); }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"><Globe className="text-white" size={22} /></div>
          External Resources
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Add external URLs or PDFs for your AI Tutor to reference. These are stored separately from your personal notes.</p>
      </div>

      {/* Add URL Form */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Link2 size={16} className="text-violet-500" /> Add URL</h2>
        <form onSubmit={handleAddUrl} className="space-y-3">
          <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://en.wikipedia.org/wiki/..." required
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all" />
          <input type="text" value={titleInput} onChange={(e) => setTitleInput(e.target.value)} placeholder="Title (optional — auto-detected from URL)"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all" />
          <button type="submit" disabled={submitting || !urlInput.trim()}
            className="px-6 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-all flex items-center gap-2">
            {submitting ? <><Loader2 className="animate-spin" size={16} /> Processing...</> : <><Globe size={16} /> Add Resource</>}
          </button>
        </form>
      </div>

      {/* Upload PDF */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Upload size={16} className="text-violet-500" /> Upload External PDF</h2>
        <label className={`flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploading ? 'border-violet-300 bg-violet-50/50 dark:bg-violet-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-violet-400 hover:bg-violet-50/30 dark:hover:bg-violet-900/10'}`}>
          {uploading ? <><Loader2 className="animate-spin text-violet-500" size={20} /><span className="text-sm text-violet-600 dark:text-violet-400 font-medium">Processing...</span></>
            : <><FileText size={20} className="text-slate-400" /><span className="text-sm text-slate-500 dark:text-slate-400">Click to upload PDF, DOCX, or TXT</span></>}
          <input type="file" accept=".pdf,.docx,.txt" onChange={handleUploadPdf} className="hidden" disabled={uploading} />
        </label>
      </div>

      {/* Feedback Messages */}
      {error && <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 flex items-center gap-2"><XCircle size={16} /> {error}</div>}
      {success && <div className="mb-4 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2"><CheckCircle size={16} /> {success}</div>}

      {/* Resource List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Your External Resources ({resources.length})</h2>
        </div>
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-violet-500" size={28} /></div>
        ) : resources.length === 0 ? (
          <div className="text-center p-12 text-slate-400">
            <Globe className="mx-auto mb-3 opacity-40" size={32} />
            <p className="text-sm">No external resources added yet</p>
            <p className="text-xs mt-1">Paste a URL or upload a PDF above to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {resources.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${r.source_type === 'url' ? 'bg-violet-100 dark:bg-violet-900/40' : 'bg-blue-100 dark:bg-blue-900/40'}`}>
                    {r.source_type === 'url' ? <Globe size={16} className="text-violet-600 dark:text-violet-400" /> : <FileText size={16} className="text-blue-600 dark:text-blue-400" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{r.title}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${r.status === 'ready' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : r.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>{r.status}</span>
                      {r.chunk_count > 0 && <span className="text-[10px] text-slate-400">{r.chunk_count} chunks</span>}
                      {r.origin_url && <a href={r.origin_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-500 hover:text-violet-700 flex items-center gap-0.5"><ExternalLink size={10} /> link</a>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleToggle(r.id, r.is_active)} className={`p-1.5 rounded-lg transition-colors ${r.is_active ? 'text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`} title={r.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}>
                    {r.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete resource">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Resources;
