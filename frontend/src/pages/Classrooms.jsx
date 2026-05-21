import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import { 
  BookOpen, Users, Layers, ArrowRight, Loader2,
  Send, CheckCircle2, XCircle, Megaphone, Globe, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useClassrooms } from '../hooks/useClassrooms';
import CreateClassroomButton from '../components/classroom/CreateClassroomButton';
import JoinClassroom from '../components/classroom/JoinClassroom';

export default function Classrooms() {
  const { isTeacher, isStudent, user } = useAuth();
  const { classrooms, loading, error, fetchClassrooms } = useClassrooms();
  
  // Student States
  const [invitations, setInvitations] = useState([]);
  const [publicClasses, setPublicClasses] = useState([]);
  
  // Teacher States
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteClassId, setInviteClassId] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastClassId, setBroadcastClassId] = useState('');

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchClassrooms();
    if (isStudent) {
      fetchInvitations();
      fetchPublicClasses();
    }
  }, [fetchClassrooms, isStudent]);

  const fetchInvitations = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/v1/classrooms/invitations`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setInvitations(res.data.invitations || []);
    } catch (err) { console.error(err); }
  };

  const fetchPublicClasses = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/v1/classrooms/public`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPublicClasses(res.data.classrooms || []);
    } catch (err) { console.error(err); }
  };

  const handleRespondInvite = async (inviteId, action) => {
    try {
      await axios.post(`${API_BASE}/api/v1/classrooms/invitations/${inviteId}/respond`, { action }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchInvitations();
      if (action === 'accept') fetchClassrooms();
    } catch (err) { console.error(err); }
  };

  const handleJoinPublic = async (classCode) => {
    try {
      await axios.post(`${API_BASE}/api/v1/classrooms/join`, { class_code: classCode }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchClassrooms();
      fetchPublicClasses();
    } catch (err) { alert(err.response?.data?.message || 'Error joining class'); }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !inviteClassId) return alert('Select class and enter email');
    try {
      await axios.post(`${API_BASE}/api/v1/classrooms/${inviteClassId}/invitations`, { email: inviteEmail }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Invitation sent successfully!');
      setInviteEmail('');
    } catch (err) { alert(err.response?.data?.message || 'Error sending invite'); }
  };

  const handleToggleVisibility = async (e, classId, currentStatus) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await axios.post(`${API_BASE}/api/v1/classrooms/${classId}/visibility`, { is_public: !currentStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchClassrooms();
    } catch (err) { console.error(err); }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMessage || !broadcastClassId) return alert('Select class and enter message');
    try {
      await axios.post(`${API_BASE}/api/v1/classrooms/${broadcastClassId}/announcements`, { content: broadcastMessage }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Broadcast sent globally to class!');
      setBroadcastMessage('');
    } catch (err) { alert(err.response?.data?.message || 'Error broadcasting'); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-16 animate-in fade-in duration-500">
      
      {/* Universal Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-light-border dark:border-border-gray pb-6">
        <div>
          <h1 className="text-3xl font-black text-light-heading dark:text-white flex items-center gap-3">
            <BookOpen className="text-coral-orange" size={32} />
            {isTeacher ? 'Facilitator Hub' : 'Classroom Hub'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {isTeacher ? 'Manage classes, dispatch invites, and broadcast messages.' : 'Discover public classes and manage your enrollments.'}
          </p>
        </div>
        {isTeacher && (
          <CreateClassroomButton onSuccess={fetchClassrooms} />
        )}
      </div>

      {/* ----------------- STUDENT WORKSPACE ----------------- */}
      {isStudent && (
        <div className="space-y-10">
          
          {/* Top Section: Join & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bento-card p-6">
              <h2 className="text-lg font-bold mb-4">Join a Classroom</h2>
              <JoinClassroom onSuccess={fetchClassrooms} />
            </div>
            <div className="bento-card bg-gradient-to-br from-coral-orange/10 to-transparent p-6 flex flex-col justify-center">
              <h2 className="text-sm font-bold text-coral-orange mb-4 uppercase tracking-wider">Quick Stats</h2>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-slate-500">Enrolled Classes</span>
                <span className="text-2xl font-black text-light-heading dark:text-white">{classrooms.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-500">Pending Invites</span>
                <span className="text-2xl font-black text-coral-orange">{invitations.length}</span>
              </div>
            </div>
          </div>

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-coral-orange animate-pulse"></span>
                Pending Invitations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {invitations.map(inv => (
                  <div key={inv.id} className="bento-card p-5 border-coral-orange/30 dark:border-coral-orange/30 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-bold text-coral-orange mb-1">Incoming Invite</p>
                      <h3 className="text-lg font-black mb-4">{inv.class_name}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRespondInvite(inv.id, 'accept')} className="flex-1 ui-button py-2 text-xs">
                        <CheckCircle2 size={16} /> Accept
                      </button>
                      <button onClick={() => handleRespondInvite(inv.id, 'ignore')} className="flex-1 ui-button-secondary py-2 text-xs">
                        <XCircle size={16} /> Ignore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Section: Explore */}
          <div>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Globe className="text-blue-500" /> Explore Public Classes
            </h2>
            {publicClasses.length === 0 ? (
              <div className="bento-card p-8 text-center text-slate-500">No public classes available at the moment.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publicClasses.map(cls => (
                  <div key={cls.class_id} className="bento-card p-6 flex flex-col justify-between group hover:-translate-y-1 transition-all">
                    <div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl w-max mb-4">
                        <Globe size={24} />
                      </div>
                      <h3 className="text-lg font-bold mb-1">{cls.class_name}</h3>
                      <p className="text-sm font-medium text-slate-500 mb-4">By {cls.facilitator_name}</p>
                    </div>
                    <button onClick={() => handleJoinPublic(cls.class_code)} className="ui-button w-full py-2 bg-blue-600 hover:bg-blue-700">
                      Request to Join
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      )}


      {/* ----------------- FACILITATOR WORKSPACE ----------------- */}
      {isTeacher && (
        <div className="space-y-10">
          
          {/* Top Section: Invitation & Broadcast Manager */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Invitation Manager */}
            <div className="bento-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-coral-orange/10 text-coral-orange rounded-lg"><Send size={20} /></div>
                <h2 className="text-lg font-bold">Invitation Manager</h2>
              </div>
              <form onSubmit={handleSendInvite} className="space-y-4">
                <select 
                  value={inviteClassId} onChange={(e) => setInviteClassId(e.target.value)}
                  className="ui-input" required
                >
                  <option value="">Select a classroom...</option>
                  {classrooms.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
                </select>
                <input 
                  type="email" placeholder="Student Email Address" 
                  value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  className="ui-input" required
                />
                <button type="submit" className="ui-button w-full">Dispatch Invite</button>
              </form>
            </div>

            {/* Global Broadcast */}
            <div className="bento-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Megaphone size={20} /></div>
                <h2 className="text-lg font-bold">Global Broadcast</h2>
              </div>
              <form onSubmit={handleBroadcast} className="space-y-4">
                <select 
                  value={broadcastClassId} onChange={(e) => setBroadcastClassId(e.target.value)}
                  className="ui-input" required
                >
                  <option value="">Select a classroom...</option>
                  {classrooms.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
                </select>
                <input 
                  type="text" placeholder="Broadcast message to students..." 
                  value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="ui-input" required
                />
                <button type="submit" className="ui-button w-full bg-blue-600 hover:bg-blue-700 shadow-blue-500/20">Broadcast Now</button>
              </form>
            </div>

          </div>

          {/* Teacher's Classrooms Grid */}
          <div>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Layers className="text-emerald-500" /> Active Classrooms
            </h2>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-12 h-12 text-coral-orange animate-spin" />
              </div>
            ) : classrooms.length === 0 ? (
              <div className="bento-card p-8 text-center text-slate-500">No classrooms created yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classrooms.map((cls) => (
                  <NavLink 
                    key={cls.class_id} 
                    to={`/classrooms/${cls.class_id}`}
                    className="bento-card-interactive p-6 relative overflow-hidden group block"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-coral-orange opacity-50 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-charcoal-gray border border-slate-200 dark:border-border-gray text-slate-700 dark:text-slate-300">
                        <BookOpen size={24} />
                      </div>
                      
                      {/* Visibility Toggle */}
                      <button 
                        onClick={(e) => handleToggleVisibility(e, cls.class_id, cls.is_public)}
                        className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full transition-all ${
                          cls.is_public 
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20' 
                          : 'bg-slate-100 dark:bg-[#1f2023] text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {cls.is_public ? <><Globe size={12}/> Public</> : <><Lock size={12}/> Private</>}
                      </button>
                    </div>

                    <h3 className="text-lg font-black text-light-heading dark:text-white mb-1 group-hover:text-coral-orange transition-colors">
                      {cls.class_name}
                    </h3>
                    <p className="text-xs text-slate-500 mb-6 font-medium">Code: {cls.class_code}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-light-border dark:border-border-gray">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                        <Users size={16} /> {cls.student_count || 0} Students
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#1f2023] flex items-center justify-center text-slate-400 group-hover:bg-coral-orange group-hover:text-white transition-all">
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  </NavLink>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
