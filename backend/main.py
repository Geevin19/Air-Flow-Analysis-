from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from typing import List, Optional, Set
from pydantic import BaseModel
import json
import asyncio
import os

from database import engine, get_db, Base, check_db_health
from models import User, Simulation, LimitRequest, Alert, SensorReading
from schemas import (
    UserCreate, UserResponse, Token, SimulationCreate, SimulationResponse,
    OTPVerify, ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest,
    LimitRequestCreate, LimitRequestResponse, AlertResponse
)
from auth import verify_password, get_password_hash, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from simulation import run_simulation, compute_iot_physics
from email_utils import generate_otp, send_otp_email, send_reset_email, send_admin_new_user, send_alert_email

# Initialize database tables
Base.metadata.create_all(bind=engine)

# ── Run migrations for new columns on existing DBs ────────────────────────────
def _run_migrations():
    from sqlalchemy import text as _text
    from database import engine as _engine
    # PostgreSQL uses IF NOT EXISTS, SQLite needs manual check
    from database import DATABASE_URL as _db_url
    is_pg = bool(_db_url and _db_url.startswith(("postgresql", "postgres")))
    
    if is_pg:
        stmts = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'worker'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_code VARCHAR(20)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id INTEGER",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS purpose VARCHAR(100)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires TIMESTAMP",
            # New tables
            """CREATE TABLE IF NOT EXISTS limit_requests (
                id SERIAL PRIMARY KEY,
                worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                manager_id INTEGER NOT NULL,
                metric VARCHAR(100) NOT NULL,
                value FLOAT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                reason VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW(),
                reviewed_at TIMESTAMP
            )""",
            """CREATE TABLE IF NOT EXISTS alerts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                metric VARCHAR(100) NOT NULL,
                value FLOAT NOT NULL,
                "limit" FLOAT NOT NULL,
                level VARCHAR(20) NOT NULL DEFAULT 'warning',
                created_at TIMESTAMP DEFAULT NOW()
            )""",
        ]
    else:
        stmts = []  # SQLite handled in database.py

    try:
        with _engine.connect() as conn:
            for sql in stmts:
                try:
                    conn.execute(_text(sql))
                    conn.commit()
                except Exception as ex:
                    print(f"[Migration] skipped: {ex}")
        print("[DB] Migrations complete")
    except Exception as e:
        print(f"[DB] Migration error: {e}")

_run_migrations()

# FastAPI app with production settings
app = FastAPI(
    title='AirFlow Analysis API',
    description='Production API for Air Flow Analysis SaaS',
    version='1.0.0',
    docs_url='/docs',
    redoc_url='/redoc',
    openapi_url='/openapi.json'
)

# CORS Middleware - Allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip compression for responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# TrustedHostMiddleware REMOVED - causes "Invalid host header" issues during development

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
    return {'message': 'AirFlow Analysis API is running', 'version': '1.0.0', 'status': 'healthy'}


@app.get('/health')
def health_check():
    """Health check endpoint for Docker and monitoring"""
    db_healthy = check_db_health()
    return {
        'status': 'healthy' if db_healthy else 'unhealthy',
        'database': 'connected' if db_healthy else 'disconnected',
        'timestamp': datetime.utcnow().isoformat()
    }


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

        # Resolve manager_code to manager_id if provided
        resolved_manager_id = user.manager_id
        if user.role == 'worker' and user.manager_code and not resolved_manager_id:
            mgr = db.query(User).filter(User.manager_code == user.manager_code, User.role == 'manager').first()
            if not mgr:
                raise HTTPException(status_code=400, detail=f'No manager found with code {user.manager_code}')
            resolved_manager_id = mgr.id

        # Generate unique manager code if role is manager
        manager_code = None
        if user.role == 'manager':
            import random as _random
            suffix = str(_random.randint(1000, 9999))
            name_part = user.username.upper()[:8]
            manager_code = f"MGR-{name_part}-{suffix}"
            # Ensure uniqueness
            while db.query(User).filter(User.manager_code == manager_code).first():
                suffix = str(_random.randint(1000, 9999))
                manager_code = f"MGR-{name_part}-{suffix}"

        new_user = User(
            username=user.username,
            email=user.email,
            hashed_password=get_password_hash(user.password),
            purpose=user.purpose,
            role=user.role or 'worker',
            manager_code=manager_code,
            manager_id=resolved_manager_id if user.role == 'worker' else None,
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

# ── Device config — Arduino polls this for limits ────────────────────────────
device_config: dict = {
    "temp_limit":     35.0,
    "humidity_limit": 70.0,
}

@app.get("/iot/config")
def get_config():
    return device_config

@app.post("/iot/config")
def update_config(data: dict):
    device_config.update(data)
    print(f"[Config] Updated: {device_config}")
    return {"status": "updated", "config": device_config}


# ── Manager: list all workers under this manager ──────────────────────────────
@app.get('/manager/workers', response_model=List[UserResponse])
def get_workers(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != 'manager':
        raise HTTPException(status_code=403, detail='Manager access required')
    return db.query(User).filter(User.manager_id == current_user.id).all()


# ── Manager: get a specific worker's latest IoT data ─────────────────────────
@app.get('/manager/workers/{worker_id}/iot')
def get_worker_iot(worker_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != 'manager':
        raise HTTPException(status_code=403, detail='Manager access required')
    worker = db.query(User).filter(User.id == worker_id, User.manager_id == current_user.id).first()
    if not worker:
        raise HTTPException(status_code=404, detail='Worker not found')
    # Return latest sensor reading for this worker
    reading = db.query(SensorReading).filter(SensorReading.user_id == worker_id).order_by(SensorReading.recorded_at.desc()).first()
    return {'worker': worker.username, 'data': reading.raw if reading else None, 'recorded_at': reading.recorded_at if reading else None}


# ── List all managers (for worker registration dropdown) ─────────────────────
@app.get('/managers', response_model=List[UserResponse])
def list_managers(db: Session = Depends(get_db)):
    return db.query(User).filter(User.role == 'manager', User.is_verified == True).all()


# ── Worker: request a limit change ───────────────────────────────────────────
@app.post('/limits/request', response_model=LimitRequestResponse)
def request_limit(data: LimitRequestCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != 'worker':
        raise HTTPException(status_code=403, detail='Only workers can request limits')
    if not current_user.manager_id:
        raise HTTPException(status_code=400, detail='No manager assigned to this worker')
    req = LimitRequest(
        worker_id=current_user.id,
        manager_id=current_user.manager_id,
        metric=data.metric,
        value=data.value,
        status='pending',
    )
    db.add(req); db.commit(); db.refresh(req)
    # Notify manager
    manager = db.query(User).filter(User.id == current_user.manager_id).first()
    if manager:
        from email_utils import _send
        _send(manager.email, f"[SmartTracker] Limit request from {current_user.username}",
              f"<p>Worker <b>{current_user.username}</b> has requested a limit of <b>{data.value}</b> for <b>{data.metric}</b>. Please review in your dashboard.</p>")
    return req


# ── Manager: get pending limit requests ──────────────────────────────────────
@app.get('/limits/pending', response_model=List[LimitRequestResponse])
def get_pending_limits(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != 'manager':
        raise HTTPException(status_code=403, detail='Manager access required')
    return db.query(LimitRequest).filter(LimitRequest.manager_id == current_user.id, LimitRequest.status == 'pending').all()


# ── Manager: approve or reject a limit request ───────────────────────────────
@app.post('/limits/{request_id}/review')
def review_limit(request_id: int, action: str, reason: Optional[str] = None,
                 current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != 'manager':
        raise HTTPException(status_code=403, detail='Manager access required')
    if action not in ('approved', 'rejected'):
        raise HTTPException(status_code=400, detail='action must be approved or rejected')
    req = db.query(LimitRequest).filter(LimitRequest.id == request_id, LimitRequest.manager_id == current_user.id).first()
    if not req:
        raise HTTPException(status_code=404, detail='Request not found')
    req.status = action
    req.reason = reason
    req.reviewed_at = datetime.utcnow()
    db.commit()
    # Notify worker
    worker = db.query(User).filter(User.id == req.worker_id).first()
    if worker:
        from email_utils import _send
        status_word = 'approved' if action == 'approved' else 'rejected'
        _send(worker.email, f"[SmartTracker] Limit request {status_word}",
              f"<p>Your limit request for <b>{req.metric}</b> = <b>{req.value}</b> has been <b>{status_word}</b> by your manager.{(' Reason: ' + reason) if reason else ''}</p>")
    return {'status': action, 'request_id': request_id}


# ── Worker: get own approved limits ──────────────────────────────────────────
@app.get('/limits/approved')
def get_approved_limits(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    reqs = db.query(LimitRequest).filter(LimitRequest.worker_id == current_user.id, LimitRequest.status == 'approved').all()
    return {r.metric: r.value for r in reqs}


# ── IoT alert with role-aware emails ─────────────────────────────────────────
class RoleAlertPayload(BaseModel):
    metric:         str
    value:          float
    limit:          float
    unit:           str
    critical_level: Optional[float] = None  # if value >= this, also alert manager

@app.post('/iot/alert/role')
async def send_role_alert(payload: RoleAlertPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from email_utils import _send
    # Save alert to DB
    level = 'critical' if (payload.critical_level and payload.value >= payload.critical_level) else 'warning'
    alert = Alert(user_id=current_user.id, metric=payload.metric, value=payload.value, limit=payload.limit, level=level)
    db.add(alert); db.commit()

    # Email worker
    _send(current_user.email, f"[SmartTracker] ⚠ {payload.metric} limit exceeded",
          f"""<div style="font-family:Arial;padding:24px;background:#fef2f2;border-radius:12px;border:1.5px solid #fca5a5">
          <h2 style="color:#dc2626">Sensor Limit Exceeded</h2>
          <p>Hi <b>{current_user.username}</b>, your sensor <b>{payload.metric}</b> has exceeded the limit.</p>
          <p>Current value: <b style="color:#dc2626">{payload.value:.4f} {payload.unit}</b> | Limit: <b>{payload.limit} {payload.unit}</b></p>
          </div>""")

    # Email manager if critical
    if level == 'critical' and current_user.manager_id:
        manager = db.query(User).filter(User.id == current_user.manager_id).first()
        if manager:
            _send(manager.email, f"[SmartTracker] 🚨 CRITICAL: {payload.metric} — Worker {current_user.username}",
                  f"""<div style="font-family:Arial;padding:24px;background:#fef2f2;border-radius:12px;border:2px solid #dc2626">
                  <h2 style="color:#dc2626">CRITICAL Alert from Worker</h2>
                  <p>Worker <b>{current_user.username}</b> has a critical sensor reading.</p>
                  <p><b>{payload.metric}</b>: <b style="color:#dc2626">{payload.value:.4f} {payload.unit}</b> (critical threshold: {payload.critical_level} {payload.unit})</p>
                  <p>Please check immediately.</p>
                  </div>""")

    return {"status": "alerts sent", "level": level}


# ── Alert history ─────────────────────────────────────────────────────────────
@app.get('/alerts', response_model=List[AlertResponse])
def get_alerts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == 'manager':
        # Manager sees alerts from all their workers
        worker_ids = [w.id for w in db.query(User).filter(User.manager_id == current_user.id).all()]
        worker_ids.append(current_user.id)
        return db.query(Alert).filter(Alert.user_id.in_(worker_ids)).order_by(Alert.created_at.desc()).limit(100).all()
    return db.query(Alert).filter(Alert.user_id == current_user.id).order_by(Alert.created_at.desc()).limit(100).all()
