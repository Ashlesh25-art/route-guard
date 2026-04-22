from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(
	title=settings.APP_NAME,
	version='0.1.0',
	description='RouteGuard backend scaffold based on planning documents.',
)

app.add_middleware(
	CORSMiddleware,
	allow_origins=settings.CORS_ORIGINS_LIST,
	allow_credentials=True,
	allow_methods=['*'],
	allow_headers=['*'],
)


@app.get('/')
async def root() -> dict[str, str]:
	return {'message': 'RouteGuard API scaffold is running'}


@app.get('/health')
async def health_check() -> dict[str, str]:
	return {'status': 'ok'}
