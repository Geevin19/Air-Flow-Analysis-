from sqlalchemy import create_engine

DATABASE_URL = "postgresql://postgres:1234@localhost:5432/airflow_db"

try:
    engine = create_engine(DATABASE_URL)
    connection = engine.connect()
    print("Database connected successfully!")
    connection.close()

except Exception as e:
    print("Connection failed:", e)