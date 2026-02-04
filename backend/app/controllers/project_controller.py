# backend/app/controllers/project_controller.py (NEW)
from fastapi import APIRouter, Depends, HTTPException
from app.models.project import ProjectCreate
from app.services.model_loader import DynamicModelLoader
from app.database import get_db_conn # Adapted to your database.py name
import aiomysql

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.post("/")
async def create_project(project: ProjectCreate, conn = Depends(get_db_conn)):
    """Create new FL project"""
    
    # 1. Validate Code
    validation = DynamicModelLoader.validate_model_code(project.model_code)
    if not validation['valid']:
        raise HTTPException(status_code=400, detail={"message": "Invalid model code", "errors": validation['errors']})

    # 2. Parse Schema
    schema_list = [s.strip() for s in project.csv_schema.split(',')]

    # 3. Save to DB
    async with conn.cursor() as cursor:
        await cursor.execute("""
            INSERT INTO projects 
            (name, description, owner_id, model_code, csv_schema, 
            expected_features, target_column, num_rounds, local_epochs, 
            batch_size, min_clients, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            project.name, project.description, project.owner_id, 
            project.model_code, str(schema_list), len(schema_list),
            project.target_column, project.num_rounds, project.local_epochs,
            project.batch_size, project.min_clients, 'draft'
        ))
        project_id = cursor.lastrowid
        
    return {"status": "success", "project_id": project_id}

@router.get("/{project_id}/model-code")
async def get_model_code(project_id: int, conn = Depends(get_db_conn)):
    """Public endpoint for Clients to download the model"""
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT model_code, csv_schema, expected_features, target_column 
            FROM projects WHERE id = %s
        """, (project_id,))
        result = await cursor.fetchone()
        
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # aiomysql returns tuples, so we map by index
    # [cite: 433-437]
    return {
        "model_code": result[0],
        "csv_schema": eval(result[1]) if isinstance(result[1], str) else result[1],
        "expected_features": result[2],
        "target_column": result[3]
    }