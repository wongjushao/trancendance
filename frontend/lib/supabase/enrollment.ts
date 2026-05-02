// frontend/lib/supabase/enrollment.ts (SIMPLIFIED - No requests)
import { getSupabaseBrowserClient } from "./browser-client";

// Direct enrollment - no approval needed
export async function enrollInCourse(courseClassId: number, userId: string) {
  const supabase = getSupabaseBrowserClient();
  
  // Check if already enrolled
  const { data: existing } = await supabase
    .from("class_members")
    .select("*")
    .eq("course_class_id", courseClassId)
    .eq("user_id", userId)
    .single();
  
  if (existing) {
    throw new Error("Already enrolled in this course");
  }
  
  // Check capacity
  const { data: courseClass } = await supabase
    .from("course_classes")
    .select("max_students")
    .eq("id", courseClassId)
    .single();
  
  const { count: enrolledCount } = await supabase
    .from("class_members")
    .select("*", { count: "exact", head: true })
    .eq("course_class_id", courseClassId)
    .eq("role", "student");
  
  if (courseClass?.max_students && enrolledCount && enrolledCount >= courseClass.max_students) {
    throw new Error("Course is full");
  }
  
  // Add as class member
  const { data: member, error } = await supabase
    .from("class_members")
    .insert({
      course_class_id: courseClassId,
      user_id: userId,
      role: "student"
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Auto-add to course chat room
  const { data: chatRoom } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("related_course_id", courseClass?.course_id)
    .eq("type", "course")
    .single();
  
  if (chatRoom) {
    await supabase
      .from("chat_room_members")
      .insert({
        room_id: chatRoom.id,
        user_id: userId
      })
      .select();
  }
  
  return member;
}

// Remove student from course (teacher/admin action)
export async function removeStudentFromCourse(courseClassId: number, userId: string) {
  const supabase = getSupabaseBrowserClient();
  
  const { error } = await supabase
    .from("class_members")
    .delete()
    .eq("course_class_id", courseClassId)
    .eq("user_id", userId)
    .eq("role", "student");
  
  if (error) throw error;
  
  // Optionally remove from chat room as well
  const { data: chatRoom } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("related_course_id", courseClass?.course_id)
    .eq("type", "course")
    .single();
  
  if (chatRoom) {
    await supabase
      .from("chat_room_members")
      .delete()
      .eq("room_id", chatRoom.id)
      .eq("user_id", userId);
  }
}

// Check if user is enrolled in a course class
export async function isEnrolled(courseClassId: number, userId: string) {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("class_members")
    .select("id, role")
    .eq("course_class_id", courseClassId)
    .eq("user_id", userId)
    .single();
  
  if (error && error.code === "PGRST116") return null;
  return data;
}

// Get all enrolled students for a course offering
export async function getEnrolledStudents(courseClassId: number) {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("class_members")
    .select(`
      *,
      user:profiles!user_id (
        id,
        username,
        first_name,
        last_name,
        email,
        avatar_url
      )
    `)
    .eq("course_class_id", courseClassId)
    .eq("role", "student");
  
  if (error) throw error;
  return data;
}

// Get all courses a user is enrolled in
export async function getUserEnrolledCourses(userId: string) {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("class_members")
    .select(`
      *,
      course_class:course_classes (
        id,
        name,
        start_date,
        end_date,
        status,
        course:courses (
          id,
          title,
          description,
          thumbnail,
          level,
          category
        )
      )
    `)
    .eq("user_id", userId)
    .eq("role", "student");
  
  if (error) throw error;
  return data;
}