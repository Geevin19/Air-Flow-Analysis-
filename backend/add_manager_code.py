"""
Migration script to add manager_code column to users table
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in environment variables")
    exit(1)

print(f"Connecting to database...")
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='manager_code'
        """))
        
        if result.fetchone():
            print("✓ Column 'manager_code' already exists in users table")
        else:
            # Add the manager_code column
            print("Adding manager_code column to users table...")
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN manager_code VARCHAR(20) UNIQUE
            """))
            
            # Create index on manager_code
            print("Creating index on manager_code...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_users_manager_code 
                ON users(manager_code)
            """))
            
            conn.commit()
            print("✓ Successfully added manager_code column and index")
            
except Exception as e:
    print(f"ERROR: {e}")
    exit(1)

print("\nMigration completed successfully!")
