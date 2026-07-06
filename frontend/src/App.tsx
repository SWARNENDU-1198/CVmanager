import { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, UploadCloud, MessageSquare, Users2, Settings as SettingsIcon, BrainCircuit, RefreshCw, Menu, X, Loader2, Filter } from 'lucide-react';
import { api, type ResumeMetadata } from './services/api';
import { Dashboard } from './components/Dashboard';
import { UploadZone } from './components/UploadZone';
import { ResumeList } from './components/ResumeList';
import { AIChat } from './components/AIChat';
import { ResumeCompare } from './components/ResumeCompare';
import { Settings } from './components/Settings';
import { CVFilter } from './components/CVFilter';

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [resumes, setResumes] = useState<ResumeMetadata[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [llmProvider, setLlmProvider] = useState<string>('gemini');
  const [focusedResume, setFocusedResume] = useState<ResumeMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchResumesAndSettings = async () => {
    try {
      setLoading(true);
      const [resList, settings] = await Promise.all([
        api.listResumes(),
        api.getSettings()
      ]);
      setResumes(resList);
      setHasApiKey(settings.has_key);
      setLlmProvider(settings.llm_provider || 'gemini');
    } catch (err) {
      console.error("Failed to load initial data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumesAndSettings();
  }, []);

  const handleSelectForChat = (resume: ResumeMetadata) => {
    setFocusedResume(resume);
    setActiveTab('chat');
  };

  const handleClearFocusResume = () => {
    setFocusedResume(null);
  };

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  // Nav Items definition
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'resumes', label: 'Candidates', icon: FileText },
    { id: 'upload', label: 'Upload Resume', icon: UploadCloud },
    { id: 'chat', label: 'AI Chat Q&A', icon: MessageSquare },
    { id: 'compare', label: 'Compare CVs', icon: Users2 },
    { id: 'filter', label: 'Shortlist CVs', icon: Filter },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Background radial blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3"></div>

      {/* Main App Container */}
      <div className="flex flex-1 h-screen overflow-hidden">
        
        {/* SIDEBAR: Desktop Navigation */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-slate-900 bg-slate-925 shrink-0 justify-between">
          <div className="p-6 space-y-8">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                <BrainCircuit className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-wide text-white uppercase">CV Intelligence</h1>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Resume Assistant</span>
              </div>
            </div>

            {/* Menu */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all relative group
                      ${isActive 
                        ? 'bg-indigo-600 text-white nav-active-glow' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                      }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full"></span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Info / Sync */}
          <div className="p-6 border-t border-slate-900/60 bg-slate-900/20 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400 font-semibold">
              <span className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              <span>{llmProvider === 'groq' ? 'Groq RAG' : 'Gemini RAG'}</span>
            </div>
            <button 
              onClick={fetchResumesAndSettings}
              disabled={loading}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
              title="Sync state"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </aside>

        {/* MOBILE HEADER */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-slate-900 bg-slate-925/80 backdrop-blur-md z-40 flex items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-600 rounded-lg">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-xs tracking-wider uppercase text-white">CV Intelligence</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* MOBILE MENU DRAWER */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-16 bg-slate-950/95 backdrop-blur-md z-30 p-6 flex flex-col justify-between">
            <nav className="space-y-2 pt-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all
                      ${isActive 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                        : 'text-slate-400 hover:bg-slate-900/50'
                      }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-900 text-xs flex items-center justify-between text-slate-400 font-semibold">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span>{llmProvider === 'groq' ? 'Groq API RAG' : 'Gemini API RAG'}</span>
              </div>
              <button 
                onClick={() => { fetchResumesAndSettings(); setMobileMenuOpen(false); }}
                className="flex items-center gap-1.5 text-indigo-400 py-1 px-2 hover:bg-slate-900 rounded-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sync
              </button>
            </div>
          </div>
        )}

        {/* MAIN BODY CONTAINER */}
        <main className="flex-1 flex flex-col overflow-hidden pt-16 lg:pt-0">
          <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-7xl w-full mx-auto">
            {loading && resumes.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-slate-400 text-sm font-semibold">Syncing workspace database...</p>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <Dashboard 
                    resumes={resumes} 
                    hasApiKey={hasApiKey} 
                    onNavigate={handleNavigate} 
                    llmProvider={llmProvider}
                  />
                )}
                {activeTab === 'upload' && (
                  <UploadZone 
                    onUploadSuccess={fetchResumesAndSettings} 
                  />
                )}
                {activeTab === 'resumes' && (
                  <ResumeList 
                    resumes={resumes} 
                    onDeleteSuccess={fetchResumesAndSettings}
                    onSelectForChat={handleSelectForChat}
                  />
                )}
                {activeTab === 'chat' && (
                  <AIChat 
                    resumes={resumes} 
                    initialFocusedResume={focusedResume}
                    onClearFocusResume={handleClearFocusResume}
                    llmProvider={llmProvider}
                  />
                )}
                {activeTab === 'compare' && (
                  <ResumeCompare 
                    resumes={resumes} 
                    llmProvider={llmProvider}
                  />
                )}
                {activeTab === 'filter' && (
                  <CVFilter 
                    resumes={resumes} 
                    llmProvider={llmProvider}
                  />
                )}
                {activeTab === 'settings' && (
                  <Settings 
                    onSettingsChange={fetchResumesAndSettings} 
                  />
                )}
              </>
            )}
          </div>
        </main>

      </div>
    </div>
  );
}

export default App;
