from flask import request
from flask_socketio import emit, join_room, leave_room
from chat_service.services.message_service import create_message, get_room_messages
from chat_service.services.room_service import validate_room_membership

def _room_channel(room_id: int) -> str:
    return f"room_{room_id}"

def init_socket_events(socketio) -> None:
    @socketio.on("connect")
    def handle_connect(auth=None):
        # In a real app, authenticate via JWT
        # user_id = authenticate(auth.get('token'))
        # request.environ["chat_user_id"] = user_id
        request.environ["chat_user_id"] = "me" # Mock user
        return True

    @socketio.on("join_room")
    def handle_join_room(payload):
        room_id = payload.get("room_id")
        user_id = request.environ.get("chat_user_id")
        
        # validate_room_membership(room_id, user_id)
        join_room(_room_channel(room_id))
        emit("room_joined", {"room_id": room_id})

    @socketio.on("get_messages")
    def handle_get_messages(payload):
        room_id = payload.get("room_id")
        user_id = request.environ.get("chat_user_id")
        
        # messages = get_room_messages(room_id, user_id)
        messages = [] # Mock empty history
        emit("messages_history", {"room_id": room_id, "messages": messages})

    @socketio.on("send_message")
    def handle_send_message(payload):
        room_id = payload.get("room_id")
        content = payload.get("content")
        user_id = request.environ.get("chat_user_id")
        
        # message = create_message(room_id, user_id, content)
        message = {
            "id": "new-id",
            "room_id": room_id,
            "senderId": user_id,
            "text": content,
            "timestamp": "Now",
            "isMe": False
        }
        emit("receive_message", message, room=_room_channel(room_id), include_self=False)
