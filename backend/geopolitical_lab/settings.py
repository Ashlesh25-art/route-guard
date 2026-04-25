from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class LabSettings(BaseSettings):
    APP_NAME: str = "RouteGuard Geopolitical Lab"
    DEBUG: bool = True
    CORS_ORIGINS: str = "*"

    # Parsing mode is deterministic and API-key free.
    PARSER_MODE: str = "rules_structured"

    # Ingestion controls
    INGEST_LIMIT_PER_PROVIDER: int = Field(default=20, ge=1, le=100)
    REQUEST_TIMEOUT_SECONDS: float = Field(default=20.0, ge=5.0, le=120.0)

    # Zone controls
    LIVE_ZONE_TTL_HOURS: int = Field(default=24, ge=1, le=168)
    DEFAULT_ZONE_RADIUS_KM: float = Field(default=200.0, ge=10.0, le=5000.0)

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [item.strip() for item in self.CORS_ORIGINS.split(",") if item.strip()]


@lru_cache()
def get_lab_settings() -> LabSettings:
    return LabSettings()
