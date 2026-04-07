from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

Base = declarative_base()

DATABASE_URL = os.getenv("DATABASE_URL", "")

def _try_postgres(url: str):
    try:
        # Use psycopg2 driver; swap asyncpg/postgres:// prefix if needed
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        eng = create_engine(url, pool_pre_ping=True, pool_size=5,
                            max_overflow=10, pool_recycle=3600,
                            connect_args={"connect_timeout": 5})
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[DB] Connected using PostgreSQL")
        return eng
    except Exception as e:
        print(f"[DB] Postgres unreachable ({type(e).__name__}). Falling back to SQLite.")
        return None

if DATABASE_URL and DATABASE_URL.startswith(("postgresql", "postgres")):
    engine = _try_postgres(DATABASE_URL)
else:
    engine = None

if engine is None:
    sqlite_path = os.path.join(os.path.dirname(__file__), "simulation.db")
    engine = create_engine(
        f"sqlite:///{sqlite_path}",
        connect_args={"check_same_thread": False}
    )
    print("[DB] Connected using SQLite")

    # Auto-migrate: add missing columns to existing SQLite DB
    with engine.connect() as conn:
        existing = {row[1] for row in conn.execute(text("PRAGMA table_info(users)"))}
        migrations = {
            "purpose":     "ALTER TABLE users ADD COLUMN purpose VARCHAR(100)",
            "is_verified": "ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT 0",
            "otp_code":    "ALTER TABLE users ADD COLUMN otp_code VARCHAR(6)",
            "otp_expires": "ALTER TABLE users ADD COLUMN otp_expires DATETIME",
        }
        for col, sql in migrations.items():
            if col not in existing:
                conn.execute(text(sql))
                print(f"[DB] Migrated: added column '{col}' to users")
        conn.commit()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
