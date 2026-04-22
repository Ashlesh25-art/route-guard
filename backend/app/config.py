from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
	APP_NAME: str = 'RouteGuard'
	ENVIRONMENT: str = 'development'
	DEBUG: bool = True
	SECRET_KEY: str = 'dev-secret'
	CORS_ORIGINS: str = 'http://localhost:5173,http://localhost:3000'

	POSTGRES_HOST: str = 'localhost'
	POSTGRES_PORT: int = 5432
	POSTGRES_DB: str = 'routeguard'
	POSTGRES_USER: str = 'postgres'
	POSTGRES_PASSWORD: str = 'postgres'

	MONGODB_HOST: str = 'localhost'
	MONGODB_PORT: int = 27017
	MONGODB_DB: str = 'routeguard_realtime'
	MONGODB_USER: str = ''
	MONGODB_PASSWORD: str = ''

	REDIS_HOST: str = 'localhost'
	REDIS_PORT: int = 6379
	REDIS_PASSWORD: str = ''
	REDIS_DB: int = 0

	JWT_SECRET_KEY: str = 'dev-jwt-secret'
	JWT_ALGORITHM: str = 'HS256'
	JWT_EXPIRE_MINUTES: int = 43200

	MONITORING_INTERVAL_MINUTES: int = 30

	model_config = SettingsConfigDict(env_file='.env', extra='ignore')

	@property
	def CORS_ORIGINS_LIST(self) -> list[str]:
		return [origin.strip() for origin in self.CORS_ORIGINS.split(',') if origin.strip()]

	@property
	def DATABASE_URL(self) -> str:
		return (
			f'postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}'
			f'@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}'
		)

	@property
	def MONGODB_URL(self) -> str:
		if self.MONGODB_USER and self.MONGODB_PASSWORD:
			return (
				f'mongodb://{self.MONGODB_USER}:{self.MONGODB_PASSWORD}'
				f'@{self.MONGODB_HOST}:{self.MONGODB_PORT}'
			)
		return f'mongodb://{self.MONGODB_HOST}:{self.MONGODB_PORT}'


@lru_cache()
def get_settings() -> Settings:
	return Settings()


settings = get_settings()
