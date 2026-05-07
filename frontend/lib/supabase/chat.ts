// frontend/lib/supabase/chat.ts
import { getSupabaseBrowserClient } from "./browser-client";

export interface ChatRoom {
  id: number;
  type: "direct" | "group" | "course";
  related_course_id: number | null;
  created_at: string;
}

export interface ChatRoomMember {
  room_id: number;
  user_id: string;
  joined_at: string;
}

export interface Message {
  id: number;
  room_id: number;
  sender_id: string;
  content: string;
  message_type: "text" | "file" | "image";
  created_at: string;
}

// Auto-create chat room when course is published
export async function autoCreateCourseChatRoom(courseId: number) {
  const supabase = getSupabaseBrowserClient();
  
  // Check if chat room already exists
  const { data: existingRoom } = await supabase
    .from("chat_rooms")
    .select("*")
    .eq("related_course_id", courseId)
    .eq("type", "course")
    .single();
  
  if (existingRoom) return existingRoom;
  
  // Create new chat room
  const { data: chatRoom, error } = await supabase
    .from("chat_rooms")
    .insert({
      type: "course",
      related_course_id: courseId
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Add all enrolled students and instructors to chat room
  await addAllCourseMembersToChatRoom(chatRoom.id, courseId);
  
  return chatRoom;
}

// Add all members of a course to its chat room
export async function addAllCourseMembersToChatRoom(roomId: number, courseId: number) {
  const supabase = getSupabaseBrowserClient();
  
  // Get all course classes for this course
  const { data: courseClasses } = await supabase
    .from("course_classes")
    .select("id")
    .eq("course_id", courseId);
  
  if (!courseClasses?.length) return;
  
  const classIds = courseClasses.map(cc => cc.id);
  
  // Get all class members (students and instructors)
  const { data: members } = await supabase
    .from("class_members")
    .select("user_id")
    .in("course_class_id", classIds);
  
  if (!members?.length) return;
  
  const uniqueUserIds = [...new Set(members.map(m => m.user_id))];
  
  // Add each member to chat room
  for (const userId of uniqueUserIds) {
    await addUserToChatRoom(roomId, userId);
  }
}

// Add user to chat room
export async function addUserToChatRoom(roomId: number, userId: string) {
  const supabase = getSupabaseBrowserClient();
  
  // Check if already a member
  const { data: existing } = await supabase
    .from("chat_room_members")
    .select("*")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .single();
  
  if (existing) return existing;
  
  const { data, error } = await supabase
    .from("chat_room_members")
    .insert({
      room_id: roomId,
      user_id: userId
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Send message to chat room
export async function sendMessage(roomId: number, senderId: string, content: string, messageType: string = "text") {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("messages")
    .insert({
      room_id: roomId,
      sender_id: senderId,
      content: content,
      message_type: messageType
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Get messages for chat room
export async function getChatMessages(roomId: number, limit: number = 50) {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("messages")
    .select(`
      *,
      sender:profiles!sender_id (
        id,
        username,
        first_name,
        last_name,
        avatar_url
      )
    `)
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data?.reverse();
}

// Get user's chat rooms
export async function getUserChatRooms(userId: string) {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("chat_room_members")
    .select(`
      room_id,
      joined_at,
      chat_rooms!inner (
        *,
        course:courses!related_course_id (
          id,
          title,
          thumbnail
        )
      )
    `)
    .eq("user_id", userId);
  
  if (error) throw error;
  return data;
}