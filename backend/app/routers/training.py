from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.database import get_db_conn
from app.socket_manager import manager
from app.models.schemas import TrainingMode
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

# --- BASIC TRAINING ENDPOINTS ---

@router.post("/start")
async def start_training(conn = Depends(get_db_conn)):
    """Start a new training session"""
    async with conn.cursor() as cursor:
        await cursor.execute(
            "INSERT INTO training_sessions (status, started_at) VALUES (%s, %s)",
            ("running", datetime.utcnow())
        )
        session_id = cursor.lastrowid
    
    await manager.broadcast({
        "type": "training_started",
        "session_id": session_id,
        "timestamp": datetime.utcnow().isoformat()
    })
    return {"status": "started", "session_id": session_id}

@router.post("/complete")
async def complete_training(conn = Depends(get_db_conn)):
    """Mark training as complete"""
    async with conn.cursor() as cursor:
        await cursor.execute(
            "UPDATE training_sessions SET status = %s, completed_at = %s WHERE status = %s",
            ("completed", datetime.utcnow(), "running")
        )
    
    await manager.broadcast({
        "type": "training_completed",
        "timestamp": datetime.utcnow().isoformat()
    })
    return {"status": "completed"}

@router.get("/status")
async def get_training_status(conn = Depends(get_db_conn)):
    """Get current training session status"""
    async with conn.cursor() as cursor:
        await cursor.execute(
            """SELECT id, status, started_at, total_rounds 
               FROM training_sessions 
               WHERE status = 'running' 
               ORDER BY id DESC LIMIT 1"""
        )
        running_session = await cursor.fetchone()
        
        if running_session:
            session_id, status, started_at, total_rounds = running_session
            await cursor.execute(
                "SELECT MAX(round) as current_round FROM metrics WHERE session_id = %s",
                (session_id,)
            )
            round_row = await cursor.fetchone()
            current_round = round_row[0] if round_row and round_row[0] else 0
            
            return {
                "is_training": True,
                "session_id": session_id,
                "current_round": current_round,
                "total_rounds": total_rounds,
                "started_at": started_at
            }
        else:
            return {"is_training": False, "session_id": None, "current_round": 0, "total_rounds": 20}

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