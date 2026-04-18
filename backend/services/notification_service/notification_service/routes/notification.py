from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from backend.services.notification_service.notification_service.services.preferences import (
    UPDATABLE_FIELDS,
    apply_updates,
    get_or_create_preferences,
    get_preferences,
)
from backend.services.notification_service.notification_service.utils.supabase_jwt import (
    extract_bearer_token,
    verify_supabase_jwt,
)


notification_bp = Blueprint("notification", __name__)


def _parse_bool_query(value: str | None) -> bool | None:
    """Parse boolean query param.

    Returns:
        - True/False if provided and valid
        - None if not provided
    Raises:
        - ValueError if provided but invalid
    """

    if value is None:
        return None

    normalized = value.strip().lower()
    if normalized in {"true", "1", "yes", "on"}:
        return True
    if normalized in {"false", "0", "no", "off"}:
        return False
    raise ValueError("must be a boolean (true/false)")


def _prefs_payload(prefs) -> dict:
    return {
        "email_enabled": bool(prefs.email_enabled),
        "push_enabled": bool(prefs.push_enabled),
        "assignment_reminders": bool(prefs.assignment_reminders),
        "course_updates": bool(prefs.course_updates),
        "message_notifications": bool(prefs.message_notifications),
        "marketing_emails": bool(prefs.marketing_emails),
        "updated_at": prefs.updated_at.isoformat() if getattr(prefs, "updated_at", None) else None,
    }


def _get_db_session_factory():
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return None
    return db_session


def _get_current_user_id():
    token = extract_bearer_token()
    if token is None:
        return None, (jsonify({"error": "Missing or invalid Authorization header"}), 401)

    user_id, _email = verify_supabase_jwt(token)
    if not user_id:
        return None, (jsonify({"error": "Invalid token"}), 401)

    return user_id, None


@notification_bp.get("/notification")
def get_notification_preferences():
    db_session = _get_db_session_factory()
    if db_session is None:
        return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

    user_id, err = _get_current_user_id()
    if err:
        return err

    session = db_session()
    try:
        prefs = get_preferences(session, user_id)
        if prefs is None:
            return jsonify({"user_id": str(user_id), "preferences": None}), 200

        return jsonify({"user_id": str(prefs.user_id), "preferences": _prefs_payload(prefs)}), 200
    except SQLAlchemyError as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()


@notification_bp.patch("/notification")
def update_notification_preferences():
    """Update notification preferences for the current user.

    Usage example:
      PATCH /notification?assignment_reminders=true
    """

    db_session = _get_db_session_factory()
    if db_session is None:
        return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

    user_id, err = _get_current_user_id()
    if err:
        return err

    updates: dict[str, bool] = {}
    errors: dict[str, str] = {}

    for key, raw in request.args.items():
        if key not in UPDATABLE_FIELDS:
            continue
        try:
            parsed = _parse_bool_query(raw)
            if parsed is None:
                continue
            updates[key] = parsed
        except ValueError as exc:
            errors[key] = str(exc)

    if errors:
        return jsonify({"error": "Invalid query params", "details": errors}), 400

    if not updates:
        return jsonify({"error": "No valid preference fields provided", "allowed": sorted(UPDATABLE_FIELDS)}), 400

    session = db_session()
    try:
        prefs = get_or_create_preferences(session, user_id)
        apply_updates(prefs, updates)
        session.commit()
        session.refresh(prefs)

        return (
            jsonify(
                {
                    "user_id": str(prefs.user_id),
                    "updated": updates,
                    "preferences": _prefs_payload(prefs),
                }
            ),
            200,
        )
    except SQLAlchemyError as exc:
        session.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()
