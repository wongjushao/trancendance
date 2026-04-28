// frontend/lib/supabase/courses.ts

import { getSupabaseBrowserClient } from "./browser-client";
import { Database } from "@/types/supabase";

type Course = Database['public']['Tables']['courses']['Row'];
type CourseInsert = Database['public']['Tables']['courses']['Insert'];
type Module = Database['public']['Tables']['modules']['Row'];
type ModuleInsert = Database['public']['Tables']['modules']['Insert'];
type Lesson = Database['public']['Tables']['lessons']['Row'];
type LessonInsert = Database['public']['Tables']['lessons']['Insert'];
type Assignment = Database['public']['Tables']['assignments']['Row'];
type AssignmentInsert = Database['public']['Tables']['assignments']['Insert'];
type CourseMember = Database['public']['Tables']['course_members']['Row'];
type CourseMemberInsert = Database['public']['Tables']['course_members']['Insert'];

export interface CourseWithDetails extends Course {
  modules?: ModuleWithLessons[];
  instructor_name?: string;
  instructor_avatar?: string;
  enrolled?: boolean;
  progress?: number;
}

export interface ModuleWithLessons extends Module {
  lessons?: LessonWithAssignments[];
}

export interface LessonWithAssignments extends Lesson {
  assignments?: Assignment[];
}

// Create a new course
export async function createCourse(courseData: {
  title: string;
  description: string;
  organization_id: number;
  visibility: "public" | "org" | "private";
  created_by: string;
}): Promise<Course> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("courses")
    .insert({
      title: courseData.title,
      description: courseData.description,
      organization_id: courseData.organization_id,
      visibility: courseData.visibility,
      created_by: courseData.created_by,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update a course
export async function updateCourse(
  courseId: number,
  updates: Partial<Course>
): Promise<Course> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("courses")
    .update(updates)
    .eq("id", courseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get course with all details (modules, lessons, assignments)
export async function getCourseWithDetails(courseId: number): Promise<CourseWithDetails | null> {
  const supabase = getSupabaseBrowserClient();
  
  // Get course
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (courseError || !course) return null;

  // Get modules
  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  if (modulesError) throw modulesError;

  // Get lessons and assignments for each module
  const modulesWithLessons: ModuleWithLessons[] = await Promise.all(
    (modules || []).map(async (module) => {
      const { data: lessons, error: lessonsError } = await supabase
        .from("lessons")
        .select("*")
        .eq("module_id", module.id)
        .order("order_index", { ascending: true });

      if (lessonsError) throw lessonsError;

      // Get assignments for each lesson
      const lessonsWithAssignments: LessonWithAssignments[] = await Promise.all(
        (lessons || []).map(async (lesson) => {
          const { data: assignments, error: assignmentsError } = await supabase
            .from("assignments")
            .select("*")
            .eq("lesson_id", lesson.id);

          if (assignmentsError) throw assignmentsError;

          return { ...lesson, assignments: assignments || [] };
        })
      );

      return { ...module, lessons: lessonsWithAssignments };
    })
  );

  return { ...course, modules: modulesWithLessons };
}

// Get all courses for a user (with enrollment status)
export async function getUserCourses(userId: string): Promise<CourseWithDetails[]> {
  const supabase = getSupabaseBrowserClient();
  
  // Get courses the user is enrolled in
  const { data: memberships, error: membershipError } = await supabase
    .from("course_members")
    .select("course_id, role, joined_at, status")
    .eq("user_id", userId);

  if (membershipError) throw membershipError;

  if (!memberships || memberships.length === 0) return [];

  const courseIds = memberships.map(m => m.course_id);
  
  // Get course details
  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select(`
      *,
      organization:organization_id(name)
    `)
    .in("id", courseIds);

  if (coursesError) throw coursesError;

  // Get instructor names
  const instructorIds = [...new Set(courses?.map(c => c.created_by) || [])];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url")
    .in("id", instructorIds);

  if (profilesError) throw profilesError;

  const profileMap = new Map(profiles?.map(p => [p.id, p]));

  // Calculate progress for each course
  const coursesWithDetails = await Promise.all(
    (courses || []).map(async (course) => {
      // Get total lessons count
      const { count: totalLessons, error: lessonsError } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .in("module_id", (
          await supabase
            .from("modules")
            .select("id")
            .eq("course_id", course.id)
        ).data?.map(m => m.id) || []);

      if (lessonsError) throw lessonsError;

      // Get completed lessons count
      const { count: completedLessons, error: progressError } = await supabase
        .from("lesson_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed");

      if (progressError) throw progressError;

      const profile = profileMap.get(course.created_by);
      const progress = totalLessons > 0 ? (completedLessons || 0) / totalLessons * 100 : 0;

      return {
        ...course,
        instructor_name: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Instructor" : "Instructor",
        instructor_avatar: profile?.avatar_url || undefined,
        enrolled: true,
        progress: Math.round(progress),
      };
    })
  );

  return coursesWithDetails;
}

// Get discoverable courses (not enrolled)
export async function getDiscoverableCourses(userId: string): Promise<CourseWithDetails[]> {
  const supabase = getSupabaseBrowserClient();
  
  // Get enrolled course IDs
  const { data: memberships } = await supabase
    .from("course_members")
    .select("course_id")
    .eq("user_id", userId);

  const enrolledIds = memberships?.map(m => m.course_id) || [];

  // Get public courses user is not enrolled in
  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select(`
      *,
      organization:organization_id(name)
    `)
    .eq("visibility", "public")
    .not("id", "in", `(${enrolledIds.join(",")})`);

  if (coursesError) throw coursesError;

  // Get instructor names
  const instructorIds = [...new Set(courses?.map(c => c.created_by) || [])];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url")
    .in("id", instructorIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p]));

  return (courses || []).map(course => ({
    ...course,
    instructor_name: profileMap.get(course.created_by)?.first_name || "Instructor",
    instructor_avatar: profileMap.get(course.created_by)?.avatar_url,
    enrolled: false,
  }));
}

// Enroll in a course
export async function enrollInCourse(courseId: number, userId: string, role: string = "student"): Promise<CourseMember> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("course_members")
    .insert({
      course_id: courseId,
      user_id: userId,
      role: role,
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Module CRUD operations
export async function addModule(courseId: number, moduleData: { title: string; order_index: number }): Promise<Module> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("modules")
    .insert({
      course_id: courseId,
      title: moduleData.title,
      order_index: moduleData.order_index,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateModule(moduleId: number, updates: Partial<Module>): Promise<Module> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("modules")
    .update(updates)
    .eq("id", moduleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteModule(moduleId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  
  const { error } = await supabase
    .from("modules")
    .delete()
    .eq("id", moduleId);

  if (error) throw error;
}

// Lesson CRUD operations
export async function addLesson(moduleId: number, lessonData: {
  title: string;
  content_type: string;
  content_url?: string;
  content_json?: any;
  order_index: number;
}): Promise<Lesson> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      module_id: moduleId,
      title: lessonData.title,
      content_type: lessonData.content_type,
      content_url: lessonData.content_url,
      content_json: lessonData.content_json,
      order_index: lessonData.order_index,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLesson(lessonId: number, updates: Partial<Lesson>): Promise<Lesson> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("lessons")
    .update(updates)
    .eq("id", lessonId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLesson(lessonId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  
  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", lessonId);

  if (error) throw error;
}

// Assignment CRUD operations
export async function addAssignment(lessonId: number, assignmentData: {
  course_id: number;
  title: string;
  description: string;
  due_at?: string;
}): Promise<Assignment> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("assignments")
    .insert({
      lesson_id: lessonId,
      course_id: assignmentData.course_id,
      title: assignmentData.title,
      description: assignmentData.description,
      due_at: assignmentData.due_at,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAssignment(assignmentId: number, updates: Partial<Assignment>): Promise<Assignment> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("assignments")
    .update(updates)
    .eq("id", assignmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAssignment(assignmentId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  
  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) throw error;
}

// Lesson progress tracking
export async function updateLessonProgress(
  lessonId: number,
  userId: string,
  status: "not_started" | "in_progress" | "completed",
  progressPercent?: number
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  
  const { error } = await supabase
    .from("lesson_progress")
    .upsert({
      lesson_id: lessonId,
      user_id: userId,
      status,
      progress_percent: progressPercent,
      last_accessed_at: new Date().toISOString(),
      completed_at: status === "completed" ? new Date().toISOString() : null,
    }, {
      onConflict: "lesson_id,user_id",
    });

  if (error) throw error;
}