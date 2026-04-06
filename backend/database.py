from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
SQLITE_URL = "sqlite:///./simulation.db"

def _try_postgres(url: str):
    """Try to connect to Postgres. Returns engine if successful, None otherwise."""
    try:
        eng = create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 5})
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return eng
    except Exception as e:
        print(f"[DB] Postgres unreachable ({e.__class__.__name__}). Falling back to SQLite.")
        return None

if DATABASE_URL and DATABASE_URL.startswith("postgresql"):
    engine = _try_postgres(DATABASE_URL) or create_engine(
        SQLITE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

db_type = "PostgreSQL" if "postgresql" in str(engine.url) else "SQLite"
print(f"[DB] Connected using {db_type}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
