"""
Backend API - Federated Learning Orchestrator
FastAPI backend with WebSocket support for real-time updates
Database: MySQL (Async)
"""
"""
Enhanced Backend API - Added Features:
1. Model save/download
2. Training mode (Federated vs Comparison)
3. Centralized training
4. Dynamic model/dataset configuration

Add these to your existing main.py
"""

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
import os
import pickle
import tensorflow as tf
import numpy as np
import pandas as pd
from datetime import datetime
import json
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Dict
from datetime import datetime, timedelta
import jwt
import json
# import asyncio
from contextlib import asynccontextmanager
import aiomysql # Replaced sqlite3/pyodbc with async MySQL driver

# Configuration
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# MySQL Database Configuration
DB_CONFIG = {
    "host": "127.0.0.1",      # <--- CHANGED from "HASSAN"
    "port": 3306,
    "user": "root",           
    "password": "kaif&*9363", 
    "db": "FederatedLearning",
    "autocommit": True     
}

# Pydantic models
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

class TrainingControl(BaseModel):
    action: str

class TrainingMode(BaseModel):
    mode: str  # "federated" or "comparison"
    dataset_file: str = None  # For comparison mode

class ModelConfig(BaseModel):
    model_code: str  # Python code for model architecture
    dataset_path: str
    
class CentralizedMetrics(BaseModel):
    accuracy: float
    loss: float
    training_time: float
    timestamp: str

# Create directories for storage
os.makedirs("models", exist_ok=True)
os.makedirs("datasets", exist_ok=True)
os.makedirs("configs", exist_ok=True)
# Global storage for current configuration
current_config = {
    "model_code": None,
    "dataset_path": None,
    "training_mode": "federated"
}

# WebSocket manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Database Initialization
async def init_db(pool):
    """Initialize MySQL tables using async connection"""
    async with pool.acquire() as conn:
        async with conn.cursor() as cursor:
            # Users table
            await cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Training sessions table
            await cursor.execute('''
                CREATE TABLE IF NOT EXISTS training_sessions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    status VARCHAR(50) NOT NULL,
                    started_at TIMESTAMP NULL,
                    completed_at TIMESTAMP NULL,
                    total_rounds INT DEFAULT 20
                )
            ''')
            
            # Clients table
            await cursor.execute('''
                CREATE TABLE IF NOT EXISTS clients (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    client_id VARCHAR(255) UNIQUE NOT NULL,
                    status VARCHAR(50) DEFAULT 'offline',
                    last_seen TIMESTAMP NULL,
                    total_samples INT DEFAULT 0
                )
            ''')

            # Metrics table (with Foreign Key)
            await cursor.execute('''
                CREATE TABLE IF NOT EXISTS metrics (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id INT,
                    round INT NOT NULL,
                    num_clients INT,
                    accuracy FLOAT,
                    loss FLOAT,
                    client_metrics JSON,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES training_sessions(id)
                )
            ''')
            # Centralized training results
            await cursor.execute('''
                CREATE TABLE IF NOT EXISTS centralized_results (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id INT,
                    accuracy FLOAT,
                    loss FLOAT,
                    training_time FLOAT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES training_sessions(id)
                )
            ''')
            
            # Model configurations
            await cursor.execute('''
                CREATE TABLE IF NOT EXISTS model_configs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    model_code TEXT,
                    dataset_path VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE
                )
            ''')
            
            # Insert default admin user if not exists
            # Note: In MySQL 'INSERT OR IGNORE' is 'INSERT IGNORE'
            await cursor.execute('''
                INSERT IGNORE INTO users (username, password_hash) 
                VALUES (%s, %s)
            ''', ('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqNe.xvWy2'))

# Lifespan context
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create DB Pool
    try:
        app.state.pool = await aiomysql.create_pool(**DB_CONFIG)
        await init_db(app.state.pool)
        print("✓ Database initialized and connected via aiomysql")
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        # Depending on requirements, you might want to raise error here
    
    yield
    
    # Shutdown: Close Pool
    if hasattr(app.state, 'pool'):
        app.state.pool.close()
        await app.state.pool.wait_closed()
        print("✓ Database pool closed")

# FastAPI app
app = FastAPI(title="Federated Learning API", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Helper functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# Dependency to get DB connection from pool
async def get_db_conn(request: Request):
    """Yields an async connection from the app-wide pool"""
    if not hasattr(request.app.state, 'pool'):
        raise HTTPException(status_code=500, detail="Database pool not initialized")
    
    async with request.app.state.pool.acquire() as conn:
        yield conn

# Routes
@app.post("/api/auth/login", response_model=Token)
async def login(request: LoginRequest):
    if request.username == "admin" and request.password == "admin123":
        access_token = create_access_token({"sub": request.username})
        return {"access_token": access_token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Incorrect username or password")

@app.post("/api/training/start")
async def start_training(conn = Depends(get_db_conn)):
    """Start a new training session"""
    async with conn.cursor() as cursor:
        await cursor.execute(
            "INSERT INTO training_sessions (status, started_at) VALUES (%s, %s)",
            ("running", datetime.utcnow())
        )
        session_id = cursor.lastrowid
        # Autocommit is enabled in config, otherwise await conn.commit()
    
    await manager.broadcast({
        "type": "training_started",
        "session_id": session_id,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    return {"status": "started", "session_id": session_id}

@app.post("/api/training/complete")
async def complete_training(conn = Depends(get_db_conn)):
    """Mark training as complete"""
    async with conn.cursor() as cursor:
        await cursor.execute(
            "UPDATE training_sessions SET status = %s, completed_at = %s WHERE status = %s",
            ("completed", datetime.utcnow(), "running")
        )
    
    await manager.broadcast({
        "type": "training_completed",
        "timestamp": datetime.utcnow().isoformat()
    })
    
    return {"status": "completed"}

@app.post("/api/training/metrics")
async def report_metrics(metrics: MetricsReport, conn = Depends(get_db_conn)):
    """Receive metrics from FL server - High concurrency optimized"""
    async with conn.cursor() as cursor:
        # Get current session
        await cursor.execute(
            "SELECT id FROM training_sessions WHERE status = 'running' ORDER BY id DESC LIMIT 1"
        )
        row = await cursor.fetchone()
        session_id = row[0] if row else None
        
        # Store metrics (Using MySQL JSON type for client_metrics)
        await cursor.execute(
            """INSERT INTO metrics 
               (session_id, round, num_clients, accuracy, loss, client_metrics, timestamp)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (session_id, metrics.round, metrics.num_clients, metrics.accuracy, 
             metrics.loss, json.dumps(metrics.client_metrics), metrics.timestamp)
        )
    
    # Broadcast to WebSocket clients
    await manager.broadcast({
        "type": "metrics_update",
        "data": {
            "round": metrics.round,
            "accuracy": metrics.accuracy,
            "loss": metrics.loss,
            "num_clients": metrics.num_clients
        }
    })
    
    return {"status": "received"}

# MODIFY the existing /api/metrics endpoint to support session filtering
@app.get("/api/metrics")
async def get_metrics(session_id: int = None, conn = Depends(get_db_conn)):
    """Get training metrics, optionally filtered by session_id"""
    async with conn.cursor() as cursor:
        if session_id:
            # Get metrics for specific session
            await cursor.execute(
                """SELECT round, accuracy, loss, num_clients, timestamp 
                   FROM metrics 
                   WHERE session_id = %s
                   ORDER BY round ASC""",
                (session_id,)
            )
        else:
            # Get all metrics (backward compatible)
            await cursor.execute(
                """SELECT round, accuracy, loss, num_clients, timestamp 
                   FROM metrics 
                   ORDER BY id DESC LIMIT 100"""
            )
        
        rows = await cursor.fetchall()
    
    return {
        "metrics": [
            {
                "round": row[0],
                "accuracy": float(row[1]) if row[1] else 0,
                "loss": float(row[2]) if row[2] else 0,
                "num_clients": row[3],
                "timestamp": row[4]
            }
            for row in rows
        ]
    }

@app.post("/api/clients/register")
async def register_client(client: ClientRegistration, conn = Depends(get_db_conn)):
    """Register a new client"""
    async with conn.cursor() as cursor:
        # MySQL UPSERT syntax (INSERT ... ON DUPLICATE KEY UPDATE)
        await cursor.execute(
            """INSERT INTO clients (client_id, status, last_seen, total_samples)
               VALUES (%s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE 
               status=%s, last_seen=%s, total_samples=%s""",
            (client.client_id, "online", datetime.utcnow(), client.total_samples,
             "online", datetime.utcnow(), client.total_samples)
        )
    
    await manager.broadcast({
        "type": "client_registered",
        "client_id": client.client_id
    })
    
    return {"status": "registered"}

@app.get("/api/clients")
async def get_clients(conn = Depends(get_db_conn)):
    """Get all registered clients"""
    async with conn.cursor() as cursor:
        await cursor.execute("SELECT client_id, status, last_seen, total_samples FROM clients")
        rows = await cursor.fetchall()
    
    return {
        "clients": [
            {
                "client_id": row[0],
                "status": row[1],
                "last_seen": row[2],
                "total_samples": row[3]
            }
            for row in rows
        ]
    }
"""
Add these endpoints to your backend/main.py
Place them after the existing endpoints
"""

@app.get("/api/training/status")
async def get_training_status(conn = Depends(get_db_conn)):
    """Get current training session status"""
    async with conn.cursor() as cursor:
        # Get the latest running session
        await cursor.execute(
            """SELECT id, status, started_at, total_rounds 
               FROM training_sessions 
               WHERE status = 'running' 
               ORDER BY id DESC LIMIT 1"""
        )
        running_session = await cursor.fetchone()
        
        if running_session:
            session_id, status, started_at, total_rounds = running_session
            
            # Get current round from metrics
            await cursor.execute(
                """SELECT MAX(round) as current_round 
                   FROM metrics 
                   WHERE session_id = %s""",
                (session_id,)
            )
            round_row = await cursor.fetchone()
            current_round = round_row[0] if round_row and round_row[0] else 0
            
            return {
                "is_training": True,
                "session_id": session_id,
                "current_round": current_round,
                "total_rounds": total_rounds,
                "started_at": started_at
            }
        else:
            return {
                "is_training": False,
                "session_id": None,
                "current_round": 0,
                "total_rounds": 20
            }

@app.get("/api/metrics/latest")
async def get_latest_metrics(conn = Depends(get_db_conn)):
    """Get metrics for the latest session"""
    async with conn.cursor() as cursor:
        # Get latest session
        await cursor.execute(
            """SELECT id FROM training_sessions 
               ORDER BY id DESC LIMIT 1"""
        )
        row = await cursor.fetchone()
        
        if not row:
            return {"metrics": []}
        
        session_id = row[0]
        
        # Get metrics for this session
        await cursor.execute(
            """SELECT round, accuracy, loss, num_clients, timestamp 
               FROM metrics 
               WHERE session_id = %s
               ORDER BY round ASC""",
            (session_id,)
        )
        rows = await cursor.fetchall()
    
    return {
        "metrics": [
            {
                "round": row[0],
                "accuracy": float(row[1]) if row[1] else 0,
                "loss": float(row[2]) if row[2] else 0,
                "num_clients": row[3],
                "timestamp": row[4]
            }
            for row in rows
        ]
    }



@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# =============================================================================================================================
# ============== TRAINING MODE ENDPOINTS ==============

@app.post("/api/training/mode")
async def set_training_mode(mode_config: TrainingMode):
    """Set training mode: federated or comparison"""
    current_config["training_mode"] = mode_config.mode
    
    if mode_config.mode == "comparison" and mode_config.dataset_file:
        current_config["comparison_dataset"] = mode_config.dataset_file
    
    return {
        "status": "success",
        "mode": mode_config.mode,
        "message": f"Training mode set to {mode_config.mode}"
    }

@app.get("/api/training/mode")
async def get_training_mode():
    """Get current training mode"""
    return {
        "mode": current_config.get("training_mode", "federated"),
        "comparison_dataset": current_config.get("comparison_dataset")
    }

# ============== CENTRALIZED TRAINING ==============

@app.post("/api/training/centralized")
async def run_centralized_training(
    dataset_file: UploadFile = File(...),
    conn = Depends(get_db_conn)
):
    """Run centralized training for comparison"""
    import time
    
    # Save uploaded dataset
    dataset_path = f"datasets/centralized_{int(time.time())}.csv"
    with open(dataset_path, "wb") as f:
        f.write(await dataset_file.read())
    
    # Load and prepare data
    df = pd.read_csv(dataset_path)
    X = df.iloc[:, :-1].values
    y = df.iloc[:, -1].values
    
    # Normalize
    X = (X - X.mean(axis=0)) / (X.std(axis=0) + 1e-7)
    
    # Split
    split_idx = int(0.8 * len(X))
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    # Create model
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(64, activation='relu', input_shape=(X.shape[1],)),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])
    
    model.compile(
        optimizer='adam',
        loss='binary_crossentropy',
        metrics=['accuracy']
    )
    
    # Train
    start_time = time.time()
    history = model.fit(
        X_train, y_train,
        epochs=100,  # Same total epochs as federated (20 rounds * 5 epochs)
        batch_size=32,
        validation_data=(X_test, y_test),
        verbose=0
    )
    training_time = time.time() - start_time
    
    # Evaluate
    loss, accuracy = model.evaluate(X_test, y_test, verbose=0)
    
    # Save model
    model_path = f"models/centralized_{int(time.time())}.h5"
    model.save(model_path)
    
    # Store results
    async with conn.cursor() as cursor:
        # Get current session
        await cursor.execute(
            "SELECT id FROM training_sessions WHERE status = 'running' OR status = 'completed' ORDER BY id DESC LIMIT 1"
        )
        row = await cursor.fetchone()
        session_id = row[0] if row else None
        
        await cursor.execute(
            """INSERT INTO centralized_results 
               (session_id, accuracy, loss, training_time)
               VALUES (%s, %s, %s, %s)""",
            (session_id, accuracy, loss, training_time)
        )
    
    # Broadcast results
    await manager.broadcast({
        "type": "centralized_complete",
        "data": {
            "accuracy": float(accuracy),
            "loss": float(loss),
            "training_time": training_time
        }
    })
    
    return {
        "status": "success",
        "accuracy": float(accuracy),
        "loss": float(loss),
        "training_time": training_time,
        "model_path": model_path
    }

@app.get("/api/training/comparison")
async def get_comparison_results(conn = Depends(get_db_conn)):
    """Get comparison between federated and centralized training"""
    async with conn.cursor() as cursor:
        # Get latest federated results
        await cursor.execute(
            """SELECT session_id, MAX(round) as final_round
               FROM metrics 
               GROUP BY session_id 
               ORDER BY session_id DESC LIMIT 1"""
        )
        fed_row = await cursor.fetchone()
        
        if not fed_row:
            return {"error": "No federated training data found"}
        
        session_id = fed_row[0]
        
        # Get final federated metrics
        await cursor.execute(
            """SELECT accuracy, loss 
               FROM metrics 
               WHERE session_id = %s 
               ORDER BY round DESC LIMIT 1""",
            (session_id,)
        )
        fed_metrics = await cursor.fetchone()
        
        # Get centralized results
        await cursor.execute(
            """SELECT accuracy, loss, training_time 
               FROM centralized_results 
               WHERE session_id = %s 
               ORDER BY id DESC LIMIT 1""",
            (session_id,)
        )
        cent_metrics = await cursor.fetchone()
        
        if not fed_metrics or not cent_metrics:
            return {"error": "Incomplete comparison data"}
        
        return {
            "federated": {
                "accuracy": float(fed_metrics[0]),
                "loss": float(fed_metrics[1])
            },
            "centralized": {
                "accuracy": float(cent_metrics[0]),
                "loss": float(cent_metrics[1]),
                "training_time": float(cent_metrics[2])
            },
            "comparison": {
                "accuracy_diff": float(cent_metrics[0] - fed_metrics[0]),
                "loss_diff": float(fed_metrics[1] - cent_metrics[1])
            }
        }

# ============== MODEL SAVE/DOWNLOAD ==============

@app.post("/api/model/save")
async def save_global_model(model_data: dict):
    """Save global model weights from FL server"""
    timestamp = int(datetime.utcnow().timestamp())
    model_path = f"models/global_model_{timestamp}.pkl"
    
    with open(model_path, 'wb') as f:
        pickle.dump(model_data['weights'], f)
    
    return {
        "status": "success",
        "model_path": model_path,
        "timestamp": timestamp
    }

@app.get("/api/model/download/global")
async def download_global_model():
    """Download latest global model"""
    # Find latest model
    models = [f for f in os.listdir("models") if f.startswith("global_model_")]
    if not models:
        raise HTTPException(status_code=404, detail="No global model found")
    
    latest_model = sorted(models)[-1]
    model_path = os.path.join("models", latest_model)
    
    return FileResponse(
        model_path,
        media_type="application/octet-stream",
        filename=latest_model
    )

@app.get("/api/model/download/centralized")
async def download_centralized_model():
    """Download latest centralized model"""
    models = [f for f in os.listdir("models") if f.startswith("centralized_")]
    if not models:
        raise HTTPException(status_code=404, detail="No centralized model found")
    
    latest_model = sorted(models)[-1]
    model_path = os.path.join("models", latest_model)
    
    return FileResponse(
        model_path,
        media_type="application/octet-stream",
        filename=latest_model
    )

@app.get("/api/models/list")
async def list_saved_models():
    """List all saved models"""
    models = []
    
    for filename in os.listdir("models"):
        filepath = os.path.join("models", filename)
        models.append({
            "filename": filename,
            "size": os.path.getsize(filepath),
            "created": datetime.fromtimestamp(os.path.getctime(filepath)).isoformat(),
            "type": "global" if "global" in filename else "centralized"
        })
    
    return {"models": sorted(models, key=lambda x: x['created'], reverse=True)}

# ============== DYNAMIC MODEL CONFIGURATION ==============

@app.post("/api/config/model")
async def save_model_config(config: ModelConfig, conn = Depends(get_db_conn)):
    """Save custom model architecture code"""
    async with conn.cursor() as cursor:
        # Deactivate old configs
        await cursor.execute(
            "UPDATE model_configs SET is_active = FALSE WHERE is_active = TRUE"
        )
        
        # Save new config
        await cursor.execute(
            """INSERT INTO model_configs (model_code, dataset_path)
               VALUES (%s, %s)""",
            (config.model_code, config.dataset_path)
        )
    
    current_config["model_code"] = config.model_code
    current_config["dataset_path"] = config.dataset_path
    
    return {"status": "success", "message": "Model configuration saved"}

@app.get("/api/config/model")
async def get_model_config(conn = Depends(get_db_conn)):
    """Get active model configuration"""
    async with conn.cursor() as cursor:
        await cursor.execute(
            """SELECT model_code, dataset_path 
               FROM model_configs 
               WHERE is_active = TRUE 
               ORDER BY id DESC LIMIT 1"""
        )
        row = await cursor.fetchone()
    
    if row:
        return {
            "model_code": row[0],
            "dataset_path": row[1]
        }
    
    # Return default configuration
    return {
        "model_code": """
model = tf.keras.Sequential([
    tf.keras.layers.Dense(64, activation='relu', input_shape=(input_shape,)),
    tf.keras.layers.Dropout(0.2),
    tf.keras.layers.Dense(32, activation='relu'),
    tf.keras.layers.Dropout(0.2),
    tf.keras.layers.Dense(1, activation='sigmoid')
])

model.compile(
    optimizer='adam',
    loss='binary_crossentropy',
    metrics=['accuracy']
)
        """.strip(),
        "dataset_path": "default_diabetes.csv"
    }

@app.post("/api/config/dataset")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload new dataset"""
    dataset_path = f"datasets/{file.filename}"
    
    with open(dataset_path, "wb") as f:
        f.write(await file.read())
    
    # Validate dataset
    try:
        df = pd.read_csv(dataset_path)
        rows, cols = df.shape
        
        return {
            "status": "success",
            "filename": file.filename,
            "path": dataset_path,
            "rows": rows,
            "columns": cols,
            "column_names": list(df.columns)
        }
    except Exception as e:
        os.remove(dataset_path)
        raise HTTPException(status_code=400, detail=f"Invalid dataset: {str(e)}")

@app.get("/api/datasets/list")
async def list_datasets():
    """List all uploaded datasets"""
    datasets = []
    
    for filename in os.listdir("datasets"):
        filepath = os.path.join("datasets", filename)
        try:
            df = pd.read_csv(filepath)
            datasets.append({
                "filename": filename,
                "path": filepath,
                "rows": len(df),
                "columns": len(df.columns),
                "size": os.path.getsize(filepath),
                "created": datetime.fromtimestamp(os.path.getctime(filepath)).isoformat()
            })
        except:
            pass
    
    return {"datasets": sorted(datasets, key=lambda x: x['created'], reverse=True)}

# ============== HELPER ENDPOINT FOR CLIENTS ==============

@app.get("/api/config/current")
async def get_current_config():
    """Get current model and dataset configuration for clients"""
    return {
        "model_code": current_config.get("model_code"),
        "dataset_path": current_config.get("dataset_path"),
        "training_mode": current_config.get("training_mode", "federated")
    }
# =============================================================================================================================
@app.get("/")
async def root():
    """Health check"""
    return {"status": "healthy", "service": "Federated Learning API (MySQL)"}

if __name__ == "__main__":
    import uvicorn
    # Make sure to create the database 'FederatedLearning' in MySQL Workbench first!
    uvicorn.run(app, host="0.0.0.0", port=8000)
    