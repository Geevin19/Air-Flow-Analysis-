from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime

class UserCreate(BaseModel):
    username:     str
    email:        EmailStr
    password:     str
    purpose:      Optional[str] = None
    role:         Optional[str] = 'worker'
    manager_id:   Optional[int] = None
    manager_code: Optional[str] = None   # worker enters this to link to a manager

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:           int
    username:     str
    email:        str
    purpose:      Optional[str] = None
    role:         str = 'worker'
    manager_code: Optional[str] = None
    manager_id:   Optional[int] = None
    is_verified:  bool = False
    created_at:   datetime

class Token(BaseModel):
    access_token: str
    token_type:   str

class OTPVerify(BaseModel):
    email: str
    otp:   str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email:        str
    otp:          str
    new_password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class SimulationCreate(BaseModel):
    name:       str
    parameters: Dict[str, Any]

class SimulationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:         int
    user_id:    int
    name:       str
    parameters: Dict[str, Any]
    results:    Optional[Dict[str, Any]] = None
    created_at: datetime

class LimitRequestCreate(BaseModel):
    metric: str
    value:  float

class LimitRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:          int
    worker_id:   int
    manager_id:  int
    metric:      str
    value:       float
    status:      str
    reason:      Optional[str] = None
    created_at:  datetime
    reviewed_at: Optional[datetime] = None

class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:         int
    user_id:    int
    metric:     str
    value:      float
    limit:      float
    level:      str
    created_at: datetime
