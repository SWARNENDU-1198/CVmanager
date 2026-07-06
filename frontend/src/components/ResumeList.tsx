import React, { useState } from 'react';
import { FileText, Search, Trash2, MessageSquare, Download, ExternalLink, Calendar, Mail, Phone, ChevronRight, X, Printer, Loader2, BrainCircuit } from 'lucide-react';
import { type ResumeMetadata, api } from '../services/api';

interface ResumeListProps {
  resumes: ResumeMetadata[];
  onDeleteSuccess: () => void;
  onSelectForChat: (resume: ResumeMetadata) => void;
}

export const ResumeList: React.FC<ResumeListProps> = ({ resumes, onDeleteSuccess, onSelectForChat }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResume, setSelectedResume] = useState<ResumeMetadata | null>(null);
  const [detailedResume, setDetailedResume] = useState<ResumeMetadata | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [summaryTab, setSummaryTab] = useState<'short' | 'detailed' | 'executive'>('short');
  const [detailsTab, setDetailsTab] = useState<'summaries' | 'sections' | 'raw'>('summaries');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenDetails = async (resume: ResumeMetadata) => {
    setSelectedResume(resume);
    setDetailedResume(null);
    setLoadingDetails(true);
    try {
      const fullResume = await api.getResumeDetails(resume.id);
      setDetailedResume(fullResume);
    } catch (err) {
      console.error("Failed to load resume details", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getFilteredResumes = () => {
    return resumes.filter(r => {
      const name = r.sections?.name || '';
      const email = r.sections?.contact?.email || '';
      const skills = r.sections?.skills || '';
      const filename = r.filename;
      
      const query = searchQuery.toLowerCase();
      return name.toLowerCase().includes(query) || 
             email.toLowerCase().includes(query) || 
             skills.toLowerCase().includes(query) || 
             filename.toLowerCase().includes(query);
    });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this resume? This will remove its indexed semantic vectors as well.")) return;
    
    setDeletingId(id);
    try {
      await api.deleteResume(id);
      if (selectedResume?.id === id) {
        setSelectedResume(null);
      }
      onDeleteSuccess();
    } catch (err) {
      console.error("Failed to delete resume:", err);
      alert("Failed to delete resume");
    } finally {
      setDeletingId(null);
    }
  };

  const exportSummaryToPDF = (resume: ResumeMetadata) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const name = resume.sections?.name || 'Resume Summary';
    const email = resume.sections?.contact?.email || 'N/A';
    const phone = resume.sections?.contact?.phone || 'N/A';
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${name} - AI Profile Summary</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            h1 { color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 4px; }
            .subtitle { color: #64748b; font-size: 14px; margin-bottom: 30px; }
            .contact-info { margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #6366f1; }
            .contact-info p { margin: 4px 0; font-size: 14px; }
            h2 { color: #0f172a; font-size: 18px; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
            .section { margin-bottom: 25px; }
            p { font-size: 15px; color: #334155; text-align: justify; }
          </style>
        </head>
        <body>
          <h1>${name}</h1>
          <div class="subtitle">AI-Generated Resume Intelligence Summary</div>
          
          <div class="contact-info">
            <strong>Contact Info:</strong>
            <p>Email: ${email}</p>
            <p>Phone: ${phone}</p>
          </div>
          
          <div class="section">
            <h2>Executive Summary</h2>
            <p>${resume.summary_executive || 'Not generated'}</p>
          </div>
          
          <div class="section">
            <h2>Short Profile</h2>
            <p>${resume.summary_short || 'Not generated'}</p>
          </div>
          
          <div class="section">
            <h2>Detailed Candidate Profile</h2>
            <p>${resume.summary_detailed || 'Not generated'}</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredResumes = getFilteredResumes();

  const getDownloadLink = (filepath: string) => {
    if (filepath.startsWith('http://') || filepath.startsWith('https://')) {
      return filepath;
    }
    // Standard relative URL map. Our backend mounts local files on /static/uploads/
    const filename = filepath.split(/[\\/]/).pop();
    return `http://127.0.0.1:8000/static/uploads/${filename}`;
  };

  return (
    <div className="relative min-h-[500px] animate-fade-in space-y-6">
      
      {/* Header Search bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          Uploaded Candidates ({resumes.length})
        </h2>
        <div className="relative w-full sm:w-80">
          <input 
            type="text" 
            placeholder="Search by name, skills, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        </div>
      </div>

      {/* Grid view of Resumes */}
      {filteredResumes.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center border border-slate-800/80 flex flex-col items-center justify-center space-y-4">
          <FileText className="w-12 h-12 text-slate-700 animate-pulse-slow" />
          <p className="text-slate-400 max-w-sm">
            {searchQuery ? "No candidates match your search query." : "No candidates uploaded yet. Go to Upload tab to start."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResumes.map((resume) => {
            const name = resume.sections?.name || resume.filename;
            const email = resume.sections?.contact?.email;
            const uploadDate = new Date(resume.upload_time).toLocaleDateString();

            return (
              <div 
                key={resume.id}
                onClick={() => handleOpenDetails(resume)}
                className="group glass-card rounded-2xl p-5 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 hover:bg-slate-900/30"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl shrink-0 group-hover:bg-indigo-500/20 transition-all">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onSelectForChat(resume); }}
                        className="p-2 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors"
                        title="Start RAG chat"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <a 
                        href={getDownloadLink(resume.filepath)}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors flex items-center justify-center"
                        title="Download raw file"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button 
                        onClick={(e) => handleDelete(resume.id, e)}
                        disabled={deletingId === resume.id}
                        className="p-2 hover:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                        title="Delete resume"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-hidden">
                    <h3 className="font-semibold text-slate-100 truncate group-hover:text-indigo-400 transition-colors text-base">
                      {name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3 h-3" />
                      Uploaded on {uploadDate}
                    </p>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {resume.summary_short || "Select this candidate to view their AI-generated summaries and structured sections."}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-900 text-xs text-slate-500">
                  <span className="truncate max-w-[150px]">
                    {email || resume.filename}
                  </span>
                  <span className="text-indigo-400 font-medium group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Details
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-out side drawer for resume details */}
      {selectedResume && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in bg-slate-950/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-3xl h-full bg-slate-925 border-l border-slate-800 shadow-2xl flex flex-col justify-between animate-slide-left">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-lg">
                    {selectedResume.sections?.name || selectedResume.filename}
                  </h3>
                  <span className="text-xs text-slate-400 truncate max-w-[300px] block">
                    {selectedResume.filename}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => exportSummaryToPDF(selectedResume)}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold"
                  title="Print / Export summary"
                >
                  <Printer className="w-4 h-4" />
                  Export PDF
                </button>
                <button 
                  onClick={() => { setSelectedResume(null); setDetailedResume(null); }}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-navigation tabs inside drawer */}
            <div className="px-6 py-2 border-b border-slate-900 bg-slate-900/10 flex gap-4 text-xs font-semibold">
              <button 
                onClick={() => setDetailsTab('summaries')}
                className={`py-2 border-b-2 transition-all ${detailsTab === 'summaries' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                AI Summaries
              </button>
              <button 
                onClick={() => setDetailsTab('sections')}
                className={`py-2 border-b-2 transition-all ${detailsTab === 'sections' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Extracted Sections
              </button>
              <button 
                onClick={() => setDetailsTab('raw')}
                className={`py-2 border-b-2 transition-all ${detailsTab === 'raw' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Full Raw Text
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDetails ? (
                <div className="h-full w-full flex flex-col items-center justify-center py-20 space-y-3">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-slate-400 text-sm font-medium">Extracting details...</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: AI Summaries */}
                  {detailsTab === 'summaries' && (
                    <div className="space-y-6">
                      {/* Summary Type Toggle */}
                      <div className="flex bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 max-w-sm text-xs">
                        <button 
                          onClick={() => setSummaryTab('short')}
                          className={`flex-1 py-1.5 text-center font-medium rounded-lg transition-all ${summaryTab === 'short' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          Short
                        </button>
                        <button 
                          onClick={() => setSummaryTab('detailed')}
                          className={`flex-1 py-1.5 text-center font-medium rounded-lg transition-all ${summaryTab === 'detailed' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          Detailed
                        </button>
                        <button 
                          onClick={() => setSummaryTab('executive')}
                          className={`flex-1 py-1.5 text-center font-medium rounded-lg transition-all ${summaryTab === 'executive' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          Executive
                        </button>
                      </div>
    
                      <div className="p-6 bg-slate-900/30 rounded-2xl border border-slate-800 space-y-4">
                        <h4 className="font-semibold text-indigo-400 text-sm uppercase tracking-wider flex items-center gap-2">
                          <BrainCircuit className="w-4 h-4" />
                          {summaryTab.charAt(0).toUpperCase() + summaryTab.slice(1)} Summary
                        </h4>
                        <div className="text-slate-300 leading-relaxed text-sm whitespace-pre-line summary-content">
                          {summaryTab === 'short' && (selectedResume.summary_short || "Generate summaries by configuring your API key.")}
                          {summaryTab === 'detailed' && (selectedResume.summary_detailed || "Generate summaries by configuring your API key.")}
                          {summaryTab === 'executive' && (selectedResume.summary_executive || "Generate summaries by configuring your API key.")}
                        </div>
                      </div>
                    </div>
                  )}
    
                  {/* TAB 2: Extracted Sections */}
                  {detailsTab === 'sections' && (
                    <div className="space-y-6">
                      {/* Contact Info Widget */}
                      <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {selectedResume.sections?.contact?.email && (
                          <div className="flex items-center gap-2.5 text-slate-300">
                            <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span className="truncate">{selectedResume.sections.contact.email}</span>
                          </div>
                        )}
                        {selectedResume.sections?.contact?.phone && (
                          <div className="flex items-center gap-2.5 text-slate-300">
                            <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span>{selectedResume.sections.contact.phone}</span>
                          </div>
                        )}
                        {selectedResume.sections?.contact?.links && selectedResume.sections.contact.links.map((link, idx) => (
                          <div key={idx} className="flex items-center gap-2.5 text-slate-300 md:col-span-2 overflow-hidden">
                            <ExternalLink className="w-4 h-4 text-indigo-400 shrink-0" />
                            <a href={link} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline truncate">{link}</a>
                          </div>
                        ))}
                      </div>
    
                      {/* Section Loop */}
                      {Object.entries(selectedResume.sections || {}).map(([key, val]) => {
                        if (["name", "contact", "other"].includes(key) || !val || typeof val !== 'string') return null;
                        return (
                          <div key={key} className="space-y-2">
                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider pl-1">
                              {key}
                            </h4>
                            <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                              {val}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
    
                  {/* TAB 3: Full Raw Text */}
                  {detailsTab === 'raw' && (
                    <div className="bg-slate-925 border border-slate-800 rounded-xl p-5 font-mono text-xs text-slate-400 h-96 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                      {detailedResume?.parsed_text || "No raw text available."}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-900/40 flex justify-between items-center">
              <button 
                onClick={(e) => handleDelete(selectedResume.id, e)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Candidate
              </button>
              <button 
                onClick={() => { onSelectForChat(selectedResume); setSelectedResume(null); setDetailedResume(null); }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]"
              >
                <MessageSquare className="w-4 h-4" />
                Chat About Candidate
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
