import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect

# Import implementation parts
from app.database import lifespan
from app.socket_manager import manager
from app.routers import auth, training, metrics, clients, models
from app.controllers import project_controller 

# Create directories
os.makedirs("models", exist_ok=True)
os.makedirs("datasets", exist_ok=True)
os.makedirs("configs", exist_ok=True)

app = FastAPI(title="Federated Learning API", lifespan=lifespan)
# backend/app/main.py

# ... imports ...

app = FastAPI(title="Federated Learning API", lifespan=lifespan)

# 🚀 FIX: Replace ["*"] with your actual Frontend IP
origins = [
    "http://139.59.87.244:5173",  # DigitalOcean Frontend
    "http://139.59.87.244",       # Standard Port 80
    "http://localhost:5173",      # Local Testing
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        # <--- Explicit Origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include Routers
app.include_router(auth.router)
app.include_router(training.router)
app.include_router(metrics.router)
app.include_router(clients.router)
app.include_router(models.router)
app.include_router(project_controller.router) # <--- Add this


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/")
async def root():
    return {"status": "healthy", "service": "Federated Learning API (Dockerized)"}