from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    purpose = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    simulations = relationship('Simulation', back_populates='user', cascade='all, delete-orphan')

class Simulation(Base):
    __tablename__ = 'simulations'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(100), nullable=False)
    parameters = Column(JSON, nullable=False)
    results = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship('User', back_populates='simulations')


# ✅ NEW TABLE (ONLY ADDITION)
class AirflowData(Base):
    __tablename__ = "airflow_data"

    id = Column(Integer, primary_key=True, index=True)
    value = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)