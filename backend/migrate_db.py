from sqlalchemy import create_engine, text, inspect
from database import DATABASE_URL, Base
from models import User, Simulation
import os

def migrate_database():
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    
    # Check if tables exist
    existing_tables = inspector.get_table_names()
    
    print("Existing tables:", existing_tables)
    
    # Drop existing tables if they have wrong schema
    if 'users' in existing_tables or 'simulations' in existing_tables:
        print("Dropping existing tables...")
        Base.metadata.drop_all(bind=engine)
        print("✓ Tables dropped")
    
    # Create all tables with correct schema
    print("Creating tables with correct schema...")
    Base.metadata.create_all(bind=engine)
    print("✓ All tables created successfully")
    
    # Verify the schema
    print("\nVerifying schema...")
    if 'users' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('users')]
        print(f"Users table columns: {columns}")
    
    if 'simulations' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('simulations')]
        print(f"Simulations table columns: {columns}")

if __name__ == "__main__":
    migrate_database()
