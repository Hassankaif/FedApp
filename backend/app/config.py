import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "default-secret")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
    
    DB_CONFIG = {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", 3306)),
        "user": os.getenv("DB_USER", "root"),
        "password": os.getenv("DB_PASSWORD", ""),
        "db": os.getenv("DB_NAME", "FederatedLearning"),
        "autocommit": True
    }

settings = Config()

#DB_CONFIG: This dictionary packages all your database connection details into one neat bundle that database.py will use later.