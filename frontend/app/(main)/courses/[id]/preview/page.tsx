"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  FileText,
  Clock,
  Users,
  Star,
  Award,
  BookOpen,
  CheckCircle,
  Lock,
  Video,
  FileQuestion,
  ChevronRight,
  ChevronDown,
  Calendar,
  Building2,
  MessageSquare,
  Shield,
  Eye,
  Edit,
  Globe,
  AlertCircle,
  Loader2,
  GraduationCap,
  UserCheck,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useRole } from "@/components/providers/RoleProvider";

interface CoursePreviewData {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  level: string;
  category: string;
  visibility: "public" | "org" | "private";
  status: "draft" | "published" | "archived";
  organization_id: number;
  organization?: {
    id: number;
    name: string;
    description: string;
    slug: string;
  };
  instructor?: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    avatar_url: string;
    bio: string;
    job_title: string;
  };
  learning_objectives: string[];
  prerequisites: string[];
  tags: string[];
  average_rating: number;
  total_reviews: number;
  total_students: number;
  total_lessons: number;
  total_duration_minutes: number;
  modules: ModulePreviewData[];
  course_classes: CourseOfferingPreview[];
}

interface ModulePreviewData {
  id: number;
  title: string;
  order_index: number;
  classes: ClassPreviewData[];
  total_lessons: number;
  free_preview_count: number;
}

interface ClassPreviewData {
  id: number;
  title: string;
  order_index: number;
  lessons: LessonPreviewData[];
}

interface LessonPreviewData {
  id: number;
  title: string;
  content_type: "video" | "text" | "quiz";
  content_url: string | null;
  duration_seconds: number | null;
  order_index: number;
  is_free_preview: boolean;
  is_locked_for_user: boolean;
}

interface CourseOfferingPreview {
  id: number;
  name: string;
  description: string | null;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  start_date: string | null;
  end_date: string | null;
  max_students: number | null;
  current_students: number;
  schedules: {
    id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }[];
}

export default function CoursePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const { roleData } = useRole();
  const courseId = parseInt(params.id as string);

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CoursePreviewData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);
  const [userCanEdit, setUserCanEdit] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<"curriculum" | "reviews" | "details">("curriculum");
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    loadCoursePreview();
  }, [courseId]);

  const loadCoursePreview = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      
      // Get course details
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select(`
          *,
          organization:organizations!courses_organization_id_fkey (
            id,
            name,
            description,
            slug
          ),
          instructor:profiles!courses_created_by_fkey (
            id,
            first_name,
            last_name,
            username,
            avatar_url,
            bio,
            job_title
          )
        `)
        .eq("id", courseId)
        .single();
      
      if (courseError) throw courseError;
      if (!courseData) {
        toast.error("Course not found");
        router.push("/courses");
        return;
      }
      
      // Check if user is the instructor
      const isCreator = authUser?.id === courseData.created_by;
      setIsInstructor(isCreator);
      
      // Check if user can edit (admin OR instructor)
      const canEdit = roleData.role === "admin" || isCreator;
      setUserCanEdit(canEdit);
      
      // Get modules, classes, lessons
      const { data: modulesData } = await supabase
        .from("modules")
        .select(`
          *,
          classes:classes (
            *,
            lessons:lessons (
              *,
              assignments:assignments (id)
            )
          )
        `)
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });
      
      // Get course reviews
      const { data: reviewsData } = await supabase
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
        `)
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      
      if (reviewsData) {
        setReviews(reviewsData);
      }
      
      // Get total students count
      const { data: classMembers } = await supabase
        .from("class_members")
        .select("id")
        .eq("course_classes.course_id", courseId);
      
      const totalStudents = classMembers?.length || 0;
      
      // Calculate total lessons and duration
      let totalLessons = 0;
      let totalDurationSeconds = 0;
      let freePreviewCount = 0;
      
      const modulesWithDetails: ModulePreviewData[] = (modulesData || []).map(module => {
        const classesWithDetails: ClassPreviewData[] = (module.classes || []).map(classItem => {
          const lessonsWithDetails: LessonPreviewData[] = (classItem.lessons || []).map(lesson => {
            totalLessons++;
            if (lesson.duration_seconds) {
              totalDurationSeconds += lesson.duration_seconds;
            }
            if (lesson.is_free_preview) {
              freePreviewCount++;
            }
            
            // Determine if lesson is locked for the user
            let isLocked = true;
            if (!authUser) {
              // Not logged in - only free previews are accessible
              isLocked = !lesson.is_free_preview;
            } else if (isCreator || roleData.role === "admin") {
              // Instructor/admin can see everything
              isLocked = false;
            } else {
              // Logged in user - check if enrolled
              // This will be updated after enrollment check
              isLocked = !lesson.is_free_preview;
            }
            
            return {
              id: lesson.id,
              title: lesson.title,
              content_type: lesson.content_type as "video" | "text" | "quiz",
              content_url: lesson.content_url,
              duration_seconds: lesson.duration_seconds,
              order_index: lesson.order_index,
              is_free_preview: lesson.is_free_preview || false,
              is_locked_for_user: isLocked,
            };
          }).sort((a, b) => a.order_index - b.order_index);
          
          return {
            id: classItem.id,
            title: classItem.title,
            order_index: classItem.order_index,
            lessons: lessonsWithDetails,
          };
        }).sort((a, b) => a.order_index - b.order_index);
        
        return {
          id: module.id,
          title: module.title,
          order_index: module.order_index,
          classes: classesWithDetails,
          total_lessons: classesWithDetails.reduce((sum, c) => sum + c.lessons.length, 0),
          free_preview_count: classesWithDetails.reduce((sum, c) => 
            sum + c.lessons.filter(l => l.is_free_preview).length, 0
          ),
        };
      }).sort((a, b) => a.order_index - b.order_index);
      
      // Calculate average rating
      const avgRating = reviewsData?.length 
        ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length 
        : 0;
      
      // Get course offerings
      const { data: offeringsData } = await supabase
        .from("course_classes")
        .select(`
          *,
          schedules:class_schedules (*),
          members:class_members (id)
        `)
        .eq("course_id", courseId)
        .in("status", ["upcoming", "ongoing"]);
      
      const offeringsWithDetails: CourseOfferingPreview[] = (offeringsData || []).map(offering => ({
        id: offering.id,
        name: offering.name,
        description: offering.description,
        status: offering.status,
        start_date: offering.start_date,
        end_date: offering.end_date,
        max_students: offering.max_students,
        current_students: offering.members?.length || 0,
        schedules: offering.schedules || [],
      }));
      
      // Check enrollment
      let enrolled = false;
      if (authUser) {
        const { data: enrollment } = await supabase
          .from("class_members")
          .select("id")
          .eq("user_id", authUser.id)
          .in("course_class_id", offeringsData?.map(o => o.id) || []);
        
        enrolled = (enrollment?.length || 0) > 0;
        setIsEnrolled(enrolled);
        
        // If enrolled, update lesson lock status
        if (enrolled && !isCreator && roleData.role !== "admin") {
          modulesWithDetails.forEach(module => {
            module.classes.forEach(classItem => {
              classItem.lessons.forEach(lesson => {
                lesson.is_locked_for_user = false;
              });
            });
          });
        }
      }
      
      setCourse({
        id: courseData.id,
        title: courseData.title,
        description: courseData.description,
        thumbnail: courseData.thumbnail,
        level: courseData.level,
        category: courseData.category,
        visibility: courseData.visibility,
        status: courseData.status,
        organization_id: courseData.organization_id,
        organization: courseData.organization,
        instructor: courseData.instructor,
        learning_objectives: courseData.learning_objectives || [],
        prerequisites: courseData.prerequisites || [],
        tags: courseData.tags || [],
        average_rating: avgRating,
        total_reviews: reviewsData?.length || 0,
        total_students: totalStudents,
        total_lessons: totalLessons,
        total_duration_minutes: Math.floor(totalDurationSeconds / 60),
        modules: modulesWithDetails,
        course_classes: offeringsWithDetails,
      });
      
      // Auto-expand first module
      if (modulesWithDetails.length > 0) {
        setExpandedModules(new Set([modulesWithDetails[0].id]));
      }
      
    } catch (error) {
      console.error("Error loading course preview:", error);
      toast.error("Failed to load course");
    } finally {
      setLoading(false);
    }
  };
  
  const toggleModule = (moduleId: number) => {
    const newSet = new Set(expandedModules);
    if (newSet.has(moduleId)) {
      newSet.delete(moduleId);
    } else {
      newSet.add(moduleId);
    }
    setExpandedModules(newSet);
  };
  
  const handleEnroll = async () => {
    if (!user) {
      router.push(`/login?redirect=/courses/${courseId}/enroll`);
      return;
    }
    
    router.push(`/courses/${courseId}/enroll`);
  };
  
  const handleEdit = () => {
    router.push(`/courses/${courseId}/edit`);
  };
  
  const handleStartLearning = () => {
    router.push(`/courses/${courseId}/learn`);
  };
  
  const handlePreviewLesson = (lesson: LessonPreviewData) => {
    if (lesson.is_free_preview || isEnrolled || isInstructor || roleData.role === "admin") {
      router.push(`/courses/${courseId}/learn/lesson/${lesson.id}`);
    } else {
      toast.info("Please enroll to access this lesson");
    }
  };
  
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (mins === 0) return `${remainingSeconds} sec`;
    return `${mins} min ${remainingSeconds} sec`;
  };
  
  const getContentIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="w-4 h-4 text-blue-400" />;
      case "text": return <FileText className="w-4 h-4 text-green-400" />;
      case "quiz": return <FileQuestion className="w-4 h-4 text-yellow-400" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };
  
  const getVisibilityBadge = () => {
    if (!course) return null;
    
    switch (course.visibility) {
      case "public":
        return <Badge className="bg-green-500/20 text-green-300">Public</Badge>;
      case "org":
        return <Badge className="bg-blue-500/20 text-blue-300">Organization Only</Badge>;
      case "private":
        return <Badge className="bg-yellow-500/20 text-yellow-300">Private</Badge>;
      default:
        return null;
    }
  };
  
  const getStatusBadge = () => {
    if (!course) return null;
    
    switch (course.status) {
      case "published":
        return <Badge className="bg-green-500/20 text-green-300">Published</Badge>;
      case "draft":
        return <Badge className="bg-yellow-500/20 text-yellow-300">Draft</Badge>;
      case "archived":
        return <Badge className="bg-gray-500/20 text-gray-300">Archived</Badge>;
      default:
        return null;
    }
  };
  
  const getDayName = (day: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day];
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <GlowCard>
            <div className="py-12">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Course Not Found</h2>
              <p className="text-gray-400 mb-6">The course you're looking for doesn't exist.</p>
              <GlowButton onClick={() => router.push("/courses")}>Browse Courses</GlowButton>
            </div>
          </GlowCard>
        </div>
      </div>
    );
  }
  
  // Redirect enrolled users to learn page (they don't need preview)
  if (isEnrolled && !isInstructor && roleData.role !== "admin") {
    router.push(`/courses/${courseId}/learn`);
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-purple-900/50 to-slate-900 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex justify-between items-start mb-6">
            <Link href="/courses">
              <GlowButton variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Courses
              </GlowButton>
            </Link>
            
            {/* Edit button for instructors/admins */}
            {userCanEdit && (
              <GlowButton variant="secondary" size="sm" onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Course
              </GlowButton>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Course Info */}
            <div className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {getVisibilityBadge()}
                {getStatusBadge()}
                <Badge className="bg-purple-500/20 text-purple-300">
                  {course.level?.toUpperCase()}
                </Badge>
                <Badge variant="outline">{course.category}</Badge>
                {course.tags?.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4">{course.title}</h1>
              
              {course.description && (
                <p className="text-gray-300 text-lg mb-6">{course.description}</p>
              )}
              
              <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{course.modules.length} modules</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{course.total_lessons} lessons</span>
                </div>
                {course.total_duration_minutes > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{Math.floor(course.total_duration_minutes / 60)}h {course.total_duration_minutes % 60}m</span>
                  </div>
                )}
                {course.average_rating > 0 && (
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span>{course.average_rating.toFixed(1)} ({course.total_reviews} reviews)</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{course.total_students.toLocaleString()} students</span>
                </div>
              </div>
              
              {/* Instructor Info */}
              {course.instructor && (
                <div className="flex items-center gap-3 mb-6">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={course.instructor.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-600 text-white text-lg">
                      {course.instructor.first_name?.[0] || course.instructor.username?.[0] || "I"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm text-gray-400">Instructor</div>
                    <div className="text-white font-semibold">
                      {course.instructor.first_name} {course.instructor.last_name}
                    </div>
                    {course.instructor.job_title && (
                      <div className="text-sm text-gray-400">
                        {course.instructor.job_title}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Right Column - Action Card */}
            <div>
              <GlowCard className="sticky top-24">
                <div className="p-6">
                  {course.thumbnail && (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  
                  <div className="space-y-4">
                    {/* Action buttons based on role */}
                    {userCanEdit ? (
                      // Instructor/Admin view
                      <>
                        <GlowButton variant="primary" fullWidth onClick={handleEdit}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Course
                        </GlowButton>
                        <p className="text-sm text-purple-400 text-center">
                          You are the {isInstructor ? "instructor" : "admin"} of this course
                        </p>
                      </>
                    ) : isEnrolled ? (
                      // Enrolled student view - shouldn't happen but just in case
                      <>
                        <GlowButton variant="primary" fullWidth onClick={handleStartLearning}>
                          <Play className="w-4 h-4 mr-2" />
                          Continue Learning
                        </GlowButton>
                        <p className="text-sm text-green-400 text-center">
                          You are enrolled in this course
                        </p>
                      </>
                    ) : (
                      // Unenrolled user view
                      <>
                        <GlowButton variant="primary" fullWidth onClick={handleEnroll}>
                          Enroll Now
                        </GlowButton>
                        <p className="text-xs text-gray-400 text-center">
                          {course.visibility === "public" && "Open to everyone"}
                          {course.visibility === "org" && "Available to organization members"}
                          {course.visibility === "private" && "By invitation only"}
                        </p>
                      </>
                    )}
                    
                    {/* Free preview indicator */}
                    {course.modules.some(m => m.free_preview_count > 0) && (
                      <div className="pt-4 border-t border-slate-700">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Eye className="w-4 h-4" />
                          <span>
                            {course.modules.reduce((sum, m) => sum + m.free_preview_count, 0)} free preview lessons available
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </GlowCard>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content Tabs */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({course.total_reviews})</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          {/* Curriculum Tab */}
          <TabsContent value="curriculum">
            <GlowCard>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Course Curriculum</h2>
                <div className="space-y-3">
                  {course.modules.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Curriculum is being prepared</p>
                    </div>
                  ) : (
                    course.modules.map((module) => {
                      const isExpanded = expandedModules.has(module.id);
                      
                      return (
                        <div key={module.id} className="border border-slate-700 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleModule(module.id)}
                            className="w-full bg-slate-800/50 p-4 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                              <div className="text-left">
                                <div className="font-semibold text-white">{module.title}</div>
                                <div className="text-sm text-gray-400">
                                  {module.total_lessons} lessons
                                  {module.free_preview_count > 0 && ` • ${module.free_preview_count} free preview`}
                                </div>
                              </div>
                            </div>
                            <Badge variant="secondary">Module {module.order_index + 1}</Badge>
                          </button>
                          
                          {isExpanded && (
                            <div className="p-4 space-y-3 bg-slate-900/30">
                              {module.classes.map((classItem) => (
                                <div key={classItem.id} className="ml-6">
                                  <div className="text-white font-medium mb-2">{classItem.title}</div>
                                  <div className="space-y-2 ml-4">
                                    {classItem.lessons.map((lesson) => (
                                      <button
                                        key={lesson.id}
                                        onClick={() => handlePreviewLesson(lesson)}
                                        className={`w-full flex items-center gap-3 text-sm p-2 rounded-lg transition-colors text-left
                                          ${lesson.is_locked_for_user && !lesson.is_free_preview
                                            ? "opacity-60 cursor-not-allowed hover:bg-transparent"
                                            : "hover:bg-slate-800/30 cursor-pointer"
                                          }`}
                                        disabled={lesson.is_locked_for_user && !lesson.is_free_preview}
                                      >
                                        {getContentIcon(lesson.content_type)}
                                        <span className={lesson.is_free_preview ? "text-purple-300" : "text-gray-300"}>
                                          {lesson.title}
                                        </span>
                                        {lesson.is_free_preview && !isEnrolled && !userCanEdit && (
                                          <Badge variant="secondary" className="text-xs ml-2">
                                            Free Preview
                                          </Badge>
                                        )}
                                        {lesson.is_locked_for_user && !lesson.is_free_preview && !isEnrolled && !userCanEdit && (
                                          <Lock className="w-3 h-3 text-gray-500 ml-auto" />
                                        )}
                                        {lesson.duration_seconds && (
                                          <span className="text-gray-500 text-xs ml-auto">
                                            {formatDuration(lesson.duration_seconds)}
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </GlowCard>
          </TabsContent>
          
          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <GlowCard>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Student Reviews</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= (course.average_rating || 0)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-600"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-white font-medium">{course.average_rating.toFixed(1)}</span>
                      <span className="text-gray-400">({course.total_reviews} reviews)</span>
                    </div>
                  </div>
                  
                  {!user && (
                    <Link href={`/login?redirect=/courses/${courseId}/reviews/create`}>
                      <GlowButton variant="secondary" size="sm">
                        Login to Review
                      </GlowButton>
                    </Link>
                  )}
                </div>
                
                {reviews.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No reviews yet. Be the first to review!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.slice(0, 5).map((review) => (
                      <div key={review.id} className="border-b border-slate-700 pb-4 last:border-0">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={review.user?.avatar_url || undefined} />
                            <AvatarFallback>
                              {review.user?.first_name?.[0] || review.user?.username?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-white font-medium">
                              {review.user?.first_name} {review.user?.last_name}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-3 h-3 ${
                                      star <= review.rating
                                        ? "text-yellow-400 fill-yellow-400"
                                        : "text-gray-600"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(review.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        {review.review && <p className="text-gray-300 text-sm mt-2">{review.review}</p>}
                      </div>
                    ))}
                  </div>
                )}
                
                {course.total_reviews > 5 && (
                  <div className="mt-4 text-center">
                    <Link href={`/courses/${courseId}/reviews`}>
                      <GlowButton variant="outline" size="sm">
                        View All {course.total_reviews} Reviews
                      </GlowButton>
                    </Link>
                  </div>
                )}
              </div>
            </GlowCard>
          </TabsContent>
          
          {/* Details Tab */}
          <TabsContent value="details">
            <GlowCard>
              <div className="p-6 space-y-6">
                {/* Organization */}
                {course.organization && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-purple-400" />
                      Organization
                    </h3>
                    <p className="text-gray-300">{course.organization.name}</p>
                    {course.organization.description && (
                      <p className="text-gray-400 text-sm mt-1">{course.organization.description}</p>
                    )}
                  </div>
                )}
                
                {/* Learning Objectives */}
                {course.learning_objectives && course.learning_objectives.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Award className="w-5 h-5 text-purple-400" />
                      What You'll Learn
                    </h3>
                    <ul className="space-y-2">
                      {course.learning_objectives.map((objective, index) => (
                        <li key={index} className="flex items-start gap-2 text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Prerequisites */}
                {course.prerequisites && course.prerequisites.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-yellow-400" />
                      Prerequisites
                    </h3>
                    <ul className="space-y-2">
                      {course.prerequisites.map((prereq, index) => (
                        <li key={index} className="flex items-start gap-2 text-gray-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2" />
                          <span>{prereq}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Course Offerings */}
                {course.course_classes && course.course_classes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-400" />
                      Available Sessions
                    </h3>
                    <div className="space-y-3">
                      {course.course_classes.map((offering) => (
                        <div key={offering.id} className="bg-slate-800/30 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-white">{offering.name}</h4>
                              {offering.description && (
                                <p className="text-sm text-gray-400 mt-1">{offering.description}</p>
                              )}
                              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-400">
                                {offering.start_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>Starts: {new Date(offering.start_date).toLocaleDateString()}</span>
                                  </div>
                                )}
                                {offering.schedules && offering.schedules.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{offering.schedules.length} sessions/week</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  <span>{offering.current_students} / {offering.max_students || "∞"} students</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Course chat available</span>
                                </div>
                              </div>
                              
                              {/* Schedule Details */}
                              {offering.schedules && offering.schedules.length > 0 && (
                                <div className="mt-3 pt-2">
                                  <div className="text-xs text-gray-500 mb-1">Schedule:</div>
                                  <div className="flex flex-wrap gap-2">
                                    {offering.schedules.map((schedule, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {getDayName(schedule.day_of_week)} {schedule.start_time}-{schedule.end_time}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            {offering.status === "upcoming" && (
                              <Badge className="bg-blue-500/20 text-blue-300">Upcoming</Badge>
                            )}
                            {offering.status === "ongoing" && (
                              <Badge className="bg-green-500/20 text-green-300">Ongoing</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Instructor Bio */}
                {course.instructor?.bio && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-purple-400" />
                      About the Instructor
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">{course.instructor.bio}</p>
                  </div>
                )}
              </div>
            </GlowCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}