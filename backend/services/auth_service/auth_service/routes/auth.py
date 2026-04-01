# backend/services/auth_service/auth_service/routes/auth.py
from __future__ import annotations

import os
import uuid

import jwt
from flask import Blueprint, jsonify, request, current_app
from supabase import create_client

auth_bp = Blueprint("auth", __name__)


def _verify_supabase_jwt(token: str) -> uuid.UUID:
    """Verify Supabase JWT and return user UUID."""
    try:
        # First try to decode without verification to get the algorithm
        unverified = jwt.decode(token, options={"verify_signature": False})
        alg = unverified.get("alg", "HS256")
        
        # Get the JWT secret
        secret = os.environ.get("SUPABASE_JWT_SECRET")
        if not secret:
            raise ValueError("SUPABASE_JWT_SECRET env var is not set")
        
        # Decode with signature verification
        payload = jwt.decode(
            token,
            secret,
            algorithms=[alg],
            options={"verify_aud": False, "verify_exp": True},
        )
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired — please log in again")
    except jwt.InvalidTokenError as exc:
        raise ValueError(f"Invalid token: {exc}")

    sub = payload.get("sub")
    if not sub:
        raise ValueError("Token is missing 'sub' claim")

    try:
        return uuid.UUID(str(sub))
    except (TypeError, ValueError):
        raise ValueError(f"Token 'sub' is not a valid UUID: {sub!r}")


def _extract_bearer_token() -> str | None:
    """Extract bearer token from Authorization header."""
    auth = request.headers.get("Authorization", "")
    parts = auth.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip() or None
    return None


@auth_bp.put("/update-password")
def update_password():
    """Update user's password."""
    token = _extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing authorization header"}), 401
    
    try:
        user_id = _verify_supabase_jwt(token)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 401
    
    data = request.get_json(silent=True) or {}
    new_password = data.get("password")
    
    if not new_password:
        return jsonify({"error": "Password is required"}), 400
    
    try:
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_service_key:
            return jsonify({"error": "Backend Supabase configuration missing"}), 500
        
        # Use service role client to update password
        supabase_admin = create_client(supabase_url, supabase_service_key)
        
        # Update user password
        response = supabase_admin.auth.admin.update_user_by_id(
            str(user_id),
            {"password": new_password}
        )
        
        return jsonify({
            "message": "Password updated successfully"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500