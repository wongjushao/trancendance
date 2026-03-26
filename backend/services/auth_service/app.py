import os

from flask import Flask

from backend.common.db import create_engine_and_session
from backend.services.auth_service.auth_service.middleware import register_bearer_auth_middleware
from backend.services.auth_service.auth_service.routes import docs_bp, health_bp, metrics_bp, register_bp
from backend.services.auth_service.auth_service.routes.onboarding import onboarding_bp
from backend.services.auth_service.auth_service.routes.profile import profile_bp
from backend.services.auth_service.auth_service.routes.metadata import metadata_bp
from backend.services.auth_service.auth_service.routes.auth import auth_bp
from backend.services.auth_service.auth_service.routes.avatar import avatar_bp  # Add this import

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

    app.config["DB_SESSION"] = db_session

    # The register endpoint no longer uses the api_keys bearer middleware.
    # It verifies Supabase JWTs directly using SUPABASE_JWT_SECRET.
    # Pass an empty set so the old middleware runs on nothing.
    register_bearer_auth_middleware(app, protected_endpoints=set())

    app.register_blueprint(docs_bp,      url_prefix="/api/auth-service")
    app.register_blueprint(health_bp,    url_prefix="/api/auth-service")
    app.register_blueprint(metrics_bp,   url_prefix="/api/auth-service")
    app.register_blueprint(register_bp,  url_prefix="/api/auth-service")
    app.register_blueprint(onboarding_bp, url_prefix="/api/auth-service")
    app.register_blueprint(profile_bp,   url_prefix="/api/auth-service")
    app.register_blueprint(metadata_bp,  url_prefix="/api/auth-service")
    app.register_blueprint(auth_bp,      url_prefix="/api/auth-service")
    app.register_blueprint(avatar_bp,    url_prefix="/api/auth-service")  # Add this line

    @app.teardown_appcontext
    def shutdown_session(_exception=None):
        if db_session is not None:
            db_session.remove()

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)