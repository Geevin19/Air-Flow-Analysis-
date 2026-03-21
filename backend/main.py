from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from typing import List
from pydantic import BaseModel

from database import engine, get_db, Base
from models import User, Simulation
from schemas import UserCreate, UserResponse, Token, SimulationCreate, SimulationResponse
from auth import verify_password, get_password_hash, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from simulation import run_simulation
from email_utils import generate_otp, send_otp_email, send_admin_notification

try:
    Base.metadata.create_all(bind=engine)
    print("Database tables ready.")
except Exception as e:
    print(f"Warning: Could not sync tables at startup: {e}")

app = FastAPI(title='Simulation API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000', 'http://localhost:5173'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@app.get('/')
def read_root():
    return {'message': 'Simulation API is running'}

@app.post('/register', response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        db_user = db.query(User).filter((User.username == user.username) | (User.email == user.email)).first()
        if db_user:
            raise HTTPException(status_code=400, detail='Username or email already registered')
        hashed_password = get_password_hash(user.password)
        otp = generate_otp()
        otp_expires = datetime.utcnow() + timedelta(minutes=10)
        new_user = User(
            username=user.username, email=user.email,
            hashed_password=hashed_password, purpose=user.purpose,
            is_verified=False, otp_code=otp, otp_expires=otp_expires
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        send_otp_email(user.email, otp, "Verify your AeroAuth account", "verification")
        send_admin_notification(user.username, user.email, user.purpose)
        return new_user
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post('/verify-otp')
def verify_otp(req: VerifyOTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    if user.otp_code != req.otp:
        raise HTTPException(status_code=400, detail='Invalid OTP')
    if user.otp_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail='OTP expired')
    user.is_verified = True
    user.otp_code = None
    user.otp_expires = None
    db.commit()
    return {'message': 'Email verified successfully'}

@app.post('/resend-otp')
def resend_otp(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    send_otp_email(user.email, otp, "Your new verification code", "verification")
    return {'message': 'OTP resent'}

@app.post('/forgot-password')
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail='No account with that email')
    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    send_otp_email(user.email, otp, "Reset your AeroAuth password", "password reset")
    return {'message': 'OTP sent to your email'}

@app.post('/reset-password')
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    if user.otp_code != req.otp:
        raise HTTPException(status_code=400, detail='Invalid OTP')
    if user.otp_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail='OTP expired')
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail='Password must be at least 6 characters')
    user.hashed_password = get_password_hash(req.new_password)
    user.otp_code = None
    user.otp_expires = None
    db.commit()
    return {'message': 'Password reset successfully'}

@app.post('/change-password')
def change_password(req: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail='Current password is incorrect')
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail='New password must be at least 6 characters')
    current_user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {'message': 'Password changed successfully'}

@app.post('/token', response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Incorrect username or password', headers={'WWW-Authenticate': 'Bearer'})
    if not user.is_verified:
        raise HTTPException(status_code=403, detail='Please verify your email before logging in')
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

@app.delete('/simulations/{simulation_id}')
def delete_simulation(simulation_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    simulation = db.query(Simulation).filter(Simulation.id == simulation_id, Simulation.user_id == current_user.id).first()
    if not simulation:
        raise HTTPException(status_code=404, detail='Simulation not found')
    db.delete(simulation)
    db.commit()
    return {'message': 'Simulation deleted successfully'}
