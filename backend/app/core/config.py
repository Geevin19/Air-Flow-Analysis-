
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = 'your-secret-key'

    class Config:
        env_file = str(BASE_DIR / '.env')

settings = Settings()