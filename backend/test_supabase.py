import os
import sys
import uuid
from dotenv import load_dotenv

# Add parent directory to path to ensure backend package can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)

from backend.database import get_supabase_client

def main():
    try:
        client = get_supabase_client()
        print("Supabase client initialized.")
        print(f"URL: {os.getenv('SUPABASE_URL')}")
        
        print("\n--- Listing Buckets ---")
        try:
            buckets = client.storage.list_buckets()
            print("Buckets found:")
            for b in buckets:
                if isinstance(b, dict):
                    print(f"- {b.get('name')} (Public: {b.get('public')})")
                else:
                    print(f"- {getattr(b, 'name', None)} (Public: {getattr(b, 'public', None)})")
        except Exception as e:
            print(f"Error listing buckets: {e}")
            
        print("\n--- Attempting to upload to 'resumes' bucket ---")
        dummy_filename = f"test_{uuid.uuid4()}.txt"
        dummy_content = b"This is a dummy test upload."
        
        try:
            # Let's save a temp file to upload
            temp_file = "temp_test_file.txt"
            with open(temp_file, "wb") as f:
                f.write(dummy_content)
                
            with open(temp_file, "rb") as file_data:
                res = client.storage.from_("resumes").upload(
                    path=dummy_filename,
                    file=file_data,
                    file_options={"content-type": "text/plain"}
                )
            print(f"Upload success: {res}")
            
            # Clean up uploaded file
            try:
                client.storage.from_("resumes").remove([dummy_filename])
                print("Cleaned up uploaded file from storage.")
            except Exception as clean_err:
                print(f"Could not clean up uploaded file: {clean_err}")
                
            if os.path.exists(temp_file):
                os.remove(temp_file)
                
        except Exception as e:
            print(f"Error uploading file: {e}")
            
    except Exception as e:
        print(f"General error: {e}")

if __name__ == "__main__":
    main()
