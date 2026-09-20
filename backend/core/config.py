import os
from typing import List, Union, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Route Planner - Part A"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "supersecret-part-a-dev-key"

    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 3000

    # PostgreSQL Database URL
    # Can also fallback to local sqlite for development if postgres is unavailable
    DATABASE_URL: str = "sqlite:///./route_planner_part_a.db"
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10

    # CORS
    CORS_ORIGINS: Union[List[str], str] = ["*"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.strip() == "*":
                return ["*"]
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s"

    # Part A Provider settings
    ROUTE_PROVIDER_DEFAULT: str = "mock_provider"
    ROUTE_PROVIDER_TIMEOUT_SECONDS: int = 10
    PROVIDER_TIMEOUT_SECONDS: int = 10

    # Real-time Provider API Keys
    AMADEUS_CLIENT_ID: Optional[str] = None
    AMADEUS_CLIENT_SECRET: Optional[str] = None
    AMADEUS_HOSTNAME: str = "test.api.amadeus.com"
    AVIATIONSTACK_API_KEY: Optional[str] = None
    OPENSKY_USERNAME: Optional[str] = None
    OPENSKY_PASSWORD: Optional[str] = None
    OPENROUTESERVICE_API_KEY: Optional[str] = None
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    NOMINATIM_USER_AGENT: str = "SmartRoutePlanner/1.0"
    OSRM_BASE_URL: str = "https://router.project-osrm.org"
    AMTRAKER_BASE_URL: str = "https://api.amtraker.com/v3"
    NOMINATIM_BASE_URL: str = "https://nominatim.openstreetmap.org"
    PHOTON_BASE_URL: str = "https://photon.komoot.io/api"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )


settings = Settings()
