from __future__ import annotations

import os
import uuid

import jwt
from flask import Blueprint, jsonify, request, current_app
from supabase import create_client

metadata_bp = Blueprint("metadata", __name__)


def _verify_supabase_jwt(token: str) -> uuid.UUID:
    """Verify Supabase JWT and return user UUID."""
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")
        
        algorithms = []
        key = None

        if alg == "HS256":
            secret = os.environ.get("SUPABASE_JWT_SECRET")
            if not secret:
                raise ValueError("SUPABASE_JWT_SECRET env var is not set")
            key = secret
            algorithms = ["HS256"]
        elif alg in ("RS256", "ES256"):
            supabase_url = os.environ.get("SUPABASE_URL")
            if not supabase_url:
                raise ValueError("SUPABASE_URL env var is not set")
            
            jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
            jwks_client = jwt.PyJWKClient(jwks_url)
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            key = signing_key.key
            algorithms = [alg]
        else:
            raise ValueError(f"Unsupported algorithm: {alg}")
        
        payload = jwt.decode(
            token,
            key,
            algorithms=algorithms,
            audience="authenticated",
            options={"verify_exp": True},
        )
    except jwt.PyJWKClientError as exc:
        raise ValueError(f"Could not fetch JWKS: {exc}")
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired — please log in again")
    except jwt.InvalidAudienceError:
        raise ValueError("Token audience is invalid — expected 'authenticated'")
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


@metadata_bp.put("/user-metadata")
def update_user_metadata():
    """Update user metadata in Supabase Auth."""
    token = _extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing authorization header"}), 401
    
    try:
        user_id = _verify_supabase_jwt(token)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 401
    
    data = request.get_json(silent=True) or {}
    
    # Only allow updating specific metadata fields
    allowed_fields = ["full_name", "role", "interests", "location", "website", "bio"]
    filtered_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    try:
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_service_key:
            return jsonify({"error": "Backend Supabase configuration missing"}), 500
        
        # Use service role client (bypasses RLS, should only be used in backend)
        supabase_admin = create_client(supabase_url, supabase_service_key)
        
        # Update user metadata
        response = supabase_admin.auth.admin.update_user_by_id(
            str(user_id),
            {"user_metadata": filtered_data}
        )
        
        return jsonify({
            "message": "User metadata updated",
            "user_metadata": response.user.user_metadata
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500