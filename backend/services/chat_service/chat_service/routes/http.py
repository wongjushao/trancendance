from __future__ import annotations

import uuid

from flask import Blueprint, current_app, jsonify, request
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from backend.services.auth_service.auth_service.utils.supabase_jwt import (
    extract_bearer_token,
    verify_supabase_jwt,
)
from backend.services.chat_service.chat_service.schemas.chat import MessageHistoryQuerySchema
from backend.services.chat_service.chat_service.services.message_service import get_room_messages
from backend.services.chat_service.chat_service.services.room_service import (
    RoomAccessError,
    ensure_db_session,
    list_user_rooms,
)


chat_bp = Blueprint("chat_service", __name__)


def get_request_user_id() -> uuid.UUID:
    token = extract_bearer_token(request.headers.get("Authorization"))
    if not token:
        raise PermissionError("Missing bearer token")

    user_id, _email = verify_supabase_jwt(token)
    if not user_id:
        raise PermissionError("Invalid or expired bearer token")

    try:
        return uuid.UUID(str(user_id))
    except (TypeError, ValueError) as exc:
        raise PermissionError("Bearer token does not contain a valid user identifier") from exc


@chat_bp.get("/rooms")
def rooms():
    db_session = current_app.config.get("DB_SESSION")

    try:
        ensure_db_session(db_session)
        user_id = get_request_user_id()
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 401

    session = db_session()
    try:
        return jsonify({"rooms": list_user_rooms(session, user_id)}), 200
    except SQLAlchemyError:
        session.rollback()
        return jsonify({"error": "Failed to load rooms"}), 500
    finally:
        session.close()


@chat_bp.get("/rooms/<int:room_id>/messages")
def room_messages(room_id: int):
    db_session = current_app.config.get("DB_SESSION")

    try:
        ensure_db_session(db_session)
        user_id = get_request_user_id()
        query = MessageHistoryQuerySchema(
            page=request.args.get("page", 1),
            page_size=request.args.get("page_size", 50),
        )
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 401
    except ValidationError as exc:
        return jsonify({"error": "Invalid query parameters", "details": exc.errors()}), 400

    session = db_session()
    try:
        payload = get_room_messages(
            session=session,
            room_id=room_id,
            user_id=user_id,
            page=query.page,
            page_size=query.page_size,
        )
        return jsonify(payload), 200
    except RoomAccessError as exc:
        session.rollback()
        return jsonify({"error": str(exc)}), 403
    except SQLAlchemyError:
        session.rollback()
        return jsonify({"error": "Failed to load room messages"}), 500
    finally:
        session.close()
