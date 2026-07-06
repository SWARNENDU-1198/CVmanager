import os
import sys
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

dotenv_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(dotenv_path)

from backend.ai.llm_factory import get_llm, invoke_llm_with_retry

def main():
    # Force Gemini provider for testing
    from backend.config import settings
    settings.LLM_PROVIDER = "gemini"
    print("Testing Gemini with model:", settings.GEMINI_MODEL)
    try:
        llm = get_llm(temperature=0.2)
        print("LLM client obtained.")
        res = invoke_llm_with_retry(llm, "Say hello in 3 words")
        print("Response:", res.content)
    except Exception as e:
        print("Error calling Gemini:", e)

if __name__ == "__main__":
    main()
