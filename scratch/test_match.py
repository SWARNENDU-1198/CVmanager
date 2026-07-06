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
        client.storage.from_("nonexistent_bucket_xyz").upload(
            path="test.txt",
            file=b"test",
            file_options={"content-type": "text/plain"}
        )
    except Exception as e:
        err_str = str(e)
        print(f"err_str: {err_str}")
        print(f"Is 'Bucket not found' in err_str? {'Bucket not found' in err_str}")
        print(f"Is 'bucket not found' in err_str? {'bucket not found' in err_str}")
        print(f"Is 'bucket not found' in err_str.lower()? {'bucket not found' in err_str.lower()}")

if __name__ == "__main__":
    main()
