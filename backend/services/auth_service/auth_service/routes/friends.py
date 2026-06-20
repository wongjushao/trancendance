from __future__ import annotations

import uuid

from flask import current_app, jsonify, request
from flask_restx import Namespace, Resource
from sqlalchemy import and_, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from backend.common.models import ChatRoom, ChatRoomMember, Friendship, Message, Profile
from backend.services.auth_service.auth_service.utils.supabase_jwt import extract_bearer_token, verify_supabase_jwt

friends_ns = Namespace("friends", path="/api/auth-service/friends", description="Friendship endpoints")


def _current_user_id():
    token = extract_bearer_token()
    if token is None:
        return None, (jsonify({"error": "Missing authorization header"}), 401)

    user_id, _email = verify_supabase_jwt(token)
    if not user_id:
        return None, (jsonify({"error": "Invalid token"}), 401)

    try:
        return uuid.UUID(str(user_id)), None
    except (TypeError, ValueError):
        return None, (jsonify({"error": "Invalid token"}), 401)


def _parse_profile_id(profile_id: str):
    try:
        return uuid.UUID(profile_id), None
    except ValueError:
        return None, (jsonify({"error": "Invalid profile id"}), 400)


def _friendship_query(session, user_id: uuid.UUID, profile_id: uuid.UUID):
    return session.query(Friendship).filter(
        or_(
            and_(Friendship.requester_id == user_id, Friendship.addressee_id == profile_id),
            and_(Friendship.requester_id == profile_id, Friendship.addressee_id == user_id),
        )
    )


def _serialize_friendship(friendship: Friendship | None, user_id: uuid.UUID) -> dict:
    if friendship is None:
        return {"status": "none"}

    if friendship.status == "accepted":
        status = "accepted"
    elif friendship.status == "rejected":
        status = "rejected"
    elif friendship.requester_id == user_id:
        status = "pending_sent"
    else:
        status = "pending_received"

    return {
        "id": friendship.id,
        "status": status,
        "raw_status": friendship.status,
        "requester_id": str(friendship.requester_id),
        "addressee_id": str(friendship.addressee_id),
    }


def _get_or_create_dm_room(session, user_id: uuid.UUID, profile_id: uuid.UUID) -> int:
    current_user_rooms = session.query(ChatRoomMember.room_id).filter(ChatRoomMember.user_id == user_id).subquery()
    target_user_rooms = session.query(ChatRoomMember.room_id).filter(ChatRoomMember.user_id == profile_id).subquery()

    existing = (
        session.query(ChatRoom)
        .filter(ChatRoom.type == "direct")
        .filter(ChatRoom.id.in_(current_user_rooms))
        .filter(ChatRoom.id.in_(target_user_rooms))
        .first()
    )
    if existing:
        return existing.id

    room = ChatRoom(type="direct")
    session.add(room)
    session.flush()
    session.add(ChatRoomMember(room_id=room.id, user_id=user_id))
    session.add(ChatRoomMember(room_id=room.id, user_id=profile_id))
    return room.id


def _create_friend_request_message(
    session,
    room_id: int,
    requester_id: uuid.UUID,
    addressee_id: uuid.UUID,
) -> None:
    existing = (
        session.query(Message)
        .filter(
            Message.room_id == room_id,
            Message.sender_id == requester_id,
            Message.message_type == "friend_request",
        )
        .first()
    )
    if existing:
        return

    requester = session.query(Profile).filter(Profile.id == requester_id).first()
    requester_name = "This user"
    if requester:
        requester_name = (
            requester.username
            or " ".join(part for part in [requester.first_name, requester.last_name] if part)
            or "This user"
        )

    session.add(
        Message(
            room_id=room_id,
            sender_id=requester_id,
            content=f"{requester_name} sent you a friend request.",
            message_type="friend_request",
        )
    )


def get_friend_status(profile_id: str):
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return jsonify({"error": "Database is not configured"}), 503

    user_id, auth_error = _current_user_id()
    if auth_error:
        return auth_error

    target_id, parse_error = _parse_profile_id(profile_id)
    if parse_error:
        return parse_error

    if target_id == user_id:
        return jsonify({"status": "self"}), 200

    session = db_session()
    try:
        friendship = _friendship_query(session, user_id, target_id).first()
        return jsonify(_serialize_friendship(friendship, user_id)), 200
    except SQLAlchemyError as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()


def request_friend(profile_id: str):
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return jsonify({"error": "Database is not configured"}), 503

    user_id, auth_error = _current_user_id()
    if auth_error:
        return auth_error

    target_id, parse_error = _parse_profile_id(profile_id)
    if parse_error:
        return parse_error

    if target_id == user_id:
        return jsonify({"error": "You cannot add yourself as a friend"}), 400

    session = db_session()
    try:
        target = session.query(Profile.id).filter(Profile.id == target_id).first()
        if not target:
            return jsonify({"error": "Profile not found"}), 404

        friendship = _friendship_query(session, user_id, target_id).first()

        room_id = _get_or_create_dm_room(session, user_id, target_id)

        if friendship:
            if friendship.status == "pending" and friendship.addressee_id == user_id:
                friendship.status = "accepted"
                session.commit()
                payload = _serialize_friendship(friendship, user_id)
                payload["room_id"] = room_id
                return jsonify(payload), 200

            session.commit()
            payload = _serialize_friendship(friendship, user_id)
            payload["room_id"] = room_id
            return jsonify(payload), 200

        friendship = Friendship(
            requester_id=user_id,
            addressee_id=target_id,
            status="pending",
        )
        session.add(friendship)
        _create_friend_request_message(session, room_id, user_id, target_id)
        session.commit()
        session.refresh(friendship)
        payload = _serialize_friendship(friendship, user_id)
        payload["room_id"] = room_id
        return jsonify(payload), 201
    except IntegrityError:
        session.rollback()
        friendship = _friendship_query(session, user_id, target_id).first()
        return jsonify(_serialize_friendship(friendship, user_id)), 200
    except SQLAlchemyError as exc:
        session.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()


def respond_friend(profile_id: str):
    db_session = current_app.config.get("DB_SESSION")
    if db_session is None:
        return jsonify({"error": "Database is not configured"}), 503

    user_id, auth_error = _current_user_id()
    if auth_error:
        return auth_error

    target_id, parse_error = _parse_profile_id(profile_id)
    if parse_error:
        return parse_error

    payload = request.get_json(silent=True) or {}
    action = str(payload.get("action", "")).lower()
    if action not in {"accept", "reject"}:
        return jsonify({"error": "Action must be 'accept' or 'reject'"}), 400

    session = db_session()
    try:
        friendship = _friendship_query(session, user_id, target_id).first()
        if not friendship:
            return jsonify({"error": "Friend request not found"}), 404

        if friendship.addressee_id != user_id:
            return jsonify({"error": "Only the request recipient can respond"}), 403

        if friendship.status == "pending":
            friendship.status = "accepted" if action == "accept" else "rejected"
            session.commit()

        return jsonify(_serialize_friendship(friendship, user_id)), 200
    except SQLAlchemyError as exc:
        session.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        session.close()


@friends_ns.route("/status/<profile_id>")
class FriendStatusResource(Resource):
    def get(self, profile_id: str):
        return get_friend_status(profile_id)


@friends_ns.route("/request/<profile_id>")
class FriendRequestResource(Resource):
    def post(self, profile_id: str):
        return request_friend(profile_id)


@friends_ns.route("/respond/<profile_id>")
class FriendRespondResource(Resource):
    def post(self, profile_id: str):
        return respond_friend(profile_id)
