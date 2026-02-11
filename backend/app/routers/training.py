from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from app.database import get_db_conn
from app.socket_manager import manager
from app.models.schemas import TrainingMode, VoteRequest
from datetime import datetime
import pandas as pd
import tensorflow as tf
import numpy as np
import time
import os

router = APIRouter(prefix="/api/training", tags=["training"])

# Global storage for current configuration
current_config = {
    "model_code": None,
    "dataset_path": None,
    "training_mode": "federated",
    "comparison_dataset": None
}



@router.post("/vote")
async def vote_strategy(vote: VoteRequest, conn = Depends(get_db_conn)):
    """Clients (Electron) call this to cast their vote"""
    if vote.strategy not in ["FedAvg", "FedProx"]:
        raise HTTPException(status_code=400, detail="Invalid strategy")

    async with conn.cursor() as cursor:
        # Insert or Update vote (One vote per client per project)
        await cursor.execute(
            """INSERT INTO strategy_votes (project_id, client_id, strategy) 
               VALUES (%s, %s, %s) 
               ON DUPLICATE KEY UPDATE strategy = %s""",
            (vote.project_id, vote.client_id, vote.strategy, vote.strategy)
        )
        
        # Get live tally to broadcast
        await cursor.execute(
            "SELECT strategy, COUNT(*) FROM strategy_votes WHERE project_id=%s GROUP BY strategy",
            (vote.project_id,)
        )
        tally = {row[0]: row[1] for row in await cursor.fetchall()}

    await manager.broadcast({"type": "vote_update", "tally": tally})
    return {"status": "voted", "tally": tally}

@router.get("/strategy/final/{project_id}")
async def get_final_strategy(project_id: int, conn = Depends(get_db_conn)):
    """FL Server calls this before starting to know which class to load"""
    async with conn.cursor() as cursor:
        await cursor.execute(
            """SELECT strategy, COUNT(*) as c 
               FROM strategy_votes 
               WHERE project_id = %s 
               GROUP BY strategy 
               ORDER BY c DESC LIMIT 1""",
            (project_id,)
        )
        row = await cursor.fetchone()
    
    # Default to FedAvg if no votes
    strategy = row[0] if row else "FedAvg"
    return {"strategy": strategy}

# --- 2. Server Control Endpoints ---

@router.get("/status")
async def get_status(conn = Depends(get_db_conn)):
    """Polled by FL Server to know when to wake up"""
    async with conn.cursor() as cursor:
        await cursor.execute(
            "SELECT status, id, final_strategy FROM training_sessions ORDER BY id DESC LIMIT 1"
        )
        row = await cursor.fetchone()
    
    if not row:
        return {"status": "idle"}
    
    return {
        "status": row[0], 
        "session_id": row[1],
        "strategy": row[2] 
    }

@router.post("/start")
async def start_training(project_id: int = 1, conn = Depends(get_db_conn)):
    """Frontend 'Start' button triggers this"""
    
    # 1. Determine Winner Strategy
    final_res = await get_final_strategy(project_id, conn)
    winner_strategy = final_res["strategy"]

    async with conn.cursor() as cursor:
        # Cancel old running sessions
        await cursor.execute("UPDATE training_sessions SET status='cancelled' WHERE status='training'")
        
        # Create new session with the winning strategy
        await cursor.execute(
            """INSERT INTO training_sessions (status, started_at, final_strategy) 
               VALUES ('training', %s, %s)""",
            (datetime.utcnow(), winner_strategy)
        )
        session_id = cursor.lastrowid

    # Notify everyone
    await manager.broadcast({
        "type": "training_started",
        "session_id": session_id,
        "strategy": winner_strategy
    })
    
    return {"status": "training", "strategy": winner_strategy, "session_id": session_id}

@router.post("/complete")
async def complete_training(conn = Depends(get_db_conn)):
    """FL Server calls this when 5 rounds are done"""
    async with conn.cursor() as cursor:
        await cursor.execute(
            "UPDATE training_sessions SET status='completed', completed_at=%s WHERE status='training'",
            (datetime.utcnow(),)
        )
    
    await manager.broadcast({"type": "training_completed"})
    return {"status": "completed"}



# --- MODE SWITCHING ---

@router.post("/mode")
async def set_training_mode(mode_config: TrainingMode):
    """Set training mode: federated or comparison"""
    current_config["training_mode"] = mode_config.mode
    if mode_config.mode == "comparison" and mode_config.dataset_file:
        current_config["comparison_dataset"] = mode_config.dataset_file
    
    return {
        "status": "success", 
        "mode": mode_config.mode,
        "message": f"Training mode set to {mode_config.mode}"
    }

@router.get("/mode")
async def get_training_mode():
    return {
        "mode": current_config.get("training_mode", "federated"),
        "comparison_dataset": current_config.get("comparison_dataset")
    }

# --- CENTRALIZED TRAINING ---

@router.post("/centralized")
async def run_centralized_training(
    dataset_file: UploadFile = File(...),
    conn = Depends(get_db_conn)
):
    """Run centralized training for comparison"""
    # Save uploaded dataset
    timestamp = int(time.time())
    dataset_path = f"datasets/centralized_{timestamp}.csv"
    with open(dataset_path, "wb") as f:
        f.write(await dataset_file.read())
    
    # Load Data
    try:
        df = pd.read_csv(dataset_path)
        X = df.iloc[:, :-1].values
        y = df.iloc[:, -1].values
        
        # Normalize
        X = (X - X.mean(axis=0)) / (X.std(axis=0) + 1e-7)
        
        # Split
        split_idx = int(0.8 * len(X))
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        # Create Model (Hardcoded for now, matching your main.py)
        model = tf.keras.Sequential([
            tf.keras.layers.Dense(64, activation='relu', input_shape=(X.shape[1],)),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(32, activation='relu'),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(1, activation='sigmoid')
        ])
        model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
        
        # Train
        start_time = time.time()
        model.fit(X_train, y_train, epochs=100, batch_size=32, validation_data=(X_test, y_test), verbose=0)
        training_time = time.time() - start_time
        
        # Evaluate
        loss, accuracy = model.evaluate(X_test, y_test, verbose=0)
        
        # Save Model
        model_path = f"models/centralized_{timestamp}.h5"
        model.save(model_path)
        
        # Store Results
        async with conn.cursor() as cursor:
            # Find latest session to link results to
            await cursor.execute(
                "SELECT id FROM training_sessions WHERE status IN ('running', 'completed') ORDER BY id DESC LIMIT 1"
            )
            row = await cursor.fetchone()
            session_id = row[0] if row else None
            
            await cursor.execute(
                """INSERT INTO centralized_results (session_id, accuracy, loss, training_time)
                   VALUES (%s, %s, %s, %s)""",
                (session_id, accuracy, loss, training_time)
            )
        
        await manager.broadcast({
            "type": "centralized_complete",
            "data": {"accuracy": float(accuracy), "loss": float(loss), "training_time": training_time}
        })
        
        return {
            "status": "success",
            "accuracy": float(accuracy),
            "loss": float(loss),
            "training_time": training_time,
            "model_path": model_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Centralized training failed: {str(e)}")

@router.get("/comparison")
async def get_comparison_results(conn = Depends(get_db_conn)):
    """Get comparison between federated and centralized training"""
    async with conn.cursor() as cursor:
        # Get latest federated results
        await cursor.execute(
            "SELECT session_id, MAX(round) as final_round FROM metrics GROUP BY session_id ORDER BY session_id DESC LIMIT 1"
        )
        fed_row = await cursor.fetchone()
        
        if not fed_row:
            return {"error": "No federated training data found"}
        
        session_id = fed_row[0]
        
        # Get final federated metrics
        await cursor.execute(
            "SELECT accuracy, loss FROM metrics WHERE session_id = %s ORDER BY round DESC LIMIT 1",
            (session_id,)
        )
        fed_metrics = await cursor.fetchone()
        
        # Get centralized results for the same session
        await cursor.execute(
            "SELECT accuracy, loss, training_time FROM centralized_results WHERE session_id = %s ORDER BY id DESC LIMIT 1",
            (session_id,)
        )
        cent_metrics = await cursor.fetchone()
        
        if not fed_metrics or not cent_metrics:
            return {"error": "Incomplete comparison data"}
        
        return {
            "federated": {"accuracy": float(fed_metrics[0]), "loss": float(fed_metrics[1])},
            "centralized": {"accuracy": float(cent_metrics[0]), "loss": float(cent_metrics[1]), "training_time": float(cent_metrics[2])},
            "comparison": {
                "accuracy_diff": float(cent_metrics[0] - fed_metrics[0]),
                "loss_diff": float(fed_metrics[1] - cent_metrics[1])
            }
        }