"""
Backend API - Federated Learning Orchestrator
FastAPI backend with WebSocket support for real-time updates
Database: MySQL (Async)
"""

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

@app.get("/")
async def root():
    """Health check"""
    return {"status": "healthy", "service": "Federated Learning API (MySQL)"}

if __name__ == "__main__":
    import uvicorn
    # Make sure to create the database 'FederatedLearning' in MySQL Workbench first!
    uvicorn.run(app, host="0.0.0.0", port=8000)