# backend/services/chat_service/chat_service/services/serialization.py
from __future__ import annotations

import uuid
from typing import Any
from datetime import timezone

from backend.common.models import Message, Profile


def serialize_message(
    message: Message,
    sender: Profile | None,
    current_user_id: uuid.UUID | None = None,
    *,
    peer_last_read_message_id: int | None = None,
) -> dict[str, Any]:
    """
    Centralized message serialization function.
    
    Ensures consistent message format across:
    - HTTP API responses
    - Socket events
    - DB query outputs
    
    Args:
        message: The Message object to serialize
        sender: The Profile object of the message sender
        current_user_id: UUID of current user (for is_me flag)
    
    Returns:
        Dictionary with standardized message format
    """
    # Build sender name
    sender_name = None
    if sender:
        if sender.username:
            sender_name = sender.username
        elif sender.first_name and sender.last_name:
            sender_name = f"{sender.first_name} {sender.last_name}"
        elif sender.first_name:
            sender_name = sender.first_name
        else:
            sender_name = "User"
    else:
        sender_name = "Unknown User"
    
    # Format timestamp
    timestamp = message.created_at.strftime("%I:%M %p") if message.created_at else None
    
    created_at = None
    if message.created_at:
        # Message timestamps are stored in UTC. Include the timezone marker so
        # browsers do not parse the value as local time.
        created_at = message.created_at.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")

    read_by_peer = False
    if (
        peer_last_read_message_id is not None
        and current_user_id is not None
        and message.sender_id == current_user_id
    ):
        read_by_peer = message.id <= peer_last_read_message_id

    return {
        "id": message.id,
        "room_id": message.room_id,
        "sender_id": str(message.sender_id),
        "sender_name": sender_name,
        "sender_avatar": sender.avatar_url if sender else None,
        "content": message.content,
        "message_type": message.message_type,
        "created_at": created_at,
        "timestamp": timestamp,
        "is_me": current_user_id is not None and str(message.sender_id) == str(current_user_id),
        "read_by_peer": read_by_peer,
    }
