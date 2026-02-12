from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db_conn
from app.socket_manager import manager
from app.models.schemas import MetricsReport
import json

router = APIRouter(tags=["metrics"])

# This router handles receiving metrics from the FL server and providing endpoints for the frontend to fetch metrics data.
# metrics.py
@router.post("/api/training/metrics")
async def report_metrics(metrics: MetricsReport, conn = Depends(get_db_conn)):
    async with conn.cursor() as cursor:
        # We fetch the latest session and join with projects to get num_rounds
        # based on your database.py schema for 'training_sessions' and 'projects'
        await cursor.execute("""
            SELECT ts.id, p.num_rounds 
            FROM training_sessions ts
            JOIN projects p ON ts.owner_id = p.owner_id 
            WHERE ts.status = 'running' 
            ORDER BY ts.id DESC LIMIT 1
        """)
        row = await cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="No active training session found")
        
        session_id, total_rounds = row[0], row[1]

        # Insertion logic using exactly your MetricsReport model
        await cursor.execute(
            """INSERT INTO metrics 
               (session_id, round, num_clients, accuracy, loss, client_metrics, timestamp)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                session_id, metrics.round, metrics.num_clients,
                metrics.accuracy, metrics.loss, 
                json.dumps(metrics.client_metrics), metrics.timestamp
            )
        )

        # FIX: Use the 'num_rounds' from the database instead of hardcoded '5'
        if metrics.round >= total_rounds:
            await cursor.execute(
                "UPDATE training_sessions SET status = 'completed' WHERE id = %s",
                (session_id,)
            )
    
    # WebSocket broadcast remains the same
    await manager.broadcast(json.dumps({"type": "metrics_update", "data": metrics.dict()}))
    return {"status": "received"}



# this endpoint can be used for historical metrics or for a specific session
@router.get("/api/metrics")
async def get_metrics(session_id: int = None, conn = Depends(get_db_conn)):
    # this endpoint can be used for historical metrics or for a specific session
    """Get training metrics"""
    async with conn.cursor() as cursor:
        if session_id:
            await cursor.execute(
                """SELECT round, accuracy, loss, num_clients, timestamp 
                   FROM metrics WHERE session_id = %s ORDER BY round ASC""",
                (session_id,),
            )
        else:
            await cursor.execute(
                """SELECT round, accuracy, loss, num_clients, timestamp 
                   FROM metrics ORDER BY id DESC LIMIT 100"""
            )
        rows = await cursor.fetchall()

    return {
        "metrics": [
            {
                "round": row[0],
                "accuracy": float(row[1]) if row[1] else 0,
                "loss": float(row[2]) if row[2] else 0,
                "num_clients": row[3],
                "timestamp": row[4],
            }
            for row in rows
        ]
    }

# Endpoint to get latest metrics for the most recent session
@router.get("/api/metrics/latest")
async def get_latest_metrics(conn = Depends(get_db_conn)):
    """Get metrics for the latest session"""
    async with conn.cursor() as cursor:
        await cursor.execute("SELECT id FROM training_sessions ORDER BY id DESC LIMIT 1")
        row = await cursor.fetchone()

        if not row:
            return {"metrics": []}

        session_id = row[0]
        await cursor.execute(
            """SELECT round, accuracy, loss, num_clients, timestamp 
               FROM metrics WHERE session_id = %s ORDER BY round ASC""",
            (session_id,),
        )
        rows = await cursor.fetchall()

    return {
        "metrics": [
            {
                "round": row[0],
                "accuracy": float(row[1]) if row[1] else 0,
                "loss": float(row[2]) if row[2] else 0,
                "num_clients": row[3],
                "timestamp": row[4],
            }
            for row in rows
        ]
    }
