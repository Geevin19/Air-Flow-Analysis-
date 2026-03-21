from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'), pool_pre_ping=True)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires TIMESTAMP"))
        conn.commit()
        print("Migration done!")
    except Exception as e:
        print(f"Error: {e}")
