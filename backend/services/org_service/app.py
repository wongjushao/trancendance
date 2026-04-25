import os
import uuid

from flask import Flask, Response, jsonify, request
from flask_restx import Api, Namespace, Resource
from flask_restx.representations import output_json as restx_output_json
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.middleware.proxy_fix import ProxyFix

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
    app.wsgi_app = ProxyFix(app.wsgi_app, x_prefix=1)
    api = Api(app, title="Organization Service API", version="1.0", doc="/docs")
    org_ns = Namespace("organizations", path="/", description="Organization service endpoints")

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

    @org_ns.route("/health")
    class HealthResource(Resource):
        def get(self):
            return jsonify({"service": "org", "status": "ok"})

    @org_ns.route("/orgs")
    class OrganizationListResource(Resource):
        def get(self):
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

        def post(self):
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

    @org_ns.route("/metrics")
    class MetricsResource(Resource):
        def get(self):
            return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)

    api.add_namespace(org_ns)

    @app.teardown_appcontext
    def shutdown_session(_exception=None):
        if db_session is not None:
            db_session.remove()

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003)
