import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect

# Import implementation parts
from app.database import lifespan
from app.socket_manager import manager
from app.routers import auth, training, metrics, clients, models

# Create directories
os.makedirs("models", exist_ok=True)
os.makedirs("datasets", exist_ok=True)
os.makedirs("configs", exist_ok=True)

app = FastAPI(title="Federated Learning API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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