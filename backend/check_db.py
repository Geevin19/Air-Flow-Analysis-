from sqlalchemy import create_engine, text, inspect
from database import DATABASE_URL
from models import User, Simulation

def check_database():
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    
    print("=" * 60)
    print("DATABASE CONNECTION INFO")
    print("=" * 60)
    print(f"Database URL: {DATABASE_URL}")
    print()
    
    # List all tables
    print("=" * 60)
    print("TABLES")
    print("=" * 60)
    tables = inspector.get_table_names()
    for table in tables:
        print(f"✓ {table}")
    print()
    
    # Show table schemas
    for table in tables:
        print("=" * 60)
        print(f"TABLE: {table}")
        print("=" * 60)
        columns = inspector.get_columns(table)
        for col in columns:
            nullable = "NULL" if col['nullable'] else "NOT NULL"
            print(f"  {col['name']:<20} {str(col['type']):<20} {nullable}")
        print()
    
    # Count records
    with engine.connect() as conn:
        print("=" * 60)
        print("RECORD COUNTS")
        print("=" * 60)
        
        for table in tables:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            print(f"{table}: {count} records")
        print()
        
        # Show users
        result = conn.execute(text("SELECT id, username, email, purpose, created_at FROM users"))
        users = result.fetchall()
        
        if users:
            print("=" * 60)
            print("USERS")
            print("=" * 60)
            for user in users:
                print(f"ID: {user[0]}")
                print(f"  Username: {user[1]}")
                print(f"  Email: {user[2]}")
                print(f"  Purpose: {user[3]}")
                print(f"  Created: {user[4]}")
                print()
        
        # Show simulations
        result = conn.execute(text("SELECT id, user_id, name, created_at FROM simulations"))
        simulations = result.fetchall()
        
        if simulations:
            print("=" * 60)
            print("SIMULATIONS")
            print("=" * 60)
            for sim in simulations:
                print(f"ID: {sim[0]}")
                print(f"  User ID: {sim[1]}")
                print(f"  Name: {sim[2]}")
                print(f"  Created: {sim[3]}")
                print()

if __name__ == "__main__":
    check_database()
