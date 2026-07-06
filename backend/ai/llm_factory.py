import time
import random
from langchain_google_genai import ChatGoogleGenerativeAI
from backend.config import settings

def get_llm(temperature: float = 0.2, model_type: str = "text"):
    if settings.LLM_PROVIDER == "groq":
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not set. Please configure it in your Settings or .env file.")
        from langchain_groq import ChatGroq
        model_name = settings.GROQ_VISION_MODEL if model_type == "vision" else settings.GROQ_MODEL
        
        return ChatGroq(
            model=model_name,
            groq_api_key=settings.GROQ_API_KEY,
            temperature=temperature,
        )
    else:
        # Default to Gemini
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not set. Please configure it in your Settings or .env file.")
        
        return ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=temperature
        )


def invoke_llm_with_retry(llm, messages_or_prompt, max_retries: int = 5, initial_delay: float = 2.0):
    """
    Invokes the LLM and retries with exponential backoff if a 429/ResourceExhausted rate limit is hit.
    """
    delay = initial_delay
    for attempt in range(max_retries):
        try:
            return llm.invoke(messages_or_prompt)
        except Exception as e:
            err_str = str(e)
            # Detect 429 or RESOURCE_EXHAUSTED / rate limits / quota
            is_rate_limit = any(x in err_str.upper() for x in ["429", "RESOURCE_EXHAUSTED", "RATE_LIMIT", "QUOTA"])
            
            if is_rate_limit and attempt < max_retries - 1:
                # Add jitter to the delay
                sleep_time = delay + random.uniform(0, 1.0)
                print(f"Gemini API rate limit hit. Retrying attempt {attempt + 1}/{max_retries} in {sleep_time:.2f} seconds...")
                time.sleep(sleep_time)
                delay *= 2  # Exponential backoff
            else:
                # Raise the error if it's not a rate limit error or if we've exhausted all retries
                raise e

