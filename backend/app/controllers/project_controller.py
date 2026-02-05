# backend/app/controllers/project_controller.py - FIXED
from fastapi import APIRouter, Depends, HTTPException
from app.models.project import ProjectCreate
from app.services.model_loader import DynamicModelLoader
from app.database import get_db_conn
import json

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.post("/")
async def create_project(project: ProjectCreate, conn = Depends(get_db_conn)):
    """Create new FL project"""
    
    # 1. Validate model code
    validation = DynamicModelLoader.validate_model_code(project.model_code)
    if not validation['valid']:
        raise HTTPException(status_code=400, detail={
            "message": "Invalid model code", 
            "errors": validation['errors']
        })
    
    # 2. Parse schema (handle both string and list)
    if isinstance(project.csv_schema, str):
        schema_list = [s.strip() for s in project.csv_schema.split(',')]
    else:
        schema_list = project.csv_schema
    
    schema_json = json.dumps(schema_list)
    
    # 3. Insert into database
    async with conn.cursor() as cursor:
        await cursor.execute("""
            INSERT INTO projects 
            (name, description, owner_id, model_code, csv_schema, 
             expected_features, target_column, num_rounds, local_epochs, 
             batch_size, min_clients, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            project.name,
            project.description,
            project.owner_id,
            project.model_code,
            schema_json,  # Store as JSON string
            len(schema_list),
            project.target_column,
            project.num_rounds,
            project.local_epochs,
            project.batch_size,
            project.min_clients,
            'draft'
        ))
        project_id = cursor.lastrowid
    
    return {
        "status": "success", 
        "project_id": project_id,
        "message": f"Project '{project.name}' created with ID {project_id}"
    }

@router.get("/{project_id}")
async def get_project(project_id: int, conn = Depends(get_db_conn)):
    """Get project details"""
    async with conn.cursor() as cursor:
        await cursor.execute("SELECT * FROM projects WHERE id = %s", (project_id,))
        row = await cursor.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Map tuple to dict (aiomysql returns tuples)
    return {
        "project": {
            "id": row[0],
            "name": row[1],
            "description": row[2],
            "owner_id": row[3],
            "model_code": row[4],
            "csv_schema": json.loads(row[5]) if row[5] else [],
            "expected_features": row[6],
            "target_column": row[7],
            "num_rounds": row[8],
            "local_epochs": row[9],
            "batch_size": row[10],
            "min_clients": row[11],
            "status": row[12],
            "server_status": row[13],
            "current_round": row[14],
            "total_clients": row[15],
        }
    }

@router.get("/{project_id}/model-code")
async def get_model_code(project_id: int, conn = Depends(get_db_conn)):
    """Public endpoint for clients to download model"""
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT model_code, csv_schema, expected_features, target_column 
            FROM projects WHERE id = %s
        """, (project_id,))
        row = await cursor.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Parse JSON schema
    try:
        csv_schema = json.loads(row[1]) if isinstance(row[1], str) else row[1]
    except:
        csv_schema = row[1].split(',') if row[1] else []
    
    return {
        "model_code": row[0],
        "csv_schema": csv_schema,
        "expected_features": row[2],
        "target_column": row[3]
    }

@router.get("/")
async def list_projects(owner_id: int, conn = Depends(get_db_conn)):
    """List all projects for a user"""
    async with conn.cursor() as cursor:
        await cursor.execute("""
            SELECT id, name, description, status, current_round, 
                   num_rounds, total_clients, created_at
            FROM projects 
            WHERE owner_id = %s 
            ORDER BY created_at DESC
        """, (owner_id,))
        rows = await cursor.fetchall()
    
    projects = []
    for row in rows:
        projects.append({
            "id": row[0],
            "name": row[1],
            "description": row[2],
            "status": row[3],
            "current_round": row[4],
            "num_rounds": row[5],
            "total_clients": row[6],
            "created_at": str(row[7])
        })
    
    return {"projects": projects}