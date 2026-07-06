import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, CheckCircle2, AlertCircle, Loader2, Key, HelpCircle, Server } from 'lucide-react';
import { api } from '../services/api';

interface SettingsProps {
  onSettingsChange: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onSettingsChange }) => {
  const [provider, setProvider] = useState<'gemini' | 'groq'>('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [groqModel, setGroqModel] = useState('llama-3.3-70b-specdec');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // Load current config from backend
    const loadConfig = async () => {
      try {
        const config = await api.getSettings();
        if (config.llm_provider) {
          setProvider(config.llm_provider as 'gemini' | 'groq');
        }
        if (config.has_gemini_key) {
          setGeminiApiKey('••••••••••••••••••••••••••••••••');
        }
        if (config.gemini_model) {
          setGeminiModel(config.gemini_model);
        }
        if (config.has_groq_key) {
          setGroqApiKey('••••••••••••••••••••••••••••••••');
        }
        if (config.groq_model) {
          setGroqModel(config.groq_model);
        }
      } catch (err) {
        console.error("Failed to load settings from server", err);
      } finally {
        setInitialLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    // If key is masked and hasn't changed, don't send the mask string
    const geminiKeyToSend = geminiApiKey.startsWith('••••') ? '' : geminiApiKey;
    const groqKeyToSend = groqApiKey.startsWith('••••') ? '' : groqApiKey;

    try {
      const result = await api.updateSettings({
        llm_provider: provider,
        gemini_api_key: geminiKeyToSend,
        gemini_model: geminiModel,
        groq_api_key: groqKeyToSend,
        groq_model: groqModel
      });
      if (result.success) {
        setStatus({
          type: 'success',
          message: "API Settings updated successfully!"
        });
        if (result.has_gemini_key) {
          setGeminiApiKey('••••••••••••••••••••••••••••••••');
        }
        if (result.has_groq_key) {
          setGroqApiKey('••••••••••••••••••••••••••••••••');
        }
        onSettingsChange();
      }
    } catch (err: any) {
      setStatus({
        type: 'error',
        message: err.message || "Failed to validate/save settings on the server."
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="h-60 w-full flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm">Loading API config...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-indigo-400" />
          API Configuration
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure active LLM provider (Gemini or Groq) to power document parsing, RAG query pipelines, and summarizations.
        </p>
      </div>

      {/* Config Form */}
      <form onSubmit={handleSave} className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
        
        {/* Provider Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            LLM Provider:
          </label>
          <select 
            value={provider}
            onChange={(e) => setProvider(e.target.value as 'gemini' | 'groq')}
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-slate-200 text-sm focus:outline-none transition-all cursor-pointer"
          >
            <option value="gemini">Google Gemini (Default API)</option>
            <option value="groq">Groq Cloud (Generous Free Tier / High Limits)</option>
          </select>
        </div>

        {provider === 'gemini' ? (
          <>
            {/* Gemini API Key */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                Gemini API Key:
              </label>
              <input 
                type="password" 
                placeholder="Enter your GEMINI_API_KEY..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono placeholder:text-slate-600"
              />
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                Active Gemini Model:
              </label>
              <select 
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-slate-200 text-sm focus:outline-none transition-all cursor-pointer"
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash (Fast, recommended)</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash (Legacy flash version)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (Highly complex reasoning)</option>
              </select>
            </div>

            {/* Help Banner */}
            <div className="p-4 bg-slate-925/80 border border-slate-900 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span>Where do I get a Gemini API Key?</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                You can generate a free API key instantly in the <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Google AI Studio</a>.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Groq API Key */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                Groq API Key:
              </label>
              <input 
                type="password" 
                placeholder="gsk_..."
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono placeholder:text-slate-600"
              />
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                Active Groq Model:
              </label>
              <select 
                value={groqModel}
                onChange={(e) => setGroqModel(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-slate-200 text-sm focus:outline-none transition-all cursor-pointer"
              >
                <option value="llama-3.3-70b-specdec">llama-3.3-70b-specdec (Excellent reasoning, fast)</option>
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Powerful general purpose)</option>
                <option value="llama3-8b-8192">llama3-8b-8192 (Extremely fast)</option>
              </select>
            </div>

            {/* Help Banner */}
            <div className="p-4 bg-slate-925/80 border border-slate-900 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span>Where do I get a Groq API Key?</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Register a developer account and obtain a free API key at <a href="https://console.groq.com/" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Groq Console</a>. Vision models (for image OCR resumes) are automatically supported in the background using `llama-3.2-11b-vision-preview`.
              </p>
            </div>
          </>
        )}

        {/* Status Messages */}
        {status && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 animate-fade-in
            ${status.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {status.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span className="text-sm font-medium">{status.message}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-2 border-t border-slate-900">
          <button 
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/40 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing & Saving...
              </>
            ) : (
              <>
                Save API Config
              </>
            )}
          </button>
        </div>

      </form>

      {/* Security note */}
      <div className="flex items-center gap-2 text-slate-500 text-xs pl-2">
        <Shield className="w-4 h-4" />
        <span>Keys are stored locally in your workspace backend environment. No telemetry is shared.</span>
      </div>

    </div>
  );
};

