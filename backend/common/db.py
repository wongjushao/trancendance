from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker


def _normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql://", 1)
    return database_url


def create_engine_and_session(database_url: str):
    normalized_database_url = _normalize_database_url(database_url)
    engine = create_engine(normalized_database_url, pool_pre_ping=True)
    session_factory = scoped_session(
        sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    )
    return engine, session_factory
