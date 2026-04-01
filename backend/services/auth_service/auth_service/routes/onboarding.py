# backend/services/auth_service/auth_service/routes/onboarding.py
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

onboarding_bp = Blueprint("onboarding", __name__)


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

    token = extract_bearer_token()
    if token is None:
        return jsonify({"error": "Missing or invalid Authorization header"}), 401

    user_id, email = verify_supabase_jwt(token)
    if not user_id:
        return jsonify({"error": "Invalid token"}), 401

    session = db_session()
    try:
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        
        # If no profile exists, user definitely needs onboarding
        if profile is None:
            logger.info(f"No profile found for user {user_id}")
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
        
        logger.info(f"Profile for user {user_id} - complete: {is_complete}")
        
        return jsonify({
            "onboarded": is_complete,
            "user_id": str(user_id),
            "missing_fields": missing_fields if not is_complete else None,
        }), 200
    except SQLAlchemyError as exc:
        logger.error(f"Database error in onboarding-status: {exc}")
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()