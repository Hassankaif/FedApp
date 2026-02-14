import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DB_HOST: str
    DB_PORT: int = 3306
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str
    
    # Auth
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Frontend URL (for CORS)
    VITE_API_URL: str = "http://localhost:5173"

    class Config:
        # Load from the .env file in the root directory
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        extra = "ignore" 

    # DB_CONFIG as a dynamic property for aiomysql
    @property
    def DB_CONFIG(self):
        return {
            "host": self.DB_HOST,
            "port": self.DB_PORT,
            "user": self.DB_USER,
            "password": self.DB_PASSWORD,
            "db": self.DB_NAME,
            "autocommit": True
        }

settings = Settings()
# DB_CONFIG = settings.DB_CONFIG  # This will be used in database.py for aiomysql connection pool to ensure it always reflects the latest settings from the .env file