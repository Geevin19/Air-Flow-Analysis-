from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    purpose: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: str
    purpose: Optional[str] = None
    is_verified: bool = False
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class OTPVerify(BaseModel):
    email: str
    otp: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class SimulationCreate(BaseModel):
    name: str
    parameters: Dict[str, Any]

class SimulationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    name: str
    parameters: Dict[str, Any]
    results: Optional[Dict[str, Any]] = None
    created_at: datetime
