# backend/services/chat_service/app.py
import eventlet
eventlet.monkey_patch()

import logging
import os

from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

from backend.common.db import create_engine_and_session
from backend.services.chat_service.chat_service.middleware.metrics import register_metrics
from backend.services.chat_service.chat_service.routes import chat_bp
from backend.services.chat_service.chat_service.sockets.handlers import init_socket_events

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


def is_valid_database_url(database_url: str) -> bool:
    if not database_url:
        return False
    if "[YOUR-PASSWORD]" in database_url:
        return False
    return True


def create_app() -> tuple[Flask, SocketIO]:
    app = Flask(__name__)

    # Enable CORS for all origins in development
    CORS(app, supports_credentials=True, origins="*")

    app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "dev-chat-secret-key")

    database_url = os.getenv("DATABASE_URL", "")
    db_session = None
    logger.info(f"[App] Database URL configured: {'yes' if database_url else 'no'}")

    if is_valid_database_url(database_url):
        _engine, db_session = create_engine_and_session(database_url)
        logger.info("[App] Database session created")
    else:
        logger.warning("[App] Invalid or missing DATABASE_URL")

    app.config["DB_SESSION"] = db_session

    app.register_blueprint(chat_bp, url_prefix="/api/chat-service")
    register_metrics(app)

    @app.get("/health")
    def health():
        return {"service": "chat", "status": "ok"}

    @app.get("/")
    def index():
        return {"service": "chat", "status": "running"}

    # Configure Socket.IO with proper settings for eventlet
    socketio = SocketIO(
        app,
        cors_allowed_origins="*",
        path="/socket.io",
        async_mode="eventlet",
        ping_interval=25,
        ping_timeout=60,
        logger=True,
        engineio_logger=True,
        always_connect=True,
    )

    def get_db_session():
        if db_session:
            return db_session()
        return None

    init_socket_events(socketio, get_db_session)
    logger.info("[App] Socket events initialized")

    @app.teardown_appcontext
    def shutdown_session(_exception=None):
        if db_session is not None:
            db_session.remove()

    return app, socketio


app, socketio = create_app()


if __name__ == "__main__":
    logger.info("[App] Starting chat service on port 5002")
    socketio.run(app, host="0.0.0.0", port=5002, debug=True, allow_unsafe_werkzeug=True)