from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

Base = declarative_base()
DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Ensure PostgreSQL URL format
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create PostgreSQL engine only
engine = create_engine(
    DATABASE_URL, 
    pool_pre_ping=True, 
    pool_size=5,
    max_overflow=10, 
    pool_recycle=3600,
    connect_args={"connect_timeout": 10}
)

# Test connection immediately
try:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print("[DB] Connected to PostgreSQL successfully")
except Exception as e:
    print(f"[DB] Failed to connect to PostgreSQL: {e}")
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"[DB Health Check Failed]: {e}")
        return False
