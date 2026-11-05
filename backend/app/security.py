from datetime import datetime, timedelta, timezone
from functools import lru_cache

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
    return bool(password_hash) and bcrypt.checkpw(password.encode(), password_hash.encode())


def create_token(user_id: int) -> str:
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(days=settings.token_days)
    return jwt.encode({"sub": str(user_id), "exp": expires}, settings.secret_key, algorithm="HS256")


def cognito_enabled() -> bool:
    settings = get_settings()
    return bool(settings.cognito_user_pool_id and settings.cognito_client_id)


@lru_cache
def _cognito_keys() -> jwt.PyJWKClient:
    s = get_settings()
    return jwt.PyJWKClient(f"https://cognito-idp.{s.cognito_region}.amazonaws.com/{s.cognito_user_pool_id}/.well-known/jwks.json")


def verify_cognito_token(token: str) -> dict:
    """Check a Cognito ID token's signature, audience, issuer and type, and return its claims."""
    s = get_settings()
    issuer = f"https://cognito-idp.{s.cognito_region}.amazonaws.com/{s.cognito_user_pool_id}"
    key = _cognito_keys().get_signing_key_from_jwt(token).key
    claims = jwt.decode(token, key, algorithms=["RS256"], audience=s.cognito_client_id, issuer=issuer)
    if claims.get("token_use") != "id":
        raise jwt.InvalidTokenError("Not an ID token.")
    if claims.get("email_verified") not in (True, "true"):
        raise jwt.InvalidTokenError("Email not verified.")
    return claims


def user_for_cognito(claims: dict, db: Session) -> User:
    """Find the profile for a Cognito account, creating it on the first visit.

    An existing profile with the same (verified) email is linked, so people who signed up
    before Cognito keep their allergies and diet.
    """
    sub, email = claims["sub"], claims["email"].lower()
    user = db.query(User).filter(User.cognito_sub == sub).first()
    if user is None:
        user = db.query(User).filter(User.email == email, User.cognito_sub.is_(None)).first()
        if user is None:
            user = User(name=(claims.get("name") or email.split("@")[0])[:100], email=email, password_hash="",
                        allergies=[], diet="none", household_size=1, chef_notes=[])
            db.add(user)
        user.cognito_sub = sub
        db.commit()
        db.refresh(user)
    return user


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    """Dependency for endpoints that need a logged-in user."""
    if credentials is None:
        raise ApiError(401, "UNAUTHORISED", "Please log in.")
    expired = ApiError(401, "UNAUTHORISED", "Your session has expired. Please log in again.")
    if cognito_enabled():
        try:
            return user_for_cognito(verify_cognito_token(credentials.credentials), db)
        except (jwt.PyJWTError, KeyError):
            raise expired
    try:
        payload = jwt.decode(credentials.credentials, get_settings().secret_key, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise expired
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise ApiError(401, "UNAUTHORISED", "Please log in.")
    return user
