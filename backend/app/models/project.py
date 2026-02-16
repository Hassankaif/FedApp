# backend/app/models/project.py (NEW)
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    model_code: str
    csv_schema: str  # Comma-separated string: "age, bmi, glucose"
    target_column: str = "target"
    num_rounds: int = 20
    local_epochs: int = 5
    batch_size: int = 32
    min_clients: int = 3

class ProjectCreate(ProjectBase):
    pass #owner_id: int is not needed as it will be derived from the authenticated user

class Project(ProjectBase):
    id: int
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True