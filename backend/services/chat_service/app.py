import logging
import os

from flask import Flask, Response, jsonify
from flask_restx import Api
from flask_restx.representations import output_json as restx_output_json
from flask_socketio import SocketIO
from werkzeug.middleware.proxy_fix import ProxyFix

from backend.common.db import create_engine_and_session
from backend.services.chat_service.chat_service.middleware.metrics import register_metrics
from backend.services.chat_service.chat_service.routes.http import chat_bp
from backend.services.chat_service.chat_service.sockets.handlers import init_socket_events


logger = logging.getLogger(__name__)


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
        title="Chat Service API",
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
    else:
        logger.warning("[App] SUPABASE_DB_URL is not configured for chat service")

    app.config["DB_SESSION"] = db_session
    register_metrics(app)

    @app.get("/health")
    def health():
        return jsonify({"service": "chat", "status": "ok"})

    app.register_blueprint(chat_bp)
    app.register_blueprint(chat_bp, url_prefix="/api/chat-service", name="chat_service_prefixed")

    socketio = SocketIO(
        app,
        cors_allowed_origins="*",
        async_mode="eventlet",
        path="/socket.io",
    )
    init_socket_events(socketio, db_session)

    @app.teardown_appcontext
    def shutdown_session(_exception=None):
        if db_session is not None:
            db_session.remove()

    return app, socketio


app, socketio = create_app()


if __name__ == "__main__":
    logger.info("[App] Starting chat service on port 5002")
    socketio.run(app, host="0.0.0.0", port=5002, debug=True)
