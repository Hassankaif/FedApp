import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect

# Import our implementation parts
from app.database import lifespan
from app.socket_manager import manager
from app.routers import auth, training, metrics, clients, models, projects
from app.config import settings

# Create directories
os.makedirs("models", exist_ok=True)
os.makedirs("datasets", exist_ok=True)

app = FastAPI(title="Federated Learning API", lifespan=lifespan)

origins = [
    "http://139.59.87.244:5173",  # DigitalOcean Frontend access (if frontend is hosted on the same server)
    "http://139.59.87.244",       # Standard Port 80 access for DigitalOcean (allowing both with and without port for flexibility)
    "http://localhost:5173",      # Local Testing from frontend 
    "http://127.0.0.1:5173",      # Local Testing from frontend (alternative localhost)
    "http://localhost:3000",      # for local development only, remove at production
    "http://127.0.0.1:3000",      # for local development only, remove at production (alternative localhost)
    "http://localhost:5174",      # electron app cors allow, for local development only, remove at production
]

app.add_middleware(
    CORSMiddleware,
    # allow_origins=origins,        
    allow_origins=settings.CORS_ORIGINS_LIST,   # Use CORS_ORIGINS_LIST from settings for flexibility and security. imported from app.config, which reads from .env file. This allows us to easily manage allowed origins without changing code.
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
async def websocket_endpoint(websocket: WebSocket, project_id: int = None):
    # initial connection
    room = f"project_{project_id}" if project_id else "global"
    await manager.connect(websocket, room) #accept the connection and add to the specified room
    try:
        while True:
            data = await websocket.receive_text()
            # Handle room join messages
            if data.startswith("join:"):
                new_room = data.split(":")[1]
                
                manager.disconnect(websocket) #remove old room
                manager.join_room(websocket, new_room) # add to new room
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/")
async def root():
    return {"status": "healthy", "service": "Federated Learning API (Dockerized) (Backend/main.py)"}

# starts the FastAPI application with the defined routes and WebSocket endpoint. The lifespan function is used to manage the database connection pool, ensuring that it is properly initialized when the application starts and closed when it shuts down. The CORS middleware is configured to allow requests from specific origins, which is crucial for security in a production environment.