import os
import uuid

from flask import Flask, Response, jsonify, request
from flask_restx import Api, Namespace, Resource
from flask_restx.representations import output_json as restx_output_json
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.middleware.proxy_fix import ProxyFix

from backend.common.db import create_engine_and_session
from backend.common.models import Message


REQUESTS = Counter("chat_requests_total", "Total chat service HTTP requests")


def is_valid_database_url(database_url: str) -> bool:
    if not database_url:
        return False
    if "[YOUR-PASSWORD]" in database_url:
        return False
    if "localhost" in database_url and "postgresql://" not in database_url and "postgres://" not in database_url:
        return False
    return True


def serialize_message(message: Message) -> dict:
    return {
        "id": message.id,
        "room_id": message.room_id,
        "sender_id": str(message.sender_id),
        "content": message.content,
        "message_type": message.message_type,
        "created_at": message.created_at.isoformat() if message.created_at else None,
    }


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
    chat_ns = Namespace("chat", path="/", description="Chat service endpoints")

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

    @chat_ns.route("/health")
    class HealthResource(Resource):
        def get(self):
            return jsonify({"service": "chat", "status": "ok"})

    @chat_ns.route("/messages")
    class MessageListResource(Resource):
        def get(self):
            if db_session is None:
                return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

            session = db_session()
            try:
                messages = session.query(Message).order_by(Message.created_at.asc()).limit(100).all()
                return jsonify([serialize_message(message) for message in messages])
            except SQLAlchemyError as exc:
                return jsonify({"error": str(exc)}), 500
            finally:
                session.close()

        def post(self):
            if db_session is None:
                return jsonify({"error": "Database is not configured. Set valid DATABASE_URL"}), 503

            payload = request.get_json(silent=True) or {}
            room_id = payload.get("room_id")
            sender_id = payload.get("sender_id") or payload.get("author")
            content = payload.get("content") or payload.get("text")
            message_type = payload.get("message_type") or "text"

            if not room_id or not sender_id or not content:
                return jsonify({"error": "Fields 'room_id', 'sender_id' (or 'author') and 'content' (or 'text') are required"}), 400

            session = db_session()

            try:
                sender_uuid = uuid.UUID(str(sender_id))
            except (TypeError, ValueError):
                return jsonify({"error": "Field 'sender_id' must be a valid UUID"}), 400

            try:
                message = Message(
                    room_id=room_id,
                    sender_id=sender_uuid,
                    content=content,
                    message_type=message_type,
                )
                session.add(message)
                session.commit()
                session.refresh(message)
                return jsonify(serialize_message(message)), 201
            except SQLAlchemyError as exc:
                session.rollback()
                return jsonify({"error": str(exc)}), 500
            finally:
                session.close()

    @chat_ns.route("/metrics")
    class MetricsResource(Resource):
        def get(self):
            return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)

    api.add_namespace(chat_ns)

    @app.teardown_appcontext
    def shutdown_session(_exception=None):
        if db_session is not None:
            db_session.remove()

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)
