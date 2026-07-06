import os
import uuid
from typing import List, Dict, Any, Optional
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from backend.config import settings
from backend.ai.llm_factory import get_llm, invoke_llm_with_retry
from backend import database

class CustomSupabaseVectorStore(SupabaseVectorStore):
    def match_args(
        self, query: List[float], filter: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        ret = {"query_embedding": query}
        # Provide default match_threshold and match_count to match our SQL signature
        ret["match_threshold"] = -1.0
        ret["match_count"] = 100
        if filter:
            ret["filter"] = filter
        return ret

# Initialize local HuggingFace embeddings (cached in HF cache, run locally)
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Initialize Supabase Vector Store
def get_vector_store():
    client = database.get_supabase_client()
    return CustomSupabaseVectorStore(
        client=client,
        embedding=embeddings,
        table_name="documents",
        query_name="match_documents"
    )

def index_resume(resume_id: str, filename: str, sections: dict):
    # We will chunk each section separately to preserve section metadata
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=80
    )
    
    documents = []
    
    for section_name, section_text in sections.items():
        if not section_text or section_name in ["contact", "name"]:
            continue
            
        # If it's a dictionary (like contact), skip or serialize.
        # But section_text should be string in our detector.
        if not isinstance(section_text, str):
            continue
            
        chunks = text_splitter.split_text(section_text)
        for chunk in chunks:
            doc = Document(
                page_content=chunk,
                metadata={
                    "resume_id": resume_id,
                    "filename": filename,
                    "section": section_name
                }
            )
            documents.append(doc)
            
    if documents:
        db = get_vector_store()
        db.add_documents(documents)

def delete_resume_vectors(resume_id: str):
    try:
        client = database.get_supabase_client()
        client.table("documents").delete().eq("metadata->>resume_id", resume_id).execute()
    except Exception as e:
        print(f"Error deleting vectors for resume {resume_id}: {e}")

def generate_summaries(resume_text: str) -> dict:
    """Generate short, detailed, and executive summaries using Gemini."""
    llm = get_llm(temperature=0.3)
    
    # We will run a single prompt or multiple prompts to extract summaries.
    # To be token-efficient and avoid 3 separate API calls, we can ask Gemini to return a JSON containing all three formats.
    prompt = f"""
    You are an expert HR assistant. Analyze the following resume text and generate three types of professional summaries.
    
    Format your response EXACTLY as a JSON object with the following keys:
    - "short": A 1-paragraph summary (50-80 words) describing the candidate's core background, experience, and key skills.
    - "detailed": A comprehensive summary (200-300 words) detailing their Skills, Experience, Education, Projects, and Certifications.
    - "executive": A high-level summary (100-150 words) focusing on their career trajectory, leadership capabilities, and overall suitability.
    
    Ensure the JSON is valid and only return the JSON, no markdown blocks or other text.
    
    Resume Text:
    {resume_text}
    """
    
    response = invoke_llm_with_retry(llm, prompt)
    response_content = response.content.strip()
    
    # Clean up markdown JSON wrapper if present
    if response_content.startswith("```json"):
        response_content = response_content[7:]
    if response_content.endswith("```"):
        response_content = response_content[:-3]
    response_content = response_content.strip()
    
    import json
    try:
        summaries = json.loads(response_content)
        # Validate keys
        for key in ["short", "detailed", "executive"]:
            if key not in summaries:
                summaries[key] = "Summary generation failed."
        return summaries
    except Exception as e:
        print(f"Error parsing summaries JSON: {e}. Raw content: {response_content}")
        # Fallback split or default
        return {
            "short": f"Candidate profile summary based on resume.",
            "detailed": "Detailed candidate background and skills breakdown.",
            "executive": "Executive summary of career accomplishments."
        }

def ask_resume_question(question: str, resume_id: str = None) -> dict:
    """
    Query the vector database and generate an answer grounded strictly in the resume context.
    If resume_id is specified, search is restricted to that resume.
    """
    db = get_vector_store()
    
    # Define search filter
    search_filter = {}
    if resume_id:
        search_filter = {"resume_id": resume_id}
        
    # Retrieve relevant documents
    # If single resume, retrieve up to 5 chunks. If multi, retrieve up to 8 chunks.
    k_val = 5 if resume_id else 8
    
    # We use similarity search with score or standard similarity search
    retrieved_docs = db.similarity_search(question, k=k_val, filter=search_filter)
    
    context_list = []
    sources = []
    for i, doc in enumerate(retrieved_docs):
        context_list.append(f"[Source {i+1} - File: {doc.metadata.get('filename')} - Section: {doc.metadata.get('section')}]\n{doc.page_content}")
        sources.append({
            "filename": doc.metadata.get("filename"),
            "section": doc.metadata.get("section"),
            "content": doc.page_content
        })
        
    context = "\n\n".join(context_list)
    
    llm = get_llm(temperature=0.1)
    
    prompt = f"""
    You are the Resume AI Assistant. Your job is to answer questions about the candidate(s) using ONLY the provided resume excerpts (context).
    
    Strict Rules:
    1. Base your answers ONLY on the provided context.
    2. Do NOT assume, extrapolate, or invent facts not explicitly written in the context.
    3. If the context does not contain the answer, you MUST respond EXACTLY with:
       "The uploaded resume does not contain this information."
       Do not add any explanations, notes, or disclaimers. Just output that exact sentence.
    
    Context:
    {context}
    
    Question:
    {question}
    
    Answer:
    """
    
    response = invoke_llm_with_retry(llm, prompt)
    answer = response.content.strip()
    
    return {
        "answer": answer,
        "sources": sources
    }

def compare_resumes(resume_id_a: str, resume_id_b: str) -> dict:
    """Generate a comparison of two candidates using their profile content."""
    resume_a = database.get_resume(resume_id_a)
    resume_b = database.get_resume(resume_id_b)
    
    if not resume_a or not resume_b:
        raise ValueError("One or both resumes could not be found.")
        
    llm = get_llm(temperature=0.2)
    
    # Combine summaries and core details for the LLM
    prompt = f"""
    You are an expert recruitment consultant. Compare the following two candidates based on their resume profiles.
    
    Format your response EXACTLY as a JSON object with the following structure:
    {{
        "comparison_table": {{
            "skills": {{ "candidate_a": "skills summaries...", "candidate_b": "skills summaries..." }},
            "experience": {{ "candidate_a": "experience summary...", "candidate_b": "experience summary..." }},
            "education": {{ "candidate_a": "education summary...", "candidate_b": "education summary..." }},
            "certifications": {{ "candidate_a": "certifications summary...", "candidate_b": "certifications summary..." }},
            "projects": {{ "candidate_a": "projects summary...", "candidate_b": "projects summary..." }}
        }},
        "candidate_a_strengths": ["strength 1", "strength 2", ...],
        "candidate_a_weaknesses": ["weakness 1", "weakness 2", ...],
        "candidate_b_strengths": ["strength 1", "strength 2", ...],
        "candidate_b_weaknesses": ["weakness 1", "weakness 2", ...],
        "verdict": "A brief 2-3 sentence recommendation comparing who might be better suited for what type of role."
    }}
    
    Candidate A (Filename: {resume_a['filename']}):
    Name: {resume_a['sections'].get('name', 'Candidate A')}
    Detailed Profile: {resume_a['summary_detailed'] or resume_a['parsed_text'][:1000]}
    
    Candidate B (Filename: {resume_b['filename']}):
    Name: {resume_b['sections'].get('name', 'Candidate B')}
    Detailed Profile: {resume_b['summary_detailed'] or resume_b['parsed_text'][:1000]}
    
    Ensure the JSON is valid and only return the JSON, no markdown blocks or other text.
    """
    
    response = invoke_llm_with_retry(llm, prompt)
    response_content = response.content.strip()
    
    if response_content.startswith("```json"):
        response_content = response_content[7:]
    if response_content.endswith("```"):
        response_content = response_content[:-3]
    response_content = response_content.strip()
    
    import json
    try:
        comparison = json.loads(response_content)
        return comparison
    except Exception as e:
        print(f"Error parsing comparison JSON: {e}. Raw content: {response_content}")
        return {
            "comparison_table": {
                "skills": { "candidate_a": "N/A", "candidate_b": "N/A" },
                "experience": { "candidate_a": "N/A", "candidate_b": "N/A" },
                "education": { "candidate_a": "N/A", "candidate_b": "N/A" },
                "certifications": { "candidate_a": "N/A", "candidate_b": "N/A" },
                "projects": { "candidate_a": "N/A", "candidate_b": "N/A" }
            },
            "candidate_a_strengths": ["Could not parse comparison details."],
            "candidate_a_weaknesses": [],
            "candidate_b_strengths": ["Could not parse comparison details."],
            "candidate_b_weaknesses": [],
            "verdict": "An error occurred during comparison generation."
        }

def evaluate_candidate_for_job(resume: dict, needs: str, eligibilities: str) -> dict:
    llm = get_llm(temperature=0.1)
    
    resume_content = resume.get("parsed_text") or resume.get("summary_detailed") or ""
    if not resume_content:
        full_resume = database.get_resume(resume["id"])
        if full_resume:
            resume_content = full_resume.get("parsed_text") or ""
            
    prompt = f"""
    You are an expert HR recruitment specialist. Evaluate the candidate's resume content against the company's job needs and eligibility criteria.
    
    Job Needs:
    {needs}
    
    Eligibility Criteria:
    {eligibilities}
    
    Candidate Name: {resume.get('sections', {}).get('name') or resume.get('filename')}
    Resume Content:
    {resume_content}
    
    Your task is to determine if the candidate should be shortlisted, calculate a matching score, and check each eligibility criteria.
    
    Format your response EXACTLY as a JSON object with the following structure:
    {{
        "is_shortlisted": true/false,
        "match_percentage": 85,
        "needs_met": ["need 1 description", "need 2 description"],
        "needs_unmet": ["unmet need 1", "unmet need 2"],
        "eligibility_check": [
            {{ "criteria": "criteria 1 description", "met": true/false, "details": "why it is met or not met" }},
            {{ "criteria": "criteria 2 description", "met": true/false, "details": "why it is met or not met" }}
        ],
        "reasoning": "A brief 2-3 sentence reasoning explaining the match assessment."
    }}
    
    Ensure the JSON is valid and only return the JSON, no markdown blocks or other text.
    """
    
    response = invoke_llm_with_retry(llm, prompt)
    response_content = response.content.strip()
    
    if response_content.startswith("```json"):
        response_content = response_content[7:]
    if response_content.endswith("```"):
        response_content = response_content[:-3]
    response_content = response_content.strip()
    
    import json
    try:
        evaluation = json.loads(response_content)
        evaluation["id"] = resume["id"]
        evaluation["filename"] = resume["filename"]
        evaluation["name"] = resume.get("sections", {}).get("name") or resume["filename"]
        return evaluation
    except Exception as e:
        print(f"Error parsing candidate evaluation JSON: {e}. Raw: {response_content}")
        return {
            "id": resume["id"],
            "filename": resume["filename"],
            "name": resume.get("sections", {}).get("name") or resume["filename"],
            "is_shortlisted": False,
            "match_percentage": 0,
            "needs_met": [],
            "needs_unmet": ["Failed to parse AI evaluation output."],
            "eligibility_check": [],
            "reasoning": f"Error occurred during evaluation: {str(e)}"
        }

def filter_resumes(needs: str, eligibilities: str) -> list:
    resumes = database.get_all_resumes()
    if not resumes:
        return []
        
    import time
    evaluations = []
    
    for i, resume in enumerate(resumes):
        if i > 0:
            # Add 1.0 second delay between requests on free tier to avoid 429 rate limits
            time.sleep(1.0)
        try:
            eval_res = evaluate_candidate_for_job(resume, needs, eligibilities)
            evaluations.append(eval_res)
        except Exception as exc:
            print(f"Candidate evaluation generated an exception for {resume.get('filename')}: {exc}")
            
    evaluations.sort(key=lambda x: x.get("match_percentage", 0), reverse=True)
    return evaluations
