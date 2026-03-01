import os
import uuid

from flask import Flask, jsonify, request
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from supabase import create_client
from sqlalchemy.exc import SQLAlchemyError

from backend.common.db import create_engine_and_session
from backend.common.models import Profile


REQUESTS = Counter("auth_requests_total", "Total auth service HTTP requests")


def is_valid_database_url(database_url: str) -> bool:
    if not database_url:
        return False
    if "[YOUR-PASSWORD]" in database_url:
        return False
    return True


def serialize_profile(profile: Profile) -> dict:
    return {
        "id": str(profile.id),
        "username": profile.username,
        "avatar_url": profile.avatar_url,
        "bio": profile.bio,
        "timezone": profile.timezone,
        "language": profile.language,
        "social_links": profile.social_links,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
    }


def create_app():
    app = Flask(__name__)

    supabase_url = os.getenv("AUTH_SUPABASE_URL", "")
    supabase_anon_key = os.getenv("AUTH_SUPABASE_ANON_KEY", "")
    supabase = create_client(supabase_url, supabase_anon_key) if supabase_url and supabase_anon_key else None
    database_url = os.getenv("DATABASE_URL", "")
    db_session = None

    if is_valid_database_url(database_url):
        _, db_session = create_engine_and_session(database_url)

    def get_user_from_bearer_token():
        if not supabase:
            return None, (jsonify({"error": "Supabase auth is not configured"}), 500)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None, (jsonify({"error": "Missing Bearer token"}), 401)

        token = auth_header.replace("Bearer ", "", 1).strip()
        if not token:
            return None, (jsonify({"error": "Missing Bearer token"}), 401)

        try:
            user_response = supabase.auth.get_user(token)
            user = getattr(user_response, "user", None)
            if user is None:
                return None, (jsonify({"error": "Invalid token"}), 401)
            return user, None
        except Exception as exc:
            return None, (jsonify({"error": str(exc)}), 401)

    @app.before_request
    def before_request():
        REQUESTS.inc()

    @app.get("/health")
    def health():
        return jsonify({"service": "auth", "status": "ok"})

    @app.post("/verify")
    def verify_token():
        user, error_response = get_user_from_bearer_token()
        if error_response is not None:
            return error_response

        return jsonify(
            {
                "id": user.id,
                "email": user.email,
                "role": user.role,
            }
        )

    @app.post("/profiles/sync")
    def sync_profile():
        if db_session is None:
            return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

        user, error_response = get_user_from_bearer_token()
        if error_response is not None:
            return error_response

        payload = request.get_json(silent=True) or {}

        try:
            user_uuid = uuid.UUID(str(user.id))
        except (TypeError, ValueError):
            return jsonify({"error": "Token user id is not a valid UUID"}), 400

        session = db_session()
        try:
            profile = session.get(Profile, user_uuid)
            if profile is None:
                profile = Profile(id=user_uuid)
                session.add(profile)

            profile.username = payload.get("username", profile.username)
            profile.avatar_url = payload.get("avatar_url", profile.avatar_url)
            profile.bio = payload.get("bio", profile.bio)
            profile.timezone = payload.get("timezone", profile.timezone)
            profile.language = payload.get("language", profile.language)
            profile.social_links = payload.get("social_links", profile.social_links)

            session.commit()
            session.refresh(profile)
            return jsonify(serialize_profile(profile)), 200
        except SQLAlchemyError as exc:
            session.rollback()
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    @app.get("/metrics")
    def metrics():
        return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}

    @app.teardown_appcontext
    def shutdown_session(_exception=None):
        if db_session is not None:
            db_session.remove()

    return app



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
