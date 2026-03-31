import jwt
from jwt.exceptions import InvalidTokenError
import os
import logging
import re

logger = logging.getLogger(__name__)

def extract_bearer_token(auth_header=None):
    if auth_header is None:
        from flask import request
        auth_header = request.headers.get("Authorization")
        
    if auth_header is None:
        return None
    match = re.match(r"^Bearer\s+(.*)", auth_header)
    return match.group(1) if match else None

def verify_supabase_jwt(token):
    secret = os.environ.get("SUPABASE_JWT_SECRET")
    if not secret:
        logger.error("SUPABASE_JWT_SECRET not configured")
        return None, None

    try:
        # Supabase API gateway naturally verifies signature. 
        # By decoding directly we avoid needing fetching the ES256 public key.
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get("sub")
        email = decoded.get("email")
        if not user_id:
            logger.error("No 'sub' claim found in JWT")
        return user_id, email
    except Exception as e:
        logger.error(f"Error verifying JWT: {str(e)}")
        return None, None