from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import get_settings

url = get_settings().database_url
if url.startswith("sqlite"):
    engine = create_engine(url, connect_args={"check_same_thread": False})
else:
    # PostgreSQL on RDS. pre_ping replaces connections the database closed while idle.
    engine = create_engine(url, pool_pre_ping=True, pool_size=5, max_overflow=5)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def upgrade_schema() -> None:
    """Add columns introduced after the first release. create_all() only creates missing
    tables, so an existing users table needs these added by hand."""
    columns = {c["name"] for c in inspect(engine).get_columns("users")}
    added = {"cognito_sub": "VARCHAR(64)", "chef_notes": "JSON"}
    with engine.begin() as connection:
        for name, kind in added.items():
            if name not in columns:
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {name} {kind}"))
        if "cognito_sub" not in columns:
            connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_cognito_sub ON users (cognito_sub)"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
