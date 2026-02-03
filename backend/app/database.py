import aiomysql
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from app.config import settings

async def init_db(pool):
    """Initialize MySQL tables"""
    async with pool.acquire() as conn:
        async with conn.cursor() as cursor:
            # 1. Users
            await cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 2. Training Sessions
            await cursor.execute('''
                CREATE TABLE IF NOT EXISTS training_sessions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    status VARCHAR(50) NOT NULL,
                    started_at TIMESTAMP NULL,
                    completed_at TIMESTAMP NULL,
                    total_rounds INT DEFAULT 20
                )
            ''')
            
            # 3. Clients
            await cursor.execute('''
                CREATE TABLE IF NOT EXISTS clients (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    client_id VARCHAR(255) UNIQUE NOT NULL,
                    status VARCHAR(50) DEFAULT 'offline',
                    last_seen TIMESTAMP NULL,
                    total_samples INT DEFAULT 0
                )
            ''')

            # 4. Metrics
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

            # 5. Centralized Results (NEW)
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
            
            # 6. Model Configs
            await cursor.execute('''
                CREATE TABLE IF NOT EXISTS model_configs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    model_code TEXT,
                    dataset_path VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE
                )
            ''')
            
            # Default Admin
            await cursor.execute('''
                INSERT IGNORE INTO users (username, password_hash) 
                VALUES (%s, %s)
            ''', ('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqNe.xvWy2'))

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