const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export interface ResumeMetadata {
  id: string;
  filename: string;
  filepath: string;
  upload_time: string;
  summary_short?: string;
  summary_detailed?: string;
  summary_executive?: string;
  sections?: {
    name?: string;
    contact?: {
      email?: string;
      phone?: string;
      links?: string[];
    };
    summary?: string;
    education?: string;
    skills?: string;
    experience?: string;
    projects?: string;
    certifications?: string;
    achievements?: string;
    languages?: string;
    other?: string;
  };
  parsed_text?: string;
  download_url?: string;
}

export interface ChatSource {
  filename: string;
  section: string;
  content: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}

export interface ComparisonTableData {
  skills: { candidate_a: string; candidate_b: string };
  experience: { candidate_a: string; candidate_b: string };
  education: { candidate_a: string; candidate_b: string };
  certifications: { candidate_a: string; candidate_b: string };
  projects: { candidate_a: string; candidate_b: string };
}

export interface ComparisonResponse {
  comparison_table: ComparisonTableData;
  candidate_a_strengths: string[];
  candidate_a_weaknesses: string[];
  candidate_b_strengths: string[];
  candidate_b_weaknesses: string[];
  verdict: string;
}

export interface EligibilityStatus {
  criteria: string;
  met: boolean;
  details: string;
}

export interface FilterCandidateResponse {
  id: string;
  filename: string;
  name: string;
  is_shortlisted: boolean;
  match_percentage: number;
  needs_met: string[];
  needs_unmet: string[];
  eligibility_check: EligibilityStatus[];
  reasoning: string;
}

export interface AppSettings {
  has_key: boolean;
  model: string;
  llm_provider: string;
  has_gemini_key: boolean;
  gemini_model: string;
  has_groq_key: boolean;
  groq_model: string;
}

export const api = {
  getSettings: async () => {
    const res = await fetch(`${API_BASE_URL}/api/settings`);
    if (!res.ok) throw new Error("Failed to fetch settings");
    return res.json() as Promise<AppSettings>;
  },

  updateSettings: async (params: {
    llm_provider: string;
    gemini_api_key?: string;
    gemini_model?: string;
    groq_api_key?: string;
    groq_model?: string;
  }) => {
    const res = await fetch(`${API_BASE_URL}/api/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to update settings" }));
      throw new Error(err.detail || "Failed to update settings");
    }
    return res.json() as Promise<{ success: boolean } & AppSettings>;
  },


  uploadResumes: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));

    const res = await fetch(`${API_BASE_URL}/api/resumes/upload`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || "Upload failed");
    }
    return res.json() as Promise<{ uploaded: { id: string; filename: string; summary: string; sections: any }[] }>;
  },

  listResumes: async () => {
    const res = await fetch(`${API_BASE_URL}/api/resumes`);
    if (!res.ok) throw new Error("Failed to list resumes");
    return res.json() as Promise<ResumeMetadata[]>;
  },

  getResumeDetails: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/api/resumes/${id}`);
    if (!res.ok) throw new Error("Failed to get resume details");
    return res.json() as Promise<ResumeMetadata>;
  },

  deleteResume: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/api/resumes/${id}`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete resume");
    return res.json() as Promise<{ success: boolean; message: string }>;
  },

  queryResumes: async (question: string, resumeId?: string) => {
    const res = await fetch(`${API_BASE_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, resume_id: resumeId || null })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Query failed" }));
      throw new Error(err.detail || "Query failed");
    }
    return res.json() as Promise<ChatResponse>;
  },

  compareResumes: async (idA: string, idB: string) => {
    const res = await fetch(`${API_BASE_URL}/api/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_id_a: idA, resume_id_b: idB })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Comparison failed" }));
      throw new Error(err.detail || "Comparison failed");
    }
    return res.json() as Promise<ComparisonResponse>;
  },

  filterResumes: async (needs: string, eligibilities: string) => {
    const res = await fetch(`${API_BASE_URL}/api/resumes/filter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ needs, eligibilities })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Filtration failed" }));
      throw new Error(err.detail || "Filtration failed");
    }
    return res.json() as Promise<FilterCandidateResponse[]>;
  }
};
