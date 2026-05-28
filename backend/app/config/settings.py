from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "QuizPulse API"
    DEBUG: bool = True
    MONGO_URI: str = Field(default="mongodb://localhost:27017", env="MONGO_URI")
    DB_NAME: str = Field(default="quizpulse", env="DB_NAME")
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
