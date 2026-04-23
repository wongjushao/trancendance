import os
import uuid

from flask import Flask, jsonify, request
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from sqlalchemy.exc import SQLAlchemyError

from backend.common.db import create_engine_and_session
from backend.common.models import Organization


REQUESTS = Counter("org_requests_total", "Total org service HTTP requests")


def is_valid_database_url(database_url: str) -> bool:
    if not database_url:
        return False
    if "[YOUR-PASSWORD]" in database_url:
        return False
    if "localhost" in database_url and "postgresql://" not in database_url and "postgres://" not in database_url:
        return False
    return True


def serialize_organization(organization: Organization) -> dict:
    return {
        "id": organization.id,
        "name": organization.name,
        "description": organization.description,
        "created_by": str(organization.created_by),
        "created_at": organization.created_at.isoformat() if organization.created_at else None,
    }


def create_app():
    app = Flask(__name__)

    database_url = os.getenv("SUPABASE_DB_URL", "")
    db_session = None

    if is_valid_database_url(database_url):
        _, db_session = create_engine_and_session(database_url)

    @app.before_request
    def before_request():
        REQUESTS.inc()

    @app.get("/health")
    def health():
        return jsonify({"service": "org", "status": "ok"})

    @app.get("/orgs")
    def list_orgs():
        if db_session is None:
            return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

        session = db_session()
        try:
            organizations = session.query(Organization).order_by(Organization.id.asc()).limit(100).all()
            return jsonify([serialize_organization(organization) for organization in organizations])
        except SQLAlchemyError as exc:
            return jsonify({"error": str(exc)}), 500
        finally:
            session.close()

    @app.post("/orgs")
    def create_org():
        if db_session is None:
            return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

        payload = request.get_json(silent=True) or {}
        name = payload.get("name")
        created_by = payload.get("created_by")

        if not name:
            return jsonify({"error": "Field 'name' is required"}), 400
        if not created_by:
            return jsonify({"error": "Field 'created_by' is required"}), 400

        try:
            created_by_uuid = uuid.UUID(str(created_by))
        except (TypeError, ValueError):
            return jsonify({"error": "Field 'created_by' must be a valid UUID"}), 400

        session = db_session()

        try:
            organization = Organization(
                name=name,
                description=payload.get("description"),
                created_by=created_by_uuid,
            )
            session.add(organization)
            session.commit()
            session.refresh(organization)
            return jsonify(serialize_organization(organization)), 201
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


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003)
