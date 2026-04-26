#!/usr/bin/env python3

import os
import sys
from typing import List
from supabase import create_client
from dotenv import load_dotenv

# Load .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_KEY in .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_users_info(user_ids: List[str]):
    print("\n🔍 Fetching user info...\n")

    try:
        response = supabase.table("profiles") \
            .select("id, username, first_name, last_name") \
            .in_("id", user_ids) \
            .execute()

        if not response.data:
            print("❌ No users found")
            return

        for user in response.data:
            print("====================================")
            print(f"🆔 ID        : {user.get('id')}")
            print(f"👤 Username  : {user.get('username')}")
            print(f"📛 First Name: {user.get('first_name')}")
            print(f"📛 Last Name : {user.get('last_name')}")
        print("====================================")

    except Exception as e:
        print(f"❌ Error: {e}")


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("python get_users_info.py <user_id1> <user_id2> ...")
        sys.exit(1)

    user_ids = sys.argv[1:]
    get_users_info(user_ids)


if __name__ == "__main__":
    main()
