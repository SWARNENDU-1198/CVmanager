import os
import json
import sqlite3
from datetime import datetime
from supabase import create_client, Client
from backend.config import settings

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "resumes.db"))
_supabase_client: Client = None

def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be configured in environment/.env")
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _supabase_client

def get_sqlite_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_sqlite():
    with get_sqlite_conn() as conn:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS resumes (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            upload_time TEXT NOT NULL,
            summary_short TEXT,
            summary_detailed TEXT,
            summary_executive TEXT,
            parsed_text TEXT,
            sections_json TEXT
        )
        """)
        conn.commit()

def init_db():
    init_sqlite()
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            client = get_supabase_client()
            print("Successfully connected to Supabase.")
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
        except Exception as e:
            print(f"WARNING: Supabase connection could not be established: {e}. Using local SQLite.")

def _add_resume_sqlite(id_val: str, filename: str, filepath: str, parsed_text: str, sections_str: str):
    now = datetime.utcnow().isoformat()
    with get_sqlite_conn() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO resumes 
            (id, filename, filepath, upload_time, parsed_text, sections_json)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (id_val, filename, filepath, now, parsed_text, sections_str))
        conn.commit()

def add_resume(id_val: str, filename: str, filepath: str, parsed_text: str, sections: dict):
    sections_str = json.dumps(sections) if isinstance(sections, dict) else (sections or "")
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            client = get_supabase_client()
            data = {
                "id": id_val,
                "filename": filename,
                "filepath": filepath,
                "parsed_text": parsed_text,
                "sections_json": sections
            }
            client.table("resumes").upsert(data).execute()
            _add_resume_sqlite(id_val, filename, filepath, parsed_text, sections_str)
            return
        except Exception as e:
            print(f"Supabase add_resume failed ({e}), falling back to SQLite.")

    _add_resume_sqlite(id_val, filename, filepath, parsed_text, sections_str)

def update_resume_summaries(id_val: str, short: str, detailed: str, executive: str):
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            client = get_supabase_client()
            client.table("resumes").update({
                "summary_short": short,
                "summary_detailed": detailed,
                "summary_executive": executive
            }).eq("id", id_val).execute()
        except Exception as e:
            print(f"Supabase update_resume_summaries failed ({e}), updating SQLite.")

    with get_sqlite_conn() as conn:
        conn.execute("""
            UPDATE resumes 
            SET summary_short = ?, summary_detailed = ?, summary_executive = ?
            WHERE id = ?
        """, (short, detailed, executive, id_val))
        conn.commit()

def get_all_resumes():
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
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
            if resumes:
                return resumes
        except Exception as e:
            print(f"Error fetching all resumes from Supabase ({e}), falling back to SQLite.")

    resumes = []
    with get_sqlite_conn() as conn:
        rows = conn.execute("SELECT id, filename, filepath, upload_time, summary_short, summary_detailed, summary_executive, sections_json FROM resumes ORDER BY upload_time DESC").fetchall()
        for row in rows:
            r = dict(row)
            try:
                r['sections'] = json.loads(r['sections_json']) if r.get('sections_json') else {}
            except Exception:
                r['sections'] = {}
            if 'sections_json' in r:
                del r['sections_json']
            resumes.append(r)
    return resumes

def get_resume(id_val: str):
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            client = get_supabase_client()
            response = client.table("resumes").select("*").eq("id", id_val).execute()
            if response.data:
                r = dict(response.data[0])
                r['sections'] = r.get('sections_json') or {}
                if 'sections_json' in r:
                    del r['sections_json']
                return r
        except Exception as e:
            print(f"Error fetching resume {id_val} from Supabase ({e}), falling back to SQLite.")

    with get_sqlite_conn() as conn:
        row = conn.execute("SELECT * FROM resumes WHERE id = ?", (id_val,)).fetchone()
        if row:
            r = dict(row)
            try:
                r['sections'] = json.loads(r['sections_json']) if r.get('sections_json') else {}
            except Exception:
                r['sections'] = {}
            if 'sections_json' in r:
                del r['sections_json']
            return r
    return None

def delete_resume(id_val: str):
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            client = get_supabase_client()
            client.table("resumes").delete().eq("id", id_val).execute()
        except Exception as e:
            print(f"Error deleting resume {id_val} from Supabase: {e}")

    with get_sqlite_conn() as conn:
        conn.execute("DELETE FROM resumes WHERE id = ?", (id_val,))
        conn.commit()


