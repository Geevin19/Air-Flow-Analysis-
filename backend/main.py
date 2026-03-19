from fastapi import FastAPI, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models

app = FastAPI()

Base.metadata.create_all(bind=engine)

# DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ✅ Register API
@app.post("/register")
def register(user: dict, db: Session = Depends(get_db)):
    new_user = models.User(
        username=user["username"],
        password=user["password"]
    )
    db.add(new_user)
    db.commit()
    return {"message": "User created"}


# ✅ Login API
@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.username == form_data.username
    ).first()

    if not user or user.password != form_data.password:
        return {"detail": "Invalid credentials"}

    return {"access_token": "dummy_token", "token_type": "bearer"}


# Test route
@app.get("/")
def root():
    return {"message": "Backend running 🚀"}