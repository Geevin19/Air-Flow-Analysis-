from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean, Float, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import enum

class RoleEnum(str, enum.Enum):
    manager = "manager"
    worker  = "worker"

class ApprovalStatus(str, enum.Enum):
    pending  = "pending"
    approved = "approved"
    rejected = "rejected"

class User(Base):
    __tablename__ = 'users'

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String(50), unique=True, nullable=False, index=True)
    email           = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    purpose         = Column(String(100), nullable=True)
    role            = Column(String(20), default='worker', nullable=False)
    manager_code    = Column(String(20), unique=True, nullable=True, index=True)
    manager_id      = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    is_verified     = Column(Boolean, default=False, nullable=False)
    otp_code        = Column(String(6), nullable=True)
    otp_expires     = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    simulations = relationship('Simulation', back_populates='user', cascade='all, delete-orphan')
    # Self-referential relationship: manager -> workers
    workers = relationship('User', backref='manager', remote_side=[id])
    limit_requests = relationship('LimitRequest', foreign_keys='LimitRequest.worker_id', back_populates='worker', cascade='all, delete-orphan')


class LimitRequest(Base):
    """Worker requests a limit change — manager must approve."""
    __tablename__ = 'limit_requests'

    id          = Column(Integer, primary_key=True, index=True)
    worker_id   = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    manager_id  = Column(Integer, nullable=False)
    metric      = Column(String(100), nullable=False)
    value       = Column(Float, nullable=False)
    status      = Column(String(20), default='pending', nullable=False)  # pending/approved/rejected
    reason      = Column(String(255), nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)

    worker = relationship('User', foreign_keys=[worker_id], back_populates='limit_requests')


class Alert(Base):
    """Stores alert history for both workers and managers."""
    __tablename__ = 'alerts'

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    metric     = Column(String(100), nullable=False)
    value      = Column(Float, nullable=False)
    limit      = Column(Float, nullable=False)
    level      = Column(String(20), default='warning', nullable=False)  # warning / critical
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class SensorReading(Base):
    __tablename__ = 'sensor_readings'

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    pressure    = Column(String(50), nullable=True)
    temperature = Column(String(50), nullable=True)
    flow_rate   = Column(String(50), nullable=True)
    humidity    = Column(String(50), nullable=True)
    raw         = Column(JSON, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)


class Simulation(Base):
    __tablename__ = 'simulations'

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name       = Column(String(100), nullable=False)
    parameters = Column(JSON, nullable=False)
    results    = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship('User', back_populates='simulations')
