from pydantic import BaseModel
from typing import Dict, Optional

class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class MetricsReport(BaseModel):
    round: int
    num_clients: int
    accuracy: float
    loss: float
    client_metrics: Dict
    timestamp: str

class ClientRegistration(BaseModel):
    client_id: str
    total_samples: int

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