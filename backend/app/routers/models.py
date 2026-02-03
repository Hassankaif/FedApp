from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from app.database import get_db_conn
from app.models.schemas import ModelConfig
# Import shared state from training router or a common state file
from app.routers.training import current_config 
import os
import pickle
import pandas as pd
from datetime import datetime

router = APIRouter(tags=["models"])

# Ensure directories exist
os.makedirs("models", exist_ok=True)
os.makedirs("datasets", exist_ok=True)

@router.post("/api/model/save")
async def save_global_model(model_data: dict):
    """Save global model weights"""
    timestamp = int(datetime.utcnow().timestamp())
    model_path = f"models/global_model_{timestamp}.pkl"
    
    with open(model_path, 'wb') as f:
        pickle.dump(model_data['weights'], f)
    
    return {"status": "success", "model_path": model_path, "timestamp": timestamp}

@router.get("/api/model/download/global")
async def download_global_model():
    """Download latest global model"""
    models = [f for f in os.listdir("models") if f.startswith("global_model_")]
    if not models:
        raise HTTPException(status_code=404, detail="No global model found")
    
    latest_model = sorted(models)[-1]
    model_path = os.path.join("models", latest_model)
    return FileResponse(model_path, media_type="application/octet-stream", filename=latest_model)

@router.get("/api/model/download/centralized")
async def download_centralized_model():
    """Download latest centralized model"""
    models = [f for f in os.listdir("models") if f.startswith("centralized_")]
    if not models:
        raise HTTPException(status_code=404, detail="No centralized model found")
    
    latest_model = sorted(models)[-1]
    model_path = os.path.join("models", latest_model)
    return FileResponse(model_path, media_type="application/octet-stream", filename=latest_model)

@router.get("/api/models/list")
async def list_saved_models():
    """List all saved models"""
    models = []
    for filename in os.listdir("models"):
        filepath = os.path.join("models", filename)
        models.append({
            "filename": filename,
            "size": os.path.getsize(filepath),
            "created": datetime.fromtimestamp(os.path.getctime(filepath)).isoformat(),
            "type": "global" if "global" in filename else "centralized"
        })
    return {"models": sorted(models, key=lambda x: x['created'], reverse=True)}

@router.post("/api/config/model")
async def save_model_config(config: ModelConfig, conn = Depends(get_db_conn)):
    """Save custom model architecture code"""
    async with conn.cursor() as cursor:
        await cursor.execute("UPDATE model_configs SET is_active = FALSE WHERE is_active = TRUE")
        await cursor.execute(
            "INSERT INTO model_configs (model_code, dataset_path) VALUES (%s, %s)",
            (config.model_code, config.dataset_path)
        )
    
    # Update runtime config
    current_config["model_code"] = config.model_code
    current_config["dataset_path"] = config.dataset_path
    
    return {"status": "success", "message": "Model configuration saved"}

@router.get("/api/config/model")
async def get_model_config(conn = Depends(get_db_conn)):
    """Get active model configuration"""
    async with conn.cursor() as cursor:
        await cursor.execute(
            "SELECT model_code, dataset_path FROM model_configs WHERE is_active = TRUE ORDER BY id DESC LIMIT 1"
        )
        row = await cursor.fetchone()
    
    if row:
        return {"model_code": row[0], "dataset_path": row[1]}
    
    return {
        "model_code": "Model code not set", 
        "dataset_path": "default.csv"
    }

@router.post("/api/config/dataset")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload new dataset"""
    dataset_path = f"datasets/{file.filename}"
    with open(dataset_path, "wb") as f:
        f.write(await file.read())
    
    try:
        df = pd.read_csv(dataset_path)
        return {
            "status": "success",
            "filename": file.filename,
            "path": dataset_path,
            "rows": df.shape[0],
            "columns": df.shape[1]
        }
    except Exception as e:
        os.remove(dataset_path)
        raise HTTPException(status_code=400, detail=f"Invalid dataset: {str(e)}")

@router.get("/api/datasets/list")
async def list_datasets():
    datasets = []
    for filename in os.listdir("datasets"):
        filepath = os.path.join("datasets", filename)
        try:
            df = pd.read_csv(filepath)
            datasets.append({
                "filename": filename,
                "rows": len(df),
                "columns": len(df.columns),
                "created": datetime.fromtimestamp(os.path.getctime(filepath)).isoformat()
            })
        except:
            pass
    return {"datasets": sorted(datasets, key=lambda x: x['created'], reverse=True)}

@router.get("/api/config/current")
async def get_current_config():
    """Get current configuration for clients"""
    return {
        "model_code": current_config.get("model_code"),
        "dataset_path": current_config.get("dataset_path"),
        "training_mode": current_config.get("training_mode", "federated")
    }