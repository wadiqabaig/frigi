from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .errors import ApiError
from .models import User

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def check_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_token(user_id: int) -> str:
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(days=settings.token_days)
    return jwt.encode({"sub": str(user_id), "exp": expires}, settings.secret_key, algorithm="HS256")


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    """Dependency for endpoints that need a logged-in user."""
    if credentials is None:
        raise ApiError(401, "UNAUTHORISED", "Please log in.")
    try:
        payload = jwt.decode(credentials.credentials, get_settings().secret_key, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise ApiError(401, "UNAUTHORISED", "Your session has expired. Please log in again.")
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise ApiError(401, "UNAUTHORISED", "Please log in.")
    return user
