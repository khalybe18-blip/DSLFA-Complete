import { useState } from 'react';
import { FileText, Play, Settings2, Target, Clock, BrainCircuit } from 'lucide-react';

const QuizSetup = ({ documents, loading, error, onGenerate }) => {
  const [selectedDocs, setSelectedDocs] = useState([]);
  
  const [preferences, setPreferences] = useState({
    difficulty: 'Medium',
    length: 5,
    questionTypes: 'Mixed',
    outOfDomain: false,
    simulationMode: 'University Exam',
    timeLimit: 'None'
  });

  const toggleDoc = (id) => {
    setSelectedDocs(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleStart = () => {
    if (selectedDocs.length === 0) {
      alert("Please select at least one document.");
      return;
    }
    onGenerate(selectedDocs, preferences);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold dark:text-white transition-colors">Quiz Studio</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors">Generate personalized quizzes from your notes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: Document Selection */}
        <div className="col-span-1 md:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 dark:text-white">
              <FileText className="text-blue-500" size={20} /> Select Materials
            </h2>
            
            {loading ? (
              <p className="text-slate-500 dark:text-slate-400">Loading documents...</p>
            ) : error ? (
              <p className="text-red-500 font-medium">{error}</p>
            ) : documents.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No documents found. Please upload some text or notes first.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {documents.map((doc) => (
                  <label 
                    key={doc.id} 
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedDocs.includes(doc.id) 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600' 
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      className="mt-1 flex-shrink-0 w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600" 
                      checked={selectedDocs.includes(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                    />
                    <div>
                      <h4 className="text-sm font-medium dark:text-slate-200">{doc.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{doc.file_type.toUpperCase()} • {new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Preferences */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 dark:text-white">
              <Settings2 className="text-purple-500" size={20} /> Quiz Settings
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Difficulty</label>
                <select 
                  value={preferences.difficulty}
                  onChange={(e) => setPreferences({...preferences, difficulty: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                  <option>Mixed</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Length</label>
                <select 
                  value={preferences.length}
                  onChange={(e) => setPreferences({...preferences, length: parseInt(e.target.value)})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Question Types</label>
                <select 
                  value={preferences.questionTypes}
                  onChange={(e) => setPreferences({...preferences, questionTypes: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Mixed</option>
                  <option>MCQ Only</option>
                  <option>True / False Only</option>
                  <option>Short Answer Only</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Simulation Mode</label>
                <select 
                  value={preferences.simulationMode}
                  onChange={(e) => setPreferences({...preferences, simulationMode: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Standard Review</option>
                  <option>University Exam</option>
                  <option>Technical Interview Round</option>
                  <option>Placement Aptitude</option>
                  <option>Competitive Exam Style</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-2 group">
                <input 
                  type="checkbox" 
                  checked={preferences.outOfDomain}
                  onChange={(e) => setPreferences({...preferences, outOfDomain: e.target.checked})}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Include Out-of-Domain Challenge?</span>
              </label>

            </div>
          </div>

          <button 
            onClick={handleStart}
            disabled={selectedDocs.length === 0}
            className="w-full bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/20"
          >
            <Play fill="currentColor" size={18} />
            Generate & Start Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizSetup;
