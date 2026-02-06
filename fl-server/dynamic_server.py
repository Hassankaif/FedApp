from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db_conn
from app.socket_manager import manager
from app.models.schemas import MetricsReport
import json

# Use a consistent prefix for clarity
router = APIRouter(prefix="/api/metrics", tags=["metrics"])

@router.post("/report")
async def report_metrics(metrics: MetricsReport, conn = Depends(get_db_conn)):
    """Receive metrics from FL server and broadcast to frontend"""

    async with conn.cursor() as cursor:
        # Check if project exists
        await cursor.execute("SELECT id FROM projects WHERE id = %s", (metrics.project_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")

        # Store metrics
        await cursor.execute(
            """INSERT INTO metrics 
               (project_id, round, num_clients, accuracy, loss, client_metrics, timestamp)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                metrics.project_id,
                metrics.round,
                metrics.num_clients,
                metrics.accuracy,
                metrics.loss,
                json.dumps(metrics.client_metrics),
                metrics.timestamp,
            ),
        )

        # Optional: update project status if last round reached
        if metrics.round >= 5:  # adjust threshold dynamically later
            await cursor.execute(
                "UPDATE projects SET status = 'completed' WHERE id = %s",
                (metrics.project_id,),
            )

    # Broadcast to WebSocket clients 🚀
    message = {
        "type": "metrics_update",
        "data": {
            "project_id": metrics.project_id,
            "round": metrics.round,
            "accuracy": metrics.accuracy,
            "loss": metrics.loss,
            "num_clients": metrics.num_clients,
            "timestamp": metrics.timestamp,
        },
    }
    await manager.broadcast(json.dumps(message))

    return {"status": "success"}


@router.get("/latest")
async def get_latest_metrics(project_id: int, conn = Depends(get_db_conn)):
    """Get metrics for the latest rounds of a given project"""
    async with conn.cursor() as cursor:
        await cursor.execute(
            """SELECT round, accuracy, loss, num_clients, timestamp 
               FROM metrics WHERE project_id = %s ORDER BY round ASC""",
            (project_id,),
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
