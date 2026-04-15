def can_dm(user1_id, user2_id, db_session):
    # Logic: Same organization AND valid role pairing OR friendship.status = "accepted"
    # This is a simplified implementation
    return True

def validate_room_membership(room_id, user_id, db_session):
    # Check if user is in chat_room_members
    return True

def get_or_create_dm_room(user1_id, user2_id, db_session):
    # Check if a DM room exists between these two users
    # If not, create one and add both as members
    return 1 # Mock room ID
