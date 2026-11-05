import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..errors import ApiError
from ..models import User
from ..schemas import Note, NoteIn, ProfileOut, ProfileUpdate
from ..security import current_user

router = APIRouter(prefix="/profile", tags=["accounts"])
MAX_NOTES = 30


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


@router.delete("", status_code=204)
def delete_profile(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Delete the profile and everything stored with it. The app deletes the Cognito account too."""
    db.delete(user)
    db.commit()
    return Response(status_code=204)


@router.post("/notes", response_model=Note, status_code=201)
def add_note(body: NoteIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Save something to change next time, e.g. "less spicy" or "no mushrooms"."""
    notes = list(user.chef_notes or [])
    if len(notes) >= MAX_NOTES:
        raise ApiError(400, "TOO_MANY_NOTES", f"You can keep up to {MAX_NOTES} notes. Delete one in your profile first.")
    note = {"id": secrets.token_hex(4), "text": body.text.strip(), "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    user.chef_notes = notes + [note]
    db.commit()
    return note


@router.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    notes = list(user.chef_notes or [])
    kept = [n for n in notes if n["id"] != note_id]
    if len(kept) == len(notes):
        raise ApiError(404, "NOT_FOUND", "That note no longer exists.")
    user.chef_notes = kept
    db.commit()
    return Response(status_code=204)
