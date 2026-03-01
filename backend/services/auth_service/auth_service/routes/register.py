from __future__ import annotations

import uuid
from datetime import date

from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from backend.common.models import Profile


register_bp = Blueprint("register", __name__)


def _parse_birthday(value: str | None):
    if value in (None, ""):
        return None
    return date.fromisoformat(str(value))


def _parse_uuid(value: str | None):
    if value in (None, ""):
        return None
    return uuid.UUID(str(value))


def serialize_profile(profile: Profile) -> dict:
    return {
        "id": str(profile.id),
        "username": profile.username,
        "phone_number": profile.phone_number,
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


@register_bp.post("/register")
def register_profile():
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

    payload = request.get_json(silent=True) or {}

    try:
        birthday = _parse_birthday(payload.get("birthday"))
    except (TypeError, ValueError):
        return jsonify({"error": "Field 'birthday' must be YYYY-MM-DD"}), 400

    try:
        invited_by = _parse_uuid(payload.get("invited_by"))
    except (TypeError, ValueError):
        return jsonify({"error": "Field 'invited_by' must be a valid UUID"}), 400

    user_id = g.get("auth_user_id")
    if user_id is None:
        return jsonify({"error": "Unauthorized bearer key"}), 401

    session = db_session()
    try:
        profile = session.query(Profile).filter(Profile.id == user_id).first()
        if profile is None:
            profile = Profile(id=user_id)
            session.add(profile)

        profile.username = payload.get("username")
        profile.phone_number = payload.get("phone_number")
        profile.birthday = birthday
        profile.invite_code = payload.get("invite_code")
        profile.invited_by = invited_by
        profile.avatar_url = payload.get("avatar_url")
        profile.bio = payload.get("bio")
        profile.timezone = payload.get("timezone")
        profile.language = payload.get("language")
        profile.social_links = payload.get("social_links")

        session.commit()
        session.refresh(profile)

        return jsonify({"message": "Profile registered successfully", "profile": serialize_profile(profile)}), 201
    except SQLAlchemyError as exc:
        session.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()