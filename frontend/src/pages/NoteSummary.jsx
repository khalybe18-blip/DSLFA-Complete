import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Brain, FileText, Loader2, BookOpen,
  Clock, Tag, FunctionSquare, List, Star, Users, Code, Map
} from 'lucide-react';

// Maps section types/titles to appropriate icons
const getSectionIcon = (title, type) => {
  const t = (title || '').toLowerCase();
  if (t.includes('timeline') || t.includes('history') || t.includes('date')) return <Clock size={20} className="text-amber-500" />;
  if (t.includes('formula') || t.includes('equation') || t.includes('theorem')) return <FunctionSquare size={20} className="text-purple-500" />;
  if (t.includes('skill') || t.includes('competenc') || t.includes('tech')) return <Star size={20} className="text-yellow-500" />;
  if (t.includes('concept') || t.includes('definition') || t.includes('term')) return <BookOpen size={20} className="text-blue-500" />;
  if (t.includes('people') || t.includes('figure') || t.includes('character')) return <Users size={20} className="text-pink-500" />;
  if (t.includes('code') || t.includes('algorithm') || t.includes('pattern')) return <Code size={20} className="text-emerald-500" />;
  if (t.includes('project') || t.includes('experience')) return <Map size={20} className="text-indigo-500" />;
  if (type === 'keyvalue') return <Tag size={20} className="text-teal-500" />;
  return <List size={20} className="text-blue-500" />;
};

// Color palette for section cards
const sectionColors = [
  { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-800/30', accent: 'bg-blue-500' },
  { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-100 dark:border-purple-800/30', accent: 'bg-purple-500' },
  { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-100 dark:border-amber-800/30', accent: 'bg-amber-500' },
  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-800/30', accent: 'bg-emerald-500' },
  { bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-100 dark:border-pink-800/30', accent: 'bg-pink-500' },
  { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-100 dark:border-indigo-800/30', accent: 'bg-indigo-500' },
];

// Renders a single section based on its type
const SectionRenderer = ({ section, colorIndex }) => {
  const colors = sectionColors[colorIndex % sectionColors.length];
  const icon = getSectionIcon(section.title, section.type);

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-xl p-5 shadow-sm transition-colors`}>
      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        {icon}
        {section.title}
      </h3>

      {/* LIST type */}
      {section.type === 'list' && (
        <ul className="space-y-2">
          {(section.items || []).map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              <div className={`w-1.5 h-1.5 rounded-full ${colors.accent} mt-2 flex-shrink-0`}></div>
              <span className="leading-relaxed">{typeof item === 'string' ? item : JSON.stringify(item)}</span>
            </li>
          ))}
        </ul>
      )}

      {/* TIMELINE type */}
      {section.type === 'timeline' && (
        <div className="space-y-3">
          {(section.items || []).map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${colors.accent} flex-shrink-0`}></div>
                {i < section.items.length - 1 && <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700 mt-1"></div>}
              </div>
              <div className="pb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{item.date || item.period || item.year}</span>
                <p className="text-sm text-slate-800 dark:text-slate-200 mt-0.5">{item.event || item.description || item.title}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KEYVALUE type */}
      {section.type === 'keyvalue' && (
        <div className="space-y-2">
          {(section.items || []).map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm bg-white/60 dark:bg-slate-900/40 p-2.5 rounded-lg transition-colors">
              <span className="font-semibold text-slate-700 dark:text-slate-300 min-w-[100px] flex-shrink-0">{item.key || item.label}:</span>
              <span className="text-slate-600 dark:text-slate-400">{item.value || item.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* FORMULAS type */}
      {section.type === 'formulas' && (
        <div className="space-y-3">
          {(section.items || []).map((item, i) => (
            <div key={i} className="bg-white/60 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50 transition-colors">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-200 mb-1.5">{item.name || item.title}</h4>
              <code className="block bg-slate-900 text-green-400 px-3 py-2 rounded text-sm font-mono mb-2">
                {item.equation || item.formula || item.expression}
              </code>
              {(item.description || item.explanation) && (
                <p className="text-xs text-slate-600 dark:text-slate-400">{item.description || item.explanation}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const NoteSummary = () => {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/ai/summary/${id}`);
        setSummary(response.data.summary);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch summary');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSummary();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-lg font-medium">Loading Summary...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to="/notes" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm">
          <ArrowLeft size={16} /> Back to Notes
        </Link>
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 text-center">
          <FileText className="mx-auto w-12 h-12 text-red-300 mb-3" />
          <h2 className="text-lg font-semibold">{error || "Summary not found"}</h2>
          <p className="text-sm mt-1">Make sure the document finished processing.</p>
        </div>
      </div>
    );
  }

  const sections = summary.sections || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 transition-colors">
      <Link to="/notes" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 font-medium text-sm transition-colors">
        <ArrowLeft size={16} /> Back to Notes
      </Link>
      
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors">AI Summary Studio</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors">Dynamically generated based on your document content</p>
        </div>
        <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 transition-colors">
          <Brain size={14} /> AI Generated
        </div>
      </div>

      {/* Overview Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-slate-900 dark:text-white">
          <FileText className="text-blue-500" size={20} />
          Overview
        </h2>
        <div className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
          {summary.overview}
        </div>
      </div>

      {/* Dynamic Sections Grid */}
      {sections.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {sections.map((section, i) => (
            <SectionRenderer key={i} section={section} colorIndex={i} />
          ))}
        </div>
      )}
    </div>
  );
};

export default NoteSummary;
