# backend/services/auth_service/auth_service/utils/supabase_jwt.py
import jwt
from jwt.exceptions import InvalidTokenError
import os
import logging
import re

# Set up logger
logger = logging.getLogger(__name__)

def extract_bearer_token(auth_header=None):
    """Extract Bearer token from Authorization header."""
    if auth_header is None:
        from flask import request
        auth_header = request.headers.get("Authorization")
        
    if auth_header is None:
        return None
    match = re.match(r"^Bearer\s+(.*)", auth_header)
    return match.group(1) if match else None

def verify_supabase_jwt(token):
    """
    Verify a Supabase JWT and return (user_id, email).
    
    Simplified approach: decode without signature verification for development.
    In production, you should verify the signature using the JWKS endpoint.
    """
    try:
        # First, decode without verification to get the algorithm and claims
        unverified = jwt.decode(token, options={"verify_signature": False})
        
        user_id = unverified.get("sub")
        email = unverified.get("email")
        
        # Also try other possible fields
        if not user_id:
            user_id = unverified.get("user_id") or unverified.get("uid")
        
        if not user_id:
            logger.error("No user ID found in token")
            return None, None
        
        # Log the expiration to help debug
        exp = unverified.get("exp")
        if exp:
            from datetime import datetime
            exp_date = datetime.fromtimestamp(exp)
            logger.info(f"Token expires at: {exp_date}")
            
            # Check if expired
            if exp < datetime.now().timestamp():
                logger.error("Token has expired")
                return None, None
        
        logger.info(f"Successfully decoded token - user_id: {user_id}, email: {email}")
        return user_id, email
        
    except jwt.ExpiredSignatureError:
        logger.error("Token has expired")
        return None, None
    except Exception as e:
        logger.error(f"Error decoding JWT: {str(e)}")
        return None, None