"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Play, FileText, Users, MessageSquare, BookOpen, Clock, Star, Award, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";

interface CourseData {
  id: number;
  title: string;
  description: string | null;
  instructor_id: string;
  instructor_name: string;
  instructor_avatar: string | null;
  thumbnail: string | null;
  level: string;
  category: string;
  students_count: number;
  rating: number;
  reviews_count: number;
  duration: string;
  enrolled: boolean;
  progress: number;
  visibility: string;
  status: string;
  organization_id: number;
  organization_name: string;
}

interface Module {
  id: number;
  title: string;
  order_index: number;
  classes: Class[];
}

interface Class {
  id: number;
  title: string;
  order_index: number;
  lessons: Lesson[];
}

interface Lesson {
  id: number;
  title: string;
  content_type: string;
  duration_seconds: number | null;
  order_index: number;
  is_completed: boolean;
  is_free_preview: boolean;
}

interface Assignment {
  id: number;
  title: string;
  due_at: string | null;
  points: number;
  status: "pending" | "submitted" | "graded" | "overdue";
  grade?: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  avatar: string;
  progress: number;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);
  const supabase = getSupabaseBrowserClient();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [classMemberId, setClassMemberId] = useState<number | null>(null);
  const [courseClassId, setCourseClassId] = useState<number | null>(null);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    try {
      // 1. Get course details
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select(`
          *,
          organization:organization_id (
            id,
            name
          ),
          created_by_profile:created_by (
            id,
            first_name,
            last_name,
            username,
            avatar_url
          )
        `)
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;
      if (!courseData) throw new Error("Course not found");

      // Calculate total duration from lessons
      let totalDurationSeconds = 0;
      
      // 2. Get modules, classes, lessons with progress
      const { data: modulesData } = await supabase
        .from("modules")
        .select(`
          id,
          title,
          order_index,
          classes:classes (
            id,
            title,
            order_index,
            lessons:lessons (
              id,
              title,
              content_type,
              duration_seconds,
              order_index,
              is_free_preview
            )
          )
        `)
        .eq("course_id", courseId)
        .order("order_index");

      // Calculate total duration and format modules
      let userClassMemberId: number | null = null;
      let userProgressMap = new Map<number, { status: string; progress_percent: number }>();

      if (user) {
        // Get user's class member for this course (find any offering)
        const { data: classMember } = await supabase
          .from("class_members")
          .select(`
            id,
            course_class_id,
            enrolled_at,
            completed_at,
            lesson_progress (
              lesson_id,
              status,
              progress_percent
            )
          `)
          .eq("user_id", user.id)
          .in(
            "course_class_id",
            supabase
              .from("course_classes")
              .select("id")
              .eq("course_id", courseId)
          )
          .limit(1)
          .single();

        if (classMember) {
          userClassMemberId = classMember.id;
          setClassMemberId(classMember.id);
          setCourseClassId(classMember.course_class_id);
          
          // Build progress map
          classMember.lesson_progress?.forEach((progress: any) => {
            userProgressMap.set(progress.lesson_id, {
              status: progress.status,
              progress_percent: progress.progress_percent,
            });
          });
        }
      }

      // Calculate total duration and mark completed lessons
      const formattedModules = (modulesData || []).map(module => ({
        id: module.id,
        title: module.title,
        order_index: module.order_index,
        classes: (module.classes || []).map((classItem: any) => ({
          id: classItem.id,
          title: classItem.title,
          order_index: classItem.order_index,
          lessons: (classItem.lessons || []).map((lesson: any) => {
            if (lesson.duration_seconds) {
              totalDurationSeconds += lesson.duration_seconds;
            }
            
            const progress = userProgressMap.get(lesson.id);
            return {
              id: lesson.id,
              title: lesson.title,
              content_type: lesson.content_type,
              duration_seconds: lesson.duration_seconds,
              order_index: lesson.order_index,
              is_free_preview: lesson.is_free_preview,
              is_completed: progress?.status === "completed" || false,
            };
          }).sort((a: Lesson, b: Lesson) => a.order_index - b.order_index),
        })).sort((a: Class, b: Class) => a.order_index - b.order_index),
      }));

      // Format duration string
      const durationHours = Math.floor(totalDurationSeconds / 3600);
      const durationMinutes = Math.floor((totalDurationSeconds % 3600) / 60);
      const durationString = durationHours > 0 
        ? `${durationHours} hour${durationHours > 1 ? 's' : ''} ${durationMinutes > 0 ? `${durationMinutes} min` : ''}`
        : `${durationMinutes} minutes`;

      // Calculate progress percentage
      const totalLessons = formattedModules.reduce(
        (sum, m) => sum + m.classes.reduce((s, c) => s + c.lessons.length, 0),
        0
      );
      const completedLessons = formattedModules.reduce(
        (sum, m) => sum + m.classes.reduce((s, c) => s + c.lessons.filter(l => l.is_completed).length, 0),
        0
      );
      const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

      // Get enrollment status
      const isEnrolled = userClassMemberId !== null;

      // 3. Get course reviews stats
      const { data: reviewsData } = await supabase
        .from("course_reviews")
        .select("rating")
        .eq("course_id", courseId);

      const averageRating = reviewsData?.length 
        ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length 
        : 0;
      const reviewsCount = reviewsData?.length || 0;

      // 4. Get student count
      const { count: studentCount } = await supabase
        .from("class_members")
        .select("id", { count: "exact", head: true })
        .eq("course_class_id", courseClassId || 0);

      // 5. Get instructor profile
      const instructorName = courseData.created_by_profile?.first_name
        ? `${courseData.created_by_profile.first_name} ${courseData.created_by_profile.last_name || ""}`.trim()
        : courseData.created_by_profile?.username || "Unknown Instructor";
      const instructorAvatar = courseData.created_by_profile?.avatar_url;

      // 6. Get assignments for this course with submissions
      let userAssignments: Assignment[] = [];
      if (user && isEnrolled) {
        const { data: assignmentsData } = await supabase
          .from("assignments")
          .select(`
            *,
            submissions!inner (
              id,
              grade,
              submitted_at
            )
          `)
          .eq("course_id", courseId)
          .eq("submissions.user_id", user.id);

        const { data: allAssignments } = await supabase
          .from("assignments")
          .select("*")
          .eq("course_id", courseId);

        const submissionMap = new Map();
        assignmentsData?.forEach((a: any) => {
          submissionMap.set(a.id, a.submissions);
        });

        userAssignments = (allAssignments || []).map(assignment => {
          const submission = submissionMap.get(assignment.id);
          const dueDate = new Date(assignment.due_at);
          const now = new Date();
          let status: Assignment["status"] = "pending";

          if (submission) {
            if (submission.grade !== null) {
              status = "graded";
            } else {
              status = "submitted";
            }
          } else if (assignment.due_at && dueDate < now) {
            status = "overdue";
          }

          return {
            id: assignment.id,
            title: assignment.title,
            due_at: assignment.due_at,
            points: assignment.points,
            status,
            grade: submission?.grade,
          };
        });
      }

      // 7. Get enrolled students (for instructors)
      let enrolledStudents: Student[] = [];
      if (user && courseData.created_by === user.id && courseClassId) {
        const { data: classMembers } = await supabase
          .from("class_members")
          .select(`
            user_id,
            enrolled_at,
            user:user_id (
              id,
              first_name,
              last_name,
              username,
              email,
              avatar_url,
              lesson_progress!class_members_id_fkey (
                status
              )
            )
          `)
          .eq("course_class_id", courseClassId);

        if (classMembers) {
          enrolledStudents = classMembers.map(member => {
            const completedLessons = member.user?.lesson_progress?.filter(
              (p: any) => p.status === "completed"
            ).length || 0;
            const totalLessons = totalLessons;
            const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

            return {
              id: member.user_id,
              name: member.user?.first_name
                ? `${member.user.first_name} ${member.user.last_name || ""}`.trim()
                : member.user?.username || member.user?.email || "Unknown",
              email: member.user?.email || "",
              avatar: member.user?.avatar_url || "",
              progress: Math.round(progress),
            };
          });
        }
      }

      setCourse({
        id: courseData.id,
        title: courseData.title,
        description: courseData.description,
        instructor_id: courseData.created_by,
        instructor_name: instructorName,
        instructor_avatar: instructorAvatar,
        thumbnail: courseData.thumbnail,
        level: courseData.level,
        category: courseData.category,
        students_count: studentCount || 0,
        rating: averageRating,
        reviews_count: reviewsCount,
        duration: durationString,
        enrolled: isEnrolled,
        progress: Math.round(progressPercent),
        visibility: courseData.visibility,
        status: courseData.status,
        organization_id: courseData.organization_id,
        organization_name: courseData.organization?.name || "",
      });

      setModules(formattedModules);
      setAssignments(userAssignments);
      setStudents(enrolledStudents);

    } catch (error) {
      console.error("Error loading course:", error);
      toast.error("Failed to load course data");
      router.push("/courses");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setEnrolling(true);

    try {
      // Find an available course offering
      const { data: courseClass } = await supabase
        .from("course_classes")
        .select("id, max_students")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .in("status", ["upcoming", "ongoing"])
        .limit(1)
        .single();

      if (!courseClass) {
        toast.error("No available course offerings at this time");
        return;
      }

      // Check capacity
      const { count: currentStudents } = await supabase
        .from("class_members")
        .select("id", { count: "exact", head: true })
        .eq("course_class_id", courseClass.id);

      if (courseClass.max_students && currentStudents && currentStudents >= courseClass.max_students) {
        toast.error("This course offering is full");
        return;
      }

      // Enroll student
      const { error: enrollError } = await supabase
        .from("class_members")
        .insert({
          course_class_id: courseClass.id,
          user_id: user.id,
          role: "student",
        });

      if (enrollError) throw enrollError;

      toast.success("Successfully enrolled in course!");
      
      // Reload course data to reflect enrollment
      await loadCourseData();

    } catch (error) {
      console.error("Error enrolling:", error);
      toast.error("Failed to enroll in course");
    } finally {
      setEnrolling(false);
    }
  };

  const handleContinueLearning = () => {
    // Find first incomplete lesson
    for (const module of modules) {
      for (const classItem of module.classes) {
        const incompleteLesson = classItem.lessons.find(l => !l.is_completed);
        if (incompleteLesson) {
          router.push(`/courses/${courseId}/learn/lesson/${incompleteLesson.id}`);
          return;
        }
      }
    }
    // If all completed, go to first lesson
    if (modules[0]?.classes[0]?.lessons[0]) {
      router.push(`/courses/${courseId}/learn/lesson/${modules[0].classes[0].lessons[0].id}`);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-white mb-2">Course Not Found</h1>
        <p className="text-gray-400">The course you're looking for doesn't exist.</p>
        <Link href="/courses" className="mt-6 inline-block">
          <GlowButton>Back to Courses</GlowButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Course Header */}
      <div className="relative">
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          {course.thumbnail && (
            <img 
              src={course.thumbnail} 
              alt={course.title}
              className="w-full h-full object-cover opacity-20"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/80 to-transparent"></div>
        </div>
        
        <div className="relative p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-purple-500/20 text-purple-400 border-0">
                  {course.level}
                </Badge>
                <Badge className="bg-gray-500/20 text-gray-400 border-0">
                  {course.category}
                </Badge>
                {course.status === "published" && (
                  <Badge className="bg-green-500/20 text-green-400 border-0">
                    Published
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{course.title}</h1>
              <p className="text-lg md:text-xl text-gray-400 mb-6 max-w-3xl">{course.description}</p>
              
              <div className="flex flex-wrap items-center gap-6 text-gray-400 mb-6">
                <div className="flex items-center gap-2">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={course.instructor_avatar || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-600 text-white">
                      {getInitials(course.instructor_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white font-medium">{course.instructor_name}</p>
                    <p className="text-sm">Instructor</p>
                  </div>
                </div>
                
                {course.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                    <span className="text-white font-medium">{course.rating.toFixed(1)}</span>
                    <span>({course.reviews_count} reviews)</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>{course.students_count.toLocaleString()} students</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{course.duration}</span>
                </div>

                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <span>{modules.length} modules</span>
                </div>
              </div>
              
              {course.enrolled && course.progress > 0 && (
                <div className="space-y-2 max-w-md">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Your Progress</span>
                    <span className="text-purple-400 font-medium">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="h-3" />
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              {!course.enrolled ? (
                <GlowButton 
                  variant="primary" 
                  className="text-lg px-8"
                  onClick={handleEnroll}
                  isLoading={enrolling}
                >
                  Enroll Now
                </GlowButton>
              ) : (
                <>
                  <GlowButton variant="primary" onClick={handleContinueLearning}>
                    <Play className="w-5 h-5 mr-2" />
                    Continue Learning
                  </GlowButton>
                  {course.progress === 100 && (
                    <Link href={`/certificates/generate?courseId=${course.id}`}>
                      <GlowButton variant="secondary">
                        <Award className="w-5 h-5 mr-2" />
                        Get Certificate
                      </GlowButton>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Course Content */}
      <Tabs defaultValue="lessons" className="w-full">
        <TabsList className="bg-gray-800/50 border border-gray-700 p-1 rounded-xl">
          <TabsTrigger value="lessons" className="rounded-lg">
            <BookOpen className="w-4 h-4 mr-2" />
            Lessons
          </TabsTrigger>
          <TabsTrigger value="assignments" className="rounded-lg">
            <FileText className="w-4 h-4 mr-2" />
            Assignments
          </TabsTrigger>
          {course.instructor_id && students.length > 0 && (
            <TabsTrigger value="students" className="rounded-lg">
              <Users className="w-4 h-4 mr-2" />
              Students ({students.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="discussion" className="rounded-lg">
            <MessageSquare className="w-4 h-4 mr-2" />
            Discussion
          </TabsTrigger>
        </TabsList>
        
        {/* Lessons Tab */}
        <TabsContent value="lessons" className="mt-6">
          <div className="space-y-4">
            {modules.length === 0 ? (
              <GlowCard>
                <div className="p-8 text-center">
                  <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No lessons yet</h3>
                  <p className="text-gray-400">This course content is being prepared.</p>
                </div>
              </GlowCard>
            ) : (
              modules.map((module) => (
                <GlowCard key={module.id}>
                  <h3 className="text-xl font-semibold text-white mb-4">{module.title}</h3>
                  <div className="space-y-2">
                    {module.classes.map((classItem) => (
                      <div key={classItem.id} className="ml-4 mb-4">
                        <h4 className="text-md font-medium text-gray-300 mb-2">{classItem.title}</h4>
                        <div className="space-y-2 pl-4">
                          {classItem.lessons.map((lesson) => (
                            <Link 
                              key={lesson.id} 
                              href={course.enrolled || lesson.is_free_preview 
                                ? `/courses/${courseId}/learn/lesson/${lesson.id}`
                                : "#"
                              }
                              onClick={(e) => {
                                if (!course.enrolled && !lesson.is_free_preview) {
                                  e.preventDefault();
                                  toast.info("Please enroll to access this lesson");
                                }
                              }}
                            >
                              <div className={`
                                flex items-center gap-4 p-4 bg-gray-800/30 rounded-xl 
                                hover:bg-gray-800/50 transition-colors group cursor-pointer
                                ${(!course.enrolled && !lesson.is_free_preview) ? 'opacity-50 cursor-not-allowed' : ''}
                              `}>
                                <div className={`
                                  w-10 h-10 rounded-full flex items-center justify-center
                                  ${lesson.is_completed 
                                    ? "bg-gradient-to-r from-purple-500 to-violet-600" 
                                    : "bg-gray-800 border border-gray-700"
                                  }
                                `}>
                                  {lesson.is_completed ? (
                                    <CheckCircle className="w-5 h-5 text-white" />
                                  ) : (
                                    <Play className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                                
                                <div className="flex-1">
                                  <p className={`font-medium ${lesson.is_completed ? "text-white" : "text-gray-400"} group-hover:text-purple-400 transition-colors`}>
                                    {lesson.title}
                                  </p>
                                  {lesson.is_free_preview && !course.enrolled && (
                                    <Badge className="mt-1 bg-purple-500/20 text-purple-400 text-xs">
                                      Free Preview
                                    </Badge>
                                  )}
                                </div>
                                
                                {lesson.duration_seconds && (
                                  <div className="flex items-center gap-2 text-gray-500">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm">{formatDuration(lesson.duration_seconds)}</span>
                                  </div>
                                )}
                                
                                {lesson.is_completed && (
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlowCard>
              ))
            )}
          </div>
        </TabsContent>
        
        {/* Assignments Tab */}
        <TabsContent value="assignments" className="mt-6">
          <div className="space-y-4">
            {assignments.length === 0 ? (
              <GlowCard>
                <div className="p-8 text-center">
                  <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No assignments yet</h3>
                  <p className="text-gray-400">Check back later for assignments.</p>
                </div>
              </GlowCard>
            ) : (
              assignments.map((assignment) => {
                const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;
                const statusColors = {
                  pending: "bg-yellow-500/20 text-yellow-400",
                  submitted: "bg-blue-500/20 text-blue-400",
                  graded: "bg-green-500/20 text-green-400",
                  overdue: "bg-red-500/20 text-red-400",
                };
                
                return (
                  <Link key={assignment.id} href={`/assignments/${assignment.id}`}>
                    <GlowCard className="hover:scale-[1.01] transition-transform cursor-pointer">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-2">{assignment.title}</h3>
                          <div className="flex flex-wrap gap-4 text-sm">
                            {dueDate && (
                              <p className="text-gray-400">
                                Due: {dueDate.toLocaleDateString()}
                              </p>
                            )}
                            <p className="text-gray-400">
                              Points: {assignment.points}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={statusColors[assignment.status]}>
                            {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                          </Badge>
                          {assignment.status === "graded" && assignment.grade !== undefined && (
                            <Badge className="bg-green-500/20 text-green-400">
                              Grade: {assignment.grade}/{assignment.points}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </GlowCard>
                  </Link>
                );
              })
            )}
          </div>
        </TabsContent>
        
        {/* Students Tab */}
        <TabsContent value="students" className="mt-6">
          <div className="space-y-4">
            {students.length === 0 ? (
              <GlowCard>
                <div className="p-8 text-center">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No students yet</h3>
                  <p className="text-gray-400">Students who enroll will appear here.</p>
                </div>
              </GlowCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((student) => (
                  <GlowCard key={student.id}>
                    <div className="p-4 flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={student.avatar} />
                        <AvatarFallback className="bg-purple-600 text-white">
                          {getInitials(student.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-white">{student.name}</p>
                        <p className="text-sm text-gray-400">{student.email}</p>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{student.progress}%</span>
                          </div>
                          <Progress value={student.progress} className="h-1" />
                        </div>
                      </div>
                    </div>
                  </GlowCard>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Discussion Tab */}
        <TabsContent value="discussion" className="mt-6">
          <GlowCard>
            <div className="p-8 text-center">
              <MessageSquare className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Course Discussion</h3>
              <p className="text-gray-400 mb-6">
                Join the conversation with fellow students and instructors.
              </p>
              {course.enrolled && (
                <Link href={`/courses/${courseId}/chat`}>
                  <GlowButton>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Go to Discussion
                  </GlowButton>
                </Link>
              )}
              {!course.enrolled && (
                <p className="text-gray-400 text-sm">Enroll to join the discussion.</p>
              )}
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}