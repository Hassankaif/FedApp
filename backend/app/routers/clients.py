from fastapi import APIRouter, Depends
from datetime import datetime
from app.database import get_db_conn
from app.socket_manager import manager
from app.models.schemas import ClientRegistration

router = APIRouter(prefix="/api/clients", tags=["clients"])

@router.post("/register")
async def register_client(client: ClientRegistration, conn = Depends(get_db_conn)):
    """Register a new client"""
    async with conn.cursor() as cursor:
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

@router.get("")
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
    
# defines api endpoints for client registration and retrieval of registered clients. It interacts with the database to store and fetch client information, and uses a socket manager to broadcast client registration events to connected WebSocket clients.
# in future, we can add more endpoints for updating client status, deleting clients, or fetching specific client details.