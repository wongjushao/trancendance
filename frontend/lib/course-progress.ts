import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export interface LessonProgress {
  lesson_id: number;
  status: "not_started" | "in_progress" | "completed";
  progress_percent?: number;
  last_accessed_at?: string;
  completed_at?: string;
}

export async function updateLessonProgress(
  lessonId: number,
  status: "not_started" | "in_progress" | "completed",
  progressPercent?: number
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from("lesson_progress")
    .upsert({
      lesson_id: lessonId,
      user_id: user.id,
      status,
      progress_percent: progressPercent,
      last_accessed_at: now,
      completed_at: status === "completed" ? now : null,
    }, {
      onConflict: "lesson_id,user_id",
    });

  if (error) {
    console.error("Error updating lesson progress:", error);
  }
}

export async function getLessonProgress(lessonId: number): Promise<LessonProgress | null> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data, error } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("lesson_id", lessonId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching lesson progress:", error);
    return null;
  }

  return data;
}

export async function getCourseProgress(courseId: number): Promise<{
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
}> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { totalLessons: 0, completedLessons: 0, progressPercentage: 0 };
  }

  // Get all modules for the course
  const { data: modules } = await supabase
    .from("modules")
    .select("id")
    .eq("course_id", courseId);

  if (!modules || modules.length === 0) {
    return { totalLessons: 0, completedLessons: 0, progressPercentage: 0 };
  }

  // Get all classes for these modules
  const { data: classes } = await supabase
    .from("classes")
    .select("id")
    .in("module_id", modules.map(m => m.id));

  if (!classes || classes.length === 0) {
    return { totalLessons: 0, completedLessons: 0, progressPercentage: 0 };
  }

  // Get all lessons for these classes
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id")
    .in("class_id", classes.map(c => c.id));

  const totalLessons = lessons?.length || 0;

  // Get completed lessons count
  const { data: completed } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .in("lesson_id", lessons?.map(l => l.id) || []);

  const completedLessons = completed?.length || 0;
  const progressPercentage = totalLessons > 0 
    ? Math.round((completedLessons / totalLessons) * 100) 
    : 0;

  return { totalLessons, completedLessons, progressPercentage };
}

export async function markLessonComplete(lessonId: number): Promise<void> {
  await updateLessonProgress(lessonId, "completed", 100);
}