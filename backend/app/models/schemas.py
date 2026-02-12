from pydantic import BaseModel, Field ,EmailStr
from typing import Dict, Optional, List
from enum import Enum

# --- Auth Models ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict  # Return user info with token

class LoginRequest(BaseModel):
    username: str  # We use email as username
    password: str = Field(..., min_length=6, max_length=64)

# --- User Models ---
class UserRole(str, Enum):
    ADMIN = 'admin'  #constants for user roles
    RESEARCHER = 'researcher'
    HOSPITAL = 'hospital'
    
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(...,  min_length=6, max_length=64)
    full_name: str = Field(..., min_length=3, max_length=50)
    role: UserRole = UserRole.HOSPITAL  # userrole is fixed to hospital for now, this is to prevent unauthorized creation of admin and researcher accounts
    
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str 
    role: UserRole

# --- Metrics Models ---
class MetricsReport(BaseModel):                     # DONE ( fl-server --> here -->frontend )
    round: int = Field(..., gt=0)                   #  "round": 2,
    num_clients: int = Field(..., gt=0)             # "num_clients": 3,
    accuracy: float = Field(..., ge=0.0, le=1.0)    # "accuracy": 0.88,
    loss: float = Field(..., ge=0.0)                # "loss": 0.22,
    client_metrics: Dict[str, List[float]]          # "client_metrics": {"accuracies": [0.8, 0.85, 0.9]}
    timestamp: str                                  # "timestamp": "2026-02-12T16:45:00.123456"


class ClientRegistration(BaseModel):
    client_id: str
    total_samples: int

class FedStrategy(str, Enum):
    FEDAVG = "FedAvg"
    FEDPROX = "FedProx"

class VoteRequest(BaseModel):
    project_id: int
    client_id: str
    strategy: FedStrategy  # "FedAvg" or "FedProx"

class TrainingMode(BaseModel):
    mode: str 
    dataset_file: Optional[str] = None

class ModelConfig(BaseModel): 
    model_code: str
    dataset_path: str
    
# --- NEW MODELS ---
class CentralizedMetrics(BaseModel):
    accuracy: float
    loss: float
    training_time: float
    timestamp: str

class TrainingControl(BaseModel):
    action: str