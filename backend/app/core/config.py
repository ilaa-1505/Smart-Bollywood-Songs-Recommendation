from pathlib import Path

from pydantic_settings import BaseSettings


ROOT_DIR = Path(__file__).resolve().parents[3]

print("ROOT_DIR:", ROOT_DIR)


class Settings(BaseSettings):

    GROQ_API_KEY: str

    GROQ_MODEL: str = "llama-3.1-8b-instant"

    SPOTIPY_CLIENT_ID: str = ""

    SPOTIPY_CLIENT_SECRET: str = ""

    class Config:

        env_file = ROOT_DIR / ".env"

        extra = "ignore"


settings = Settings()