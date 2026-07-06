# AI-Powered Resume Intelligence Assistant

A full-stack web application designed for HR departments and recruiters to parse, summarize, semantically search, and compare candidate resumes (PDF, DOCX, TXT) in natural language. Powered by Google Gemini (LLM) and ChromaDB (Vector Store) using Retrieval-Augmented Generation (RAG).

---

## Key Features

- **Resume Upload & Parsing**: Supports PDF, DOCX, and TXT files. Features structured metadata extraction (Name, Contact, Education, Skills, Experience, Projects, Certifications) and text cleaning.
- **RAG Q&A Chat**: Ask natural-language questions about candidates. Restricts responses to resume content (no hallucinations) and displays grounded source snippets.
- **Multi-Resume Scope**: Query individual candidates or compare all candidates globally.
- **Side-by-Side Comparison**: Compare two candidates dynamically, highlighting education, experience, skills, certifications, and AI-generated strengths & weaknesses with a final verdict.
- **Semantic Search**: Match resumes conceptually (e.g., searching "Cloud Engineer" matches AWS, Azure, GCP, and DevOps).
- **Executive Summarizer**: Generate Short, Detailed, or Executive summaries for each candidate.
- **Exporting Capabilities**: Export AI summaries to PDF directly from the UI.
- **Premium Aesthetics**: Features a modern, responsive dark mode UI with glassmorphic cards and subtle gradients.

---

## Folder Structure

```text
CVmanager/
├── backend/
│   ├── ai/
│   │   ├── llm_factory.py
│   │   └── rag_service.py
│   ├── parser/
│   │   ├── detector.py
│   │   └── extractor.py
│   ├── config.py
│   ├── database.py
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AIChat.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ResumeCompare.tsx
│   │   │   ├── ResumeList.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── UploadZone.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── chroma_db/
└── README.md
```

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Backend**: FastAPI (Python), SQLite (Metadata DB), ChromaDB (Vector DB)
- **AI Core**: LangChain, Google Gemini API (`gemini-1.5-flash`), HuggingFace Sentence Transformers (`all-MiniLM-L6-v2` for free offline embeddings)

---

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and configure your API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
5. Run the FastAPI server:
   ```bash
   python main.py
   # Or: uvicorn main:app --reload
   ```
   The backend will run on `http://localhost:8000`.

### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## RAG Pipeline Workflow

1. **Document Parsing**: Resumes are loaded, text is cleaned, and segmented into logical sections.
2. **Metadata Tagging**: Text chunks are labeled with the `resume_id`, `filename`, and the specific `section` (e.g., `experience`, `skills`).
3. **Local Embedding**: Chunks are embedded using a local HuggingFace model (`all-MiniLM-L6-v2`) and saved into a local persistent ChromaDB collection.
4. **Semantic Retrieval**: User queries query the Chroma DB, returning the top matching snippets filtered optionally by candidate.
5. **Grounded Synthesis**: Retrieved context and the query are wrapped in a strict prompt template and sent to Gemini, returning a response along with clickable citation references.
