from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import ProfileOut, ProfileUpdate
from ..security import current_user

router = APIRouter(prefix="/profile", tags=["accounts"])


@router.get("", response_model=ProfileOut)
def get_profile(user: User = Depends(current_user)):
    return user


@router.put("", response_model=ProfileOut)
def update_profile(body: ProfileUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    for field, value in body.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(user, field, list(value) if field == "allergies" else value)
    db.commit()
    return user
