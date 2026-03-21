"""
Supabase Database Setup Script
This script helps you set up the database tables in Supabase
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from models import Base
import sys

# Load environment variables
load_dotenv()

def setup_database():
    """Create all database tables"""
    
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("❌ ERROR: DATABASE_URL not found in .env file")
        print("\nPlease add your Supabase connection string to backend/.env:")
        print("DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres")
        sys.exit(1)
    
    print("🔗 Connecting to database...")
    print(f"   URL: {database_url.split('@')[1] if '@' in database_url else 'localhost'}")
    
    try:
        # Create engine
        if database_url.startswith('sqlite'):
            engine = create_engine(database_url, connect_args={'check_same_thread': False})
        else:
            engine = create_engine(database_url)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            print(f"✅ Connected successfully!")
            print(f"   Database: {version.split(',')[0]}")
        
        # Create all tables
        print("\n📋 Creating tables...")
        Base.metadata.create_all(bind=engine)
        
        # Verify tables were created
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """))
            tables = [row[0] for row in result.fetchall()]
            
            if tables:
                print("✅ Tables created successfully:")
                for table in tables:
                    print(f"   - {table}")
            else:
                print("⚠️  No tables found. This might be normal for SQLite.")
        
        print("\n✅ Database setup complete!")
        print("\nYou can now:")
        print("1. Start the backend: python main.py")
        print("2. Start the frontend: cd Frontend && npm run dev")
        print("3. Open http://localhost:5173 in your browser")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Check your DATABASE_URL in backend/.env")
        print("2. Verify your Supabase password is correct")
        print("3. Ensure your IP is allowed in Supabase settings")
        print("4. Try adding ?sslmode=require to your DATABASE_URL")
        sys.exit(1)

if __name__ == "__main__":
    print("=" * 60)
    print("  Supabase Database Setup")
    print("=" * 60)
    print()
    setup_database()
