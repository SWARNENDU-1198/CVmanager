import React, { useState } from 'react';
import { Users, AlertCircle, ArrowRight, BrainCircuit, CheckCircle2, Award, GraduationCap, Briefcase, Code, Terminal, Loader2 } from 'lucide-react';
import { type ResumeMetadata, type ComparisonResponse, api } from '../services/api';

interface ResumeCompareProps {
  resumes: ResumeMetadata[];
  llmProvider?: string;
}

export const ResumeCompare: React.FC<ResumeCompareProps> = ({ resumes, llmProvider = 'gemini' }) => {
  const [candidateAId, setCandidateAId] = useState('');
  const [candidateBId, setCandidateBId] = useState('');
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!candidateAId || !candidateBId) {
      setError("Please select both candidates to compare.");
      return;
    }
    if (candidateAId === candidateBId) {
      setError("Please select two different candidates.");
      return;
    }

    setLoading(true);
    setError(null);
    setComparison(null);

    try {
      const result = await api.compareResumes(candidateAId, candidateBId);
      setComparison(result);
    } catch (err: any) {
      setError(err.message || `Failed to generate comparison. Please check your ${llmProvider === 'groq' ? 'Groq' : 'Gemini'} API configuration.`);
    } finally {
      setLoading(false);
    }
  };

  const getCandidateName = (id: string, defaultVal: string) => {
    const resume = resumes.find(r => r.id === id);
    return resume?.sections?.name || resume?.filename || defaultVal;
  };

  const nameA = getCandidateName(candidateAId, "Candidate A");
  const nameB = getCandidateName(candidateBId, "Candidate B");

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          Compare Resumes
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Perform a detailed AI comparative analysis highlighting strengths, weaknesses, and functional suitability.
        </p>
      </div>

      {/* Select Candidates Box */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          
          {/* Candidate A select */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
              Select Candidate A:
            </label>
            <select 
              value={candidateAId}
              onChange={(e) => setCandidateAId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-200 focus:outline-none transition-all cursor-pointer"
            >
              <option value="">-- Choose Candidate --</option>
              {resumes.map(r => (
                <option key={r.id} value={r.id} disabled={r.id === candidateBId}>
                  {r.sections?.name || r.filename}
                </option>
              ))}
            </select>
          </div>

          {/* Candidate B select */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
              Select Candidate B:
            </label>
            <select 
              value={candidateBId}
              onChange={(e) => setCandidateBId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-200 focus:outline-none transition-all cursor-pointer"
            >
              <option value="">-- Choose Candidate --</option>
              {resumes.map(r => (
                <option key={r.id} value={r.id} disabled={r.id === candidateAId}>
                  {r.sections?.name || r.filename}
                </option>
              ))}
            </select>
          </div>

        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button 
            onClick={handleCompare}
            disabled={loading || !candidateAId || !candidateBId}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/40 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Comparing profiles...
              </>
            ) : (
              <>
                Compare Candidates
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-8 animate-fade-in">
          
          {/* 1. Comparison Table */}
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-5 bg-slate-900/40 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-indigo-400" />
                Detailed Profile Comparison Matrix
              </h3>
            </div>
            
            <div className="divide-y divide-slate-800/80">
              {/* Row Header */}
              <div className="grid grid-cols-12 bg-slate-925/80 text-xs font-semibold text-slate-400 uppercase tracking-widest p-4">
                <div className="col-span-2">Section</div>
                <div className="col-span-5 border-l border-slate-800 pl-4">{nameA}</div>
                <div className="col-span-5 border-l border-slate-800 pl-4">{nameB}</div>
              </div>

              {/* Skills Row */}
              <div className="grid grid-cols-12 p-4 text-sm">
                <div className="col-span-2 font-semibold text-slate-300 flex items-center gap-1.5 self-start">
                  <Code className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Skills</span>
                </div>
                <div className="col-span-5 border-l border-slate-800/60 pl-4 text-slate-300 leading-relaxed whitespace-pre-line pr-2">{comparison.comparison_table.skills.candidate_a}</div>
                <div className="col-span-5 border-l border-slate-800/60 pl-4 text-slate-300 leading-relaxed whitespace-pre-line">{comparison.comparison_table.skills.candidate_b}</div>
              </div>

              {/* Experience Row */}
              <div className="grid grid-cols-12 p-4 text-sm">
                <div className="col-span-2 font-semibold text-slate-300 flex items-center gap-1.5 self-start">
                  <Briefcase className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Experience</span>
                </div>
                <div className="col-span-5 border-l border-slate-800/60 pl-4 text-slate-300 leading-relaxed whitespace-pre-line pr-2">{comparison.comparison_table.experience.candidate_a}</div>
                <div className="col-span-5 border-l border-slate-800/60 pl-4 text-slate-300 leading-relaxed whitespace-pre-line">{comparison.comparison_table.experience.candidate_b}</div>
              </div>

              {/* Education Row */}
              <div className="grid grid-cols-12 p-4 text-sm">
                <div className="col-span-2 font-semibold text-slate-300 flex items-center gap-1.5 self-start">
                  <GraduationCap className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Education</span>
                </div>
                <div className="col-span-5 border-l border-slate-800/60 pl-4 text-slate-300 leading-relaxed whitespace-pre-line pr-2">{comparison.comparison_table.education.candidate_a}</div>
                <div className="col-span-5 border-l border-slate-800/60 pl-4 text-slate-300 leading-relaxed whitespace-pre-line">{comparison.comparison_table.education.candidate_b}</div>
              </div>

              {/* Projects Row */}
              <div className="grid grid-cols-12 p-4 text-sm">
                <div className="col-span-2 font-semibold text-slate-300 flex items-center gap-1.5 self-start">
                  <Terminal className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Projects</span>
                </div>
                <div className="col-span-5 border-l border-slate-800/60 pl-4 text-slate-300 leading-relaxed whitespace-pre-line pr-2">{comparison.comparison_table.projects.candidate_a}</div>
                <div className="col-span-5 border-l border-slate-800/60 pl-4 text-slate-300 leading-relaxed whitespace-pre-line">{comparison.comparison_table.projects.candidate_b}</div>
              </div>

              {/* Certifications Row */}
              <div className="grid grid-cols-12 p-4 text-sm">
                <div className="col-span-2 font-semibold text-slate-300 flex items-center gap-1.5 self-start">
                  <Award className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Certs</span>
                </div>
                <div className="col-span-5 border-l border-slate-800/60 pl-4 text-slate-300 leading-relaxed whitespace-pre-line pr-2">{comparison.comparison_table.certifications.candidate_a}</div>
                <div className="col-span-5 border-l border-slate-800/60 pl-4 text-slate-300 leading-relaxed whitespace-pre-line">{comparison.comparison_table.certifications.candidate_b}</div>
              </div>
            </div>
          </div>

          {/* 2. Side-by-side Strengths and Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Candidate A Cards */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wider pl-1">{nameA} Analysis</h3>
              
              <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
                {/* Strengths */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest pl-1">Key Strengths:</span>
                  <ul className="space-y-1.5 text-slate-300 text-xs">
                    {comparison.candidate_a_strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Weaknesses */}
                {comparison.candidate_a_weaknesses.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest pl-1">Identified Gaps:</span>
                    <ul className="space-y-1.5 text-slate-300 text-xs">
                      {comparison.candidate_a_weaknesses.map((weak, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                          <span>{weak}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Candidate B Cards */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wider pl-1">{nameB} Analysis</h3>
              
              <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
                {/* Strengths */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest pl-1">Key Strengths:</span>
                  <ul className="space-y-1.5 text-slate-300 text-xs">
                    {comparison.candidate_b_strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Weaknesses */}
                {comparison.candidate_b_weaknesses.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest pl-1">Identified Gaps:</span>
                    <ul className="space-y-1.5 text-slate-300 text-xs">
                      {comparison.candidate_b_weaknesses.map((weak, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                          <span>{weak}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* 3. Verdict */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border border-indigo-500/20 glass-card space-y-3">
            <div className="flex items-center gap-2 text-indigo-400">
              <BrainCircuit className="w-5 h-5" />
              <h4 className="font-bold text-sm uppercase tracking-wider">AI Recruiter Verdict</h4>
            </div>
            <p className="text-slate-300 leading-relaxed text-sm">
              {comparison.verdict}
            </p>
          </div>

        </div>
      )}

    </div>
  );
};
