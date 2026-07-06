import os
import sys
import uuid
import shutil

# Add parent directory to path to ensure backend package can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.config import settings
from backend import database
from backend.parser import extractor, detector
from backend.ai import rag_service

def is_api_key_configured() -> bool:
    if settings.LLM_PROVIDER == "groq":
        return bool(settings.GROQ_API_KEY)
    return bool(settings.GEMINI_API_KEY)

app = FastAPI(title="Resume AI Assistant API")

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    database.init_db()

# Mount uploaded files directory as static so we can view them
app.mount("/static/uploads", StaticFiles(directory=settings.UPLOADS_DIR), name="uploads")

# Pydantic models for API requests/responses
class QueryRequest(BaseModel):
    question: str
    resume_id: Optional[str] = None

class CompareRequest(BaseModel):
    resume_id_a: str
    resume_id_b: str

class SettingsUpdateRequest(BaseModel):
    llm_provider: Optional[str] = "gemini"
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    groq_api_key: Optional[str] = None
    groq_model: Optional[str] = None

# Settings Endpoints
@app.get("/api/settings")
def get_settings():
    has_active_key = (
        bool(settings.GEMINI_API_KEY) if settings.LLM_PROVIDER == "gemini"
        else bool(settings.GROQ_API_KEY)
    )
    active_model = settings.GEMINI_MODEL if settings.LLM_PROVIDER == "gemini" else settings.GROQ_MODEL
    
    return {
        "has_key": has_active_key,
        "model": active_model,
        "llm_provider": settings.LLM_PROVIDER,
        "has_gemini_key": bool(settings.GEMINI_API_KEY),
        "gemini_model": settings.GEMINI_MODEL,
        "has_groq_key": bool(settings.GROQ_API_KEY),
        "groq_model": settings.GROQ_MODEL
    }

@app.post("/api/settings")
def update_settings(req: SettingsUpdateRequest):
    if req.llm_provider:
        settings.LLM_PROVIDER = req.llm_provider.strip().lower()
        if settings.LLM_PROVIDER not in ["gemini", "groq"]:
            settings.LLM_PROVIDER = "gemini"
            
    if req.gemini_api_key is not None:
        key_val = req.gemini_api_key.strip()
        if key_val and not key_val.startswith("••••"):
            settings.GEMINI_API_KEY = key_val
    if req.gemini_model:
        settings.GEMINI_MODEL = req.gemini_model.strip()
        
    if req.groq_api_key is not None:
        key_val = req.groq_api_key.strip()
        if key_val and not key_val.startswith("••••"):
            settings.GROQ_API_KEY = key_val
    if req.groq_model:
        settings.GROQ_MODEL = req.groq_model.strip()
    
    # Save to a local .env file in backend directory so it persists across restarts
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    with open(env_path, "w", encoding="utf-8") as f:
        f.write(f"GEMINI_API_KEY={settings.GEMINI_API_KEY}\n")
        f.write(f"GEMINI_MODEL={settings.GEMINI_MODEL}\n")
        f.write(f"GROQ_API_KEY={settings.GROQ_API_KEY}\n")
        f.write(f"GROQ_MODEL={settings.GROQ_MODEL}\n")
        f.write(f"LLM_PROVIDER={settings.LLM_PROVIDER}\n")
        f.write(f"SUPABASE_URL={settings.SUPABASE_URL}\n")
        f.write(f"SUPABASE_KEY={settings.SUPABASE_KEY}\n")
        
    has_active_key = (
        bool(settings.GEMINI_API_KEY) if settings.LLM_PROVIDER == "gemini"
        else bool(settings.GROQ_API_KEY)
    )
    active_model = settings.GEMINI_MODEL if settings.LLM_PROVIDER == "gemini" else settings.GROQ_MODEL

    return {
        "success": True,
        "has_key": has_active_key,
        "model": active_model,
        "llm_provider": settings.LLM_PROVIDER,
        "has_gemini_key": bool(settings.GEMINI_API_KEY),
        "gemini_model": settings.GEMINI_MODEL,
        "has_groq_key": bool(settings.GROQ_API_KEY),
        "groq_model": settings.GROQ_MODEL
    }

# Resume Management Endpoints
@app.post("/api/resumes/upload")
async def upload_resumes(files: List[UploadFile] = File(...)):
    uploaded_resumes = []
    failed_resumes = []
    client = database.get_supabase_client()
    
    for file in files:
        # Validate extension
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg"]:
            failed_resumes.append({"filename": file.filename, "error": "Unsupported file format."})
            continue  # Skip unsupported files
            
        resume_id = str(uuid.uuid4())
        safe_filename = f"{resume_id}{ext}"
        # Save to a temporary file locally so we can extract text
        temp_filepath = os.path.join(settings.UPLOADS_DIR, safe_filename)
        
        with open(temp_filepath, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        uploaded_to_storage = False
        added_to_db = False
        
        try:
            # 1. Extract raw text
            raw_text = extractor.extract_text(temp_filepath)
            
            # 2. Segment into sections
            sections = detector.detect_sections(raw_text)
            
            # 3. Upload to Supabase Storage
            try:
                with open(temp_filepath, "rb") as file_data:
                    client.storage.from_("resumes").upload(
                        path=safe_filename,
                        file=file_data,
                        file_options={"content-type": file.content_type}
                    )
                uploaded_to_storage = True
            except Exception as upload_err:
                err_str = str(upload_err)
                if "bucket not found" in err_str.lower():
                    print("Supabase storage bucket 'resumes' not found. Attempting auto-creation...")
                    try:
                        client.storage.create_bucket("resumes", options={"public": True})
                        print("Bucket 'resumes' created successfully. Retrying upload...")
                        with open(temp_filepath, "rb") as file_data:
                            client.storage.from_("resumes").upload(
                                path=safe_filename,
                                file=file_data,
                                file_options={"content-type": file.content_type}
                            )
                        uploaded_to_storage = True
                    except Exception as retry_err:
                        print(f"Auto-creation of bucket or upload retry failed: {retry_err}")
                        raise HTTPException(
                            status_code=404,
                            detail=(
                                "Supabase storage bucket 'resumes' was not found and could not be created automatically. "
                                "Please make sure a public bucket named 'resumes' exists in your Supabase project dashboard, "
                                "or configure your SUPABASE_KEY in backend/.env with service_role permissions."
                            )
                        )
                else:
                    raise upload_err
            
            # Get the public URL
            public_url = client.storage.from_("resumes").get_public_url(safe_filename)
            
            # 4. Save to database (without summaries initially, in case API fails)
            database.add_resume(resume_id, file.filename, public_url, raw_text, sections)
            added_to_db = True
            
            # 5. Generate Summaries via LLM (if key exists)
            summaries = {
                "short": "Summary not generated yet. Configure API key in Settings.",
                "detailed": "Summary not generated yet.",
                "executive": "Summary not generated yet."
            }
            
            if is_api_key_configured():
                try:
                    summaries = rag_service.generate_summaries(raw_text)
                    database.update_resume_summaries(
                        resume_id, 
                        summaries["short"], 
                        summaries["detailed"], 
                        summaries["executive"]
                    )
                except Exception as api_err:
                    print(f"LLM Summary generation failed for {file.filename}: {api_err}")
            
            # 6. Index chunks in pgvector/Supabase
            rag_service.index_resume(resume_id, file.filename, sections)
            
            uploaded_resumes.append({
                "id": resume_id,
                "filename": file.filename,
                "summary": summaries["short"],
                "sections": sections
            })
            
        except HTTPException as he:
            # Clean up Supabase Storage if upload happened but later failed
            if uploaded_to_storage:
                try:
                    client.storage.from_("resumes").remove([safe_filename])
                except Exception:
                    pass
            # Clean up Database if record was added but later failed
            if added_to_db:
                try:
                    database.delete_resume(resume_id)
                except Exception:
                    pass
            print(f"Failed to process upload {file.filename}: {he.detail}")
            failed_resumes.append({"filename": file.filename, "error": he.detail})
        except Exception as e:
            # Clean up Supabase Storage if upload happened but later failed
            if uploaded_to_storage:
                try:
                    client.storage.from_("resumes").remove([safe_filename])
                except Exception:
                    pass
            # Clean up Database if record was added but later failed
            if added_to_db:
                try:
                    database.delete_resume(resume_id)
                except Exception:
                    pass
            print(f"Failed to process upload {file.filename}: {e}")
            failed_resumes.append({"filename": file.filename, "error": str(e)})
        finally:
            # Always clean up temporary local file
            if os.path.exists(temp_filepath):
                try:
                    os.remove(temp_filepath)
                except Exception:
                    pass
            
    if len(uploaded_resumes) == 0 and len(failed_resumes) > 0:
        first_err_str = failed_resumes[0]["error"]
        first_err_filename = failed_resumes[0]["filename"]
        
        if any(x in first_err_str.upper() for x in ["429", "RESOURCE_EXHAUSTED", "RATE_LIMIT", "QUOTA"]):
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Gemini API Quota or Rate Limit exceeded while processing {first_err_filename}. "
                    "If you are using a free tier API key, you may have reached your daily limit (20 requests) or "
                    "made too many requests too quickly. Please configure a new Gemini API key in the Settings panel "
                    "or try again in a few minutes."
                )
            )
        elif "bucket not found" in first_err_str.lower() or "was not found and could not be created automatically" in first_err_str.lower():
            raise HTTPException(
                status_code=404,
                detail=(
                    "Supabase storage bucket 'resumes' not found. "
                    "Please create a public bucket named 'resumes' in your Supabase project dashboard, "
                    "or configure your SUPABASE_KEY in backend/.env with service_role permissions."
                )
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process {first_err_filename}: {first_err_str}"
            )
            
    return {"uploaded": uploaded_resumes, "failed": failed_resumes}

@app.get("/api/resumes")
def list_resumes():
    try:
        return database.get_all_resumes()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/resumes/{resume_id}")
def get_resume_details(resume_id: str):
    resume = database.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Use public URL directly as download_url
    resume["download_url"] = resume["filepath"]
    return resume

@app.delete("/api/resumes/{resume_id}")
def delete_resume_endpoint(resume_id: str):
    resume = database.get_resume(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    try:
        # Delete from pgvector/Supabase
        rag_service.delete_resume_vectors(resume_id)
        
        # Delete from Supabase database resumes table
        database.delete_resume(resume_id)
        
        # Delete from Supabase Storage
        try:
            # Extract filename from public URL (last part of filepath)
            storage_filename = resume["filepath"].split("/")[-1]
            client = database.get_supabase_client()
            client.storage.from_("resumes").remove([storage_filename])
        except Exception as storage_err:
            print(f"Failed to remove file from Supabase storage: {storage_err}")
            
        return {"success": True, "message": f"Resume {resume['filename']} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete resume: {str(e)}")

# AI Query Endpoint
@app.post("/api/query")
def query_resumes(req: QueryRequest):
    if not is_api_key_configured():
         raise HTTPException(status_code=400, detail="API Key is not configured. Please add it in the Settings panel.")
         
    try:
        result = rag_service.ask_resume_question(req.question, req.resume_id)
        return result
    except Exception as e:
        err_str = str(e)
        if any(x in err_str.upper() for x in ["429", "RESOURCE_EXHAUSTED", "RATE_LIMIT", "QUOTA"]):
             raise HTTPException(
                 status_code=429,
                 detail="Gemini API Quota or Rate Limit exceeded. If you are using a free tier API key, you may have reached your daily limit (20 requests) or made too many requests too quickly. Please configure a new Gemini API key in the Settings panel or try again in a few minutes."
             )
        raise HTTPException(status_code=500, detail=err_str)

# AI Compare Endpoint
@app.post("/api/compare")
def compare_resumes_endpoint(req: CompareRequest):
    if not is_api_key_configured():
         raise HTTPException(status_code=400, detail="API Key is not configured. Please add it in the Settings panel.")
         
    try:
        result = rag_service.compare_resumes(req.resume_id_a, req.resume_id_b)
        return result
    except Exception as e:
        err_str = str(e)
        if any(x in err_str.upper() for x in ["429", "RESOURCE_EXHAUSTED", "RATE_LIMIT", "QUOTA"]):
             raise HTTPException(
                 status_code=429,
                 detail="Gemini API Quota or Rate Limit exceeded. If you are using a free tier API key, you may have reached your daily limit (20 requests) or made too many requests too quickly. Please configure a new Gemini API key in the Settings panel or try again in a few minutes."
             )
        raise HTTPException(status_code=500, detail=err_str)

# AI Filter Endpoint
class FilterRequest(BaseModel):
    needs: str
    eligibilities: str

@app.post("/api/resumes/filter")
def filter_resumes_endpoint(req: FilterRequest):
    if not is_api_key_configured():
         raise HTTPException(status_code=400, detail="API Key is not configured. Please add it in the Settings panel.")
         
    try:
        result = rag_service.filter_resumes(req.needs, req.eligibilities)
        return result
    except Exception as e:
        err_str = str(e)
        if any(x in err_str.upper() for x in ["429", "RESOURCE_EXHAUSTED", "RATE_LIMIT", "QUOTA"]):
             raise HTTPException(
                 status_code=429,
                 detail="Gemini API Quota or Rate Limit exceeded. If you are using a free tier API key, you may have reached your daily limit (20 requests) or made too many requests too quickly. Please configure a new Gemini API key in the Settings panel or try again in a few minutes."
             )
        raise HTTPException(status_code=500, detail=err_str)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
