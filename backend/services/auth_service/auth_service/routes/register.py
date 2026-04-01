from __future__ import annotations

import os
import uuid
from datetime import date
from typing import List, Optional

import jwt
import requests
from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from backend.common.models import Profile, Organization, OrganizationMember, OrganizationDomain
from backend.services.auth_service.auth_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt

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
#   email → the user's email address (if available)
#   exp  → expiry timestamp (PyJWT validates this automatically)

# Reusing JWT helpers from utils/supabase_jwt.py


def _extract_bearer_token() -> str | None:
    return extract_bearer_token()


# ── Field parsers (from teammate's work) ──────────────────────────────────────

def _parse_birthday(value: str | None) -> date | None:
    """Parse birthday from ISO format string."""
    if value in (None, ""):
        return None
    return date.fromisoformat(str(value))


def _validate_language(value: str | None) -> str | None:
    """Validate language code (EN, CN, BM)."""
    if value in ("EN", "CN", "BM"):
        return value
    return None


def _parse_interests(value: list | None) -> list | None:
    """Parse interests list, ensure it's a proper JSON array."""
    if value is None:
        return None
    if isinstance(value, list):
        return [str(item) for item in value if item]
    return None


# ── Serialiser ────────────────────────────────────────────────────────────────

def serialize_profile(profile: Profile) -> dict:
    return {
        "id":           str(profile.id),
        "username":     profile.username,
        "first_name":   profile.first_name,
        "last_name":    profile.last_name,
        "phone_number": profile.phone_number,
        "job_title":    profile.job_title,
        "birthday":     profile.birthday.isoformat() if profile.birthday else None,
        "avatar_url":   profile.avatar_url,
        "bio":          profile.bio,
        "timezone":     profile.timezone,
        "language":     profile.language,
        "interests":    profile.interests,
        "social_links": profile.social_links,
        "invite_code":  profile.invite_code,
        "invited_by":   str(profile.invited_by) if profile.invited_by else None,
        "onboarded":    profile.onboarded,
        "created_at":   profile.created_at.isoformat() if profile.created_at else None,
    }


# ── Route ─────────────────────────────────────────────────────────────────────

@register_bp.post("/register")
def register_profile():
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

    # ── Auth: verify the Supabase JWT from the Authorization header ───────────
    token = extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing or invalid Authorization header. Expected: Bearer <token>"}), 401

    try:
        user_id, email = verify_supabase_jwt(token)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 401

    if not user_id:
        return jsonify({"error": "Invalid token"}), 401

    # ── Parse request body ────────────────────────────────────────────────────
    payload = request.get_json(silent=True) or {}

    # Parse birthday (from teammate's work)
    try:
        birthday = _parse_birthday(payload.get("birthday"))
    except (TypeError, ValueError):
        return jsonify({"error": "Field 'birthday' must be YYYY-MM-DD"}), 400

    # Parse interests (from current repo)
    interests = _parse_interests(payload.get("interests"))

    # Parse invite code (improved from teammate's work)
    invited_by: uuid.UUID | None = None
    invite_code_input = payload.get("invite_code") or payload.get("invite_code_input", "").strip()

    if invite_code_input:
        session_check = db_session()
        try:
            referrer = (
                session_check.query(Profile)
                .filter(Profile.invite_code == invite_code_input)
                .first()
            )
            if referrer:
                invited_by = referrer.id
            # If no matching code found, silently ignore — don't error the user
        finally:
            session_check.close()

    # ── Upsert the profile row ────────────────────────────────────────────────
    session = db_session()
    try:
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        if profile is None:
            profile = Profile(id=user_id)
            session.add(profile)

        # Update all fields (combining both versions)
        profile.username     = payload.get("username")       or profile.username
        profile.first_name   = payload.get("first_name")     or profile.first_name
        profile.last_name    = payload.get("last_name")      or profile.last_name
        profile.phone_number = payload.get("phone_number")   or profile.phone_number
        profile.birthday     = birthday                      or profile.birthday
        profile.invited_by   = invited_by                    or profile.invited_by
        profile.bio          = payload.get("bio")            or profile.bio
        profile.job_title    = payload.get("job_title") or payload.get("role") or profile.job_title
        profile.interests    = interests                     or profile.interests
        profile.timezone     = payload.get("timezone")       or profile.timezone
        profile.language     = _validate_language(payload.get("language")) or profile.language
        
        # Mark as onboarded since this is the completion of the onboarding flow
        profile.onboarded = True

        # ── Auto-join organization based on email domain (from teammate's work) ──
        if email:
            domain = email.split("@")[-1].lower()
            # Find all organizations associated with this domain
            org_domains = (
                session.query(OrganizationDomain)
                .filter(OrganizationDomain.domain == domain)
                .all()
            )

            for org_domain in org_domains:
                # Check if already a member
                member = (
                    session.query(OrganizationMember)
                    .filter(
                        OrganizationMember.organization_id == org_domain.organization_id,
                        OrganizationMember.user_id == user_id
                    )
                    .first()
                )
                if not member:
                    member = OrganizationMember(
                        organization_id=org_domain.organization_id,
                        user_id=user_id,
                        member_role="member"
                    )
                    session.add(member)

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


@register_bp.get("/check_org")
def check_org():
    """Check which organizations match the email domain from the supplied Supabase JWT.

    Returns a JSON list of organizations with fields: id, name, slug, description, and domain.
    """
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

    token = extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing or invalid Authorization header. Expected: Bearer <token>"}), 401

    try:
        user_id, email = verify_supabase_jwt(token)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 401

    if not email:
        return jsonify({"organizations": []}), 200

    domain = email.split("@")[-1].lower()

    session = db_session()
    try:
        org_domains = (
            session.query(OrganizationDomain)
            .filter(OrganizationDomain.domain == domain)
            .all()
        )

        orgs = []
        for od in org_domains:
            org = session.query(Organization).filter(Organization.id == od.organization_id).first()
            if org:
                orgs.append({
                    "id": org.id,
                    "name": org.name,
                    "slug": org.slug,
                    "description": org.description,
                    "domain": od.domain,
                })

        return jsonify({"organizations": orgs}), 200
    except SQLAlchemyError as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()