def create_message(room_id, sender_id, content, db_session):
    # Insert message into DB
    # Return serialized message
    return {
        "id": 1,
        "room_id": room_id,
        "sender_id": sender_id,
        "content": content,
        "created_at": "2023-10-27T10:00:00Z"
    }

def get_room_messages(room_id, user_id, db_session, limit=50):
    # Validate membership
    # Fetch last 50 messages
    return []
