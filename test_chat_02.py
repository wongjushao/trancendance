#!/usr/bin/env python3
from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from typing import Iterable

from dotenv import load_dotenv
from supabase import Client, create_client


@dataclass(frozen=True)
class ChatUser:
    email: str
    uid: str


USER_1 = ChatUser(
    email="wongjushao@gmail.com",
    uid="da3657de-d9be-4eae-9bea-03569de1474f",
)
USER_2 = ChatUser(
    email="wjun-kea@student.42kl.edu.my",
    uid="9d22ed15-8336-42b1-894c-7fcdf27729a4",
)


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        print(f"Missing required environment variable: {name}")
        sys.exit(1)
    return value


def get_supabase_client() -> Client:
    load_dotenv()

    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        print(
            "Missing Supabase configuration. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL "
            "and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY."
        )
        sys.exit(1)

    return create_client(supabase_url, supabase_key)


def ensure_profiles_exist(client: Client, users: Iterable[ChatUser]) -> None:
    user_list = list(users)
    user_ids = [user.uid for user in user_list]

    response = (
        client.table("profiles")
        .select("id, username, first_name, last_name")
        .in_("id", user_ids)
        .execute()
    )
    profiles_by_id = {profile["id"]: profile for profile in response.data or []}
    missing = [user for user in user_list if user.uid not in profiles_by_id]

    if missing:
        for user in missing:
            print(f"Profile not found for {user.email} ({user.uid})")
        sys.exit(1)

    for user in user_list:
        profile = profiles_by_id[user.uid]
        display_name = (
            profile.get("username")
            or " ".join(
                part for part in [profile.get("first_name"), profile.get("last_name")] if part
            )
            or "unnamed profile"
        )
        print(f"Found profile: {user.email} -> {display_name} ({user.uid})")


def ensure_accepted_friendship(client: Client, user1: ChatUser, user2: ChatUser) -> None:
    existing = (
        client.table("friendships")
        .select("id, requester_id, addressee_id, status")
        .or_(
            f"and(requester_id.eq.{user1.uid},addressee_id.eq.{user2.uid}),"
            f"and(requester_id.eq.{user2.uid},addressee_id.eq.{user1.uid})"
        )
        .execute()
    )

    friendships = existing.data or []
    if friendships:
        for friendship in friendships:
            if friendship.get("status") != "accepted":
                (
                    client.table("friendships")
                    .update({"status": "accepted"})
                    .eq("id", friendship["id"])
                    .execute()
                )
        print("Friendship already exists; status is accepted.")
        return

    (
        client.table("friendships")
        .insert(
            {
                "requester_id": user1.uid,
                "addressee_id": user2.uid,
                "status": "accepted",
            }
        )
        .execute()
    )
    print("Created accepted friendship.")


def find_existing_dm_room(client: Client, user1: ChatUser, user2: ChatUser) -> int | None:
    user1_memberships = (
        client.table("chat_room_members")
        .select("room_id")
        .eq("user_id", user1.uid)
        .execute()
    )
    user1_room_ids = [member["room_id"] for member in user1_memberships.data or []]
    if not user1_room_ids:
        return None

    shared_memberships = (
        client.table("chat_room_members")
        .select("room_id")
        .eq("user_id", user2.uid)
        .in_("room_id", user1_room_ids)
        .execute()
    )
    shared_room_ids = [member["room_id"] for member in shared_memberships.data or []]
    if not shared_room_ids:
        return None

    rooms = (
        client.table("chat_rooms")
        .select("id")
        .eq("type", "direct")
        .in_("id", shared_room_ids)
        .limit(1)
        .execute()
    )
    if not rooms.data:
        return None

    return int(rooms.data[0]["id"])


def ensure_dm_room(client: Client, user1: ChatUser, user2: ChatUser) -> int:
    existing_room_id = find_existing_dm_room(client, user1, user2)
    if existing_room_id is not None:
        print(f"DM room already exists: {existing_room_id}")
        return existing_room_id

    room_response = (
        client.table("chat_rooms")
        .insert({"type": "direct", "related_course_id": None})
        .execute()
    )
    room_id = int(room_response.data[0]["id"])

    (
        client.table("chat_room_members")
        .upsert(
            [
                {"room_id": room_id, "user_id": user1.uid},
                {"room_id": room_id, "user_id": user2.uid},
            ],
            on_conflict="room_id,user_id",
        )
        .execute()
    )
    print(f"Created DM room: {room_id}")
    return room_id


def main() -> None:
    client = get_supabase_client()

    ensure_profiles_exist(client, [USER_1, USER_2])
    ensure_accepted_friendship(client, USER_1, USER_2)
    room_id = ensure_dm_room(client, USER_1, USER_2)

    print()
    print("Done. These users can now chat with each other.")
    print(f"Room ID: {room_id}")


if __name__ == "__main__":
    main()
