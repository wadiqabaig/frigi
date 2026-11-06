from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    # Empty for Cognito accounts: Cognito keeps the password.
    password_hash: Mapped[str] = mapped_column(String(100), default="")
    cognito_sub: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True, index=True)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    allergies: Mapped[list[str]] = mapped_column(JSON, default=list)
    diet: Mapped[str] = mapped_column(String(20), default="none")
    household_size: Mapped[int] = mapped_column(Integer, default=1)
    # Notes the user left after cooking, e.g. "less spicy"; sent to the chef next time.
    chef_notes: Mapped[list[dict]] = mapped_column(JSON, default=list)
    # The confirmed fridge list, kept on the server so every device sees the same items.
    inventory: Mapped[list[dict]] = mapped_column(JSON, default=list)
    # Saved recipe snapshots, shared by all of the user's devices.
    saved_recipes: Mapped[list[dict]] = mapped_column(JSON, default=list)
    # Notes tied to one recipe, e.g. "cook 5 minutes longer"; shown when it is opened again.
    recipe_notes: Mapped[list[dict]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
