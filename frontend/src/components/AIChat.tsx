import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Bot, User, Loader2, Sparkles, Copy, Check, FileText, HelpCircle, ChevronDown, Trash2 } from 'lucide-react';
import { type ResumeMetadata, type ChatSource, api } from '../services/api';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  sources?: ChatSource[];
}

interface AIChatProps {
  resumes: ResumeMetadata[];
  initialFocusedResume?: ResumeMetadata | null;
  onClearFocusResume: () => void;
  llmProvider?: string;
}

const SUGGESTED_PROMPTS_SINGLE = [
  "Summarize this resume.",
  "What are this candidate's strongest skills?",
  "How many years of experience does the candidate have?",
  "What projects has the candidate completed?",
  "Is this candidate suitable for a Backend Developer role?"
];

const SUGGESTED_PROMPTS_MULTI = [
  "Which candidate has the most experience?",
  "Which candidates know Python?",
  "Compare the candidates' technical skills.",
  "List all candidates with AWS or Cloud experience.",
  "Who is best suited for a frontend developer role?"
];

export const AIChat: React.FC<AIChatProps> = ({ resumes, initialFocusedResume, onClearFocusResume, llmProvider = 'gemini' }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusResumeId, setFocusResumeId] = useState<string>('all');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize focused resume from parent callback if any
  useEffect(() => {
    if (initialFocusedResume) {
      setFocusResumeId(initialFocusedResume.id);
    }
  }, [initialFocusedResume]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem('resume_ai_chat_history');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const formatted = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(formatted);
      } catch (e) {
        console.error("Failed to parse cached chat history", e);
      }
    }
  }, []);

  // Save chat history to localStorage on change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('resume_ai_chat_history', JSON.stringify(messages));
    } else {
      localStorage.removeItem('resume_ai_chat_history');
    }
  }, [messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsgId = Math.random().toString(36).substring(7);
    const newMessages: Message[] = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        text: textToSend,
        timestamp: new Date()
      }
    ];

    setMessages(newMessages);
    setInputMessage('');
    setLoading(true);

    const queryResumeId = focusResumeId === 'all' ? undefined : focusResumeId;

    try {
      const response = await api.queryResumes(textToSend, queryResumeId);
      const assistantMsgId = Math.random().toString(36).substring(7);
      
      setMessages(prev => [
        ...prev,
        {
          id: assistantMsgId,
          sender: 'assistant',
          text: response.answer,
          timestamp: new Date(),
          sources: response.sources
        }
      ]);
    } catch (err: any) {
      const assistantMsgId = Math.random().toString(36).substring(7);
      setMessages(prev => [
        ...prev,
        {
          id: assistantMsgId,
          sender: 'assistant',
          text: err.message || "An error occurred while connecting to the AI agent. Please check your API key and connection.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const clearChatHistory = () => {
    if (window.confirm("Are you sure you want to clear the conversation history?")) {
      setMessages([]);
    }
  };

  const selectedResumeName = resumes.find(r => r.id === focusResumeId)?.sections?.name || 'Selected Candidate';

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col justify-between glass-card border border-slate-800 rounded-3xl overflow-hidden animate-fade-in">
      
      {/* Chat Settings Header */}
      <div className="px-6 py-4 bg-slate-900/40 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm sm:text-base">AI Resume Q&A Chat</h3>
            <p className="text-xs text-slate-400">Ask questions grounded directly in resume content.</p>
          </div>
        </div>

        {/* Scope Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0">Scope:</span>
          <div className="relative shrink-0">
            <select 
              value={focusResumeId}
              onChange={(e) => {
                setFocusResumeId(e.target.value);
                if (e.target.value === 'all') {
                  onClearFocusResume();
                }
              }}
              className="appearance-none pl-3 pr-8 py-1.5 bg-slate-925 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Resumes ({resumes.length})</option>
              {resumes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.sections?.name || r.filename}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {messages.length > 0 && (
            <button 
              onClick={clearChatHistory}
              className="p-1.5 hover:bg-slate-800 hover:text-rose-400 text-slate-500 rounded-lg transition-colors ml-1"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {resumes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto py-12">
            <Bot className="w-12 h-12 text-slate-700 animate-pulse-slow" />
            <p className="text-sm text-slate-400">
              No resumes uploaded yet. Upload candidate files first, then navigate back here to ask questions.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-8 max-w-2xl mx-auto py-8">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl">
                <Sparkles className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-100">
                Ask about {focusResumeId === 'all' ? 'any candidate' : selectedResumeName}
              </h4>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                The AI will scan the resume content, perform a semantic search, and reply using ONLY grounded information from the documents.
              </p>
            </div>

            {/* Suggestions */}
            <div className="w-full space-y-3">
              <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Suggested Questions:</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(focusResumeId === 'all' ? SUGGESTED_PROMPTS_MULTI : SUGGESTED_PROMPTS_SINGLE).map((p, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleSendMessage(p)}
                    className="p-3 text-left text-xs bg-slate-900/40 border border-slate-800 hover:border-indigo-500/30 hover:bg-slate-900/80 text-slate-300 rounded-xl transition-all duration-300 flex items-start gap-2 group"
                  >
                    <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span className="group-hover:text-slate-100">{p}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div 
                  key={m.id} 
                  className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  {/* Assistant Avatar */}
                  {!isUser && (
                    <div className="w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className="space-y-3 max-w-[85%]">
                    <div className={`p-4 rounded-2xl leading-relaxed text-sm shadow-md border
                      ${isUser 
                        ? 'bg-indigo-600 border-indigo-700 text-white rounded-tr-none' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      <p className="whitespace-pre-line">{m.text}</p>
                      
                      {/* Copy Action for AI responses */}
                      {!isUser && (
                        <div className="flex justify-end pt-2">
                          <button 
                            onClick={() => copyToClipboard(m.text, m.id)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors flex items-center gap-1 text-[10px]"
                          >
                            {copiedMessageId === m.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Answer</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* RAG Sources list */}
                    {!isUser && m.sources && m.sources.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 block">
                          Grounded references ({m.sources.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {m.sources.map((src, sIdx) => (
                            <div 
                              key={sIdx}
                              className="p-2.5 bg-slate-925 border border-slate-900 rounded-xl text-xs space-y-1.5 flex flex-col justify-between"
                            >
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span className="font-semibold truncate max-w-[130px]">{src.filename}</span>
                                <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-[9px] uppercase tracking-wider text-slate-300 rounded shrink-0">
                                  {src.section}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 italic line-clamp-2 leading-relaxed">
                                "{src.content}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {isUser && (
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* AI thinking state */}
            {loading && (
              <div className="flex gap-4 justify-start">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl rounded-tl-none flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>{llmProvider === 'groq' ? 'Groq' : 'Gemini'} is reading indexed chunks...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input box */}
      {resumes.length > 0 && (
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputMessage); }}
          className="p-4 bg-slate-900/30 border-t border-slate-800 flex gap-3"
        >
          <input 
            type="text" 
            placeholder={focusResumeId === 'all' ? "Ask anything about all candidates..." : `Ask anything about ${selectedResumeName}...`}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-slate-925 border border-slate-800 focus:border-indigo-500 rounded-2xl text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
          />
          <button 
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 text-white disabled:text-slate-600 rounded-2xl transition-all shrink-0 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      )}

    </div>
  );
};
