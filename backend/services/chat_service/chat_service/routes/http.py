# backend/services/chat_service/chat_service/routes/http.py
from __future__ import annotations

import uuid

from flask import Blueprint, current_app, jsonify, request
from flask_restx import Namespace, Resource
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from backend.services.auth_service.auth_service.utils.supabase_jwt import (
    extract_bearer_token,
    verify_supabase_jwt,
)
from backend.services.chat_service.chat_service.schemas.chat import (
    MessageHistoryQuerySchema,
    CreateDMSchema,
    CreateCourseRoomSchema,
)
from backend.services.chat_service.chat_service.services.message_service import (
    get_room_messages,
)
from backend.services.chat_service.chat_service.services.room_service import (
    ensure_db_session,
    list_user_rooms,
    get_or_create_dm_room,
    get_or_create_course_room,
    can_dm,
    block_user,
    unblock_user,
    get_chat_profile,
    RoomAccessError,
)
from backend.services.chat_service.chat_service.sockets.handlers import get_online_user_ids

chat_ns = Namespace("chat", path="/", description="Chat HTTP API")

prefixed_chat_bp = Blueprint("chat_service_prefixed", __name__)


def get_request_user_id() -> uuid.UUID:
    """Extract and verify user ID from JWT token."""
    auth_header = request.headers.get("Authorization")
    token = extract_bearer_token(auth_header)
    if not token:
        raise PermissionError("Missing bearer token")

    user_id, _email = verify_supabase_jwt(token)
    if not user_id:
        raise PermissionError("Invalid or expired bearer token")

    try:
        return uuid.UUID(str(user_id))
    except (TypeError, ValueError) as exc:
        raise PermissionError("Bearer token does not contain a valid user identifier") from exc


def get_rooms_handler():
    """Get all chat rooms for the current user."""
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
        rooms = list_user_rooms(session, user_id, get_online_user_ids())
        return jsonify({"rooms": rooms}), 200
    except SQLAlchemyError:
        session.rollback()
        return jsonify({"error": "Failed to load rooms"}), 500
    finally:
        session.close()


def get_profile_handler(profile_id: str):
    """Get a chat-visible profile with block state."""
    db_session = current_app.config.get("DB_SESSION")

    try:
        ensure_db_session(db_session)
        current_user_id = get_request_user_id()
        target_user_id = uuid.UUID(profile_id)
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 401
    except ValueError:
        return jsonify({"error": "Invalid user id"}), 400

    session = db_session()
    try:
        return jsonify({"profile": get_chat_profile(session, current_user_id, target_user_id)}), 200
    except RoomAccessError as exc:
        return jsonify({"error": str(exc)}), 403
    except SQLAlchemyError:
        session.rollback()
        return jsonify({"error": "Failed to load profile"}), 500
    finally:
        session.close()


def block_profile_handler(profile_id: str):
    """Block a user from direct messaging the current user."""
    db_session = current_app.config.get("DB_SESSION")

    try:
        ensure_db_session(db_session)
        current_user_id = get_request_user_id()
        target_user_id = uuid.UUID(profile_id)
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 401
    except ValueError:
        return jsonify({"error": "Invalid user id"}), 400

    session = db_session()
    try:
        status = block_user(session, current_user_id, target_user_id)
        return jsonify(status), 200
    except RoomAccessError as exc:
        session.rollback()
        return jsonify({"error": str(exc)}), 400
    except SQLAlchemyError:
        session.rollback()
        return jsonify({"error": "Failed to block user"}), 500
    finally:
        session.close()


def unblock_profile_handler(profile_id: str):
    """Unblock a user for direct messaging."""
    db_session = current_app.config.get("DB_SESSION")

    try:
        ensure_db_session(db_session)
        current_user_id = get_request_user_id()
        target_user_id = uuid.UUID(profile_id)
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 401
    except ValueError:
        return jsonify({"error": "Invalid user id"}), 400

    session = db_session()
    try:
        status = unblock_user(session, current_user_id, target_user_id)
        return jsonify(status), 200
    except SQLAlchemyError:
        session.rollback()
        return jsonify({"error": "Failed to unblock user"}), 500
    finally:
        session.close()


def create_dm_room_handler():
    """Create or get a DM room between current user and another user."""
    db_session = current_app.config.get("DB_SESSION")

    try:
        ensure_db_session(db_session)
        current_user_id = get_request_user_id()
        data = CreateDMSchema(**request.get_json(silent=True) or {})
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 401
    except ValidationError as exc:
        return jsonify({"error": "Invalid request", "details": exc.errors()}), 400

    session = db_session()
    try:
        if not can_dm(session, current_user_id, data.target_user_id):
            return jsonify({"error": "Cannot DM this user"}), 403

        room_id = get_or_create_dm_room(session, current_user_id, data.target_user_id)

        rooms = list_user_rooms(session, current_user_id)
        room = next((r for r in rooms if r["id"] == room_id), None)

        return jsonify({"room": room, "room_id": room_id}), 200
    except SQLAlchemyError:
        session.rollback()
        return jsonify({"error": "Failed to create DM room"}), 500
    finally:
        session.close()


def create_course_room_handler():
    """Get or create a course chat room."""
    db_session = current_app.config.get("DB_SESSION")

    try:
        ensure_db_session(db_session)
        current_user_id = get_request_user_id()
        data = CreateCourseRoomSchema(**request.get_json(silent=True) or {})
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except PermissionError as exc:
        return jsonify({"error": str(exc)}), 401
    except ValidationError as exc:
        return jsonify({"error": "Invalid request", "details": exc.errors()}), 400

    session = db_session()
    try:
        from backend.common.models import CourseMember

        is_enrolled = (
            session.query(CourseMember)
            .filter(
                CourseMember.course_id == data.course_id,
                CourseMember.user_id == current_user_id,
            )
            .first()
            is not None
        )

        if not is_enrolled:
            return jsonify({"error": "Not enrolled in this course"}), 403

        room_id = get_or_create_course_room(session, data.course_id)

        return jsonify({"room_id": room_id}), 200
    except SQLAlchemyError:
        session.rollback()
        return jsonify({"error": "Failed to create course room"}), 500
    finally:
        session.close()


def get_room_messages_handler(room_id: int):
    """Get messages for a specific room with cursor-based pagination."""
    db_session = current_app.config.get("DB_SESSION")

    try:
        ensure_db_session(db_session)
        user_id = get_request_user_id()

        page = request.args.get("page", 1, type=int)
        page_size = request.args.get("page_size", 50, type=int)
        cursor = request.args.get("cursor", type=int)

        query = MessageHistoryQuerySchema(
            page=page,
            page_size=page_size,
            cursor=cursor,
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
            cursor=query.cursor,
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


@chat_ns.route("/rooms")
class RoomsList(Resource):
    def get(self):
        """Get all chat rooms for the current user."""
        return get_rooms_handler()


@chat_ns.route("/profiles/<string:profile_id>")
class ProfileDetail(Resource):
    def get(self, profile_id: str):
        """Get a chat-visible profile with block state."""
        return get_profile_handler(profile_id)


@chat_ns.route("/blocks/<string:profile_id>")
class BlockProfile(Resource):
    def post(self, profile_id: str):
        """Block a user from direct messaging the current user."""
        return block_profile_handler(profile_id)

    def delete(self, profile_id: str):
        """Unblock a user for direct messaging."""
        return unblock_profile_handler(profile_id)


@chat_ns.route("/rooms/dm")
class CreateDMRoom(Resource):
    def post(self):
        """Create or get a DM room between current user and another user."""
        return create_dm_room_handler()


@chat_ns.route("/rooms/course")
class CreateCourseRoom(Resource):
    def post(self):
        """Get or create a course chat room."""
        return create_course_room_handler()


@chat_ns.route("/rooms/<int:room_id>/messages")
class RoomMessages(Resource):
    def get(self, room_id: int):
        """Get messages for a specific room with cursor-based pagination."""
        return get_room_messages_handler(room_id)


@prefixed_chat_bp.get("/rooms")
def get_rooms_prefixed():
    return get_rooms_handler()


@prefixed_chat_bp.get("/profiles/<profile_id>")
def get_profile_prefixed(profile_id: str):
    return get_profile_handler(profile_id)


@prefixed_chat_bp.post("/blocks/<profile_id>")
def block_profile_prefixed(profile_id: str):
    return block_profile_handler(profile_id)


@prefixed_chat_bp.delete("/blocks/<profile_id>")
def unblock_profile_prefixed(profile_id: str):
    return unblock_profile_handler(profile_id)


@prefixed_chat_bp.post("/rooms/dm")
def create_dm_room_prefixed():
    return create_dm_room_handler()


@prefixed_chat_bp.post("/rooms/course")
def create_course_room_prefixed():
    return create_course_room_handler()


@prefixed_chat_bp.get("/rooms/<int:room_id>/messages")
def get_room_messages_prefixed(room_id: int):
    return get_room_messages_handler(room_id)
