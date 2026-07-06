import os
import sys
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

dotenv_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(dotenv_path)

from google import genai

def main():
    api_key = os.getenv("GEMINI_API_KEY")
    print("API Key starts with:", api_key[:10] if api_key else "None")
    
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env")
        return
        
    try:
        client = genai.Client(api_key=api_key)
        
        print("Calling generate_content...")
        test_models = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-3.5-flash"]
        for model in test_models:
            print(f"\n--- Testing model: {model} ---")
            try:
                response = client.models.generate_content(
                    model=model,
                    contents="Say hello in 3 words"
                )
                print(f"Success with {model}! Response: {response.text}")
            except Exception as e:
                print(f"Failed with {model}: {e}")
    except Exception as e:
        print("Exception occurred:")
        print(type(e))
        print(e)

if __name__ == "__main__":
    main()
