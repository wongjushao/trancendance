# backend/services/auth_service/auth_service/routes/profile.py

from __future__ import annotations

import os
import uuid
import logging

import jwt
from flask import Blueprint, jsonify, request, current_app
from sqlalchemy.exc import SQLAlchemyError

from backend.common.models import Profile
from backend.services.auth_service.auth_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt

# Set up logger
logger = logging.getLogger(__name__)

profile_bp = Blueprint("profile", __name__)


def serialize_profile(profile: Profile) -> dict:
    """Serialize profile for API response."""
    return {
        "id": str(profile.id),
        "username": profile.username,
        "first_name": profile.first_name,
        "last_name": profile.last_name,
        "job_title": profile.job_title,
        "birthday": profile.birthday.isoformat() if profile.birthday else None,
        "invite_code": profile.invite_code,
        "invited_by": str(profile.invited_by) if profile.invited_by else None,
        "avatar_url": profile.avatar_url,
        "bio": profile.bio,
        "timezone": profile.timezone,
        "language": profile.language,
        "social_links": profile.social_links,
        "interests": profile.interests,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
    }


@profile_bp.get("/profile")
def get_profile():
    """Get current user's profile."""
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return jsonify({"error": "Database is not configured"}), 503

    token = extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing authorization header"}), 401

    user_id, email = verify_supabase_jwt(token)
    if not user_id:
        return jsonify({"error": "Invalid token"}), 401

    session = db_session()
    try:
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        if not profile:
            return jsonify({"error": "Profile not found"}), 404
        
        logger.info(f"Profile retrieved for user {user_id}")
        return jsonify(serialize_profile(profile)), 200
    except SQLAlchemyError as exc:
        logger.error(f"Database error in get_profile: {exc}")
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()


@profile_bp.put("/profile")
def update_profile():
    """Update current user's profile."""
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return jsonify({"error": "Database is not configured"}), 503

    token = extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing authorization header"}), 401

    user_id, email = verify_supabase_jwt(token)
    if not user_id:
        return jsonify({"error": "Invalid token"}), 401

    data = request.get_json(silent=True) or {}
    logger.info(f"Profile update payload for user {user_id}: {data}")
    
    # All fields that can be updated
    allowed_fields = [
        "username", "bio", "timezone", 
        "language", "social_links", "first_name", 
        "last_name", "job_title", "birthday"
    ]
    
    session = db_session()
    try:
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        if not profile:
            return jsonify({"error": "Profile not found"}), 404
        
        # Track if any fields were updated
        updated = False
        
        # Update allowed fields
        for field in allowed_fields:
            if field in data and data[field] is not None:
                setattr(profile, field, data[field])
                updated = True
        
        if updated:
            session.commit()
            session.refresh(profile)
            logger.info(f"Profile updated for user {user_id}")
        
        return jsonify(serialize_profile(profile)), 200
    except SQLAlchemyError as exc:
        session.rollback()
        logger.error(f"Database error in update_profile: {exc}")
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()