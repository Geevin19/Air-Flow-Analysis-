from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List

from database import engine, get_db, Base
from models import User, Simulation
from schemas import UserCreate, UserResponse, Token, SimulationCreate, SimulationResponse
from auth import verify_password, get_password_hash, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from simulation import run_simulation

Base.metadata.create_all(bind=engine)

app = FastAPI(title='Simulation API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000', 'http://localhost:5173'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.get('/')
def read_root():
    return {'message': 'Simulation API is running'}

@app.post('/register', response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter((User.username == user.username) | (User.email == user.email)).first()
    if db_user:
        raise HTTPException(status_code=400, detail='Username or email already registered')
    hashed_password = get_password_hash(user.password)
    new_user = User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post('/token', response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Incorrect username or password', headers={'WWW-Authenticate': 'Bearer'})
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={'sub': user.username}, expires_delta=access_token_expires)
    return {'access_token': access_token, 'token_type': 'bearer'}

@app.get('/users/me', response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.post('/simulations', response_model=SimulationResponse)
def create_simulation(simulation: SimulationCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    results = run_simulation(simulation.parameters)
    new_simulation = Simulation(user_id=current_user.id, name=simulation.name, parameters=simulation.parameters, results=results)
    db.add(new_simulation)
    db.commit()
    db.refresh(new_simulation)
    return new_simulation

@app.get('/simulations', response_model=List[SimulationResponse])
def get_simulations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Simulation).filter(Simulation.user_id == current_user.id).all()

@app.get('/simulations/{simulation_id}', response_model=SimulationResponse)
def get_simulation(simulation_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    simulation = db.query(Simulation).filter(Simulation.id == simulation_id, Simulation.user_id == current_user.id).first()
    if not simulation:
        raise HTTPException(status_code=404, detail='Simulation not found')
    return simulation
