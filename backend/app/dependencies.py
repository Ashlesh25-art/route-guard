from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer(auto_error=False)


async def get_current_user(
	credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
	if credentials is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Not authenticated')

	token = credentials.credentials
	# Placeholder token decoding for scaffold stage.
	if not token:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')

	return {'user_id': 'demo-user', 'role': 'manager', 'token': token}


def require_role(allowed_roles: list[str]) -> Callable:
	async def _role_check(user: dict = Depends(get_current_user)) -> dict:
		role = user.get('role')
		if role not in allowed_roles:
			raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')
		return user

	return _role_check
