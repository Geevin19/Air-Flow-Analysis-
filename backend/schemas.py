from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class SimulationCreate(BaseModel):
    name: str
    parameters: Dict[str, Any]

class SimulationResponse(BaseModel):
    id: int
    user_id: int
    name: str
    parameters: Dict[str, Any]
    results: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
