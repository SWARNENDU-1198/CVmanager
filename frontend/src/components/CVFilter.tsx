import React, { useState } from 'react';
import { Filter, Users, CheckCircle2, XCircle, Loader2, Sparkles, ChevronDown, ChevronUp, AlertCircle, FileText, Check, X } from 'lucide-react';
import { api, type FilterCandidateResponse } from '../services/api';

interface CVFilterProps {
  resumes: { id: string; filename: string }[];
  llmProvider?: string;
}

export const CVFilter: React.FC<CVFilterProps> = ({ resumes, llmProvider = 'gemini' }) => {
  const [needs, setNeeds] = useState('');
  const [eligibilities, setEligibilities] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FilterCandidateResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);

  const handleFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!needs.trim() || !eligibilities.trim()) {
      setError('Please provide both Job Needs and Eligibility Criteria.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setExpandedCandidateId(null);

    try {
      const filterResults = await api.filterResumes(needs, eligibilities);
      setResults(filterResults);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to evaluate and filter resumes.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCandidateId(prev => prev === id ? null : id);
  };

  const loadExample = () => {
    setNeeds(
      "Senior Software Engineer to build scalable Python backends using FastAPI. Must have experience deploying database solutions and integrating Large Language Models (LLMs) via RAG pipelines."
    );
    setEligibilities(
      "1. Must have at least 3 years of Python development experience.\n2. Must have experience building RAG or LangChain pipelines.\n3. Knowledge of TypeScript and React is a plus."
    );
  };

  const shortlistedCount = results.filter(r => r.is_shortlisted).length;
  const rejectedCount = results.length - shortlistedCount;

  return (
    <div className="w-full space-y-8 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-400" />
            AI Candidate Shortlisting & Filtration
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Shortlist and grade candidate CVs automatically against your company's custom requirements and eligibility rules.
          </p>
        </div>
        {resumes.length > 0 && (
          <button
            onClick={loadExample}
            className="px-4 py-2 text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Load Example Criteria
          </button>
        )}
      </div>

      {resumes.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center border border-slate-800/80 flex flex-col items-center justify-center space-y-4">
          <FileText className="w-12 h-12 text-slate-700 animate-pulse-slow" />
          <p className="text-slate-400 max-w-sm">
            No resumes uploaded yet. Go to the **Upload Resume** tab to import candidate profiles before using filtration.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: Query Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-slate-800/80 bg-slate-900/10 space-y-6">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Filtration Parameters
              </h3>
              
              <form onSubmit={handleFilter} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    Company Job Description & Needs
                  </label>
                  <textarea
                    value={needs}
                    onChange={(e) => setNeeds(e.target.value)}
                    placeholder="E.g., Senior Full-Stack Developer to build FastAPI servers and React interfaces. Needs to be expert in database design and Docker deployments."
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-925 border border-slate-800 focus:border-indigo-500 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 resize-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    Eligibility / Mandatory Criteria (Line by Line)
                  </label>
                  <textarea
                    value={eligibilities}
                    onChange={(e) => setEligibilities(e.target.value)}
                    placeholder="E.g.,&#10;1. At least 3 years React experience.&#10;2. Holds a CS degree or equivalent.&#10;3. Proficient in database modeling."
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-925 border border-slate-800 focus:border-indigo-500 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/40 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Evaluating {resumes.length} Candidate(s)...
                    </>
                  ) : (
                    <>
                      <Filter className="w-4 h-4" />
                      Evaluate & Shortlist Candidates
                    </>
                  )}
                </button>
              </form>

              {error && (
                <div className="p-4 rounded-xl border bg-rose-500/10 border-rose-500/20 text-rose-400 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="text-xs font-medium">{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Shortlist Dashboard */}
          <div className="lg:col-span-7 space-y-6">
            {loading && (
              <div className="glass-card rounded-2xl p-16 text-center border border-slate-800/80 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <h4 className="text-slate-200 font-semibold text-sm">LLM Processing in Progress</h4>
                <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                  Evaluating all candidate profiles concurrently using {llmProvider === 'groq' ? 'Groq' : 'Gemini'}. This includes OCR scanning, checking eligibility criteria, mapping strengths, and generating shortlisting verdicts.
                </p>
              </div>
            )}

            {!loading && results.length === 0 && (
              <div className="glass-card rounded-2xl p-16 text-center border border-slate-800/80 flex flex-col items-center justify-center space-y-4 h-full min-h-[300px]">
                <Users className="w-12 h-12 text-slate-800" />
                <h4 className="text-slate-300 font-semibold text-sm">No Evaluation Data</h4>
                <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                  Enter the job requirements and eligibility constraints on the left, then trigger the filtration algorithm to get analysis details.
                </p>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-6">
                {/* Stats Summary Panel */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass-card p-4 rounded-2xl border border-slate-800/50 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Candidates</span>
                    <span className="text-2xl font-black text-slate-100 mt-2">{results.length}</span>
                  </div>
                  <div className="glass-card p-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-400/80 tracking-wider">Shortlisted</span>
                    <span className="text-2xl font-black text-emerald-400 mt-2">{shortlistedCount}</span>
                  </div>
                  <div className="glass-card p-4 rounded-2xl border border-rose-500/10 bg-rose-500/5 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-rose-400/80 tracking-wider">Not Selected</span>
                    <span className="text-2xl font-black text-rose-400 mt-2">{rejectedCount}</span>
                  </div>
                </div>

                {/* Candidate Result List */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Shortlisted Results (Ranked by Match Score)
                  </h3>

                  <div className="space-y-3">
                    {results.map((candidate) => {
                      const isExpanded = expandedCandidateId === candidate.id;
                      
                      return (
                        <div 
                          key={candidate.id}
                          className={`glass-card rounded-2xl border transition-all duration-300 overflow-hidden
                            ${candidate.is_shortlisted 
                              ? 'border-slate-800 hover:border-emerald-500/30' 
                              : 'border-slate-850 hover:border-slate-800'
                            }`}
                        >
                          {/* Header row */}
                          <div 
                            onClick={() => toggleExpand(candidate.id)}
                            className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-900/30 select-none"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className={`p-2.5 rounded-xl shrink-0
                                ${candidate.is_shortlisted 
                                  ? 'bg-emerald-500/10 text-emerald-400' 
                                  : 'bg-slate-800/40 text-slate-500'
                                }`}
                              >
                                {candidate.is_shortlisted ? (
                                  <CheckCircle2 className="w-5 h-5" />
                                ) : (
                                  <XCircle className="w-5 h-5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-200 text-sm truncate">
                                  {candidate.name}
                                </h4>
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {candidate.filename}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-6 shrink-0">
                              {/* Match Percentage */}
                              <div className="flex flex-col items-end gap-1.5">
                                <div className="flex items-baseline gap-0.5">
                                  <span className="text-sm font-extrabold text-slate-100">{candidate.match_percentage}</span>
                                  <span className="text-[10px] text-slate-500 font-bold">%</span>
                                </div>
                                <div className="w-20 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500
                                      ${candidate.match_percentage >= 80 
                                        ? 'bg-emerald-500' 
                                        : candidate.match_percentage >= 50 
                                          ? 'bg-indigo-500' 
                                          : 'bg-slate-700'
                                      }`}
                                    style={{ width: `${candidate.match_percentage}%` }}
                                  ></div>
                                </div>
                              </div>

                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Expanded Details Drawer */}
                          {isExpanded && (
                            <div className="px-5 pb-6 border-t border-slate-900 bg-slate-925/40 space-y-6 pt-5 animate-slide-down">
                              
                              {/* AI Reasoning */}
                              <div className="space-y-2">
                                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Match Verdict</h5>
                                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                  {candidate.reasoning}
                                </p>
                              </div>

                              {/* Eligibility Checks */}
                              {candidate.eligibility_check && candidate.eligibility_check.length > 0 && (
                                <div className="space-y-3">
                                  <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Eligibility Verification</h5>
                                  <div className="grid gap-2">
                                    {candidate.eligibility_check.map((check, idx) => (
                                      <div 
                                        key={idx}
                                        className="flex items-start justify-between gap-4 p-3 bg-slate-925 border border-slate-900 rounded-xl"
                                      >
                                        <div className="flex items-start gap-2.5">
                                          <div className={`p-1 rounded mt-0.5
                                            ${check.met 
                                              ? 'bg-emerald-500/10 text-emerald-400' 
                                              : 'bg-rose-500/10 text-rose-400'
                                            }`}
                                          >
                                            {check.met ? (
                                              <Check className="w-3 h-3" />
                                            ) : (
                                              <X className="w-3 h-3" />
                                            )}
                                          </div>
                                          <div className="space-y-0.5">
                                            <p className="text-xs font-semibold text-slate-200">
                                              {check.criteria}
                                            </p>
                                            <p className="text-[10px] text-slate-500 leading-relaxed">
                                              {check.details}
                                            </p>
                                          </div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0
                                          ${check.met 
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' 
                                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                                          }`}
                                        >
                                          {check.met ? 'Met' : 'Unmet'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Needs Met / Unmet Columns */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Strengths */}
                                <div className="p-4 bg-emerald-500/[0.02] border border-emerald-500/5 rounded-2xl space-y-2">
                                  <h6 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    Qualifications & Met Needs ({candidate.needs_met.length})
                                  </h6>
                                  {candidate.needs_met.length === 0 ? (
                                    <p className="text-[10px] text-slate-500 font-semibold italic">No matched criteria highlighted.</p>
                                  ) : (
                                    <ul className="space-y-1.5">
                                      {candidate.needs_met.map((item, idx) => (
                                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                                          <span className="text-emerald-500 select-none mt-0.5 font-bold">•</span>
                                          <span>{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>

                                {/* Gaps */}
                                <div className="p-4 bg-rose-500/[0.02] border border-rose-500/5 rounded-2xl space-y-2">
                                  <h6 className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                    Identified Gaps & Unmet Needs ({candidate.needs_unmet.length})
                                  </h6>
                                  {candidate.needs_unmet.length === 0 ? (
                                    <p className="text-[10px] text-slate-500 font-semibold italic">No gaps detected.</p>
                                  ) : (
                                    <ul className="space-y-1.5">
                                      {candidate.needs_unmet.map((item, idx) => (
                                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                                          <span className="text-rose-400 select-none mt-0.5 font-bold">•</span>
                                          <span>{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
