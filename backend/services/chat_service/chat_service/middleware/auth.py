from __future__ import annotations

import uuid
from typing import Any

from backend.services.auth_service.auth_service.utils.supabase_jwt import (
    extract_bearer_token,
    verify_supabase_jwt,
)


def _extract_token_from_auth_payload(auth_payload: Any) -> str | None:
    if isinstance(auth_payload, str):
        return extract_bearer_token(auth_payload) or auth_payload

    if not isinstance(auth_payload, dict):
        return None

    token = auth_payload.get("token") or auth_payload.get("access_token")
    if token:
        return token

    authorization = auth_payload.get("Authorization") or auth_payload.get("authorization")
    return extract_bearer_token(authorization)


def authenticate_socket(auth_payload: Any) -> tuple[uuid.UUID | None, str | None]:
    token = _extract_token_from_auth_payload(auth_payload)
    if not token:
        return None, "Missing authentication token"

    user_id, _email = verify_supabase_jwt(token)
    if not user_id:
        return None, "Invalid or expired token"

    try:
        return uuid.UUID(str(user_id)), None
    except (TypeError, ValueError):
        return None, "Token does not contain a valid user identifier"
