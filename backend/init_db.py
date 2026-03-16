from sqlalchemy import create_engine, text
from database import Base, DATABASE_URL
from models import User, Simulation
import os

def init_database():
    # Create database if it doesn't exist (for PostgreSQL)
    if DATABASE_URL.startswith('postgresql'):
        # Extract database name
        db_name = DATABASE_URL.split('/')[-1]
        base_url = DATABASE_URL.rsplit('/', 1)[0]
        
        # Connect to postgres database to create our database
        engine = create_engine(f"{base_url}/postgres")
        conn = engine.connect()
        conn.execution_options(isolation_level="AUTOCOMMIT")
        
        try:
            conn.execute(text(f"CREATE DATABASE {db_name}"))
            print(f"✓ Database '{db_name}' created successfully")
        except Exception as e:
            if 'already exists' in str(e):
                print(f"✓ Database '{db_name}' already exists")
            else:
                print(f"Error creating database: {e}")
        finally:
            conn.close()
    
    # Create tables
    from database import engine
    Base.metadata.create_all(bind=engine)
    print("✓ All tables created successfully")

if __name__ == "__main__":
    init_database()
