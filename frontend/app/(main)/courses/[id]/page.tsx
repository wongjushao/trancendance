"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Play, FileText, Users, MessageSquare, BookOpen, Clock, Star, 
  Award, CheckCircle, Loader2, ArrowLeft, Eye, Shield, 
  Target, Sparkles, Heart, ThumbsUp, Quote, ChevronRight, 
  GraduationCap, Calendar, TrendingUp, StarHalf, Send, X 
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";

interface CourseData {
  id: number;
  title: string;
  description: string | null;
  instructor_id: string;
  instructor_name: string;
  instructor_avatar: string | null;
  instructor_bio?: string | null;
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
  learning_objectives?: string[];
  prerequisites?: string[];
  tags?: string[];
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

interface Review {
  id: number;
  rating: number;
  review: string | null;
  created_at: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface ReviewStats {
  average: number;
  total: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
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
  
  // Review state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    average: 0,
    total: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

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
            avatar_url,
            bio,
            job_title
          )
        `)
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;
      if (!courseData) throw new Error("Course not found");

      // Get instructor bio
      const instructorBio = courseData.created_by_profile?.bio;
      const instructorJobTitle = courseData.created_by_profile?.job_title;

      // Parse JSON fields
      let learningObjectives: string[] = [];
      let prerequisites: string[] = [];
      let tags: string[] = [];

      try {
        learningObjectives = courseData.learning_objectives || [];
        prerequisites = courseData.prerequisites || [];
        tags = courseData.tags || [];
      } catch (e) {
        console.error("Error parsing JSON fields:", e);
      }

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

      // 3. Load reviews and stats
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

      const allReviews: Review[] = (reviewsData || []).map(r => ({
        id: r.id,
        rating: r.rating,
        review: r.review,
        created_at: r.created_at,
        user: r.user,
      }));

      setReviews(allReviews.slice(0, 5));

      // Calculate stats
      const avgRating = allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0;
      
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      allReviews.forEach(r => {
        distribution[r.rating as keyof typeof distribution]++;
      });

      setReviewStats({
        average: avgRating,
        total: allReviews.length,
        distribution,
      });

      // Check if user has reviewed
      if (user) {
        const userExistingReview = allReviews.find(r => r.user.id === user.id);
        if (userExistingReview) {
          setUserReview(userExistingReview);
          setRatingValue(userExistingReview.rating);
          setReviewText(userExistingReview.review || "");
        }
      }

      // 4. Get student count (using existing query)
      const { count: studentCount } = await supabase
        .from("class_members")
        .select("id", { count: "exact", head: true })
        .eq("course_class_id", courseClassId || 0);

      // 5. Get instructor profile
      const instructorName = courseData.created_by_profile?.first_name
        ? `${courseData.created_by_profile.first_name} ${courseData.created_by_profile.last_name || ""}`.trim()
        : courseData.created_by_profile?.username || "Unknown Instructor";
      const instructorAvatar = courseData.created_by_profile?.avatar_url;

      // 6. Get assignments
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
            const totalLessonsCount = totalLessons;
            const progress = totalLessonsCount > 0 ? (completedLessons / totalLessonsCount) * 100 : 0;

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
        instructor_bio: instructorBio || instructorJobTitle || null,
        thumbnail: courseData.thumbnail,
        level: courseData.level,
        category: courseData.category,
        students_count: studentCount || 0,
        rating: avgRating,
        reviews_count: allReviews.length,
        duration: durationString,
        enrolled: isEnrolled,
        progress: Math.round(progressPercent),
        visibility: courseData.visibility,
        status: courseData.status,
        organization_id: courseData.organization_id,
        organization_name: courseData.organization?.name || "",
        learning_objectives: learningObjectives,
        prerequisites,
        tags,
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

      const { count: currentStudents } = await supabase
        .from("class_members")
        .select("id", { count: "exact", head: true })
        .eq("course_class_id", courseClass.id);

      if (courseClass.max_students && currentStudents && currentStudents >= courseClass.max_students) {
        toast.error("This course offering is full");
        return;
      }

      const { error: enrollError } = await supabase
        .from("class_members")
        .insert({
          course_class_id: courseClass.id,
          user_id: user.id,
          role: "student",
        });

      if (enrollError) throw enrollError;

      toast.success("Successfully enrolled in course!");
      await loadCourseData();

    } catch (error) {
      console.error("Error enrolling:", error);
      toast.error("Failed to enroll in course");
    } finally {
      setEnrolling(false);
    }
  };

  const handleContinueLearning = () => {
    for (const module of modules) {
      for (const classItem of module.classes) {
        const incompleteLesson = classItem.lessons.find(l => !l.is_completed);
        if (incompleteLesson) {
          router.push(`/courses/${courseId}/learn`);
          return;
        }
      }
    }
    if (modules[0]?.classes[0]?.lessons[0]) {
      router.push(`/courses/${courseId}/learn`);
    }
  };

  const handleSubmitReview = async () => {
    if (ratingValue === 0) {
      toast.error("Please select a rating");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please login to leave a review");
      router.push("/login");
      return;
    }

    if (!course?.enrolled) {
      toast.error("You must be enrolled in this course to leave a review");
      return;
    }

    setSubmittingReview(true);

    try {
      if (userReview) {
        // Update existing review
        const { error } = await supabase
          .from("course_reviews")
          .update({
            rating: ratingValue,
            review: reviewText.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userReview.id);

        if (error) throw error;
        toast.success("Review updated successfully!");
      } else {
        // Create new review
        const { error } = await supabase
          .from("course_reviews")
          .insert({
            course_id: courseId,
            user_id: user.id,
            rating: ratingValue,
            review: reviewText.trim() || null,
          });

        if (error) throw error;
        toast.success("Review submitted successfully! Thank you for your feedback.");
      }

      setShowReviewModal(false);
      await loadCourseData();

    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStars = (rating: number, size: "sm" | "md" | "lg" = "md") => {
    const sizes = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-5 h-5" };
    const sizeClass = sizes[size];
    
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-600"
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate rating distribution percentages
  const getPercentage = (count: number) => {
    return reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
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
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-4">
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
                {course.tags?.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
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
                    {renderStars(Math.round(course.rating), "sm")}
                    <span className="text-white font-medium ml-1">{course.rating.toFixed(1)}</span>
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
                <>
                  <GlowButton 
                    variant="primary" 
                    className="text-lg px-8"
                    onClick={handleEnroll}
                    isLoading={enrolling}
                  >
                    Enroll Now
                  </GlowButton>
                  <Link href={`/courses/${courseId}/preview`}>
                    <GlowButton variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Course
                    </GlowButton>
                  </Link>
                </>
              ) : (
                <>
                  <GlowButton variant="primary" onClick={handleContinueLearning}>
                    <Play className="w-5 h-5 mr-2" />
                    Continue Learning
                  </GlowButton>
                  {course.progress === 100 && (
                    <GlowButton variant="secondary">
                      <Award className="w-5 h-5 mr-2" />
                      Get Certificate
                    </GlowButton>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Course Content Tabs - Updated to include Overview as default */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-800/50 border border-gray-700 p-1 rounded-xl flex-wrap h-auto">
          <TabsTrigger value="overview" className="rounded-lg">
            <Target className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="lessons" className="rounded-lg">
            <BookOpen className="w-4 h-4 mr-2" />
            Curriculum
          </TabsTrigger>
          <TabsTrigger value="assignments" className="rounded-lg">
            <FileText className="w-4 h-4 mr-2" />
            Assignments ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-lg">
            <Star className="w-4 h-4 mr-2" />
            Reviews ({course.reviews_count})
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

        {/* OVERVIEW TAB - New! Combines learning objectives, prerequisites, instructor bio */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Learning Objectives */}
          {course.learning_objectives && course.learning_objectives.length > 0 && (
            <GlowCard>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-6 h-6 text-purple-400" />
                  <h2 className="text-xl font-semibold text-white">What You'll Learn</h2>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {course.learning_objectives.map((objective, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-300">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </GlowCard>
          )}

          {/* Prerequisites */}
          {course.prerequisites && course.prerequisites.length > 0 && (
            <GlowCard>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-6 h-6 text-yellow-400" />
                  <h2 className="text-xl font-semibold text-white">Prerequisites</h2>
                </div>
                <ul className="space-y-2">
                  {course.prerequisites.map((prerequisite, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2" />
                      <span>{prerequisite}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </GlowCard>
          )}

          {/* Course Features / Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlowCard>
              <div className="p-4 text-center">
                <GraduationCap className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{modules.length}</p>
                <p className="text-sm text-gray-400">Modules</p>
              </div>
            </GlowCard>
            <GlowCard>
              <div className="p-4 text-center">
                <Clock className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{course.duration}</p>
                <p className="text-sm text-gray-400">Total Duration</p>
              </div>
            </GlowCard>
            <GlowCard>
              <div className="p-4 text-center">
                <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">Certificate</p>
                <p className="text-sm text-gray-400">Upon Completion</p>
              </div>
            </GlowCard>
          </div>

          {/* Instructor Bio */}
          {course.instructor_bio && (
            <GlowCard>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={course.instructor_avatar || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-600 text-white text-xl">
                      {getInitials(course.instructor_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{course.instructor_name}</h2>
                    <p className="text-sm text-gray-400">Course Instructor</p>
                  </div>
                </div>
                <p className="text-gray-300 leading-relaxed">{course.instructor_bio}</p>
              </div>
            </GlowCard>
          )}

          {/* What's Included section */}
          <GlowCard>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">What's Included</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-gray-300">
                  <Play className="w-5 h-5 text-purple-400" />
                  <span>{modules.reduce((sum, m) => sum + m.classes.reduce((s, c) => s + c.lessons.length, 0), 0)} on-demand lessons</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Award className="w-5 h-5 text-purple-400" />
                  <span>Certificate of completion</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                  <span>Course discussion forum</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <span>Full lifetime access</span>
                </div>
              </div>
            </div>
          </GlowCard>
        </TabsContent>
        
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

        {/* REVIEWS TAB - Enhanced with write review functionality */}
        <TabsContent value="reviews" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rating Summary - Left Column */}
            <div className="lg:col-span-1">
              <GlowCard>
                <div className="p-6 text-center">
                  <div className="text-5xl font-bold text-white mb-2">
                    {reviewStats.average.toFixed(1)}
                  </div>
                  <div className="flex justify-center mb-3">
                    {renderStars(Math.round(reviewStats.average), "lg")}
                  </div>
                  <div className="text-gray-400 text-sm">
                    Based on {reviewStats.total} {reviewStats.total === 1 ? "review" : "reviews"}
                  </div>

                  {/* Rating Distribution */}
                  <div className="mt-6 space-y-2 text-left">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <div key={star} className="flex items-center gap-2">
                        <div className="w-12 text-sm text-gray-400">{star} stars</div>
                        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 rounded-full"
                            style={{ width: `${getPercentage(reviewStats.distribution[star as keyof typeof reviewStats.distribution])}%` }}
                          />
                        </div>
                        <div className="w-8 text-xs text-gray-400">
                          {reviewStats.distribution[star as keyof typeof reviewStats.distribution]}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Write Review Button */}
                  {course.enrolled && (
                    <div className="mt-6">
                      {userReview ? (
                        <button
                          onClick={() => {
                            setRatingValue(userReview.rating);
                            setReviewText(userReview.review || "");
                            setShowReviewModal(true);
                          }}
                          className="w-full px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition-colors"
                        >
                          Edit Your Review
                        </button>
                      ) : (
                        <GlowButton
                          variant="primary"
                          fullWidth
                          onClick={() => setShowReviewModal(true)}
                        >
                          <ThumbsUp className="w-4 h-4 mr-2" />
                          Write a Review
                        </GlowButton>
                      )}
                    </div>
                  )}
                  {!course.enrolled && (
                    <div className="mt-6 p-3 bg-gray-800/30 rounded-lg text-center">
                      <p className="text-sm text-gray-400">
                        Enroll to leave a review
                      </p>
                    </div>
                  )}
                </div>
              </GlowCard>
            </div>

            {/* Reviews List - Right Column */}
            <div className="lg:col-span-2">
              <GlowCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Student Reviews
                  </h3>
                  {reviews.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No reviews yet. Be the first to review!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="border-b border-gray-800 pb-4 last:border-0">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={review.user.avatar_url || undefined} />
                                <AvatarFallback className="bg-purple-600 text-white">
                                  {getInitials(`${review.user.first_name} ${review.user.last_name}`)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-white">
                                  {review.user.first_name} {review.user.last_name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {renderStars(review.rating, "sm")}
                                  <span className="text-xs text-gray-500">
                                    {formatDate(review.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          {review.review && (
                            <div className="mt-3 pl-13">
                              <p className="text-gray-300 text-sm leading-relaxed">
                                {review.review}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {course.reviews_count > 5 && (
                    <div className="mt-4 text-center">
                      <Link href={`/courses/${courseId}/reviews`}>
                        <GlowButton variant="outline" size="sm">
                          View All {course.reviews_count} Reviews
                        </GlowButton>
                      </Link>
                    </div>
                  )}
                </div>
              </GlowCard>
            </div>
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

      {/* Write Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h3 className="text-xl font-semibold text-white">
                {userReview ? "Edit Your Review" : "Write a Review"}
              </h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Star Rating */}
              <div>
                <Label className="text-gray-300 mb-2 block">Your Rating</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRatingValue(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= (hoverRating || ratingValue)
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-600"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {ratingValue > 0 && `${ratingValue} ${ratingValue === 1 ? "star" : "stars"}`}
                </p>
              </div>

              {/* Review Text */}
              <div>
                <Label htmlFor="review" className="text-gray-300 mb-2 block">
                  Your Review (Optional)
                </Label>
                <Textarea
                  id="review"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your experience with this course. What did you like? What could be improved?"
                  rows={5}
                  className="bg-gray-800 border-gray-700 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {reviewText.length}/2000 characters
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-800">
              <GlowButton
                variant="outline"
                onClick={() => setShowReviewModal(false)}
                fullWidth
              >
                Cancel
              </GlowButton>
              <GlowButton
                onClick={handleSubmitReview}
                isLoading={submittingReview}
                fullWidth
              >
                <Send className="w-4 h-4 mr-2" />
                {userReview ? "Update Review" : "Submit Review"}
              </GlowButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}