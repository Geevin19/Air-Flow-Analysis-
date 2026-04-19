#!/usr/bin/env python3
"""
PostgreSQL Migration Script
Adds missing columns to existing tables
"""
import os
import sys
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv

load_dotenv()

def run_postgres_migrations():
    """Add missing columns to PostgreSQL database"""
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    
    if not DATABASE_URL:
        print("❌ ERROR: DATABASE_URL not found in .env file")
        return False
        
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    try:
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            # Check if users table exists
            inspector = inspect(engine)
            if 'users' not in inspector.get_table_names():
                print("❌ Users table doesn't exist. Run docker-compose up first to create tables.")
                return False
            
            # Get existing columns
            existing_columns = {col['name'] for col in inspector.get_columns('users')}
            print(f"📋 Existing columns: {existing_columns}")
            
            # Define migrations
            migrations = [
                ("purpose", "ALTER TABLE users ADD COLUMN purpose VARCHAR(100)"),
                ("role", "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'worker'"),
                ("manager_id", "ALTER TABLE users ADD COLUMN manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL"),
                ("is_verified", "ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE"),
                ("otp_code", "ALTER TABLE users ADD COLUMN otp_code VARCHAR(6)"),
                ("otp_expires", "ALTER TABLE users ADD COLUMN otp_expires TIMESTAMP"),
                ("created_at", "ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
            ]
            
            # Run migrations
            for col_name, sql in migrations:
                if col_name not in existing_columns:
                    try:
                        conn.execute(text(sql))
                        print(f"✅ Added column: {col_name}")
                    except Exception as e:
                        print(f"⚠️  Failed to add {col_name}: {e}")
                else:
                    print(f"⏭️  Column {col_name} already exists")
            
            conn.commit()
            print("✅ PostgreSQL migrations completed successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    print("🔄 Running PostgreSQL migrations...")
    success = run_postgres_migrations()
    sys.exit(0 if success else 1)