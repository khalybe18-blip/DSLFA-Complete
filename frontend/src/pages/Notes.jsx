import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Upload, FileText, Trash2, Search, Loader2 } from 'lucide-react';

const Notes = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/documents');
      setDocuments(response.data.documents);
    } catch (err) {
      setError('Failed to fetch documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('http://localhost:5000/api/documents/upload', formData);
      
      setFile(null);
      document.getElementById('file-upload').value = '';
      fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/documents/${id}`);
      fetchDocuments();
    } catch (err) {
      setError('Failed to delete document');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white transition-colors">My Notes</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors">Upload and manage your study materials</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm border border-red-100 dark:border-red-900/50 flex items-center justify-between transition-colors">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 dark:hover:text-red-300">&times;</button>
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
        <h2 className="text-lg font-semibold mb-4 dark:text-white transition-colors">Upload New Material</h2>
        <form onSubmit={handleUpload} className="flex gap-4 items-center">
          <div className="flex-1">
            <label 
              htmlFor="file-upload" 
              className={`flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                file ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="text-center">
                <Upload className={`mx-auto h-8 w-8 mb-2 ${file ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                {file ? (
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">{file.name}</p>
                ) : (
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Click to upload</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400"> or drag and drop</span>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">PDF, DOCX, PPTX, TXT up to 10MB</p>
                  </div>
                )}
              </div>
              <input 
                id="file-upload" 
                name="file" 
                type="file" 
                className="hidden" 
                accept=".pdf,.docx,.pptx,.txt"
                onChange={handleFileChange}
              />
            </label>
          </div>
          
          <button
            type="submit"
            disabled={!file || uploading}
            className="px-6 py-8 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors min-w-[120px] justify-center"
          >
            {uploading ? (
              <><Loader2 className="animate-spin" size={20} /> Uploading...</>
            ) : (
              'Upload'
            )}
          </button>
        </form>
      </div>

      {/* Documents List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">Your Documents</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Filter notes..." 
              className="pl-9 pr-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-blue-500/40 dark:focus:border-blue-400 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            <Loader2 className="animate-spin mx-auto h-8 w-8 mb-2" />
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">No notes yet</p>
            <p className="text-sm mt-1">Upload your first document above to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {documents.map((doc) => (
              <li key={doc.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase">
                    {doc.file_type}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-slate-200 transition-colors">{doc.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      <span className={`px-2 py-0.5 rounded-full ${
                        doc.status === 'ready' ? 'bg-green-100/50 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        doc.status === 'processing' ? 'bg-yellow-100/50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                        doc.status === 'failed' ? 'bg-red-100/50 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link 
                    to={`/summary/${doc.id}`}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    View Summary
                  </Link>
                  <button 
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Notes;
