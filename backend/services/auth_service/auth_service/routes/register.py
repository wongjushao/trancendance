from __future__ import annotations

import os
import uuid
from datetime import date

import jwt
import requests
from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from backend.common.models import Profile


register_bp = Blueprint("register", __name__)


# ── JWT verification ──────────────────────────────────────────────────────────
#
# The frontend sends the Supabase session access_token as a Bearer token.
# Supabase signs its JWTs with a project-level secret available at:
#   Supabase Dashboard → Project Settings → API → JWT Secret
#
# Add to your .env / docker-compose:
#   SUPABASE_JWT_SECRET=your-secret-here
#
# The token payload contains:
#   sub  → the user's UUID (this is what we use as the profile ID)
#   role → "authenticated" for logged-in users
#   exp  → expiry timestamp (PyJWT validates this automatically)

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
    auth = request.headers.get("Authorization", "")
    parts = auth.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip() or None
    return None


# ── Field parsers ─────────────────────────────────────────────────────────────

def _parse_birthday(value: str | None) -> date | None:
    if value in (None, ""):
        return None
    return date.fromisoformat(str(value))


def _validate_language(value: str | None) -> str | None:
    if value in ("EN", "CN", "BM"):
        return value
    return None


# ── Serialiser ────────────────────────────────────────────────────────────────

def serialize_profile(profile: Profile) -> dict:
    return {
        "id":           str(profile.id),
        "username":     profile.username,
        "birthday":     profile.birthday.isoformat() if profile.birthday else None,
        "invite_code":  profile.invite_code,
        "invited_by":   str(profile.invited_by) if profile.invited_by else None,
        "avatar_url":   profile.avatar_url,
        "bio":          profile.bio,
        "timezone":     profile.timezone,
        "language":     profile.language,
        "social_links": profile.social_links,
        "created_at":   profile.created_at.isoformat() if profile.created_at else None,
    }


# ── Route ─────────────────────────────────────────────────────────────────────

@register_bp.post("/register")
def register_profile():
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

    # ── Auth: verify the Supabase JWT from the Authorization header ───────────
    token = _extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing or invalid Authorization header. Expected: Bearer <token>"}), 401

    try:
        user_id = _verify_supabase_jwt(token)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 401

    # ── Parse request body ────────────────────────────────────────────────────
    payload = request.get_json(silent=True) or {}

    try:
        birthday = _parse_birthday(payload.get("birthday"))
    except (TypeError, ValueError):
        return jsonify({"error": "Field 'birthday' must be YYYY-MM-DD"}), 400

    invited_by: uuid.UUID | None = None
    invite_code_input = payload.get("invite_code_input", "").strip()

    if invite_code_input:
        session = db_session()
        try:
            referrer = (
                session.query(Profile)
                .filter(Profile.invite_code == invite_code_input)
                .first()
            )
            if referrer:
                invited_by = referrer.id
            # If no matching code found, silently ignore — don't error the user
        finally:
            session.close()

    # ── Upsert the profile row ────────────────────────────────────────────────
    session = db_session()
    try:
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        if profile is None:
            profile = Profile(id=user_id)
            session.add(profile)

        profile.username     = payload.get("username")       or profile.username
        profile.birthday     = birthday                       or profile.birthday
        profile.invited_by   = invited_by                    or profile.invited_by
        profile.bio          = payload.get("bio")            or profile.bio
        profile.timezone     = payload.get("timezone")       or profile.timezone
        profile.language     = _validate_language(payload.get("language")) or profile.language

        # These are managed elsewhere — never overwrite from this endpoint
        # profile.avatar_url   — set via a dedicated avatar upload endpoint
        # profile.invite_code  — generated server-side, not user-submitted
        # profile.social_links — set via profile settings

        session.commit()
        session.refresh(profile)

        return jsonify({
            "message": "Profile registered successfully",
            "profile": serialize_profile(profile),
        }), 201

    except SQLAlchemyError as exc:
        session.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()
