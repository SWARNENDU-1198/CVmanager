import React from 'react';
import { FileText, Cpu, Search, Database, ArrowRight, BrainCircuit, ArrowUpRight } from 'lucide-react';
import type { ResumeMetadata } from '../services/api';

interface DashboardProps {
  resumes: ResumeMetadata[];
  hasApiKey: boolean;
  onNavigate: (tab: string) => void;
  llmProvider?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ resumes, hasApiKey, onNavigate, llmProvider = 'gemini' }) => {
  // Compute some dashboard statistics
  const totalResumes = resumes.length;
  
  // Extract all skills from all candidates to build a tag cloud
  const allSkills = new Set<string>();
  resumes.forEach(r => {
    if (r.sections?.skills) {
      // Split skills by comma or newline or bullet points and clean
      const splitRegex = /[,;|•]|\n/;
      r.sections.skills.split(splitRegex).forEach(s => {
        const cleaned = s.trim().replace(/^[-*]\s*/, '');
        if (cleaned && cleaned.length < 25 && cleaned.length > 1 && !/\s{2,}/.test(cleaned)) {
          allSkills.add(cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase());
        }
      });
    }
  });

  const skillsList = Array.from(allSkills).slice(0, 15);

  const getRecentResumes = () => {
    return [...resumes].slice(0, 3);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 to-purple-900/40 p-8 border border-indigo-500/20 glass-card">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute right-20 bottom-0 -mb-20 w-44 h-44 bg-purple-500/20 rounded-full blur-2xl animate-blob"></div>
        
        <div className="relative max-w-2xl space-y-3">
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold uppercase tracking-wider">
            Enterprise Intelligence
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            AI-Powered Resume Intelligence
          </h1>
          <p className="text-slate-300 leading-relaxed">
            Upload resumes, extract structural intelligence, generate executive summaries, and search semantically or compare candidates in natural language using {llmProvider === 'groq' ? 'Groq RAG' : 'Gemini RAG'}.
          </p>
          <div className="flex gap-4 pt-2">
            <button 
              onClick={() => onNavigate('upload')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] flex items-center gap-2"
            >
              Upload Resumes
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onNavigate('chat')}
              className="px-5 py-2.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-200 rounded-xl text-sm font-medium transition-all"
            >
              Start AI Chat
            </button>
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center gap-4">
          <div className="p-3.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Total Resumes</p>
            <h3 className="text-2xl font-bold text-slate-100">{totalResumes}</h3>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center gap-4">
          <div className="p-3.5 bg-purple-500/10 text-purple-400 rounded-xl">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">{llmProvider === 'groq' ? 'Groq API Status' : 'Gemini API Status'}</p>
            <h3 className={`text-lg font-bold flex items-center gap-1.5 ${hasApiKey ? 'text-emerald-400' : 'text-amber-400'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${hasApiKey ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              {hasApiKey ? 'Connected' : 'Configure Key'}
            </h3>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center gap-4">
          <div className="p-3.5 bg-pink-500/10 text-pink-400 rounded-xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">ChromaDB Store</p>
            <h3 className="text-lg font-bold text-slate-100">
              {totalResumes > 0 ? 'Indexed & Active' : 'Empty'}
            </h3>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex items-center gap-4">
          <div className="p-3.5 bg-sky-500/10 text-sky-400 rounded-xl">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Unique Skills Indexed</p>
            <h3 className="text-2xl font-bold text-slate-100">{allSkills.size}</h3>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Recent candidates */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Recent Candidates
            </h3>
            {totalResumes > 3 && (
              <button 
                onClick={() => onNavigate('resumes')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                View all resumes
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {totalResumes === 0 ? (
            <div className="glass-card border border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
              <FileText className="w-12 h-12 text-slate-600 animate-pulse-slow" />
              <p className="text-slate-400 max-w-sm">No resumes uploaded yet. Go to the upload page to start parsing resumes.</p>
              <button 
                onClick={() => onNavigate('upload')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all"
              >
                Upload First Resume
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {getRecentResumes().map((resume) => (
                <div 
                  key={resume.id}
                  onClick={() => onNavigate('resumes')}
                  className="glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700/80 transition-all cursor-pointer flex justify-between items-start gap-4 hover:bg-slate-900/30 group"
                >
                  <div className="space-y-3 overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-slate-100 truncate group-hover:text-indigo-400 transition-colors">
                        {resume.sections?.name || resume.filename}
                      </span>
                      <span className="text-xs text-slate-500 shrink-0">
                        {new Date(resume.upload_time).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                      {resume.summary_short || "Click to see summaries."}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {resume.sections?.skills && resume.sections.skills.split(/[,;|•]|\n/).slice(0, 4).map((s, idx) => {
                        const clean = s.trim().replace(/^[-*]\s*/, '');
                        if (clean && clean.length < 20) {
                          return (
                            <span key={idx} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-[11px] text-slate-300">
                              {clean}
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                  <div className="text-slate-500 group-hover:text-indigo-400 p-1 hover:bg-slate-800 rounded-lg transition-all shrink-0">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Skill distribution & AI instructions */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-400" />
            Skills Cloud
          </h3>

          <div className="glass-card rounded-2xl p-6 border border-slate-800/80 space-y-4">
            {skillsList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                Upload resumes to build the aggregate skills cloud.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skillsList.map((skill, index) => (
                  <span 
                    key={index} 
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border
                      ${index % 3 === 0 
                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' 
                        : index % 3 === 1 
                        ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                        : 'bg-pink-500/10 border-pink-500/20 text-pink-300'
                      }`}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-400" />
            Suggested RAG Queries
          </h3>

          <div className="glass-card rounded-2xl p-5 border border-slate-800/80 space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed mb-1">
              Ask questions to explore candidate profiles semantically:
            </p>
            <div className="space-y-2 text-xs">
              <div 
                onClick={() => onNavigate('chat')}
                className="p-2.5 bg-slate-925/80 border border-slate-900 hover:border-slate-800 hover:bg-slate-900 rounded-xl cursor-pointer text-slate-300 transition-all flex justify-between items-center"
              >
                <span>"Which candidates know Python?"</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div 
                onClick={() => onNavigate('chat')}
                className="p-2.5 bg-slate-925/80 border border-slate-900 hover:border-slate-800 hover:bg-slate-900 rounded-xl cursor-pointer text-slate-300 transition-all flex justify-between items-center"
              >
                <span>"Compare Candidate A and Candidate B"</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div 
                onClick={() => onNavigate('chat')}
                className="p-2.5 bg-slate-925/80 border border-slate-900 hover:border-slate-800 hover:bg-slate-900 rounded-xl cursor-pointer text-slate-300 transition-all flex justify-between items-center"
              >
                <span>"List all candidates with AWS experience"</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
