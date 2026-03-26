from __future__ import annotations

import os
import uuid

import jwt
from flask import Blueprint, jsonify, request, current_app
from sqlalchemy.exc import SQLAlchemyError

from backend.common.models import Profile

onboarding_bp = Blueprint("onboarding", __name__)


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


def _is_profile_complete(profile: Profile | None) -> bool:
    """
    Check if a profile has all required fields filled.
    No separate 'onboarded' column needed - derive from field completeness.
    """
    if not profile:
        return False
    
    # These are the fields collected during onboarding
    required_fields = [
        profile.username,
        profile.bio,
        profile.timezone,
        profile.language,
        profile.birthday,
    ]

    print(f"[DEBUG] Checking fields:")
    print(f"  username: {profile.username}")
    print(f"  bio: {profile.bio}")
    print(f"  timezone: {profile.timezone}")
    print(f"  language: {profile.language}")
    print(f"  birthday: {profile.birthday}")
    
    return all(field is not None and field != "" for field in required_fields)


@onboarding_bp.get("/onboarding-status")
def get_onboarding_status():
    """Check if the current user has completed onboarding."""
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return jsonify({"error": "Database is not configured"}), 503

    # Extract and verify token
    token = _extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing or invalid Authorization header"}), 401

    try:
        user_id = _verify_supabase_jwt(token)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 401

    # Query profile
    session = db_session()
    try:
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        is_complete = _is_profile_complete(profile)

        # Add debug logging DEBUDGEBUG
        print(f"[DEBUG] Onboarding check for user {user_id}")
        if profile:
            print(f"[DEBUG] Username: {profile.username}")
            print(f"[DEBUG] Bio: {profile.bio}")
            print(f"[DEBUG] Timezone: {profile.timezone}")
            print(f"[DEBUG] Language: {profile.language}")
            print(f"[DEBUG] Birthday: {profile.birthday}")
        else:
            print(f"[DEBUG] No profile found for user {user_id}")
        print(f"[DEBUG] Onboarding complete: {is_complete}")
        
        return jsonify({
            "onboarded": is_complete,
            "user_id": str(user_id),
        }), 200
    except SQLAlchemyError as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()