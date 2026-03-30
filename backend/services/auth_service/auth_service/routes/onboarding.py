from __future__ import annotations

import os
import uuid

import jwt
from flask import Blueprint, jsonify, request, current_app
from sqlalchemy.exc import SQLAlchemyError

from backend.common.models import Profile

onboarding_bp = Blueprint("onboarding", __name__)


def _verify_supabase_jwt(token: str) -> uuid.UUID:
    """
    Verifies the Supabase JWT and returns the user UUID from the `sub` claim.
    Raises ValueError with a descriptive message on any failure.
    """
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


# Required fields for onboarding completion
REQUIRED_FIELDS = [
    "username",
    "first_name",
    "last_name",
    "bio",
    "language",
    "birthday",
    "job_title",
]


def _is_profile_complete(profile: Profile | None) -> bool:
    """
    Check if a profile has all required fields filled.
    Required: username, first_name, last_name, bio, language, birthday, job_title
    """
    if not profile:
        return False
    
    # Check if all required fields are present and not empty
    for field in REQUIRED_FIELDS:
        value = getattr(profile, field, None)
        if value is None or value == "":
            return False
    
    return True


@onboarding_bp.get("/onboarding-status")
def get_onboarding_status():
    """Check if the current user has completed onboarding by verifying required fields."""
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return jsonify({"error": "Database is not configured"}), 503

    token = _extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing or invalid Authorization header"}), 401

    try:
        user_id = _verify_supabase_jwt(token)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 401

    session = db_session()
    try:
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        
        # If no profile exists, user definitely needs onboarding
        if profile is None:
            print(f"[DEBUG] No profile found for user {user_id}")
            return jsonify({
                "onboarded": False,
                "user_id": str(user_id),
                "missing_fields": REQUIRED_FIELDS,
            }), 200
        
        # Check if all required fields are filled
        is_complete = _is_profile_complete(profile)
        
        # If not complete, return which fields are missing
        missing_fields = []
        if not is_complete:
            for field in REQUIRED_FIELDS:
                value = getattr(profile, field, None)
                if value is None or value == "":
                    missing_fields.append(field)

        print(f"[DEBUG] Onboarding check for user {user_id}")
        print(f"[DEBUG] Profile exists: {profile is not None}")
        print(f"[DEBUG] Profile data:")
        print(f"  username: {profile.username}")
        print(f"  first_name: {profile.first_name}")
        print(f"  last_name: {profile.last_name}")
        print(f"  bio: {profile.bio}")
        print(f"  language: {profile.language}")
        print(f"  birthday: {profile.birthday}")
        print(f"  job_title: {profile.job_title}")
        print(f"[DEBUG] Onboarding complete: {is_complete}")
        if missing_fields:
            print(f"[DEBUG] Missing fields: {missing_fields}")
        
        return jsonify({
            "onboarded": is_complete,
            "user_id": str(user_id),
            "missing_fields": missing_fields if not is_complete else None,
        }), 200
    except SQLAlchemyError as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()