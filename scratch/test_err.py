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
        # Attempt to upload to a non-existent bucket to trigger the exact error
        client.storage.from_("nonexistent_bucket_xyz").upload(
            path="test.txt",
            file=b"test",
            file_options={"content-type": "text/plain"}
        )
    except Exception as e:
        print(f"Exception type: {type(e)}")
        print(f"Exception str: {str(e)}")
        print(f"Exception repr: {repr(e)}")
        if hasattr(e, 'message'):
            print(f"e.message: {e.message}")
        if hasattr(e, 'args'):
            print(f"e.args: {e.args}")

if __name__ == "__main__":
    main()
