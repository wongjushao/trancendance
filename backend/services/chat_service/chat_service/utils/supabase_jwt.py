# backend/services/chat_service/chat_service/utils/supabase_jwt.py
import logging
import os
import re
from datetime import datetime
from typing import Optional, Tuple

import jwt

logger = logging.getLogger(__name__)

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_JWT_ALGORITHM = "HS256"


def extract_bearer_token(auth_header: Optional[str] = None) -> Optional[str]:
    """Extract Bearer token from an Authorization header value."""
    if auth_header is None:
        from flask import request
        auth_header = request.headers.get("Authorization")

    if not auth_header:
        return None

    if auth_header.startswith("Bearer "):
        return auth_header[7:]

    match = re.match(r"^Bearer\s+(.*)", auth_header)
    return match.group(1) if match else None


def verify_supabase_jwt(token: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Verify a Supabase JWT and return (user_id, email).
    For development, we decode without signature verification.
    """
    if not token:
        logger.error("No token provided for verification")
        return None, None

    try:
        # For development, decode without verification
        # In production, verify signature using SUPABASE_JWT_SECRET
        payload = jwt.decode(token, options={"verify_signature": False})

        user_id = payload.get("sub") or payload.get("user_id") or payload.get("uid")
        email = payload.get("email")

        if not user_id:
            logger.error(f"No user ID in token payload (keys={list(payload.keys())})")
            return None, None

        # Check expiration
        exp = payload.get("exp")
        if exp and exp < datetime.utcnow().timestamp():
            logger.error(f"Token expired at {datetime.utcfromtimestamp(exp)}")
            return None, None

        logger.info(f"Token verified - user_id: {user_id}, email: {email}")
        return str(user_id), email

    except jwt.ExpiredSignatureError:
        logger.error("Token has expired")
        return None, None
    except jwt.InvalidTokenError as exc:
        logger.error(f"Invalid token: {exc}")
        return None, None
    except Exception as exc:
        logger.error(f"Error decoding JWT: {exc}")
        return None, None