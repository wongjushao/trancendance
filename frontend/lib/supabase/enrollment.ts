// frontend/lib/supabase/enrollment.ts (BATCH OPTIMIZED)
import { getSupabaseBrowserClient } from "./browser-client";

// Direct enrollment - no approval needed
export async function enrollInCourse(courseClassId: number, userId: string) {
  const supabase = getSupabaseBrowserClient();
  
  // BATCH: Get existing enrollment AND course class details in parallel
  const [existingResult, courseClassResult, enrollmentCountResult] = await Promise.all([
    supabase
      .from("class_members")
      .select("*")
      .eq("course_class_id", courseClassId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("course_classes")
      .select("max_students, course_id")
      .eq("id", courseClassId)
      .single(),
    supabase
      .from("class_members")
      .select("*", { count: "exact", head: true })
      .eq("course_class_id", courseClassId)
      .eq("role", "student")
  ]);
  
  const existing = existingResult.data;
  const courseClass = courseClassResult.data;
  const enrolledCount = enrollmentCountResult.count;
  
  if (existing) {
    throw new Error("Already enrolled in this course");
  }
  
  // Check capacity
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
  
  // Auto-add to course chat room (if exists)
  if (courseClass?.course_id) {
    const { data: chatRoom } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("related_course_id", courseClass.course_id)
      .eq("type", "course")
      .maybeSingle();
    
    if (chatRoom) {
      await supabase
        .from("chat_room_members")
        .insert({
          room_id: chatRoom.id,
          user_id: userId
        })
        .select();
    }
  }
  
  return member;
}

// Remove student from course (teacher/admin action)
export async function removeStudentFromCourse(courseClassId: number, userId: string) {
  const supabase = getSupabaseBrowserClient();
  
  // First get the course_id for this class (to find chat room)
  const { data: courseClass } = await supabase
    .from("course_classes")
    .select("course_id")
    .eq("id", courseClassId)
    .maybeSingle();
  
  // Delete the class member
  const { error } = await supabase
    .from("class_members")
    .delete()
    .eq("course_class_id", courseClassId)
    .eq("user_id", userId)
    .eq("role", "student");
  
  if (error) throw error;
  
  // Optionally remove from chat room as well
  if (courseClass?.course_id) {
    const { data: chatRoom } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("related_course_id", courseClass.course_id)
      .eq("type", "course")
      .maybeSingle();
    
    if (chatRoom) {
      await supabase
        .from("chat_room_members")
        .delete()
        .eq("room_id", chatRoom.id)
        .eq("user_id", userId);
    }
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
    .maybeSingle();
  
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

// Get all enrolled students for a course offering - BATCH OPTIMIZED
export async function getEnrolledStudents(courseClassId: number) {
  const supabase = getSupabaseBrowserClient();
  
  // Single query with JOIN to get all students with their profiles
  const { data, error } = await supabase
    .from("class_members")
    .select(`
      id,
      user_id,
      enrolled_at,
      role,
      profiles!user_id (
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
  
  // Format the response to match expected structure
  return (data || []).map(item => ({
    id: item.id,
    user_id: item.user_id,
    enrolled_at: item.enrolled_at,
    role: item.role,
    user: item.profiles
  }));
}

// Get all courses a user is enrolled in - BATCH OPTIMIZED
export async function getUserEnrolledCourses(userId: string) {
  const supabase = getSupabaseBrowserClient();
  
  // Single query with nested joins to get all enrollments with course details
  const { data, error } = await supabase
    .from("class_members")
    .select(`
      id,
      enrolled_at,
      role,
      course_class:course_classes!inner (
        id,
        name,
        start_date,
        end_date,
        status,
        course:courses!inner (
          id,
          title,
          description,
          thumbnail,
          level,
          category,
          organization_id,
          created_by,
          created_at
        )
      )
    `)
    .eq("user_id", userId)
    .eq("role", "student");
  
  if (error) throw error;
  
  if (!data || data.length === 0) return [];
  
  // Get unique course IDs to fetch additional data like progress
  const courseIds = [...new Set(
    data.map(item => item.course_class?.course?.id).filter(Boolean)
  )];
  
  // BATCH: Get lesson counts and user progress for all courses in one go
  let lessonsByCourseId: Record<number, number> = {};
  let progressByCourseId: Record<number, { completed: number; total: number }> = {};
  
  if (courseIds.length > 0) {
    // Get all modules and lessons for these courses
    const { data: modulesData } = await supabase
      .from("modules")
      .select(`
        id,
        course_id,
        classes!inner (
          id,
          lessons!inner (
            id
          )
        )
      `)
      .in("course_id", courseIds);
    
    // Count lessons per course
    if (modulesData) {
      modulesData.forEach(module => {
        const courseId = module.course_id;
        if (!lessonsByCourseId[courseId]) lessonsByCourseId[courseId] = 0;
        
        module.classes?.forEach(classItem => {
          lessonsByCourseId[courseId] += classItem.lessons?.length || 0;
        });
      });
    }
    
    // Get all lesson ids for these courses
    const { data: allLessons } = await supabase
      .from("lessons")
      .select("id, class_id, classes!inner(module_id, modules!inner(course_id))")
      .in("classes.modules.course_id", courseIds);
    
    const lessonIds = allLessons?.map(l => l.id) || [];
    
    // Get user's progress for all lessons
    if (lessonIds.length > 0) {
      const { data: allProgress } = await supabase
        .from("lesson_progress")
        .select("lesson_id, status")
        .eq("user_id", userId)
        .in("lesson_id", lessonIds);
      
      const completedLessonIds = new Set(
        allProgress?.filter(p => p.status === "completed").map(p => p.lesson_id) || []
      );
      
      // Calculate progress per course
      for (const lesson of allLessons || []) {
        const courseId = lesson.classes?.modules?.course_id;
        if (courseId) {
          if (!progressByCourseId[courseId]) {
            progressByCourseId[courseId] = { completed: 0, total: 0 };
          }
          progressByCourseId[courseId].total++;
          if (completedLessonIds.has(lesson.id)) {
            progressByCourseId[courseId].completed++;
          }
        }
      }
    }
  }
  
  // Format the response with progress data
  return data.map(item => {
    const course = item.course_class?.course;
    const totalLessons = lessonsByCourseId[course?.id] || 0;
    const progress = progressByCourseId[course?.id] || { completed: 0, total: totalLessons };
    const progressPercentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
    
    return {
      ...item,
      course_class: {
        ...item.course_class,
        course: course ? {
          ...course,
          total_lessons: totalLessons,
          completed_lessons: progress.completed,
          progress: Math.round(progressPercentage)
        } : null
      }
    };
  });
}

// Get enrollment status for multiple courses at once (BATCH)
export async function getBulkEnrollmentStatus(courseClassIds: number[], userId: string) {
  const supabase = getSupabaseBrowserClient();
  
  if (!courseClassIds.length) return {};
  
  const { data, error } = await supabase
    .from("class_members")
    .select("course_class_id, id, role")
    .eq("user_id", userId)
    .in("course_class_id", courseClassIds)
    .eq("role", "student");
  
  if (error) throw error;
  
  const enrollmentMap: Record<number, { enrolled: boolean; memberId: number; role: string }> = {};
  courseClassIds.forEach(id => {
    enrollmentMap[id] = { enrolled: false, memberId: 0, role: "" };
  });
  
  (data || []).forEach(member => {
    enrollmentMap[member.course_class_id] = {
      enrolled: true,
      memberId: member.id,
      role: member.role
    };
  });
  
  return enrollmentMap;
}