import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect

# Import our implementation parts
from app.database import lifespan
from app.socket_manager import manager
from app.routers import auth, training, metrics, clients, models, projects

# Create directories
os.makedirs("models", exist_ok=True)
os.makedirs("datasets", exist_ok=True)

app = FastAPI(title="Federated Learning API", lifespan=lifespan)

origins = [
    "http://139.59.87.244:5173",  # DigitalOcean Frontend access (if frontend is hosted on the same server)
    "http://139.59.87.244",       # Standard Port 80 access for DigitalOcean (allowing both with and without port for flexibility)
    "http://localhost:5173",      # Local Testing from frontend 
    "http://127.0.0.1:5173",       # Local Testing from frontend (alternative localhost)
    "http://localhost:3000",      # for local development only, remove at production
    "http://127.0.0.1:3000"        # for local development only, remove at production (alternative localhost)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        # <--- Explicitly specify allowed origins for security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include Routers (Api Endpoints)
app.include_router(auth.router)
app.include_router(training.router)
app.include_router(metrics.router)
app.include_router(clients.router)
app.include_router(models.router)
app.include_router(projects.router) 

# WebSocket Endpoint
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

# starts the FastAPI application with the defined routes and WebSocket endpoint. The lifespan function is used to manage the database connection pool, ensuring that it is properly initialized when the application starts and closed when it shuts down. The CORS middleware is configured to allow requests from specific origins, which is crucial for security in a production environment.