from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..errors import ApiError
from ..models import User
from ..schemas import AuthOut, LoginIn, SignupIn
from ..security import check_password, cognito_enabled, create_token, hash_password

router = APIRouter(prefix="/auth", tags=["accounts"])


def auth_response(user: User) -> dict:
    return {"token": create_token(user.id), "user": {"id": user.id, "name": user.name, "email": user.email}}


def local_accounts_only() -> None:
    """With Cognito switched on, accounts are created and checked by Cognito only."""
    if cognito_enabled():
        raise ApiError(410, "USE_COGNITO", "Please sign up and log in through the Frigi app.")


@router.post("/signup", response_model=AuthOut, status_code=201, dependencies=[Depends(local_accounts_only)])
def signup(body: SignupIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise ApiError(409, "EMAIL_TAKEN", "An account with this email already exists.")
    user = User(
        name=body.name, email=email, password_hash=hash_password(body.password), age=body.age,
        allergies=list(body.allergies), diet=body.diet, household_size=body.household_size,
    )
    db.add(user)
    db.commit()
    return auth_response(user)


@router.post("/login", response_model=AuthOut, dependencies=[Depends(local_accounts_only)])
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if user is None or not check_password(body.password, user.password_hash):
        raise ApiError(401, "INVALID_LOGIN", "Email or password is incorrect.")
    return auth_response(user)
