# backend/app/controllers/project_controller.py - FIXED
from fastapi import APIRouter, Depends, HTTPException
from app.models.project import ProjectCreate
from app.services.model_loader import DynamicModelLoader
from app.database import get_db_conn
from app.routers.auth import get_current_user # 🔒 Import auth dependency to get current user info
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

# projects.py
@router.get("/{project_id}")
async def get_project(project_id: int, conn = Depends(get_db_conn)):
    async with conn.cursor() as cursor:
        # Explicitly list columns in the order expected by your Project model
        await cursor.execute("""
            SELECT id, name, description, model_code, csv_schema, 
                   target_column, num_rounds, local_epochs, batch_size, min_clients, status
            FROM projects WHERE id = %s
        """, (project_id,))
        row = await cursor.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # This mapping is now "column-change proof"
    return {
        "project": {
            "id": row[0], 
            "name": row[1], 
            "description": row[2],
            "model_code": row[3], 
            "csv_schema": row[4], 
            "target_column": row[5],
            "num_rounds": row[6], 
            "local_epochs": row[7], 
            "batch_size": row[8],
            "min_clients": row[9], 
            "status": row[10]
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
async def list_projects(
    owner_id: int = None, # Make this optional
    conn = Depends(get_db_conn),
    current_user: dict = Depends(get_current_user) # 🔒 Get user from Token
):
    """List projects: Admins see all, Researchers see their own"""
    
    async with conn.cursor() as cursor:
        if current_user['role'] == 'admin':
            # Admin sees ALL projects
            await cursor.execute("""
                SELECT id, name, description, status, current_round, 
                       num_rounds, total_clients, created_at
                FROM projects 
                ORDER BY created_at DESC
            """)
        else:
            # Researchers only see THEIR projects
            await cursor.execute("""
                SELECT id, name, description, status, current_round, 
                       num_rounds, total_clients, created_at
                FROM projects 
                WHERE owner_id = %s 
                ORDER BY created_at DESC
            """, (current_user['id'],))
            
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

# this file contains the main endpoints for creating, listing and retrieving FL projects and handles model code distribution to clients.
# in future iterations, we can add endpoints for updating project status, managing clients, and aggregating model updates.