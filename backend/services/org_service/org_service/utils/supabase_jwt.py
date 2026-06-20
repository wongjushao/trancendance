import logging
import re
from datetime import datetime

import jwt


logger = logging.getLogger(__name__)


def extract_bearer_token(auth_header=None):
    """Extract a bearer token from the Authorization header."""
    if auth_header is None:
        from flask import request

        auth_header = request.headers.get("Authorization")

    if auth_header is None:
        return None

    match = re.match(r"^Bearer\s+(.*)", auth_header)
    return match.group(1) if match else None


def verify_supabase_jwt(token):
    """Decode a Supabase JWT and return (user_id, email)."""
    try:
        unverified = jwt.decode(token, options={"verify_signature": False})
        user_id = unverified.get("sub") or unverified.get("user_id") or unverified.get("uid")
        email = unverified.get("email")

        if not user_id:
            logger.error("No user ID found in token")
            return None, None

        exp = unverified.get("exp")
        if exp and exp < datetime.now().timestamp():
            logger.error("Token has expired")
            return None, None

        return user_id, email
    except Exception as exc:
        logger.error("Error decoding JWT: %s", exc)
        return None, None
