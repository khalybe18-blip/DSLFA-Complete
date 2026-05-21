import { useState, useEffect } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import {
  ArrowLeft, Users, BookOpen, ClipboardList,
  Upload, Loader2, Hash, Calendar, MessageSquare, Copy, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useClassrooms } from '../hooks/useClassrooms';
import ResourceViewer from '../components/classroom/ResourceViewer';
import ManageTestsModule from '../components/classroom/ManageTestsModule';
import StudentQuizView from '../components/classroom/StudentQuizView';
import AnnouncementFeed from '../components/classroom/AnnouncementFeed';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function ClassroomDashboard() {
  const { classId } = useParams();
  const { isTeacher, isStudent } = useAuth();
  const { getResources, getStudents, uploadResource, getAnnouncements } = useClassrooms();

  const [classroom, setClassroom]   = useState(null);
  const [students, setStudents]     = useState([]);
  const [activeTab, setActiveTab]   = useState('stream');
  const [uploading, setUploading]   = useState(false);
  const [uploadMsg, setUploadMsg]   = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [copied, setCopied]         = useState(false);

  useEffect(() => {
    // Fetch classroom detail including class_code
    const fetchClassroom = async () => {
      try {
        const token = localStorage.getItem('token');
        const resp = await axios.get(`${API_BASE}/api/v1/classrooms/${classId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setClassroom(resp.data.classroom);
      } catch (err) {
        console.error("Failed to fetch classroom", err);
      }
    };
    
    fetchClassroom();

    if (isTeacher) {
      getStudents(Number(classId)).then(setStudents).catch(() => {});
    }
  }, [classId, isTeacher]);

  const handleCopyCode = () => {
    if (classroom?.class_code) {
      navigator.clipboard.writeText(classroom.class_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadMsg('');
    try {
      await uploadResource(Number(classId), file);
      setUploadMsg('Uploaded & embedded successfully!');
      setRefreshKey(k => k + 1);
    } catch (err) {
      setUploadMsg(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const tabs = [
    { id: 'stream',    label: 'Stream',    icon: MessageSquare },
    { id: 'classwork', label: 'Classwork', icon: BookOpen },
    { id: 'people',    label: 'People',    icon: Users },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Back nav */}
      <NavLink
        to="/classrooms"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition font-medium"
      >
        <ArrowLeft size={16} /> Back to Classrooms
      </NavLink>

      {/* Hero Section — Google Classroom Style */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 shadow-2xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 via-transparent to-cyan-500/30" />
          <div className="h-full w-full bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>

        <div className="relative p-8 md:p-12 text-white">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold uppercase tracking-wider">
                {classroom?.subject || 'Classroom'}
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                {classroom?.class_name ?? 'Loading…'}
              </h1>
              
              {isTeacher && classroom?.class_code && (
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl w-fit">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Class Code</p>
                    <p className="text-2xl font-mono font-bold tracking-widest text-white">{classroom.class_code}</p>
                  </div>
                  <button 
                    onClick={handleCopyCode}
                    className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white active:scale-95"
                    title="Copy Code"
                  >
                    {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              {isTeacher && (
                <label
                  htmlFor="resource-upload"
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold cursor-pointer transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                >
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  {uploading ? 'Uploading…' : 'Add Classwork'}
                  <input
                    id="resource-upload"
                    type="file"
                    accept=".pdf,.docx,.pptx,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 py-2 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex justify-center gap-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative py-3 text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <tab.icon size={18} /> {tab.label}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'stream' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar info */}
            <div className="hidden lg:block space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Upcoming</h4>
                <p className="text-sm text-slate-500">Woohoo, no work due soon!</p>
                <button className="mt-4 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                  View all
                </button>
              </div>
            </div>
            
            {/* Main stream */}
            <div className="lg:col-span-3">
              <AnnouncementFeed classId={classId} />
            </div>
          </div>
        )}

        {activeTab === 'classwork' && (
          <div className="space-y-12">
            <section>
              <div className="flex items-center gap-3 mb-6">
                <BookOpen className="text-indigo-600" size={24} />
                <h2 className="text-2xl font-bold dark:text-white">Resources</h2>
              </div>
              <ResourceViewer
                key={refreshKey}
                classId={Number(classId)}
                className={classroom?.class_name}
              />
            </section>

            <section className="pt-12 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-6">
                <ClipboardList className="text-indigo-600" size={24} />
                <h2 className="text-2xl font-bold dark:text-white">Assignments & Quizzes</h2>
              </div>
              {isTeacher ? (
                <ManageTestsModule classId={Number(classId)} />
              ) : (
                <StudentQuizView classId={Number(classId)} />
              )}
            </section>
          </div>
        )}

        {activeTab === 'people' && (
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Teacher section */}
            <section>
              <h3 className="text-2xl text-indigo-600 font-bold border-b border-indigo-100 dark:border-indigo-900/50 pb-4 mb-6">
                Teachers
              </h3>
              <div className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  T
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">Facilitator</p>
                  <p className="text-sm text-slate-500">Class Owner</p>
                </div>
              </div>
            </section>

            {/* Students section */}
            <section>
              <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/50 pb-4 mb-6">
                <h3 className="text-2xl text-indigo-600 font-bold">Students</h3>
                <span className="text-sm font-bold text-slate-400">{students.length} students</span>
              </div>
              
              {students.length === 0 ? (
                <div className="text-center py-12">
                   <Users size={48} className="mx-auto text-slate-200 mb-4" />
                   <p className="text-slate-500">No students joined yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {students.map(s => (
                    <div key={s.id} className="flex items-center gap-4 py-4 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                        {s.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <p className="font-medium text-slate-800 dark:text-white">{s.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
