import os

from flask import Flask, Response, jsonify, request
from flask_restx import Api, Namespace, Resource
from flask_restx.representations import output_json as restx_output_json
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.middleware.proxy_fix import ProxyFix

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
    app.wsgi_app = ProxyFix(app.wsgi_app, x_prefix=1)
    api = Api(app, title="Notification Service API", version="1.0", doc="/docs")
    notification_ns = Namespace("notifications", path="/", description="Notification service endpoints")

    @api.representation("application/json")
    def output_json_with_response_passthrough(data, code, headers=None):
        if isinstance(data, Response):
            response = data
            response.status_code = code
            if headers:
                response.headers.extend(headers)
            return response
        return restx_output_json(data, code, headers)

    database_url = os.getenv("SUPABASE_DB_URL", "")
    db_session = None

    if is_valid_database_url(database_url):
        _, db_session = create_engine_and_session(database_url)

    @app.before_request
    def before_request():
        REQUESTS.inc()

    @notification_ns.route("/health")
    class HealthResource(Resource):
        def get(self):
            return jsonify({"service": "notification", "status": "ok"})

    @notification_ns.route("/metrics")
    class MetricsResource(Resource):
        def get(self):
            return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)

    @notification_ns.route("/notification")
    class NotificationPreferenceResource(Resource):
        def get(self):
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

        def patch(self):
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

    api.add_namespace(notification_ns)

    @app.teardown_appcontext
    def shutdown_session(_exception=None):
        if db_session is not None:
            db_session.remove()

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5004)
