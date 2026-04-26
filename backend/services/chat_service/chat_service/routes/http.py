# backend/services/chat_service/chat_service/routes/http.py
from __future__ import annotations

import uuid

from flask import Blueprint, current_app, jsonify, request
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from backend.services.auth_service.auth_service.utils.supabase_jwt import (
    extract_bearer_token,
    verify_supabase_jwt,
)
from backend.services.chat_service.chat_service.schemas.chat import (
    MessageHistoryQuerySchema,
    CreateDMSchema,
    CreateCourseRoomSchema
)
from backend.services.chat_service.chat_service.services.message_service import (
    get_room_messages
)
from backend.services.chat_service.chat_service.services.room_service import (
    ensure_db_session,
    list_user_rooms,
    get_or_create_dm_room,
    get_or_create_course_room,
    can_dm,
    RoomAccessError
)

chat_bp = Blueprint("chat_service", __name__)


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


@chat_bp.get("/rooms")
def get_rooms():
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
        rooms = list_user_rooms(session, user_id)
        return jsonify({"rooms": rooms}), 200
    except SQLAlchemyError:
        session.rollback()
        return jsonify({"error": "Failed to load rooms"}), 500
    finally:
        session.close()


@chat_bp.post("/rooms/dm")
def create_dm_room():
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
        # Check if users can DM
        if not can_dm(session, current_user_id, data.target_user_id):
            return jsonify({"error": "Cannot DM this user"}), 403
        
        room_id = get_or_create_dm_room(session, current_user_id, data.target_user_id)
        
        # Get room details
        rooms = list_user_rooms(session, current_user_id)
        room = next((r for r in rooms if r["id"] == room_id), None)
        
        return jsonify({"room": room, "room_id": room_id}), 200
    except SQLAlchemyError:
        session.rollback()
        return jsonify({"error": "Failed to create DM room"}), 500
    finally:
        session.close()


@chat_bp.post("/rooms/course")
def create_course_room():
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
        # Verify user is enrolled in the course
        from backend.common.models import CourseMember
        is_enrolled = session.query(CourseMember).filter(
            CourseMember.course_id == data.course_id,
            CourseMember.user_id == current_user_id
        ).first() is not None
        
        if not is_enrolled:
            return jsonify({"error": "Not enrolled in this course"}), 403
        
        room_id = get_or_create_course_room(session, data.course_id)
        
        return jsonify({"room_id": room_id}), 200
    except SQLAlchemyError:
        session.rollback()
        return jsonify({"error": "Failed to create course room"}), 500
    finally:
        session.close()


@chat_bp.get("/rooms/<int:room_id>/messages")
def get_room_messages_endpoint(room_id: int):
    """Get messages for a specific room with cursor-based pagination."""
    db_session = current_app.config.get("DB_SESSION")
    
    try:
        ensure_db_session(db_session)
        user_id = get_request_user_id()
        
        # Support both page-based (legacy) and cursor-based pagination
        page = request.args.get("page", 1, type=int)
        page_size = request.args.get("page_size", 50, type=int)
        cursor = request.args.get("cursor", type=int)
        
        query = MessageHistoryQuerySchema(
            page=page,
            page_size=page_size,
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
            cursor=cursor,
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