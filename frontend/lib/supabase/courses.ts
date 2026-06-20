// frontend/lib/supabase/courses.ts
import { getSupabaseBrowserClient } from "./browser-client";
import { Database } from "@/types/supabase";
import {
  autoCreateCourseChatRoom,
} from "@/lib/supabase/chat";

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
  
  const { data: courseClasses } = await supabase
    .from('course_classes')
    .select('id')
    .eq('course_id', courseId);

  const classIds = (courseClasses ?? []).map((row) => row.id);
  if (classIds.length === 0) {
    return null;
  }

  const { data, error } = await supabase
    .from('class_members')
    .select('course_class_id')
    .eq('user_id', userId)
    .in('course_class_id', classIds)
    .limit(1);
  
  if (error) {
    console.error('Error getting course class ID:', error);
    return null;
  }
  
  return data && data.length > 0 ? data[0].course_class_id : null;
}

// Get course with all details (modules, classes, lessons, assignments) - BATCH OPTIMIZED
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
  
  // BATCH 1: Get ALL modules for this course
  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });
  
  if (modulesError) throw modulesError;
  
  if (!modules || modules.length === 0) {
    return {
      ...course,
      modules: [],
      course_classes: []
    };
  }
  
  const moduleIds = modules.map(m => m.id);
  
  // BATCH 2: Get ALL classes for ALL modules in one query
  const { data: allClasses, error: classesError } = await supabase
    .from("classes")
    .select("*")
    .in("module_id", moduleIds)
    .order("order_index", { ascending: true });
  
  if (classesError) throw classesError;
  
  const classIds = (allClasses || []).map(c => c.id);
  
  // BATCH 3: Get ALL lessons for ALL classes in one query
  const { data: allLessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("*")
    .in("class_id", classIds)
    .order("order_index", { ascending: true });
  
  if (lessonsError) throw lessonsError;
  
  const lessonIds = (allLessons || []).map(l => l.id);
  
  // BATCH 4: Get ALL assignments for ALL lessons in one query
  let allAssignments: any[] = [];
  if (lessonIds.length > 0) {
    const { data: assignments, error: assignmentsError } = await supabase
      .from("assignments")
      .select("*")
      .in("lesson_id", lessonIds);
    
    if (!assignmentsError && assignments) {
      allAssignments = assignments;
    }
  }
  
  // Build lookup maps for efficient data assembly
  const classesByModuleId: Record<number, any[]> = {};
  (allClasses || []).forEach(classItem => {
    if (!classesByModuleId[classItem.module_id]) {
      classesByModuleId[classItem.module_id] = [];
    }
    classesByModuleId[classItem.module_id].push(classItem);
  });
  
  const lessonsByClassId: Record<number, any[]> = {};
  (allLessons || []).forEach(lesson => {
    if (lesson.class_id == null) return;
    if (!lessonsByClassId[lesson.class_id]) {
      lessonsByClassId[lesson.class_id] = [];
    }
    lessonsByClassId[lesson.class_id].push(lesson);
  });
  
  const assignmentsByLessonId: Record<number, any[]> = {};
  allAssignments.forEach(assignment => {
    if (assignment.lesson_id) {
      if (!assignmentsByLessonId[assignment.lesson_id]) {
        assignmentsByLessonId[assignment.lesson_id] = [];
      }
      assignmentsByLessonId[assignment.lesson_id].push(assignment);
    }
  });
  
  // Assemble the hierarchy
  const modulesWithClasses = modules.map(module => {
    const moduleClasses = classesByModuleId[module.id] || [];
    
    const classesWithLessons = moduleClasses.map(classItem => {
      const classLessons = lessonsByClassId[classItem.id] || [];
      
      const lessonsWithAssignments = classLessons.map(lesson => ({
        ...lesson,
        assignments: assignmentsByLessonId[lesson.id] || []
      }));
      
      return {
        ...classItem,
        lessons: lessonsWithAssignments
      };
    });
    
    return {
      ...module,
      classes: classesWithLessons
    };
  });
  
  // BATCH 5: Get ALL course classes (offerings) for this course
  const { data: courseClasses, error: courseClassesError } = await supabase
    .from("course_classes")
    .select("*")
    .eq("course_id", courseId);
  
  if (courseClassesError) throw courseClassesError;
  
  let courseClassesWithDetails: CourseClassWithDetails[] = [];
  
  if (courseClasses && courseClasses.length > 0) {
    const offeringIds = courseClasses.map(cc => cc.id);
    
    // BATCH 6: Get ALL schedules for ALL offerings in one query
    const { data: allSchedules, error: schedulesError } = await supabase
      .from("class_schedules")
      .select("*")
      .in("course_class_id", offeringIds);
    
    if (schedulesError) throw schedulesError;
    
    const schedulesByOfferingId: Record<number, any[]> = {};
    (allSchedules || []).forEach(schedule => {
      if (!schedulesByOfferingId[schedule.course_class_id]) {
        schedulesByOfferingId[schedule.course_class_id] = [];
      }
      schedulesByOfferingId[schedule.course_class_id].push(schedule);
    });
    
    // BATCH 7: Get ALL members for ALL offerings in one query
    const { data: allMembers, error: membersError } = await supabase
      .from("class_members")
      .select("*")
      .in("course_class_id", offeringIds);
    
    if (membersError) throw membersError;
    
    const membersByOfferingId: Record<number, any[]> = {};
    (allMembers || []).forEach(member => {
      if (!membersByOfferingId[member.course_class_id]) {
        membersByOfferingId[member.course_class_id] = [];
      }
      membersByOfferingId[member.course_class_id].push(member);
    });
    
    // BATCH 8: Get chat room for this course (single query)
    const { data: chatRoom, error: chatRoomError } = await supabase
      .from("chat_rooms")
      .select("*")
      .eq("related_course_id", courseId)
      .eq("type", "course")
      .maybeSingle();
    
    if (chatRoomError) {
      console.error("Error fetching chat room:", chatRoomError);
    }
    
    // Assemble offerings
    courseClassesWithDetails = courseClasses.map((courseClass) => ({
      ...courseClass,
      schedules: schedulesByOfferingId[courseClass.id] || [],
      members: membersByOfferingId[courseClass.id] || [],
      chat_room: chatRoom || null,
    })) as CourseClassWithDetails[];
  }
  
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
export const addAssignment = async (lessonId: number, data: any) => {
  const supabase = getSupabaseBrowserClient();
  const { data: assignment, error } = await supabase
    .from("assignments")
    .insert({
      ...data,
      lesson_id: lessonId,  // This is critical!
    })
    .select()
    .single();
  
  if (error) throw error;
  return assignment;
};

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
  // console.log("=== DELETE ASSIGNMENT FROM COURSES.TS ===");
  // console.log("Deleting assignment ID:", assignmentId);
  
  const supabase = getSupabaseBrowserClient();
  
  // First delete any submissions associated with this assignment
  const { error: submissionsError } = await supabase
    .from("submissions")
    .delete()
    .eq("assignment_id", assignmentId);
  
  if (submissionsError && submissionsError.code !== 'PGRST116') {
    console.error("Error deleting submissions:", submissionsError);
    // Don't throw - continue with assignment deletion
  }
  
  // Then delete the assignment
  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId);
  
  if (error) {
    console.error("Error deleting assignment:", error);
    throw error;
  }
  
  // console.log("Assignment deleted successfully");
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
  
  // console.log("Final insert data for course_classes:", insertData);
  
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

// Get course reviews with user details
export async function getCourseReviews(courseId: number, page = 1, limit = 10) {
  const supabase = getSupabaseBrowserClient();
  const from = (page - 1) * limit;
  
  const { data, error, count } = await supabase
    .from("course_reviews")
    .select(`
      *,
      user:user_id (
        id,
        first_name,
        last_name,
        username,
        avatar_url
      )
    `, { count: "exact" })
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);
  
  if (error) throw error;
  return { reviews: data, total: count || 0 };
}

// Check if user has written a review
export async function hasUserReviewed(courseId: number, userId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("course_reviews")
    .select("id")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .maybeSingle();
  
  if (error) throw error;
  return !!data;
}

// Get course offerings with schedule
export async function getCourseOfferings(courseId: number) {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from("course_classes")
    .select(`
      *,
      schedules:class_schedules(*),
      members:class_members(count)
    `)
    .eq("course_id", courseId)
    .in("status", ["upcoming", "ongoing"]);
  
  if (error) throw error;
  return data;
}