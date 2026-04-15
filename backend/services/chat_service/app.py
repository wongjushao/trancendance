import os
from flask import Flask
from flask_cors import CORS
from chat_service.sockets.handlers import init_socket_events
from chat_service.sockets.socketio import socketio

def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, supports_credentials=True)

    # Mock DB session for this example
    app.config["DB_SESSION"] = None

    @app.get("/health")
    def health():
        return {"service": "chat", "status": "ok"}

    init_socket_events(socketio)
    socketio.init_app(
        app,
        cors_allowed_origins="*",
        async_mode="threading",
        ping_interval=25,
        ping_timeout=60,
    )

    return app

app = create_app()

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5002)
