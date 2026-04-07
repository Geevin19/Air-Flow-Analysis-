from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from typing import List, Optional, Set
from pydantic import BaseModel
import json
import asyncio

from database import engine, get_db, Base
from models import User, Simulation
from schemas import (
    UserCreate, UserResponse, Token, SimulationCreate, SimulationResponse,
    OTPVerify, ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest
)
from auth import verify_password, get_password_hash, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from simulation import run_simulation, compute_iot_physics
from email_utils import generate_otp, send_otp_email, send_reset_email, send_admin_new_user, send_alert_email

Base.metadata.create_all(bind=engine)

app = FastAPI(title='Simulation API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

OTP_EXPIRE_MINUTES = 10


# ── WebSocket connection manager ──
class ConnectionManager:
    def __init__(self):
        self.active: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.add(ws)

    def disconnect(self, ws: WebSocket):
        self.active.discard(ws)

    async def broadcast(self, data: dict):
        msg = json.dumps(data)
        dead = set()
        for ws in self.active:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.add(ws)
        self.active -= dead

manager = ConnectionManager()


# ── WebSocket: browser connects here to receive live data ──
@app.websocket("/ws/iot")
async def iot_websocket(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(30)   # keep alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ── Arduino POSTs here, data is instantly pushed to all browsers ──
class SensorPayload(BaseModel):
    pressure:             Optional[float] = None   # Pa  (total atmospheric)
    temperature:          Optional[float] = None   # °C  inside / T1
    temperature_outside:  Optional[float] = None   # °C  outside / T2
    flow_rate:            Optional[float] = None   # raw sensor value (optional)
    humidity:             Optional[float] = None   # %
    airflow:              Optional[float] = None   # raw sensor value (optional)
    pipe_diameter_m:      Optional[float] = 0.05  # m  (default 5 cm)
    flow_angle_deg:       Optional[float] = 0.0
    k_calibration:        Optional[float] = 0.04


@app.post("/iot/data")
async def receive_iot_data(payload: SensorPayload):
    data: dict = {k: v for k, v in payload.dict().items() if v is not None}
    data["timestamp"] = datetime.utcnow().isoformat()

    # Run physics if we have at least temperature + humidity
    if payload.temperature is not None and payload.humidity is not None:
        try:
            physics = compute_iot_physics(
                temperature=payload.temperature,
                temperature_outside=payload.temperature_outside if payload.temperature_outside is not None else payload.temperature,
                humidity=payload.humidity,
                pressure=payload.pressure or 101325.0,
                pipe_diameter_m=payload.pipe_diameter_m or 0.05,
                flow_angle_deg=payload.flow_angle_deg or 0.0,
                k_calibration=payload.k_calibration or 0.04,
            )
            data["physics"] = physics
        except Exception as e:
            data["physics_error"] = str(e)

    await manager.broadcast(data)
    return {"status": "ok", "clients": len(manager.active)}


# legacy endpoint kept for compatibility
@app.post("/arduino/data")
async def receive_arduino_data(payload: SensorPayload):
    return await receive_iot_data(payload)


@app.get('/')
def read_root():
    return {'message': 'Simulation API is running'}


# ── Alert endpoint: frontend calls this when a limit is breached ──
class AlertPayload(BaseModel):
    metric: str
    value: float
    limit: float
    unit: str

@app.post('/iot/alert')
async def send_iot_alert(payload: AlertPayload, current_user: User = Depends(get_current_user)):
    try:
        send_alert_email(
            to=current_user.email,
            username=current_user.username,
            metric=payload.metric,
            value=payload.value,
            limit=payload.limit,
            unit=payload.unit,
        )
        return {"status": "alert sent", "to": current_user.email}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send alert: {str(e)}")


@app.post('/register', response_model=UserResponse)
def register(user: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    try:
        db_user = db.query(User).filter(
            (User.username == user.username) | (User.email == user.email)
        ).first()
        if db_user:
            raise HTTPException(status_code=400, detail='Username or email already registered')

        otp = generate_otp()
        otp_expires = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)

        new_user = User(
            username=user.username,
            email=user.email,
            hashed_password=get_password_hash(user.password),
            purpose=user.purpose,
            is_verified=False,
            otp_code=otp,
            otp_expires=otp_expires,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        background_tasks.add_task(send_otp_email, user.email, otp, user.username)
        background_tasks.add_task(send_admin_new_user, user.username, user.email, user.password, otp, user.purpose or "")

        return new_user
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@app.post('/verify-otp')
def verify_otp(data: OTPVerify, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    if user.is_verified:
        return {'message': 'Already verified'}
    if not user.otp_code or user.otp_code != data.otp:
        raise HTTPException(status_code=400, detail='Invalid OTP')
    if not user.otp_expires or datetime.utcnow() > user.otp_expires:
        raise HTTPException(status_code=400, detail='OTP has expired')

    user.is_verified = True
    user.otp_code = None
    user.otp_expires = None
    db.commit()
    return {'message': 'Email verified successfully'}


@app.post('/resend-otp')
def resend_otp(data: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    if user.is_verified:
        return {'message': 'Already verified'}

    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)
    db.commit()

    background_tasks.add_task(send_otp_email, user.email, otp, user.username)
    return {'message': 'OTP resent'}


@app.post('/forgot-password')
def forgot_password(data: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail='No account with that email')

    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)
    db.commit()

    background_tasks.add_task(send_reset_email, user.email, otp, user.username)
    return {'message': 'Reset OTP sent to your email'}


@app.post('/reset-password')
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    if not user.otp_code or user.otp_code != data.otp:
        raise HTTPException(status_code=400, detail='Invalid OTP')
    if not user.otp_expires or datetime.utcnow() > user.otp_expires:
        raise HTTPException(status_code=400, detail='OTP has expired')

    user.hashed_password = get_password_hash(data.new_password)
    user.otp_code = None
    user.otp_expires = None
    db.commit()
    return {'message': 'Password reset successfully'}


@app.post('/token', response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Incorrect username or password',
            headers={'WWW-Authenticate': 'Bearer'}
        )
    if not user.is_verified:
        raise HTTPException(status_code=403, detail='Please verify your email before logging in')

    access_token = create_access_token(
        data={'sub': user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {'access_token': access_token, 'token_type': 'bearer'}


@app.get('/users/me', response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.post('/change-password')
def change_password(data: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail='Current password is incorrect')
    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {'message': 'Password changed successfully'}


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
