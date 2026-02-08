# backend/app/database.py - FIXED VERSION
import aiomysql
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from app.config import settings

async def init_db(pool):
    """Initialize MySQL tables - FIXED"""
    async with pool.acquire() as conn:
        async with conn.cursor() as cursor:
            
        # 1. Users Table (Updated for Email Login)
            await cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    hashed_password VARCHAR(255) NOT NULL,
                    full_name VARCHAR(255),
                    role VARCHAR(50) DEFAULT 'researcher',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 2. Projects Table (NEW)
            await cursor.execute('''
                CREATE TABLE IF NOT EXISTS projects (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    owner_id INT NOT NULL,
                    
                    model_code TEXT NOT NULL,
                    csv_schema TEXT NOT NULL,
                    expected_features INT NOT NULL,
                    target_column VARCHAR(100) DEFAULT 'target',
                    
                    num_rounds INT DEFAULT 20,
                    local_epochs INT DEFAULT 5,
                    batch_size INT DEFAULT 32,
                    min_clients INT DEFAULT 3,
                    
                    status VARCHAR(50) DEFAULT 'draft',
                    server_status VARCHAR(50) DEFAULT 'offline',
                    current_round INT DEFAULT 0,
                    total_clients INT DEFAULT 0,
                    
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    started_at TIMESTAMP NULL,
                    completed_at TIMESTAMP NULL,
                    
                    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ''')
            
            # 3. Training Sessions
            await cursor.execute('''
                CREATE TABLE IF NOT EXISTS training_sessions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    project_id INT,
                    status VARCHAR(50) NOT NULL,
                    started_at TIMESTAMP NULL,
                    completed_at TIMESTAMP NULL,
                    total_rounds INT DEFAULT 20,
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
                )
            ''')
            
            # 4. Clients (Updated)
            await cursor.execute('''
                CREATE TABLE IF NOT EXISTS clients (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    client_id VARCHAR(255) UNIQUE NOT NULL,
                    project_id INT,
                    status VARCHAR(50) DEFAULT 'offline',
                    last_seen TIMESTAMP NULL,
                    total_samples INT DEFAULT 0,
                    dataset_schema TEXT,
                    dataset_validated BOOLEAN DEFAULT FALSE,
                    app_version VARCHAR(20),
                    os_type VARCHAR(50),
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
                )
            ''')
            
            # 5. Metrics (Updated)
            await cursor.execute('''
                CREATE TABLE IF NOT EXISTS metrics (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id INT,
                    project_id INT,
                    round INT NOT NULL,
                    num_clients INT,
                    accuracy FLOAT,
                    loss FLOAT,
                    client_metrics TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
                )
            ''')
            
            # 6. Centralized Results
            await cursor.execute('''
                CREATE TABLE IF NOT EXISTS centralized_results (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    session_id INT,
                    project_id INT,
                    accuracy FLOAT,
                    loss FLOAT,
                    training_time FLOAT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
                )
            ''')
            
            # 7. Model Configs
            await cursor.execute('''
                CREATE TABLE IF NOT EXISTS model_configs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    model_code TEXT,
                    dataset_path VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE
                )
            ''')
            
            # Insert default admin
            await cursor.execute('''
                INSERT IGNORE INTO users (username, password_hash, email, role) 
                VALUES (%s, %s, %s, %s)
            ''', ('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqNe.xvWy2', 'admin@fedapp.me', 'admin'))

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.pool = await aiomysql.create_pool(**settings.DB_CONFIG)
        await init_db(app.state.pool)
        print("✓ Database initialized and connected")
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
    yield
    if hasattr(app.state, 'pool'):
        app.state.pool.close()
        await app.state.pool.wait_closed()

async def get_db_conn(request: Request):
    if not hasattr(request.app.state, 'pool'):
        raise HTTPException(status_code=500, detail="Database pool not initialized")
    async with request.app.state.pool.acquire() as conn:
        yield conn