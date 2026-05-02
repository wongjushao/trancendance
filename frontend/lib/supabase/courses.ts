// frontend/lib/supabase/courses.ts
import { getSupabaseBrowserClient } from "./browser-client";
import { Database } from "@/types/supabase";

type Course = Database['public']['Tables']['courses']['Row'];
type CourseInsert = Database['public']['Tables']['courses']['Insert'];
type Module = Database['public']['Tables']['modules']['Row'];
type ModuleInsert = Database['public']['Tables']['modules']['Insert'];
type Class = Database['public']['Tables']['classes']['Row'];
type ClassInsert = Database['public']['Tables']['classes']['Insert'];
type Lesson = Database['public']['Tables']['lessons']['Row'];
type LessonInsert = Database['public']['Tables']['lessons']['Insert'];
type Assignment = Database['public']['Tables']['assignments']['Row'];
type AssignmentInsert = Database['public']['Tables']['assignments']['Insert'];
type CourseClass = Database['public']['Tables']['course_classes']['Row'];
type CourseClassInsert = Database['public']['Tables']['course_classes']['Insert'];
type ClassSchedule = Database['public']['Tables']['class_schedules']['Row'];
type ClassScheduleInsert = Database['public']['Tables']['class_schedules']['Insert'];
type ClassMember = Database['public']['Tables']['class_members']['Row'];
type ClassMemberInsert = Database['public']['Tables']['class_members']['Insert'];
type ChatRoom = Database['public']['Tables']['chat_rooms']['Row'];
type ChatRoomInsert = Database['public']['Tables']['chat_rooms']['Insert'];
type ChatRoomMember = Database['public']['Tables']['chat_room_members']['Row'];
type ChatRoomMemberInsert = Database['public']['Tables']['chat_room_members']['Insert'];

export interface ModuleWithClasses extends Module {
  classes: ClassWithLessons[];
}

export interface ClassWithLessons extends Class {
  lessons: LessonWithAssignments[];
}

export interface LessonWithAssignments extends Lesson {
  assignments?: Assignment[];
}

export interface CourseWithDetails extends Course {
  modules?: ModuleWithClasses[];
  course_classes?: CourseClassWithDetails[];
}

export interface CourseClassWithDetails extends CourseClass {
  schedules?: ClassSchedule[];
  members?: ClassMember[];
  chat_room?: ChatRoom;
}

// Create a new course
export async function createCourse(courseData: {
  title: string;
  description: string;
  organization_id: number;
  visibility: "public" | "org" | "private";
  created_by: string;
  level?: string;
  category?: string;
  learning_objectives?: string[];
  prerequisites?: string[];
  tags?: string[];
  thumbnail?: string;
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
      level: courseData.level || "intermediate",
      category: courseData.category || "Development",
      learning_objectives: courseData.learning_objectives || [],
      prerequisites: courseData.prerequisites || [],
      tags: courseData.tags || [],
      thumbnail: courseData.thumbnail || null,
      status: "draft"
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update course
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

// Get course class ID for a user (helper function)
export async function getCourseClassIdForUser(courseId: number, userId: string): Promise<number | null> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from('class_members')
    .select('course_class_id')
    .eq('user_id', userId)
    .in('course_class_id', 
      supabase
        .from('course_classes')
        .select('id')
        .eq('course_id', courseId)
    )
    .limit(1);
  
  if (error) {
    console.error('Error getting course class ID:', error);
    return null;
  }
  
  return data && data.length > 0 ? data[0].course_class_id : null;
}

// Get course with all details (modules, classes, lessons, assignments)
export async function getCourseWithDetails(courseId: number): Promise<CourseWithDetails | null> {
  const supabase = getSupabaseBrowserClient();
  
  // Get course
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();
  
  if (courseError) throw courseError;
  if (!course) return null;
  
  // Get modules
  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });
  
  if (modulesError) throw modulesError;
  
  // For each module, get classes
  const modulesWithClasses = await Promise.all(
    (modules || []).map(async (module) => {
      const { data: classes, error: classesError } = await supabase
        .from("classes")
        .select("*")
        .eq("module_id", module.id)
        .order("order_index", { ascending: true });
      
      if (classesError) throw classesError;
      
      // For each class, get lessons
      const classesWithLessons = await Promise.all(
        (classes || []).map(async (classItem) => {
          const { data: lessons, error: lessonsError } = await supabase
            .from("lessons")
            .select("*")
            .eq("class_id", classItem.id)
            .order("order_index", { ascending: true });
          
          if (lessonsError) throw lessonsError;
          
          // For each lesson, get assignments
          const lessonsWithAssignments = await Promise.all(
            (lessons || []).map(async (lesson) => {
              const { data: assignments, error: assignmentsError } = await supabase
                .from("assignments")
                .select("*")
                .eq("lesson_id", lesson.id);
              
              if (assignmentsError) throw assignmentsError;
              
              return { ...lesson, assignments: assignments || [] };
            })
          );
          
          return { ...classItem, lessons: lessonsWithAssignments };
        })
      );
      
      return { ...module, classes: classesWithLessons };
    })
  );
  
  // Get course classes (offerings)
  const { data: courseClasses, error: courseClassesError } = await supabase
    .from("course_classes")
    .select("*")
    .eq("course_id", courseId);
  
  if (courseClassesError) throw courseClassesError;
  
  // For each course class, get schedules and members
  const courseClassesWithDetails = await Promise.all(
    (courseClasses || []).map(async (courseClass) => {
      const { data: schedules, error: schedulesError } = await supabase
        .from("class_schedules")
        .select("*")
        .eq("course_class_id", courseClass.id);
      
      if (schedulesError) throw schedulesError;
      
      const { data: members, error: membersError } = await supabase
        .from("class_members")
        .select("*")
        .eq("course_class_id", courseClass.id);
      
      if (membersError) throw membersError;
      
      const { data: chatRoom, error: chatRoomError } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("related_course_id", courseId)
        .eq("type", "course")
        .maybeSingle();  // Changed from .single() to .maybeSingle()

      // Don't throw error - .maybeSingle() returns null if not found
      if (chatRoomError) {
        console.error("Error fetching chat room:", chatRoomError);
        // Don't throw - just continue without chat room
      }
      
      return {
        ...courseClass,
        schedules: schedules || [],
        members: members || [],
        chat_room: chatRoom || null
      };
    })
  );
  
  return {
    ...course,
    modules: modulesWithClasses,
    course_classes: courseClassesWithDetails
  };
}

// Module CRUD operations
export async function addModule(courseId: number, moduleData: {
  title: string;
  order_index: number;
}): Promise<Module> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("modules")
    .insert({
      course_id: courseId,
      title: moduleData.title,
      order_index: moduleData.order_index,
      is_published: true
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



// Class CRUD operations
export async function addClass(moduleId: number, classData: {
  title: string;
  order_index: number;
}): Promise<Class> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("classes")
    .insert({
      module_id: moduleId,
      title: classData.title,
      order_index: classData.order_index,
      is_published: true
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Update this function in courses.ts to allow updating module_id
export async function updateClass(classId: number, updates: Partial<Class>): Promise<Class> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("classes")
    .update(updates)  // This already supports module_id since it's in Partial<Class>
    .eq("id", classId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Lesson CRUD operations
export async function addLesson(classId: number, lessonData: {
  title: string;
  content_type: string;
  content_url?: string;
  content_json?: any;
  order_index: number;
  duration_seconds?: number;
  is_free_preview?: boolean;
}): Promise<Lesson> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      class_id: classId,
      title: lessonData.title,
      content_type: lessonData.content_type,
      content_url: lessonData.content_url,
      content_json: lessonData.content_json,
      order_index: lessonData.order_index,
      is_published: false,
      duration_seconds: lessonData.duration_seconds,
      is_free_preview: lessonData.is_free_preview || false
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

// Delete lesson - delete assignments first
export async function deleteLesson(lessonId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  
  // First, delete any assignments attached to this lesson
  const { error: assignmentsError } = await supabase
    .from("assignments")
    .delete()
    .eq("lesson_id", lessonId);
  
  if (assignmentsError && assignmentsError.code !== 'PGRST116') {
    console.error('Error deleting assignments:', assignmentsError);
  }
  
  // Then delete the lesson
  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", lessonId);
  
  if (error) throw error;
}

// Delete module - delete all classes and lessons inside first
export async function deleteModule(moduleId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  
  // First, get all classes in this module
  const { data: classes, error: classesFetchError } = await supabase
    .from("classes")
    .select("id")
    .eq("module_id", moduleId);
  
  if (classesFetchError) throw classesFetchError;
  
  // Delete each class (which will delete its lessons and assignments)
  if (classes && classes.length > 0) {
    for (const classItem of classes) {
      await deleteClass(classItem.id);
    }
  }
  
  // Now delete the module
  const { error } = await supabase
    .from("modules")
    .delete()
    .eq("id", moduleId);
  
  if (error) throw error;
}

export async function deleteClass(classId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  
  // First, get all lessons in this class
  const { data: lessons, error: lessonsFetchError } = await supabase
    .from("lessons")
    .select("id")
    .eq("class_id", classId);
  
  if (lessonsFetchError) throw lessonsFetchError;
  
  // Delete each lesson (which will delete its assignments)
  if (lessons && lessons.length > 0) {
    for (const lesson of lessons) {
      await deleteLesson(lesson.id);
    }
  }
  
  // Now delete the class
  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("id", classId);
  
  if (error) throw error;
}

// Assignment CRUD operations
export async function addAssignment(lessonId: number, assignmentData: {
  course_id: number;
  title: string;
  description: string;
  due_at?: string;
  points?: number;
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
      points: assignmentData.points || 100
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

// Course Class (offering) operations
export async function addCourseClass(courseId: number, classData: {
  name: string;
  description?: string | null;
  instructor_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  max_students?: number | null;
  status?: "upcoming" | "ongoing" | "completed" | "cancelled";
}): Promise<CourseClass> {
  const supabase = getSupabaseBrowserClient();
  
  // CRITICAL: Ensure instructor_id is either a valid UUID string or null
  let instructorId = classData.instructor_id;
  
  // If it's an empty string or invalid, convert to null
  if (!instructorId || instructorId === "" || instructorId === "null" || instructorId === "undefined") {
    instructorId = null;
  }
  
  // Validate UUID format (must be 36 characters with hyphens)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (instructorId && !uuidRegex.test(instructorId)) {
    console.error("Invalid UUID format for instructor_id:", instructorId);
    instructorId = null;
  }
  
  // If we have an instructor_id, verify it exists in profiles
  if (instructorId) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", instructorId)
      .maybeSingle();
    
    if (profileError || !profile) {
      console.error("Instructor profile not found for ID:", instructorId);
      instructorId = null;
    }
  }
  
  const insertData = {
    course_id: courseId,
    name: classData.name,
    description: classData.description || null,
    instructor_id: instructorId,
    start_date: classData.start_date || null,
    end_date: classData.end_date || null,
    max_students: classData.max_students || null,
    status: classData.status || "upcoming",
    is_published: false,
  };
  
  console.log("Final insert data for course_classes:", insertData);
  
  const { data, error } = await supabase
    .from("course_classes")
    .insert(insertData)
    .select()
    .single();
  
  if (error) {
    console.error("Supabase error in addCourseClass:", error);
    console.error("Failed insert data:", insertData);
    throw error;
  }
  
  return data;
}

// Class Schedule operations
export async function addClassSchedule(courseClassId: number, scheduleData: {
  day_of_week: number;
  start_time: string;
  end_time: string;
}): Promise<ClassSchedule> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("class_schedules")
    .insert({
      course_class_id: courseClassId,
      day_of_week: scheduleData.day_of_week,
      start_time: scheduleData.start_time,
      end_time: scheduleData.end_time
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Chat Room operations
export async function createCourseChatRoom(courseId: number): Promise<ChatRoom> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("chat_rooms")
    .insert({
      type: "course",
      related_course_id: courseId
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Update the publish function in courses.ts
export async function publishCourse(courseId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  
  // Update course status
  const { error: courseError } = await supabase
    .from('courses')
    .update({ 
      status: 'published',
      updated_at: new Date().toISOString()
    })
    .eq('id', courseId);
  
  if (courseError) {
    console.error('Error publishing course:', courseError);
    throw new Error(`Failed to publish course: ${courseError.message}`);
  }
  
  // Auto-create chat room
  try {
    await autoCreateCourseChatRoom(courseId);
  } catch (chatError) {
    console.error('Error creating chat room for course:', chatError);
    // Don't throw - chat room creation shouldn't block course publishing
  }
}

// Archive a course (set status to 'archived')
export async function archiveCourse(courseId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  
  const { error } = await supabase
    .from('courses')
    .update({ 
      status: 'archived',
      updated_at: new Date().toISOString()
    })
    .eq('id', courseId);
  
  if (error) {
    console.error('Error archiving course:', error);
    throw new Error(`Failed to archive course: ${error.message}`);
  }
}

// Enroll student in course class
export async function enrollStudent(courseClassId: number, userId: string, role: string = "student"): Promise<ClassMember> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("class_members")
    .insert({
      course_class_id: courseClassId,
      user_id: userId,
      role: role
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Unpublish a course (set status back to 'draft')
export async function unpublishCourse(courseId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  
  const { error } = await supabase
    .from('courses')
    .update({ 
      status: 'draft',
      updated_at: new Date().toISOString()
    })
    .eq('id', courseId);
  
  if (error) {
    console.error('Error unpublishing course:', error);
    throw new Error(`Failed to unpublish course: ${error.message}`);
  }
}

// Update course class (offering)
export async function updateCourseClass(courseClassId: number, updates: Partial<CourseClass>): Promise<CourseClass> {
  const supabase = getSupabaseBrowserClient();
  
  // Clean the updates - ensure instructor_id is proper UUID or null
  const cleanedUpdates: any = { ...updates };
  
  if (cleanedUpdates.instructor_id === "" || 
      cleanedUpdates.instructor_id === "null" || 
      cleanedUpdates.instructor_id === "undefined") {
    cleanedUpdates.instructor_id = null;
  }
  
  // Validate UUID format if present
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (cleanedUpdates.instructor_id && !uuidRegex.test(cleanedUpdates.instructor_id)) {
    console.error("Invalid UUID format for instructor_id in update:", cleanedUpdates.instructor_id);
    cleanedUpdates.instructor_id = null;
  }
  
  const { data, error } = await supabase
    .from("course_classes")
    .update(cleanedUpdates)
    .eq("id", courseClassId)
    .select()
    .single();
  
  if (error) {
    console.error("Update error details:", error);
    throw error;
  }
  return data;
}

// Delete course class (offering)
export async function deleteCourseClass(courseClassId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  
  // First delete associated class members
  const { error: membersError } = await supabase
    .from("class_members")
    .delete()
    .eq("course_class_id", courseClassId);
  
  if (membersError && membersError.code !== 'PGRST116') {
    console.error('Error deleting class members:', membersError);
  }
  
  // Delete associated schedules
  const { error: schedulesError } = await supabase
    .from("class_schedules")
    .delete()
    .eq("course_class_id", courseClassId);
  
  if (schedulesError && schedulesError.code !== 'PGRST116') {
    console.error('Error deleting class schedules:', schedulesError);
  }
  
  // Delete the course class
  const { error } = await supabase
    .from("course_classes")
    .delete()
    .eq("id", courseClassId);
  
  if (error) throw error;
}

// Update class schedule
export async function updateClassSchedule(scheduleId: number, updates: Partial<ClassSchedule>): Promise<ClassSchedule> {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("class_schedules")
    .update(updates)
    .eq("id", scheduleId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Delete class schedule
export async function deleteClassSchedule(scheduleId: number): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  
  const { error } = await supabase
    .from("class_schedules")
    .delete()
    .eq("id", scheduleId);
  
  if (error) throw error;
}