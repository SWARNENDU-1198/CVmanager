import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-specdec"
    GROQ_VISION_MODEL: str = "llama-3.2-11b-vision-preview"
    LLM_PROVIDER: str = "gemini"
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    UPLOADS_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "uploads"))

    
    # Allow CORS origins config
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
