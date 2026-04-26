#!/usr/bin/env python3
"""
Chat Service Testing Script (FULL FLOW)

Flow:
1. Connect to DB
2. Fetch specific users by name
3. Make them friends
4. Create DM room
5. Send messages
6. Retrieve messages
"""

import os
import time
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

# ---------------- COLORS ----------------
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_success(msg): print(f"{Colors.GREEN}✓ {msg}{Colors.END}")
def print_error(msg): print(f"{Colors.RED}✗ {msg}{Colors.END}")
def print_info(msg): print(f"{Colors.BLUE}ℹ {msg}{Colors.END}")

def print_header(msg):
    print(f"\n{Colors.HEADER}{'='*60}")
    print(f"{msg:^60}")
    print(f"{'='*60}{Colors.END}\n")

# ---------------- MAIN CLASS ----------------
class ChatTester:
    def __init__(self):
        self.supabase: Optional[Client] = None
        self.user1_id = None
        self.user2_id = None

    # ---------------- DB ----------------
    def connect_database(self):
        print_info("Connecting to database...")

        if not SUPABASE_URL or not SUPABASE_KEY:
            print_error("Missing Supabase env variables")
            return False

        try:
            self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            print_success("Connected to database")
            return True
        except Exception as e:
            print_error(f"Connection failed: {e}")
            return False

    # ---------------- FETCH USERS (UPDATED) ----------------
    def get_two_users(self):
        print_info("Fetching specific users from database...")

        try:
            USER1_USERNAME = "aissa_aissa"
            USER2_PATTERN = "isa"

            # user1 exact
            res1 = self.supabase.table('profiles') \
                .select('id, username') \
                .eq('username', USER1_USERNAME) \
                .execute()

            if not res1.data:
                print_error("User1 not found")
                return False

            user1 = res1.data[0]

            # user2 partial match
            res2 = self.supabase.table('profiles') \
                .select('id, username') \
                .ilike('username', f"%{USER2_PATTERN}%") \
                .execute()

            user2 = None
            for u in res2.data:
                if u['id'] != user1['id']:
                    user2 = u
                    break

            if not user2:
                print_error("User2 not found")
                return False

            self.user1_id = user1['id']
            self.user2_id = user2['id']

            print_success(f"User 1: {user1['username']} ({self.user1_id})")
            print_success(f"User 2: {user2['username']} ({self.user2_id})")

            return True

        except Exception as e:
            print_error(f"User fetch failed: {e}")
            return False

    # ---------------- FRIENDSHIP ----------------
    def make_friends(self):
        print_info("Creating friendship...")

        existing = self.supabase.table('friendships') \
            .select('*') \
            .or_(f"and(requester_id.eq.{self.user1_id},addressee_id.eq.{self.user2_id}),and(requester_id.eq.{self.user2_id},addressee_id.eq.{self.user1_id})") \
            .execute()

        if existing.data:
            print_info("Already friends")
            return True

        self.supabase.table('friendships').insert([
            {'requester_id': self.user1_id, 'addressee_id': self.user2_id, 'status': 'accepted'},
            {'requester_id': self.user2_id, 'addressee_id': self.user1_id, 'status': 'accepted'}
        ]).execute()

        print_success("Friendship created")
        return True

    # ---------------- ROOM ----------------
    def create_dm_room(self):
        print_info("Creating DM room...")

        room = self.supabase.table('chat_rooms').insert({
            'type': 'direct',
            'related_course_id': None
        }).execute()

        room_id = room.data[0]['id']

        self.supabase.table('chat_room_members').insert([
            {'room_id': room_id, 'user_id': self.user1_id},
            {'room_id': room_id, 'user_id': self.user2_id}
        ]).execute()

        print_success(f"Room created: {room_id}")
        return room_id

    # ---------------- SEND ----------------
    def send_message(self, room_id, sender, content):
        self.supabase.table('messages').insert({
            'room_id': room_id,
            'sender_id': sender,
            'content': content,
            'message_type': 'text'
        }).execute()

        print_success(f"Message: {content}")

    # ---------------- FETCH ----------------
    def get_messages(self, room_id):
        res = self.supabase.table('messages') \
            .select('*') \
            .eq('room_id', room_id) \
            .order('created_at') \
            .execute()

        return res.data

    # ---------------- DISPLAY ----------------
    def display(self, msgs):
        print("\nMessages:")
        print("-" * 50)
        for m in msgs:
            print(f"{m['sender_id'][:8]}: {m['content']}")
        print("-" * 50)

    # ---------------- FULL TEST ----------------
    def run(self):
        print_header("CHAT SERVICE TEST")

        if not self.connect_database(): return
        if not self.get_two_users(): return
        self.make_friends()

        room_id = self.create_dm_room()

        print_header("SENDING")

        msgs = [
            (self.user1_id, "Hello from Aissa"),
            (self.user2_id, "Hello from Isa"),
            (self.user1_id, "Testing full pipeline"),
        ]

        for u, m in msgs:
            self.send_message(room_id, u, m)
            time.sleep(0.3)

        print_header("RETRIEVING")

        data = self.get_messages(room_id)
        self.display(data)

        print_header("DONE")
        print_success(f"Room ID: {room_id}")
        print_success(f"Messages: {len(data)}")


# ---------------- ENTRY ----------------
if __name__ == "__main__":
    ChatTester().run()
