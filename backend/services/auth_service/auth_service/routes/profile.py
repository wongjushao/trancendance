from __future__ import annotations

import os
import uuid

import jwt
from flask import Blueprint, jsonify, request, current_app
from sqlalchemy.exc import SQLAlchemyError

from backend.common.models import Profile

profile_bp = Blueprint("profile", __name__)


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


def serialize_profile(profile: Profile) -> dict:
    """Serialize profile for API response."""
    return {
        "id": str(profile.id),
        "username": profile.username,
        "birthday": profile.birthday.isoformat() if profile.birthday else None,
        "invite_code": profile.invite_code,
        "invited_by": str(profile.invited_by) if profile.invited_by else None,
        "avatar_url": profile.avatar_url,
        "bio": profile.bio,
        "timezone": profile.timezone,
        "language": profile.language,
        "social_links": profile.social_links,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
    }


def _is_profile_complete(profile: Profile) -> bool:
    """Check if profile has all required fields."""
    if not profile:
        return False
    
    required_fields = [
        profile.username,
        profile.bio,
        profile.timezone,
        profile.language,
        profile.birthday,
    ]
    
    return all(field is not None and field != "" for field in required_fields)


@profile_bp.get("/profile")
def get_profile():
    """Get current user's profile."""
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return jsonify({"error": "Database is not configured"}), 503

    token = _extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing authorization header"}), 401

    try:
        user_id = _verify_supabase_jwt(token)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 401

    session = db_session()
    try:
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        if not profile:
            return jsonify({"error": "Profile not found"}), 404
        
        return jsonify(serialize_profile(profile)), 200
    except SQLAlchemyError as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()


@profile_bp.put("/profile")
def update_profile():
    """Update current user's profile."""
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return jsonify({"error": "Database is not configured"}), 503

    token = _extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing authorization header"}), 401

    try:
        user_id = _verify_supabase_jwt(token)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 401

    data = request.get_json(silent=True) or {}
    
    # Fields that can be updated
    # REMOVED "avatar_url" from allowed fields - avatar should only be updated via /upload-avatar endpoint
    allowed_fields = [
        "username", "bio", "timezone", 
        "language", "social_links"
    ]
    
    session = db_session()
    try:
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        if not profile:
            return jsonify({"error": "Profile not found"}), 404
        
        # Update allowed fields
        for field in allowed_fields:
            if field in data and data[field] is not None:
                setattr(profile, field, data[field])
        
        session.commit()
        session.refresh(profile)
        
        return jsonify(serialize_profile(profile)), 200
    except SQLAlchemyError as exc:
        session.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()