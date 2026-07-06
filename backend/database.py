import json
from datetime import datetime
from supabase import create_client, Client
from backend.config import settings

_supabase_client: Client = None

def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be configured in environment/.env")
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _supabase_client

def init_db():
    try:
        client = get_supabase_client()
        print("Successfully connected to Supabase.")
        
        # Ensure the 'resumes' storage bucket exists
        try:
            buckets = client.storage.list_buckets()
            bucket_names = []
            for b in buckets:
                if isinstance(b, dict):
                    bucket_names.append(b.get("name"))
                else:
                    bucket_names.append(getattr(b, "name", None))
            
            if "resumes" not in bucket_names:
                print("Bucket 'resumes' not found. Creating it...")
                client.storage.create_bucket("resumes", options={"public": True})
                print("Bucket 'resumes' created successfully.")
            else:
                print("Bucket 'resumes' already exists.")
        except Exception as storage_err:
            print(f"WARNING: Could not check/create Supabase storage bucket: {storage_err}")
            print("Please make sure a public storage bucket named 'resumes' exists in your Supabase dashboard,")
            print("or configure SUPABASE_KEY in backend/.env with a service_role key to auto-create it.")
            
    except Exception as e:
        print(f"WARNING: Supabase connection could not be established: {e}")

def add_resume(id_val: str, filename: str, filepath: str, parsed_text: str, sections: dict):
    client = get_supabase_client()
    data = {
        "id": id_val,
        "filename": filename,
        "filepath": filepath,
        "parsed_text": parsed_text,
        "sections_json": sections
    }
    client.table("resumes").upsert(data).execute()

def update_resume_summaries(id_val: str, short: str, detailed: str, executive: str):
    client = get_supabase_client()
    client.table("resumes").update({
        "summary_short": short,
        "summary_detailed": detailed,
        "summary_executive": executive
    }).eq("id", id_val).execute()

def get_all_resumes():
    try:
        client = get_supabase_client()
        response = client.table("resumes").select(
            "id, filename, filepath, upload_time, summary_short, summary_detailed, summary_executive, sections_json"
        ).order("upload_time", desc=True).execute()
        
        resumes = []
        for row in response.data:
            r = dict(row)
            r['sections'] = r.get('sections_json') or {}
            if 'sections_json' in r:
                del r['sections_json']
            resumes.append(r)
        return resumes
    except Exception as e:
        print(f"Error fetching all resumes: {e}")
        return []

def get_resume(id_val: str):
    try:
        client = get_supabase_client()
        response = client.table("resumes").select("*").eq("id", id_val).execute()
        if response.data:
            r = dict(response.data[0])
            r['sections'] = r.get('sections_json') or {}
            if 'sections_json' in r:
                del r['sections_json']
            return r
        return None
    except Exception as e:
        print(f"Error fetching resume {id_val}: {e}")
        return None

def delete_resume(id_val: str):
    client = get_supabase_client()
    client.table("resumes").delete().eq("id", id_val).execute()

