from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from app.database import get_db_conn
from app.models.schemas import LoginRequest, Token, UserCreate, UserResponse
from app.services.security import verify_password, get_password_hash, create_access_token
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer()

# --- REGISTER ---
@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, conn = Depends(get_db_conn)):
    async with conn.cursor() as cursor:
        # 1. Check if email exists
        await cursor.execute("SELECT id FROM users WHERE email = %s", (user.email,))
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # 2. Hash Password
        hashed_pw = get_password_hash(user.password)
        
        # 3. Insert User
        await cursor.execute("""
            INSERT INTO users (email, hashed_password, full_name, role)
            VALUES (%s, %s, %s, %s)
        """, (user.email, hashed_pw, user.full_name, user.role))
        
        user_id = cursor.lastrowid
        
    return {
        "id": user_id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role
    }

# --- LOGIN ---
@router.post("/login", response_model=Token)
async def login(request: LoginRequest, conn = Depends(get_db_conn)):
    async with conn.cursor() as cursor:
        # 1. Fetch User by Email
        await cursor.execute("""
            SELECT id, email, hashed_password, full_name, role 
            FROM users WHERE email = %s
        """, (request.username,))
        user = await cursor.fetchone()
        
    # 2. Verify User & Password
    if not user or not verify_password(request.password, user[2]): # user[2] is hashed_password
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Incorrect email or password"
        )
    
    # 3. Generate Token
    access_token = create_access_token(data={"sub": user[1], "id": user[0], "role": user[4]})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user[0],
            "email": user[1],
            "full_name": user[3],
            "role": user[4]
        }
    }

# --- DEPENDENCY: GET CURRENT USER ---
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), conn = Depends(get_db_conn)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        # Fetch user from DB to ensure they still exist
        async with conn.cursor() as cursor:
            await cursor.execute("SELECT id, email, full_name, role FROM users WHERE email = %s", (email,))
            user = await cursor.fetchone()
            
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
            
        return {"id": user[0], "email": user[1], "full_name": user[2], "role": user[3]}
        
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")