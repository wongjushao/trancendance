#!/usr/bin/env python3
"""
Course Chat Testing Script
This script:
1. Connects to the database
2. Fetches two users (Isa and Aissa - or first two users)
3. Creates a test course
4. Adds both users as members of the course
5. Creates/retrieves the course chat room
6. Sends test messages in the course chat
7. Verifies messages can be retrieved
"""

import os
import sys
import uuid
import time
from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

# Colors for console output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_success(msg: str):
    print(f"{Colors.GREEN}✓ {msg}{Colors.END}")

def print_error(msg: str):
    print(f"{Colors.RED}✗ {msg}{Colors.END}")

def print_info(msg: str):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.END}")

def print_warning(msg: str):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.END}")

def print_header(msg: str):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{Colors.HEADER}{Colors.BOLD}{msg:^60}{Colors.END}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.END}\n")

class CourseChatTester:
    def __init__(self):
        self.supabase: Optional[Client] = None
        self.user1: Optional[Dict] = None
        self.user2: Optional[Dict] = None
        self.course_id: Optional[int] = None
        self.chat_room_id: Optional[int] = None
        self.organization_id: Optional[int] = None
        
    def connect_database(self) -> bool:
        """Connect to Supabase database"""
        print_info("Connecting to database...")
        
        if not SUPABASE_URL or not SUPABASE_KEY:
            print_error("SUPABASE_URL or SUPABASE_KEY not found in environment")
            return False
            
        try:
            self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            print_success("Connected to database")
            return True
        except Exception as e:
            print_error(f"Failed to connect: {e}")
            return False
    
    def get_or_create_organization(self) -> bool:
        """Get or create an organization for the course"""
        print_info("Setting up organization...")
        
        try:
            # Try to get an existing organization
            org_response = self.supabase.table('organizations').select('id, name').limit(1).execute()
            
            if org_response.data:
                self.organization_id = org_response.data[0]['id']
                print_success(f"Using existing organization: {org_response.data[0]['name']} (ID: {self.organization_id})")
                return True
            
            # Create a new organization if none exists
            new_org = {
                'name': 'Test Organization',
                'description': 'Organization created for course chat testing',
                'created_by': self.user1['id']
            }
            
            org_response = self.supabase.table('organizations').insert(new_org).execute()
            self.organization_id = org_response.data[0]['id']
            print_success(f"Created new organization: Test Organization (ID: {self.organization_id})")
            
            # Add both users to the organization
            members = [
                {'organization_id': self.organization_id, 'user_id': self.user1['id'], 'member_role': 'admin'},
                {'organization_id': self.organization_id, 'user_id': self.user2['id'], 'member_role': 'member'}
            ]
            self.supabase.table('organization_members').insert(members).execute()
            print_success(f"Added both users to organization")
            
            return True
            
        except Exception as e:
            print_error(f"Failed to setup organization: {e}")
            return False
    
    def fetch_users(self, user1_name: str = "Isa", user2_name: str = "Aissa") -> bool:
        """Fetch users by name or get first two users"""
        print_info(f"Looking for users: {user1_name} and {user2_name}...")
        
        try:
            # Try to find users by name in profiles
            # Note: profiles table doesn't have name field directly, it has first_name/last_name or username
            # Let's try to find by username or name patterns
            
            # Get all profiles
            response = self.supabase.table('profiles').select('id, username, first_name, last_name').execute()
            
            if not response.data or len(response.data) < 2:
                print_error(f"Found only {len(response.data) if response.data else 0} users. Need at least 2 users.")
                return False
            
            # Try to find specific users
            user1_found = None
            user2_found = None
            
            for profile in response.data:
                full_name = f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip()
                username = profile.get('username', '')
                
                if user1_name.lower() in full_name.lower() or user1_name.lower() in username.lower():
                    user1_found = profile
                elif user2_name.lower() in full_name.lower() or user2_name.lower() in username.lower():
                    user2_found = profile
            
            # If specific users not found, take first two
            if not user1_found:
                user1_found = response.data[0]
                print_warning(f"User '{user1_name}' not found, using: {user1_found.get('username', user1_found['id'][:8])}")
            else:
                print_success(f"Found user 1: {user1_found.get('username', user1_found['id'][:8])}")
                
            if not user2_found:
                user2_found = response.data[1]
                print_warning(f"User '{user2_name}' not found, using: {user2_found.get('username', user2_found['id'][:8])}")
            else:
                print_success(f"Found user 2: {user2_found.get('username', user2_found['id'][:8])}")
            
            self.user1 = user1_found
            self.user2 = user2_found
            
            # Get emails from auth.users
            try:
                auth_response = self.supabase.auth.admin.list_users()
                users_by_id = {user.id: user.email for user in auth_response.users}
                self.user1['email'] = users_by_id.get(self.user1['id'], f"user1_{self.user1['id'][:8]}@test.com")
                self.user2['email'] = users_by_id.get(self.user2['id'], f"user2_{self.user2['id'][:8]}@test.com")
            except:
                self.user1['email'] = f"user_{self.user1['id'][:8]}@test.com"
                self.user2['email'] = f"user_{self.user2['id'][:8]}@test.com"
            
            print_success(f"User 1 ID: {self.user1['id']} ({self.user1['email']})")
            print_success(f"User 2 ID: {self.user2['id']} ({self.user2['email']})")
            return True
            
        except Exception as e:
            print_error(f"Failed to fetch users: {e}")
            return False
    
    def create_test_course(self) -> bool:
        """Create a test course"""
        print_info("Creating test course...")
        
        try:
            # First, ensure we have an organization
            if not self.organization_id:
                if not self.get_or_create_organization():
                    return False
            
            course_data = {
                'organization_id': self.organization_id,
                'title': 'Test Course for Chat',
                'description': 'This is a test course created for testing course chat functionality',
                'visibility': 'public',
                'created_by': self.user1['id']
            }
            
            response = self.supabase.table('courses').insert(course_data).execute()
            self.course_id = response.data[0]['id']
            
            print_success(f"Created test course: Test Course for Chat (ID: {self.course_id})")
            return True
            
        except Exception as e:
            print_error(f"Failed to create course: {e}")
            return False
    
    def add_users_to_course(self) -> bool:
        """Add both users as members of the course"""
        print_info("Adding users to course...")
        
        try:
            members = [
                {
                    'course_id': self.course_id,
                    'user_id': self.user1['id'],
                    'role': 'instructor'
                },
                {
                    'course_id': self.course_id,
                    'user_id': self.user2['id'],
                    'role': 'student'
                }
            ]
            
            self.supabase.table('course_members').insert(members).execute()
            print_success(f"Added {self.user1['email'][:20]} as instructor")
            print_success(f"Added {self.user2['email'][:20]} as student")
            return True
            
        except Exception as e:
            print_error(f"Failed to add users to course: {e}")
            return False
    
    def get_or_create_course_chat_room(self) -> bool:
        """Get or create the course chat room"""
        print_info("Setting up course chat room...")
        
        try:
            # Check if course chat room already exists
            response = self.supabase.table('chat_rooms')\
                .select('*')\
                .eq('type', 'course')\
                .eq('related_course_id', self.course_id)\
                .execute()
            
            if response.data:
                self.chat_room_id = response.data[0]['id']
                print_success(f"Existing course chat room found: {self.chat_room_id}")
            else:
                # Create new course chat room
                room_data = {
                    'type': 'course',
                    'related_course_id': self.course_id
                }
                room_response = self.supabase.table('chat_rooms').insert(room_data).execute()
                self.chat_room_id = room_response.data[0]['id']
                print_success(f"Created new course chat room: {self.chat_room_id}")
            
            # Add both users as members of the chat room
            # Check if already members
            members_response = self.supabase.table('chat_room_members')\
                .select('*')\
                .eq('room_id', self.chat_room_id)\
                .execute()
            
            existing_members = {m['user_id'] for m in members_response.data}
            
            new_members = []
            if self.user1['id'] not in existing_members:
                new_members.append({'room_id': self.chat_room_id, 'user_id': self.user1['id']})
            if self.user2['id'] not in existing_members:
                new_members.append({'room_id': self.chat_room_id, 'user_id': self.user2['id']})
            
            if new_members:
                self.supabase.table('chat_room_members').insert(new_members).execute()
                print_success(f"Added {len(new_members)} users to chat room")
            else:
                print_info("Both users already in chat room")
            
            return True
            
        except Exception as e:
            print_error(f"Failed to setup course chat room: {e}")
            return False
    
    def send_test_messages(self) -> bool:
        """Send test messages in the course chat"""
        print_header("SENDING TEST MESSAGES IN COURSE CHAT")
        
        messages = [
            (self.user1['id'], f"👋 Welcome to the course chat! This is {self.user1['email'][:20]}"),
            (self.user2['id'], f"Hey everyone! {self.user2['email'][:20]} here. Excited to learn!"),
            (self.user1['id'], "Let's test if the course chat is working properly."),
            (self.user2['id'], "Yes! I can see your messages. This is great!"),
            (self.user1['id'], "Course chat feature seems to be working perfectly! 🎉"),
            (self.user2['id'], "I'll try sending a file attachment next time."),
            (self.user1['id'], "Good idea! The chat supports different message types."),
        ]
        
        sent_count = 0
        for sender_id, content in messages:
            try:
                message_data = {
                    'room_id': self.chat_room_id,
                    'sender_id': sender_id,
                    'content': content,
                    'message_type': 'text'
                }
                
                response = self.supabase.table('messages').insert(message_data).execute()
                if response.data:
                    sent_count += 1
                    sender_name = "User 1" if sender_id == self.user1['id'] else "User 2"
                    print_success(f"[{sender_name}] {content[:50]}...")
                time.sleep(0.3)  # Small delay between messages
            except Exception as e:
                print_error(f"Failed to send message: {e}")
        
        print_success(f"\nSent {sent_count} messages to course chat")
        return sent_count > 0
    
    def get_course_messages(self, limit: int = 20) -> List[Dict]:
        """Retrieve messages from the course chat"""
        try:
            response = self.supabase.table('messages')\
                .select('*, profiles!sender_id(username, first_name, last_name)')\
                .eq('room_id', self.chat_room_id)\
                .order('created_at', desc=False)\
                .limit(limit)\
                .execute()
            
            return response.data if response.data else []
        except Exception as e:
            print_error(f"Failed to get messages: {e}")
            return []
    
    def display_course_messages(self, messages: List[Dict]):
        """Display course chat messages in a readable format"""
        if not messages:
            print_info("No messages found in course chat")
            return
        
        print(f"\n{Colors.BOLD}{'='*60}{Colors.END}")
        print(f"{Colors.BOLD}{'COURSE CHAT MESSAGES':^60}{Colors.END}")
        print(f"{Colors.BOLD}{'='*60}{Colors.END}\n")
        
        for msg in messages:
            # Get sender name
            profile = msg.get('profiles', {})
            sender_name = profile.get('username') or f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip()
            if not sender_name:
                sender_name = msg['sender_id'][:8]
            
            content = msg['content']
            created = msg['created_at'][:19] if msg.get('created_at') else "unknown"
            
            print(f"  {Colors.YELLOW}[{created}]{Colors.END}")
            print(f"  {Colors.GREEN}{sender_name}:{Colors.END} {content}")
            print()
    
    def verify_chat_room_access(self) -> bool:
        """Verify that both users can access the chat room"""
        print_info("Verifying chat room access...")
        
        try:
            for user in [self.user1, self.user2]:
                member_check = self.supabase.table('chat_room_members')\
                    .select('*')\
                    .eq('room_id', self.chat_room_id)\
                    .eq('user_id', user['id'])\
                    .execute()
                
                if member_check.data:
                    print_success(f"User {user['email'][:20]} has access to course chat")
                else:
                    print_error(f"User {user['email'][:20]} does NOT have access!")
                    return False
            
            return True
            
        except Exception as e:
            print_error(f"Failed to verify access: {e}")
            return False
    
    def run_full_test(self):
        """Run the complete course chat test"""
        print_header("COURSE CHAT TESTING SUITE")
        
        # Step 1: Connect to database
        if not self.connect_database():
            return
        
        # Step 2: Fetch users
        if not self.fetch_users("Isa", "Aissa"):
            return
        
        # Step 3: Get or create organization
        if not self.get_or_create_organization():
            return
        
        # Step 4: Create test course
        if not self.create_test_course():
            return
        
        # Step 5: Add users to course
        if not self.add_users_to_course():
            return
        
        # Step 6: Setup course chat room
        if not self.get_or_create_course_chat_room():
            return
        
        # Step 7: Verify access
        if not self.verify_chat_room_access():
            print_warning("Continuing despite access issues...")
        
        # Step 8: Send test messages
        if not self.send_test_messages():
            print_warning("No messages were sent")
        
        # Step 9: Retrieve and display messages
        messages = self.get_course_messages(limit=20)
        self.display_course_messages(messages)
        
        # Step 10: Summary
        print_header("TEST SUMMARY")
        print_success(f"Course ID: {self.course_id}")
        print_success(f"Chat Room ID: {self.chat_room_id}")
        print_success(f"Organization ID: {self.organization_id}")
        print_success(f"Total messages in course chat: {len(messages)}")
        
        print_header("NEXT STEPS")
        print_info("To test real-time course chat messaging:")
        print_info("1. Log in as both users in different browser windows")
        print_info("2. Navigate to the course page: /courses/{self.course_id}")
        print_info("3. Look for the Discussion tab or chat section")
        print_info("4. Also check the Messages page: /messages")
        print_info("5. You should see the course chat room in the list")
        print_info("6. Send messages and verify they appear in real-time")
        
        print_info("\nTo test via API:")
        print_info(f"  GET /api/chat-service/rooms/{self.chat_room_id}/messages")
        print_info(f"  POST /api/chat-service/rooms/{self.chat_room_id}/messages")
        
        print_success("\nCourse chat testing completed!")

def main():
    """Main entry point"""
    tester = CourseChatTester()
    
    # Parse command line arguments
    import argparse
    parser = argparse.ArgumentParser(description='Test course chat functionality')
    parser.add_argument('--user1', type=str, default="Isa", help='First username to look for')
    parser.add_argument('--user2', type=str, default="Aissa", help='Second username to look for')
    parser.add_argument('--quick', action='store_true', help='Only setup, don\'t send messages')
    parser.add_argument('--cleanup', action='store_true', help='Clean up test data after test')
    
    args = parser.parse_args()
    
    if args.quick:
        # Just setup, don't send messages
        if tester.connect_database():
            if tester.fetch_users(args.user1, args.user2):
                tester.get_or_create_organization()
                tester.create_test_course()
                tester.add_users_to_course()
                tester.get_or_create_course_chat_room()
                print_success(f"Setup complete! Course ID: {tester.course_id}, Chat Room ID: {tester.chat_room_id}")
    else:
        # Run full test
        tester.run_full_test()

if __name__ == "__main__":
    main()
