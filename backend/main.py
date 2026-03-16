from fastapi import FastAPI
from database import SessionLocal
from models import User

app = FastAPI()

@app.post("/add_user")
def add_user(name: str, email: str):
    db = SessionLocal()
    new_user = User(name=name, email=email)
    db.add(new_user)
    db.commit()
    db.close()

    return {"message": "User added successfully"}