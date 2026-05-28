import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Notes from './pages/Notes';
import NoteSummary from './pages/NoteSummary';
import AiTutor from './pages/AiTutor';
import VectorStore from './pages/VectorStore';
import QuizDashboard from './pages/QuizDashboard';
import FlashcardDashboard from './pages/FlashcardDashboard';
import Dashboard from './pages/Dashboard';
import Reminders from './pages/Reminders';
import Resources from './pages/Resources';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="notes" element={<Notes />} />
          <Route path="summary/:id" element={<NoteSummary />} />
          <Route path="tutor" element={<AiTutor />} />
          <Route path="quizzes" element={<QuizDashboard />} />
          <Route path="flashcards" element={<FlashcardDashboard />} />
          <Route path="vectorstore" element={<VectorStore />} />
          <Route path="reminders" element={<Reminders />} />
          <Route path="resources" element={<Resources />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
