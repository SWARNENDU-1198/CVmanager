import os
import sys
import uuid
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

dotenv_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(dotenv_path)

from backend.database import get_supabase_client
from backend.parser import extractor, detector
from backend.ai import rag_service

def main():
    from backend.config import settings
    settings.LLM_PROVIDER = "gemini"
    settings.GEMINI_MODEL = "gemini-3.5-flash"
    
    image_path = "backend/uploads/4725d0c5-17a1-4756-9145-5a0a0f2894d8.png"
    if not os.path.exists(image_path):
        print(f"Error: {image_path} does not exist.")
        return
        
    print(f"Testing with image: {image_path}")
    
    try:
        # 1. Extract raw text
        print("1. Extracting text...")
        raw_text = extractor.extract_text(image_path)
        print(f"Raw text (first 100 chars): {raw_text[:100]}")
        
        # 2. Segment into sections
        print("2. Detecting sections...")
        sections = detector.detect_sections(raw_text)
        print(f"Sections found: {list(sections.keys())}")
        
        # 3. Supabase upload
        print("3. Uploading to Supabase Storage...")
        client = get_supabase_client()
        safe_filename = f"test_{uuid.uuid4()}.png"
        with open(image_path, "rb") as file_data:
            res = client.storage.from_("resumes").upload(
                path=safe_filename,
                file=file_data,
                file_options={"content-type": "image/png"}
            )
        print(f"Upload response: {res}")
        
        # 4. Get public URL
        print("4. Getting public URL...")
        public_url = client.storage.from_("resumes").get_public_url(safe_filename)
        print(f"Public URL: {public_url}")
        
        # 5. Clean up from storage
        print("5. Cleaning up file from storage...")
        client.storage.from_("resumes").remove([safe_filename])
        print("Clean up success.")
        
    except Exception as e:
        print(f"Failed with exception type: {type(e)}")
        print(f"Exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
