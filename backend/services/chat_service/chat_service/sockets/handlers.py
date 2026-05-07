# backend/services/chat_service/chat_service/sockets/handlers.py
from __future__ import annotations

import uuid
import logging
from typing import Dict, Optional, Set

from flask import request
from flask_socketio import ConnectionRefusedError, emit, join_room, leave_room

from backend.services.chat_service.chat_service.middleware.auth import authenticate_socket
from backend.services.chat_service.chat_service.middleware.rate_limit import get_rate_limiter
from backend.services.chat_service.chat_service.services.message_service import (
    create_message,
    get_room_messages,
    update_room_member_last_read,
)
from backend.services.chat_service.chat_service.services.room_service import (
    RoomAccessError,
    validate_room_membership,
)

logger = logging.getLogger(__name__)

# In-memory storage for socket session data
_socket_users: Dict[str, uuid.UUID] = {}
_socket_rooms: Dict[str, Set[int]] = {}


def get_online_user_ids() -> Set[uuid.UUID]:
    return set(_socket_users.values())


def is_user_online(user_id: uuid.UUID) -> bool:
    return user_id in get_online_user_ids()


def _room_channel(room_id: int) -> str:
    return f"room_{room_id}"


def _user_for(sid: str) -> Optional[uuid.UUID]:
    return _socket_users.get(sid)


def init_socket_events(socketio, db_session_factory):
    """Initialize all Socket.IO event handlers."""

    @socketio.on("connect")
    def handle_connect(auth=None):
        sid = request.sid
        logger.info(f"[Socket] CONNECT event received - sid={sid}, auth={auth is not None}")

        # Handle auth being passed as a dict or directly
        auth_data = None
        if auth:
            if isinstance(auth, dict):
                # Socket.IO client sends { token: "..." }
                auth_data = auth.get("token") or auth.get("access_token")
            elif isinstance(auth, str):
                auth_data = auth
        else:
            # Try to get token from headers as fallback
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                auth_data = auth_header[7:]

        if not auth_data:
            logger.warning(f"[Socket] No auth token for sid={sid}")
            raise ConnectionRefusedError("Authentication required")

        logger.info(f"[Socket] Authenticating with token length: {len(auth_data)}")

        user_id, error = authenticate_socket(auth_data)
        if error or not user_id:
            logger.warning(f"[Socket] Authentication failed for sid={sid}: {error}")
            raise ConnectionRefusedError(error or "Authentication failed")

        # Store the user_id for this socket session
        _socket_users[sid] = user_id
        _socket_rooms[sid] = set()
        
        logger.info(f"[Socket] CONNECT success - sid={sid}, user_id={user_id}")
        logger.info(f"[Socket] Current active users: {list(_socket_users.keys())}")
        
        # Send confirmation to client
        emit("connected", {"status": "ok", "user_id": str(user_id)})
        emit(
            "presence_changed",
            {"user_id": str(user_id), "is_online": True},
            broadcast=True,
            include_self=False,
        )
        return True

    @socketio.on("disconnect")
    def handle_disconnect():
        sid = request.sid
        user_id = _socket_users.pop(sid, None)
        _socket_rooms.pop(sid, None)
        logger.info(f"[Socket] DISCONNECT - sid={sid}, user_id={user_id}")
        if user_id and not is_user_online(user_id):
            emit(
                "presence_changed",
                {"user_id": str(user_id), "is_online": False},
                broadcast=True,
                include_self=False,
            )

    @socketio.on("join_room")
    def handle_join_room(data):
        sid = request.sid
        
        # Get user_id from our session store
        user_id = _socket_users.get(sid)
        
        logger.info(f"[Socket] JOIN_ROOM - sid={sid}, user_id={user_id}, data={data}")
        
        if not user_id:
            logger.error(f"[Socket] JOIN_ROOM failed - No user_id for sid={sid}")
            emit("chat_error", {"message": "Not authenticated - please reconnect"})
            return

        if not data:
            emit("chat_error", {"message": "Invalid request data"})
            return

        try:
            room_id = int(data.get("room_id"))
        except (TypeError, ValueError):
            emit("chat_error", {"message": "Invalid room_id"})
            return

        if room_id < 1:
            emit("chat_error", {"message": "room_id required"})
            return

        if not db_session_factory:
            emit("chat_error", {"message": "Database not available"})
            return

        db_session = None
        try:
            db_session = db_session_factory()
            if not validate_room_membership(db_session, room_id, user_id):
                logger.warning(f"[Socket] User {user_id} not a member of room {room_id}")
                emit("chat_error", {"message": "Not a member of this room"})
                return

            # Join the room channel
            channel = _room_channel(room_id)
            join_room(channel)
            _socket_rooms.setdefault(sid, set()).add(room_id)
            
            logger.info(f"[Socket] User {user_id} joined room {room_id} (channel: {channel})")
            emit("room_joined", {"room_id": room_id})
            
        except Exception as exc:
            logger.error(f"[Socket] JOIN_ROOM error: {exc}", exc_info=True)
            emit("chat_error", {"message": "Failed to join room"})
        finally:
            if db_session:
                db_session.close()

    @socketio.on("leave_room")
    def handle_leave_room(data):
        sid = request.sid
        
        if not data:
            return
            
        room_id = data.get("room_id")
        if not room_id:
            return

        leave_room(_room_channel(room_id))
        rooms = _socket_rooms.get(sid)
        if rooms and room_id in rooms:
            rooms.discard(room_id)
        emit("room_left", {"room_id": room_id})
        logger.info(f"[Socket] User {_socket_users.get(sid)} left room {room_id}")

    @socketio.on("send_message")
    def handle_send_message(data):
        sid = request.sid
        user_id = _socket_users.get(sid)
        
        logger.info(f"[Socket] SEND_MESSAGE - sid={sid}, user_id={user_id}")
        
        if not user_id:
            logger.error(f"[Socket] SEND_MESSAGE failed - No user_id for sid={sid}")
            emit("chat_error", {"message": "Not authenticated - please refresh the page"})
            return

        if not data:
            emit("chat_error", {"message": "Invalid message data"})
            return

        room_id = data.get("room_id")
        content = data.get("content")
        temp_id = data.get("temp_id")

        if not room_id or not content:
            emit("chat_error", {"message": "room_id and content required"})
            return

        if not db_session_factory:
            emit("chat_error", {"message": "Database not available"})
            return

        db_session = None
        try:
            db_session = db_session_factory()

            rate_limiter = get_rate_limiter()
            if not rate_limiter.is_allowed(user_id):
                emit("chat_error", {"message": "Rate limit exceeded. Please slow down."})
                return

            if not validate_room_membership(db_session, room_id, user_id):
                emit("chat_error", {"message": "Not a member of this room"})
                return

            message_dict = create_message(
                session=db_session,
                room_id=room_id,
                sender_id=user_id,
                content=content,
            )

            # Acknowledge message sent to the sender
            emit("message_sent", {
                "status": "ok",
                "message_id": message_dict["id"],
                "temp_id": temp_id,
                "message": message_dict,
            })

            # Broadcast to all other clients in the room
            broadcast_payload = {
                "id": message_dict["id"],
                "room_id": message_dict["room_id"],
                "sender_id": message_dict["sender_id"],
                "sender_name": message_dict["sender_name"],
                "sender_avatar": message_dict.get("sender_avatar"),
                "content": message_dict["content"],
                "message_type": message_dict.get("message_type", "text"),
                "created_at": message_dict["created_at"],
                "timestamp": message_dict.get("timestamp"),
                "read_by_peer": message_dict.get("read_by_peer", False),
            }

            emit("receive_message", broadcast_payload, room=_room_channel(room_id), include_self=False)
            logger.info(f"[Socket] Message sent to room {room_id} by user {user_id}")

        except RoomAccessError as exc:
            emit("chat_error", {"message": str(exc)})
        except Exception as exc:
            logger.error(f"[Socket] SEND_MESSAGE error: {exc}", exc_info=True)
            emit("chat_error", {"message": "Failed to send message"})
        finally:
            if db_session:
                db_session.close()

    @socketio.on("typing")
    def handle_typing(data):
        sid = request.sid
        user_id = _socket_users.get(sid)
        if not user_id or not data:
            return

        try:
            room_id = int(data.get("room_id"))
            typing = bool(data.get("typing"))
        except (TypeError, ValueError):
            return

        if room_id < 1 or not db_session_factory:
            return

        db_session = None
        try:
            db_session = db_session_factory()
            if not validate_room_membership(db_session, room_id, user_id):
                return
            emit(
                "user_typing",
                {"room_id": room_id, "user_id": str(user_id), "typing": typing},
                room=_room_channel(room_id),
                include_self=False,
            )
        except Exception as exc:
            logger.error(f"[Socket] TYPING error: {exc}", exc_info=True)
        finally:
            if db_session:
                db_session.close()

    @socketio.on("mark_read")
    def handle_mark_read(data):
        sid = request.sid
        user_id = _socket_users.get(sid)
        if not user_id:
            emit("chat_error", {"message": "Not authenticated"})
            return

        if not data:
            emit("chat_error", {"message": "Invalid request"})
            return

        try:
            room_id = int(data.get("room_id"))
            message_id = int(data.get("message_id"))
        except (TypeError, ValueError):
            emit("chat_error", {"message": "Invalid mark_read payload"})
            return

        if room_id < 1 or message_id < 1 or not db_session_factory:
            emit("chat_error", {"message": "Invalid mark_read"})
            return

        db_session = None
        try:
            db_session = db_session_factory()
            if not validate_room_membership(db_session, room_id, user_id):
                emit("chat_error", {"message": "Not a member of this room"})
                return

            changed, cursor = update_room_member_last_read(db_session, room_id, user_id, message_id)
            if changed:
                db_session.commit()
                emit(
                    "messages_read",
                    {
                        "room_id": room_id,
                        "reader_id": str(user_id),
                        "last_read_message_id": cursor,
                    },
                    room=_room_channel(room_id),
                    include_self=False,
                )
            else:
                db_session.rollback()
        except RoomAccessError as exc:
            if db_session:
                db_session.rollback()
            emit("chat_error", {"message": str(exc)})
        except Exception as exc:
            logger.error(f"[Socket] MARK_READ error: {exc}", exc_info=True)
            if db_session:
                db_session.rollback()
            emit("chat_error", {"message": "Failed to update read state"})
        finally:
            if db_session:
                db_session.close()

    @socketio.on("get_messages")
    def handle_get_messages(data):
        sid = request.sid
        user_id = _socket_users.get(sid)
        
        logger.info(f"[Socket] GET_MESSAGES - sid={sid}, user_id={user_id}")
        
        if not user_id:
            logger.error(f"[Socket] GET_MESSAGES failed - No user_id for sid={sid}")
            emit("chat_error", {"message": "Not authenticated"})
            return

        if not data:
            emit("chat_error", {"message": "Invalid request"})
            return

        try:
            room_id = int(data.get("room_id"))
            page = int(data.get("page", 1))
            page_size = min(int(data.get("page_size", 50)), 100)
            raw_cursor = data.get("cursor")
            cursor = int(raw_cursor) if raw_cursor is not None else None
        except (TypeError, ValueError):
            emit("chat_error", {"message": "Invalid message query"})
            return

        if not room_id:
            emit("chat_error", {"message": "room_id required"})
            return

        if not db_session_factory:
            emit("chat_error", {"message": "Database not available"})
            return

        db_session = None
        try:
            db_session = db_session_factory()
            result = get_room_messages(
                session=db_session,
                room_id=room_id,
                user_id=user_id,
                page=page,
                page_size=page_size,
                cursor=cursor,
            )
            emit("messages_history", result)
        except RoomAccessError as exc:
            emit("chat_error", {"message": str(exc)})
        except Exception as exc:
            logger.error(f"[Socket] GET_MESSAGES error: {exc}", exc_info=True)
            emit("chat_error", {"message": "Failed to load messages"})
        finally:
            if db_session:
                db_session.close()