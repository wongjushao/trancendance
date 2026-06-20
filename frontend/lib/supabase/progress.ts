// frontend/lib/supabase/progress.ts
import { getSupabaseBrowserClient } from "./browser-client";

export interface LessonProgress {
  id: number;
  user_id: string;
  lesson_id: number;
  class_member_id: number;
  status: "not_started" | "in_progress" | "completed";
  progress_percent: number;
  last_accessed_at: string;
  completed_at: string | null;
  created_at: string;
}

// Get class member ID for a user in a specific offering
export async function getClassMemberId(courseClassId: number, userId: string) {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("class_members")
    .select("id")
    .eq("course_class_id", courseClassId)
    .eq("user_id", userId)
    .single();
  
  if (error) throw error;
  return data?.id;
}

// Update lesson progress for a specific offering
export async function updateOfferingLessonProgress(
  courseClassId: number,
  lessonId: number,
  userId: string,
  status: "not_started" | "in_progress" | "completed",
  progressPercent: number
) {
  const supabase = getSupabaseBrowserClient();
  
  // Get class member ID
  const classMemberId = await getClassMemberId(courseClassId, userId);
  if (!classMemberId) throw new Error("Not enrolled in this offering");
  
  // Check if progress record exists
  const { data: existing } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .eq("class_member_id", classMemberId)
    .single();
  
  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from("lesson_progress")
      .update({
        status,
        progress_percent: progressPercent,
        last_accessed_at: new Date().toISOString(),
        completed_at: status === "completed" ? new Date().toISOString() : existing.completed_at
      })
      .eq("id", existing.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } else {
    // Create new
    const { data, error } = await supabase
      .from("lesson_progress")
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        class_member_id: classMemberId,
        status,
        progress_percent: progressPercent,
        last_accessed_at: new Date().toISOString(),
        completed_at: status === "completed" ? new Date().toISOString() : null
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

// Get offering progress for a student
export async function getOfferingProgress(courseClassId: number, userId: string) {
  const supabase = getSupabaseBrowserClient();
  
  const classMemberId = await getClassMemberId(courseClassId, userId);
  if (!classMemberId) return null;
  
  // Get all lessons for this course
  const { data: courseClass } = await supabase
    .from("course_classes")
    .select(`
      *,
      course:courses (
        id,
        modules (
          id,
          classes (
            id,
            lessons (
              id,
              title,
              order_index
            )
          )
        )
      )
    `)
    .eq("id", courseClassId)
    .single();
  
  if (!courseClass) return null;
  
  // Flatten all lessons
  const allLessons: { id: number; title: string; order_index: number }[] = [];
  courseClass.course.modules?.forEach((module: any) => {
    module.classes?.forEach((classItem: any) => {
      classItem.lessons?.forEach((lesson: any) => {
        allLessons.push(lesson);
      });
    });
  });
  
  // Get progress for all lessons
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("class_member_id", classMemberId)
    .in("lesson_id", allLessons.map(l => l.id));
  
  const progressMap = new Map();
  progress?.forEach(p => progressMap.set(p.lesson_id, p));
  
  const completedLessons = progress?.filter(p => p.status === "completed").length || 0;
  const totalLessons = allLessons.length;
  const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  
  return {
    classMemberId,
    totalLessons,
    completedLessons,
    overallProgress,
    lessons: allLessons.map(lesson => ({
      ...lesson,
      progress: progressMap.get(lesson.id) || {
        status: "not_started",
        progress_percent: 0
      }
    }))
  };
}

// Get offering progress for all students (teacher view)
export async function getOfferingStudentsProgress(courseClassId: number) {
  const supabase = getSupabaseBrowserClient();
  
  // Get all students in this offering
  const { data: students } = await supabase
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
  
  if (!students) return [];
  
  // Get progress for each student
  const studentsWithProgress = await Promise.all(
    students.map(async (student) => {
      const progress = await getOfferingProgress(courseClassId, student.user_id);
      return {
        ...student,
        progress: progress?.overallProgress || 0,
        completedLessons: progress?.completedLessons || 0,
        totalLessons: progress?.totalLessons || 0
      };
    })
  );
  
  return studentsWithProgress.sort((a, b) => b.progress - a.progress);
}