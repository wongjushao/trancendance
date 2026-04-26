# backend/services/chat_service/chat_service/services/room_service.py
from __future__ import annotations

import uuid
import logging
from typing import Any, List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_, and_, func

from backend.common.models import (
    ChatRoom, 
    ChatRoomMember, 
    Message,
    Friendship,
    Course,
    CourseMember,
    OrganizationMember,
    Profile
)

logger = logging.getLogger(__name__)


class RoomAccessError(PermissionError):
    pass


def ensure_db_session(db_session: Any) -> None:
    """Ensure database session is configured."""
    if db_session is None:
        raise RuntimeError("Database is not configured. Set valid DATABASE_URL")


def list_user_rooms(session: Session, user_id: uuid.UUID) -> List[dict]:
    """Get all chat rooms for a user with last message (fully optimized with deduplication)."""
    logger.info(f"[RoomService] Listing rooms for user {user_id}")
    
    try:
        # First, get distinct room IDs the user is a member of
        user_room_ids = (
            session.query(ChatRoomMember.room_id)
            .filter(ChatRoomMember.user_id == user_id)
            .distinct()
            .subquery()
        )
        
        # Subquery to get exactly one latest message per room
        ranked_messages_subq = (
            session.query(
                Message.room_id,
                Message.content.label("last_content"),
                Message.created_at.label("last_created_at"),
                func.row_number()
                .over(
                    partition_by=Message.room_id,
                    order_by=Message.created_at.desc(),
                )
                .label("rn"),
            )
            .filter(Message.room_id.in_(user_room_ids))
            .subquery()
        )
        
        last_message_subq = (
            session.query(
                ranked_messages_subq.c.room_id,
                ranked_messages_subq.c.last_content,
                ranked_messages_subq.c.last_created_at,
            )
            .filter(ranked_messages_subq.c.rn == 1)
            .subquery()
        )
        
        # Query rooms with last messages using distinct rooms
        rooms = (
            session.query(ChatRoom, last_message_subq.c.last_content, last_message_subq.c.last_created_at)
            .filter(ChatRoom.id.in_(user_room_ids))
            .outerjoin(last_message_subq, last_message_subq.c.room_id == ChatRoom.id)
            .distinct()
            .order_by(ChatRoom.created_at.desc())
            .all()
        )
        
        # Batch fetch all course titles for course rooms
        course_ids = {room.related_course_id for room, _, _ in rooms if room.type == "course" and room.related_course_id}
        courses = {}
        if course_ids:
            courses = {
                c.id: c.title 
                for c in session.query(Course).filter(Course.id.in_(course_ids)).all()
            }
        
        # Batch fetch all other users for DM rooms
        dm_room_ids = {room.id for room, _, _ in rooms if room.type == "direct"}
        dm_profiles = {}
        if dm_room_ids:
            other_members = (
                session.query(Profile, ChatRoomMember.room_id)
                .join(ChatRoomMember, ChatRoomMember.user_id == Profile.id)
                .filter(
                    ChatRoomMember.room_id.in_(dm_room_ids),
                    Profile.id != user_id
                )
                .distinct()
                .all()
            )
            for profile, room_id in other_members:
                if room_id not in dm_profiles:
                    dm_profiles[room_id] = profile
        
        result = []
        for room, last_content, last_created_at in rooms:
            # Get display name from pre-fetched data
            if room.type == "direct":
                profile = dm_profiles.get(room.id)
                if profile:
                    if profile.username:
                        display_name = profile.username
                    elif profile.first_name and profile.last_name:
                        display_name = f"{profile.first_name} {profile.last_name}"
                    elif profile.first_name:
                        display_name = profile.first_name
                    else:
                        display_name = "User"
                else:
                    display_name = "Unknown User"
            elif room.type == "course" and room.related_course_id:
                display_name = courses.get(room.related_course_id, "Course Chat")
            else:
                display_name = "Group Chat"
            
            result.append({
                "id": room.id,
                "type": room.type,
                "related_course_id": room.related_course_id,
                "display_name": display_name,
                "last_message": last_content,
                "last_message_time": last_created_at.isoformat() if last_created_at else None,
                "created_at": room.created_at.isoformat() if room.created_at else None,
            })
        
        # Remove duplicates by room id
        seen_ids = set()
        unique_result = []
        for room_dict in result:
            if room_dict["id"] not in seen_ids:
                seen_ids.add(room_dict["id"])
                unique_result.append(room_dict)
        
        logger.info(f"[RoomService] Found {len(unique_result)} rooms for user {user_id}")
        return unique_result
        
    except SQLAlchemyError as e:
        logger.error(f"[RoomService] Database error: {e}", exc_info=True)
        session.rollback()
        raise e


def validate_room_membership(
    session: Session,
    room_id: int,
    user_id: uuid.UUID
) -> bool:
    """Check if user is a member of the room."""
    try:
        member = (
            session.query(ChatRoomMember)
            .filter(
                ChatRoomMember.room_id == room_id,
                ChatRoomMember.user_id == user_id
            )
            .first()
        )
        is_member = member is not None
        if not is_member:
            logger.warning(f"[RoomService] User {user_id} is NOT a member of room {room_id}")
        return is_member
    except Exception as e:
        logger.error(f"[RoomService] Error checking membership: {e}")
        return False


def get_or_create_dm_room(session: Session, user1_id: uuid.UUID, user2_id: uuid.UUID) -> int:
    """
    Find existing DM room between two users, or create a new one.
    Returns room ID.
    """
    # Look for a direct room where both users are members
    # Subquery to get rooms where user1 is member
    subq1 = session.query(ChatRoomMember.room_id).filter(ChatRoomMember.user_id == user1_id).subquery()
    subq2 = session.query(ChatRoomMember.room_id).filter(ChatRoomMember.user_id == user2_id).subquery()
    
    # Intersection: rooms where both are members
    existing = (
        session.query(ChatRoom)
        .filter(ChatRoom.type == 'direct')
        .filter(ChatRoom.id.in_(subq1))
        .filter(ChatRoom.id.in_(subq2))
        .first()
    )
    
    if existing:
        return existing.id
    
    # Create new room
    new_room = ChatRoom(type='direct')
    session.add(new_room)
    session.flush()  # get id
    
    # Add members
    session.add(ChatRoomMember(room_id=new_room.id, user_id=user1_id))
    session.add(ChatRoomMember(room_id=new_room.id, user_id=user2_id))
    session.commit()
    
    return new_room.id


def get_or_create_course_room(session: Session, course_id: int) -> int:
    """
    Find existing course room for the given course, or create a new one.
    Returns room ID.
    """
    existing = session.query(ChatRoom).filter(
        ChatRoom.type == 'course',
        ChatRoom.related_course_id == course_id
    ).first()
    
    if existing:
        return existing.id
    
    # Create new room
    new_room = ChatRoom(
        type='course',
        related_course_id=course_id
    )
    session.add(new_room)
    session.commit()
    
    return new_room.id


def can_dm(session: Session, user1_id: uuid.UUID, user2_id: uuid.UUID) -> bool:
    """
    Check if two users can direct message each other.
    Rule: They must be in the same organization OR be friends.
    """
    # Check if they share any organization
    from backend.common.models import OrganizationMember
    shared_org = (
        session.query(OrganizationMember)
        .filter(OrganizationMember.user_id == user1_id)
        .join(OrganizationMember, OrganizationMember.user_id == user2_id, and_(
            OrganizationMember.organization_id == OrganizationMember.organization_id
        ))
        .first()
    )
    if shared_org:
        return True
    
    # Check if they are friends (status 'accepted')
    friendship = session.query(Friendship).filter(
        or_(
            and_(Friendship.requester_id == user1_id, Friendship.addressee_id == user2_id),
            and_(Friendship.requester_id == user2_id, Friendship.addressee_id == user1_id)
        ),
        Friendship.status == 'accepted'
    ).first()
    
    return friendship is not None