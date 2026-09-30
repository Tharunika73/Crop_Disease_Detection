import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-this-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./cropapp.db")

    WEATHER_API_KEY: str = os.getenv("WEATHER_API_KEY", "")
    WEATHER_API_URL: str = "https://api.openweathermap.org/data/2.5/forecast"

    MODEL_PATH: str = os.getenv("MODEL_PATH", "./ml/trained_model.h5")
    CLASS_NAMES_PATH: str = os.getenv("CLASS_NAMES_PATH", "./ml/class_names.json")

    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")

    CORS_ORIGINS_RAW: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://localhost:4173,http://localhost:3000",
    )

    def cors_origins_list(self) -> list:
        return [o.strip() for o in self.CORS_ORIGINS_RAW.split(",") if o.strip()]

    OUTBREAK_CASE_THRESHOLD: int = 25

    class Config:
        env_file = ".env"


settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
