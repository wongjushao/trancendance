# backend/services/chat_service/chat_service/middleware/auth.py
from __future__ import annotations

import uuid
import logging
from typing import Any, Tuple, Optional

from backend.services.chat_service.chat_service.utils.supabase_jwt import (
    extract_bearer_token,
    verify_supabase_jwt,
)

logger = logging.getLogger(__name__)


def _extract_token_from_auth_payload(auth_payload: Any) -> Optional[str]:
    """Extract JWT token from various auth payload formats."""
    if auth_payload is None:
        logger.warning("[Auth] Auth payload is None")
        return None

    # If it's a string, try to extract as Bearer token or use directly
    if isinstance(auth_payload, str):
        # First try to extract from "Bearer ..." format
        extracted = extract_bearer_token(auth_payload)
        if extracted:
            logger.info("[Auth] Extracted token from Bearer string")
            return extracted
        # Otherwise assume the string is the token itself
        logger.info("[Auth] Using string as token directly")
        return auth_payload

    # If it's a dictionary, look for token field
    if isinstance(auth_payload, dict):
        # Socket.IO client sends auth as { token: "..." }
        token = auth_payload.get("token") or auth_payload.get("access_token")
        if token:
            logger.info(f"[Auth] Extracted token from auth dict, length: {len(token)}")
            return token

        # Check Authorization header inside dict
        authorization = auth_payload.get("Authorization") or auth_payload.get("authorization")
        if authorization:
            extracted = extract_bearer_token(authorization)
            if extracted:
                logger.info("[Auth] Extracted token from Authorization header in dict")
                return extracted

        logger.warning(f"[Auth] Auth dict keys (no token field): {list(auth_payload.keys())}")

    logger.warning(f"[Auth] Unexpected auth payload type: {type(auth_payload)}")
    return None


def authenticate_socket(auth_payload: Any) -> Tuple[Optional[uuid.UUID], Optional[str]]:
    """
    Authenticate a socket connection using JWT token.

    Returns:
        Tuple of (user_id, error_message). If authentication succeeds,
        error_message is None. If it fails, user_id is None and error_message
        describes the failure.
    """
    logger.info(f"[Auth] Authenticating socket - payload type: {type(auth_payload)}")

    token = _extract_token_from_auth_payload(auth_payload)
    if not token:
        logger.error("[Auth] No token found in auth payload")
        return None, "Missing authentication token"

    logger.info(f"[Auth] Token extracted (length: {len(token)}), attempting verification")

    try:
        user_id, email = verify_supabase_jwt(token)
        logger.info(f"[Auth] Verification result - user_id: {user_id}, email: {email}")

        if not user_id:
            logger.error("[Auth] No user_id in verified token")
            return None, "Invalid or expired token"

        try:
            user_uuid = uuid.UUID(str(user_id))
            logger.info(f"[Auth] Authentication successful for user: {user_uuid}")
            return user_uuid, None
        except (TypeError, ValueError) as e:
            logger.error(f"[Auth] Invalid user_id format: {user_id} - {e}")
            return None, "Token does not contain a valid user identifier"

    except Exception as e:
        logger.error(f"[Auth] Token verification exception: {e}", exc_info=True)
        return None, f"Token verification failed: {str(e)}"