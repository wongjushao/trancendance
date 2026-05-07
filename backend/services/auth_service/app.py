import os

from flask import Flask, Response
from flask_restx import Api
from flask_restx.representations import output_json as restx_output_json
from flask import request
from werkzeug.middleware.proxy_fix import ProxyFix

from backend.common.db import create_engine_and_session
from backend.services.auth_service.auth_service.routes import (
    AUTH_API_DESCRIPTION,
    AUTH_API_TITLE,
    AUTH_API_VERSION,
    AUTH_DOC_PATH,
    account_ns,
    auth_ns,
    avatar_ns,
    friends_ns,
    health_ns,
    metadata_ns,
    metrics_ns,
    mfa_ns,
    onboarding_ns,
    profile_ns,
    register_ns,
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
    
    app.config["RESTX_MASK_SWAGGER"] = False
    app.config["SWAGGER_UI_DOC_EXPANSION"] = "list"

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
        title=AUTH_API_TITLE,
        version=AUTH_API_VERSION,
        description=AUTH_API_DESCRIPTION,
        doc=AUTH_DOC_PATH,
        prefix="/",
        default_label="API",
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

    for namespace in (
        health_ns,
        metrics_ns,
        register_ns,
        onboarding_ns,
        friends_ns,
        profile_ns,
        metadata_ns,
        auth_ns,
        avatar_ns,
        account_ns,
        mfa_ns,
    ):
        api.add_namespace(namespace)
    

    @app.teardown_appcontext
    def shutdown_session(_exception=None):
        if db_session is not None:
            db_session.remove()

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
