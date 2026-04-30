import os

from flask import Flask, Response
from flask_restx import Api
from flask_restx.representations import output_json as restx_output_json
from prometheus_client import Counter
from werkzeug.middleware.proxy_fix import ProxyFix

from backend.common.db import create_engine_and_session
from backend.services.org_service.org_service.routes import courses_ns, health_ns, metrics_ns, organizations_ns


REQUESTS = Counter("org_requests_total", "Total org service HTTP requests")


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
    authorizations = {
        "Bearer": {
            "type": "apiKey",
            "in": "header",
            "name": "Authorization",
            "description": "Enter your token as: Bearer <access_token>",
        }
    }
    api = Api(
        app,
        title="Organization Service API",
        version="1.0",
        doc="/docs",
        authorizations=authorizations,
        security="Bearer",
    )

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

    app.config["DB_SESSION"] = db_session

    @app.before_request
    def before_request():
        REQUESTS.inc()

    for namespace in (
        health_ns,
        metrics_ns,
        organizations_ns,
        courses_ns,
    ):
        api.add_namespace(namespace)

    @app.teardown_appcontext
    def shutdown_session(_exception=None):
        if db_session is not None:
            db_session.remove()

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003)
