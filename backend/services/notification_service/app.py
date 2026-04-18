import os

from flask import Flask

from backend.common.db import create_engine_and_session
from backend.services.notification_service.notification_service.routes import (
    health_bp,
    metrics_bp,
    notification_bp,
)


def is_valid_database_url(database_url: str) -> bool:
    if not database_url:
        return False
    if "[YOUR-PASSWORD]" in database_url:
        return False
    if (
        "localhost" in database_url
        and "postgresql://" not in database_url
        and "postgres://" not in database_url
    ):
        return False
    return True


def create_app() -> Flask:
    app = Flask(__name__)

    database_url = os.getenv("DATABASE_URL", "")
    db_session = None

    if is_valid_database_url(database_url):
        _, db_session = create_engine_and_session(database_url)

    app.config["DB_SESSION"] = db_session

    app.register_blueprint(health_bp)
    app.register_blueprint(metrics_bp)
    app.register_blueprint(notification_bp)

    @app.teardown_appcontext
    def shutdown_session(_exception=None):
        if db_session is not None:
            db_session.remove()

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5004)
