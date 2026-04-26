# backend/services/chat_service/chat_service/services/message_service.py
from __future__ import annotations

import uuid
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from backend.common.models import Message, ChatRoomMember, Profile
from backend.services.chat_service.chat_service.services.room_service import RoomAccessError
from backend.services.chat_service.chat_service.services.serialization import serialize_message

logger = logging.getLogger(__name__)


def create_message(
    session: Session,
    room_id: int,
    sender_id: uuid.UUID,
    content: str,
    message_type: str = "text"
) -> dict:
    """Create and save a new message to the database with transaction safety."""
    logger.info(f"[MessageService] Creating message in room {room_id} from user {sender_id}")
    
    try:
        # Verify user is still a member of the room
        is_member = session.query(ChatRoomMember).filter(
            ChatRoomMember.room_id == room_id,
            ChatRoomMember.user_id == sender_id
        ).first() is not None
        
        if not is_member:
            logger.error(f"[MessageService] User {sender_id} is not a member of room {room_id}")
            raise RoomAccessError(f"User {sender_id} is not a member of room {room_id}")
        
        # Create message
        now = datetime.utcnow()
        message = Message(
            room_id=room_id,
            sender_id=sender_id,
            content=content,
            message_type=message_type,
            created_at=now
        )
        session.add(message)
        session.flush()  # Get the ID without committing
        session.refresh(message)
        
        # Get sender info for response
        sender = session.query(Profile).filter(Profile.id == sender_id).first()
        
        logger.info(f"[MessageService] Message created with ID: {message.id}")
        
        # Use centralized serialization
        return serialize_message(message, sender, sender_id)
        
    except SQLAlchemyError as e:
        logger.error(f"[MessageService] Database error: {e}", exc_info=True)
        session.rollback()
        raise e


def get_room_messages(
    session: Session,
    room_id: int,
    user_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
    cursor: int | None = None
) -> dict:
    """Get messages for a room with cursor-based pagination."""
    logger.info(f"[MessageService] Getting messages for room {room_id}, user {user_id}, page {page}")
    
    # Verify user is a member
    is_member = session.query(ChatRoomMember).filter(
        ChatRoomMember.room_id == room_id,
        ChatRoomMember.user_id == user_id
    ).first() is not None
    
    if not is_member:
        logger.warning(f"[MessageService] User {user_id} not a member of room {room_id}")
        raise RoomAccessError(f"User {user_id} is not a member of room {room_id}")
    
    # Query messages with sender info in a single JOIN query
    base_query = (
        session.query(Message, Profile)
        .join(Profile, Profile.id == Message.sender_id)
        .filter(Message.room_id == room_id)
    )

    if cursor:
        # Cursor-based pagination: get messages after cursor
        query = (
            base_query
            .filter(Message.id > cursor)
            .order_by(Message.id.asc())
        )
        messages_with_senders = query.limit(page_size).all()
        has_more = len(messages_with_senders) == page_size
        next_cursor = messages_with_senders[-1][0].id if has_more else None
    else:
        # Page-based pagination (legacy)
        offset = (page - 1) * page_size
        query = base_query.order_by(Message.id.desc()).offset(offset).limit(page_size)
        messages_with_senders = query.all()
        # Reverse to get chronological order
        messages_with_senders = list(reversed(messages_with_senders))
        
        # Get total count
        total = session.query(Message).filter(Message.room_id == room_id).count()
        next_cursor = None
        has_more = (page * page_size) < total
    
    # Process messages using centralized serialization
    result_messages = []
    for msg, sender in messages_with_senders:
        result_messages.append(serialize_message(msg, sender, user_id))
    
    logger.info(f"[MessageService] Retrieved {len(result_messages)} messages for room {room_id}")
    
    return {
        "messages": result_messages,
        "total": len(result_messages),
        "page": page,
        "page_size": page_size,
        "next_cursor": next_cursor,
        "has_more": has_more
    }