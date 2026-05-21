import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Notes from './pages/Notes';
import NoteSummary from './pages/NoteSummary';
import AiTutor from './pages/AiTutor';
import VectorStore from './pages/VectorStore';
import QuizDashboard from './pages/QuizDashboard';
import FlashcardDashboard from './pages/FlashcardDashboard';
import Dashboard from './pages/Dashboard';
import Reminders from './pages/Reminders';
import Login from './pages/Login';
import Register from './pages/Register';
import Classrooms from './pages/Classrooms';
import ClassroomDashboard from './pages/ClassroomDashboard';
import MaterialsLab from './pages/MaterialsLab';
import AssessmentManager from './pages/AssessmentManager';
import NoticeBoard from './pages/NoticeBoard';
import DataAudit from './pages/DataAudit';
import TeacherAnalytics from './pages/TeacherAnalytics';
import AdminDashboard from './pages/AdminDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center bg-[#030712] text-[#deff9a]">Loading StudyOS...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'admin') return <Navigate to="/admin" />;
    if (user?.role === 'teacher' || user?.role === 'facilitator') return <Navigate to="/analytics" />;
    return <Navigate to="/student-dashboard" />;
  }
  
  return children;
};

const SmartIndexRoute = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" />;
  if (user?.role === 'teacher' || user?.role === 'facilitator') return <Navigate to="/analytics" />;
  return <Navigate to="/student-dashboard" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<SmartIndexRoute />} />
            
            {/* Student Only Routes */}
            <Route path="student-dashboard" element={<ProtectedRoute allowedRoles={['student']}><Dashboard /></ProtectedRoute>} />
            <Route path="notes" element={<Notes />} />
            <Route path="summary/:id" element={<NoteSummary />} />
            <Route path="tutor" element={<AiTutor />} />
            <Route path="quizzes" element={<QuizDashboard />} />
            <Route path="flashcards" element={<FlashcardDashboard />} />
            <Route path="reminders" element={<Reminders />} />
            <Route path="classrooms" element={<Classrooms />} />
            <Route path="classrooms/:classId" element={<ClassroomDashboard />} />
            
            {/* Facilitator Only Routes */}
            <Route path="materials-lab" element={<ProtectedRoute allowedRoles={['teacher', 'facilitator', 'admin']}><MaterialsLab /></ProtectedRoute>} />
            <Route path="assessment-manager" element={<ProtectedRoute allowedRoles={['teacher', 'facilitator', 'admin']}><AssessmentManager /></ProtectedRoute>} />
            <Route path="notice-board" element={<ProtectedRoute allowedRoles={['teacher', 'facilitator', 'admin']}><NoticeBoard /></ProtectedRoute>} />
            <Route path="analytics" element={<ProtectedRoute allowedRoles={['teacher', 'facilitator', 'admin']}><TeacherAnalytics /></ProtectedRoute>} />
            
            {/* Admin Only Routes */}
            <Route path="data-audit" element={<ProtectedRoute allowedRoles={['admin']}><DataAudit /></ProtectedRoute>} />
            <Route path="vectorstore" element={<ProtectedRoute allowedRoles={['admin']}><VectorStore /></ProtectedRoute>} />
            <Route path="admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
