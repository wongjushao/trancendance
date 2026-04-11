import os

from flask import Flask, jsonify, request
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from sqlalchemy.exc import SQLAlchemyError

from backend.common.db import create_engine_and_session
from backend.common.models.entities import NotificationPreference
from backend.services.notification_service.notification_service.utils.supabase_jwt import (
    extract_bearer_token,
    verify_supabase_jwt,
)


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


REQUESTS = Counter(
    "notification_requests_total",
    "Total notification service HTTP requests",
)


def is_valid_database_url(database_url: str) -> bool:
    if not database_url:
        return False
    if "[YOUR-PASSWORD]" in database_url:
        return False
    if "localhost" in database_url and "postgresql://" not in database_url and "postgres://" not in database_url:
        return False
    return True


def create_app():
    app = Flask(__name__)

    database_url = os.getenv("DATABASE_URL", "")
    db_session = None

    if is_valid_database_url(database_url):
        _, db_session = create_engine_and_session(database_url)

    @app.before_request
    def before_request():
        REQUESTS.inc()

    @app.get("/health")
    def health():
        return jsonify({"service": "notification", "status": "ok"})

    @app.get("/metrics")
    def metrics():
        return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}

    @app.get("/notification")
    def get_notification_preferences():
        """Return the current user's notification_preferences row."""

        if db_session is None:
            return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

        token = extract_bearer_token()
        if token is None:
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        user_id, _email = verify_supabase_jwt(token)
        if not user_id:
            return jsonify({"error": "Invalid token"}), 401

        session = db_session()
        try:
            prefs = session.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).first()
            if prefs is None:
                return jsonify({"user_id": str(user_id), "preferences": None}), 200

            return (
                jsonify(
                    {
                        "user_id": str(prefs.user_id),
                        "preferences": {
                            "email_enabled": bool(prefs.email_enabled),
                            "push_enabled": bool(prefs.push_enabled),
                            "assignment_reminders": bool(prefs.assignment_reminders),
                            "course_updates": bool(prefs.course_updates),
                            "message_notifications": bool(prefs.message_notifications),
                            "marketing_emails": bool(prefs.marketing_emails),
                            "updated_at": prefs.updated_at.isoformat() if prefs.updated_at else None,
                        },
                    }
                ),
                200,
            )
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    @app.patch("/notification")
    def update_notification_preferences():
        """Update notification preferences for the current user.

        Usage example:
          PATCH /notification?assignment_reminders=true
        """

        if db_session is None:
            return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

        token = extract_bearer_token()
        if token is None:
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        user_id, _email = verify_supabase_jwt(token)
        if not user_id:
            return jsonify({"error": "Invalid token"}), 401

        updatable_fields = {
            "email_enabled",
            "push_enabled",
            "assignment_reminders",
            "course_updates",
            "message_notifications",
            "marketing_emails",
        }

        updates: dict[str, bool] = {}
        errors: dict[str, str] = {}

        for key, raw in request.args.items():
            if key not in updatable_fields:
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
            return (
                jsonify(
                    {
                        "error": "No valid preference fields provided",
                        "allowed": sorted(updatable_fields),
                    }
                ),
                400,
            )

        session = db_session()
        try:
            prefs = session.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).first()
            if prefs is None:
                prefs = NotificationPreference(user_id=user_id)
                session.add(prefs)

            for field, value in updates.items():
                setattr(prefs, field, value)

            session.commit()
            session.refresh(prefs)

            return (
                jsonify(
                    {
                        "user_id": str(prefs.user_id),
                        "updated": updates,
                        "preferences": {
                            "email_enabled": bool(prefs.email_enabled),
                            "push_enabled": bool(prefs.push_enabled),
                            "assignment_reminders": bool(prefs.assignment_reminders),
                            "course_updates": bool(prefs.course_updates),
                            "message_notifications": bool(prefs.message_notifications),
                            "marketing_emails": bool(prefs.marketing_emails),
                            "updated_at": prefs.updated_at.isoformat() if prefs.updated_at else None,
                        },
                    }
                ),
                200,
            )
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    @app.teardown_appcontext
    def shutdown_session(_exception=None):
        if db_session is not None:
            db_session.remove()

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5004)
