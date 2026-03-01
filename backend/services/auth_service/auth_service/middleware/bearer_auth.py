from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from flask import Flask, g, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from backend.common.models import ApiKey


def _extract_bearer_token() -> str | None:
    authorization = request.headers.get("Authorization", "")
    if not authorization:
        return None

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    token = parts[1].strip()
    if not token:
        return None

    return token


def _is_expired(expires_at) -> bool:
    if expires_at is None:
        return False

    now_utc = datetime.now(timezone.utc)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at <= now_utc


def register_bearer_auth_middleware(app: Flask, protected_endpoints: set[str] | None = None) -> None:
    endpoints = protected_endpoints or set()

    @app.before_request
    def authorize_bearer_key():
        if endpoints and request.endpoint not in endpoints:
            return None

        db_session = app.config.get("DB_SESSION")
        if db_session is None:
            return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

        token = _extract_bearer_token()
        if token is None:
            return jsonify({"error": "Missing or invalid Authorization header. Expected: Bearer <token>"}), 401

        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

        session = db_session()
        try:
            api_key = (
                session.query(ApiKey)
                .filter(
                    ApiKey.key_hash.in_([token, token_hash]),
                )
                .order_by(ApiKey.id.desc())
                .first()
            )

            if api_key is None or _is_expired(api_key.expires_at):
                return jsonify({"error": "Unauthorized bearer key"}), 401

            api_key.last_used_at = datetime.now(timezone.utc)
            session.commit()

            g.auth_user_id = api_key.user_id
            g.auth_api_key_id = api_key.id
            return None
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()