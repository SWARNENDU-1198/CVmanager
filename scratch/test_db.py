import os
import sys
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

dotenv_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(dotenv_path)

from backend.database import get_supabase_client

def main():
    try:
        client = get_supabase_client()
        print("Connected to Supabase.")
        
        # Test query to resumes table
        print("\n--- Testing resumes table ---")
        try:
            res = client.table("resumes").select("count", count="exact").limit(1).execute()
            print(f"Resumes count query success: {res.count} records.")
        except Exception as e:
            print(f"Error querying resumes table: {e}")
            
        # Test query to documents table
        print("\n--- Testing documents table ---")
        try:
            res = client.table("documents").select("count", count="exact").limit(1).execute()
            print(f"Documents count query success: {res.count} records.")
        except Exception as e:
            print(f"Error querying documents table: {e}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
