import os
import sys
from dotenv import load_dotenv
import google.generativeai as genai

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

dotenv_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(dotenv_path)

def main():
    api_key = os.getenv("GEMINI_API_KEY")
    print("API Key starts with:", api_key[:10] if api_key else "None")
    
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env")
        return
        
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        print("Calling generate_content...")
        response = model.generate_content("Say hello in 3 words")
        print("Success! Response:")
        print(response.text)
    except Exception as e:
        print("Exception occurred:")
        print(type(e))
        print(e)

if __name__ == "__main__":
    main()
