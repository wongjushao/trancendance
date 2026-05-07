// frontend/app/(main)/courses/[id]/preview/page.tsx
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
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { getCourseWithDetails, CourseWithDetails } from "@/lib/supabase/courses";
import { isEnrolled } from "@/lib/supabase/enrollment";

interface CourseWithDetailsFull extends CourseWithDetails {
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
  };
  reviews?: {
    id: number;
    rating: number;
    review: string;
    created_at: string;
    user: {
      id: string;
      first_name: string;
      last_name: string;
      username: string;
      avatar_url: string;
    };
  }[];
  average_rating?: number;
  total_reviews?: number;
}

export default function CoursePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);
  
  const [course, setCourse] = useState<CourseWithDetailsFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEnrolledState, setIsEnrolledState] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseBrowserClient();
        
        // Check authentication
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setIsAuthenticated(!!authUser);
        setUser(authUser);
        
        // Load course details
        const courseData = await getCourseWithDetails(courseId);
        
        if (!courseData) {
          toast.error("Course not found");
          router.push("/courses");
          return;
        }
        
        // Fetch organization details
        const { data: orgData } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", courseData.organization_id)
          .single();
        
        // Fetch instructor details
        const { data: instructorData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", courseData.created_by)
          .single();
        
        // Fetch reviews
        const { data: reviewsData } = await supabase
          .from("course_reviews")
          .select(`
            *,
            user:profiles!user_id (
              id,
              first_name,
              last_name,
              username,
              avatar_url
            )
          `)
          .eq("course_id", courseId)
          .order("created_at", { ascending: false });
        
        // Calculate average rating
        let averageRating = 0;
        if (reviewsData && reviewsData.length > 0) {
          const sum = reviewsData.reduce((acc, review) => acc + review.rating, 0);
          averageRating = sum / reviewsData.length;
        }
        
        setCourse({
          ...courseData,
          organization: orgData || undefined,
          instructor: instructorData || undefined,
          reviews: reviewsData || [],
          average_rating: averageRating,
          total_reviews: reviewsData?.length || 0,
        });
        
        // Check enrollment if authenticated
        if (authUser && courseData.course_classes) {
          for (const offering of courseData.course_classes) {
            const enrollment = await isEnrolled(offering.id, authUser.id);
            if (enrollment) {
              setIsEnrolledState(true);
              break;
            }
          }
        }
        
        // Auto-expand first module
        if (courseData.modules && courseData.modules.length > 0) {
          setExpandedModules(new Set([courseData.modules[0].id]));
        }
      } catch (error) {
        console.error("Error loading course preview:", error);
        toast.error("Failed to load course");
      } finally {
        setLoading(false);
      }
    };
    
    if (courseId) {
      loadData();
    }
  }, [courseId, router]);
  
  const toggleModule = (moduleId: number) => {
    const newSet = new Set(expandedModules);
    if (newSet.has(moduleId)) {
      newSet.delete(moduleId);
    } else {
      newSet.add(moduleId);
    }
    setExpandedModules(newSet);
  };
  
  const handleEnroll = () => {
    if (!isAuthenticated) {
      toast.error("Please login to enroll in this course");
      router.push(`/login?redirect=/courses/${courseId}/enroll`);
      return;
    }
    router.push(`/courses/${courseId}/enroll`);
  };
  
  const handleStartLearning = () => {
    router.push(`/courses/${courseId}/learn`);
  };
  
  const getTotalLessons = () => {
    if (!course?.modules) return 0;
    return course.modules.reduce((total, module) => {
      return total + module.classes.reduce((classTotal, classItem) => {
        return classTotal + classItem.lessons.length;
      }, 0);
    }, 0);
  };
  
  const getFreePreviewLessons = () => {
    const freeLessons: { title: string; moduleTitle: string; classTitle: string }[] = [];
    if (!course?.modules) return freeLessons;
    
    for (const module of course.modules) {
      for (const classItem of module.classes) {
        for (const lesson of classItem.lessons) {
          if (lesson.is_free_preview) {
            freeLessons.push({
              title: lesson.title,
              moduleTitle: module.title,
              classTitle: classItem.title,
            });
          }
        }
      }
    }
    return freeLessons;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }
  
  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <GlowCard>
            <div className="py-12">
              <h2 className="text-2xl font-bold text-white mb-2">Course Not Found</h2>
              <p className="text-gray-400 mb-6">The course you're looking for doesn't exist.</p>
              <GlowButton onClick={() => router.push("/courses")}>Browse Courses</GlowButton>
            </div>
          </GlowCard>
        </div>
      </div>
    );
  }
  
  const totalLessons = getTotalLessons();
  const freeLessons = getFreePreviewLessons();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-purple-900/50 to-slate-900 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Link href="/courses">
            <GlowButton variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </GlowButton>
          </Link>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Course Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                {course.visibility === "public" && (
                  <Badge className="bg-green-500/20 text-green-300">Public</Badge>
                )}
                {course.visibility === "org" && (
                  <Badge className="bg-blue-500/20 text-blue-300">Organization Only</Badge>
                )}
                {course.visibility === "private" && (
                  <Badge className="bg-yellow-500/20 text-yellow-300">Private</Badge>
                )}
                <Badge className="bg-purple-500/20 text-purple-300">
                  {course.level?.toUpperCase()}
                </Badge>
                <Badge variant="outline">{course.category}</Badge>
              </div>
              
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4">{course.title}</h1>
              
              {course.description && (
                <p className="text-gray-300 text-lg mb-6">{course.description}</p>
              )}
              
              <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{course.modules?.length || 0} modules</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{totalLessons} lessons</span>
                </div>
                {course.average_rating && course.average_rating > 0 && (
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span>{course.average_rating.toFixed(1)} ({course.total_reviews} reviews)</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>
                    {course.course_classes?.reduce((sum, c) => sum + (c.members?.filter(m => m.role === 'student').length || 0), 0)} students
                  </span>
                </div>
              </div>
              
              {/* Instructor Info */}
              {course.instructor && (
                <div className="flex items-center gap-3 mb-6">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={course.instructor.avatar_url || undefined} />
                    <AvatarFallback>
                      {course.instructor.first_name?.[0] || course.instructor.username?.[0] || "I"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm text-gray-400">Instructor</div>
                    <div className="text-white font-medium">
                      {course.instructor.first_name} {course.instructor.last_name}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right Column - Enrollment Card */}
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
                    {isEnrolledState ? (
                      <>
                        <GlowButton
                          variant="primary"
                          fullWidth
                          onClick={handleStartLearning}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Continue Learning
                        </GlowButton>
                        <p className="text-sm text-green-400 text-center">
                          You are enrolled in this course
                        </p>
                      </>
                    ) : (
                      <>
                        <GlowButton
                          variant="primary"
                          fullWidth
                          onClick={handleEnroll}
                        >
                          Enroll Now
                        </GlowButton>
                        <p className="text-xs text-gray-400 text-center">
                          {course.visibility === "public" && "Open to everyone"}
                          {course.visibility === "org" && "Available to organization members"}
                          {course.visibility === "private" && "By invitation only"}
                        </p>
                      </>
                    )}
                    
                    {freeLessons.length > 0 && (
                      <div className="pt-4 border-t border-slate-700">
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                          <Eye className="w-4 h-4" />
                          <span>{freeLessons.length} free preview lessons available</span>
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
        <Tabs defaultValue="curriculum" className="space-y-6">
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
                  {course.modules?.map((module, moduleIndex) => {
                    const isExpanded = expandedModules.has(module.id);
                    const moduleLessons = module.classes.reduce((total, classItem) => total + classItem.lessons.length, 0);
                    const freeLessonsInModule = module.classes.reduce((total, classItem) => {
                      return total + classItem.lessons.filter(l => l.is_free_preview).length;
                    }, 0);
                    
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
                                {moduleLessons} lessons
                                {freeLessonsInModule > 0 && ` • ${freeLessonsInModule} free preview`}
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary">Module {moduleIndex + 1}</Badge>
                        </button>
                        
                        {isExpanded && (
                          <div className="p-4 space-y-3 bg-slate-900/30">
                            {module.classes.map((classItem) => (
                              <div key={classItem.id} className="ml-6">
                                <div className="text-white font-medium mb-2">{classItem.title}</div>
                                <div className="space-y-2 ml-4">
                                  {classItem.lessons.map((lesson) => (
                                    <div key={lesson.id} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-slate-800/30">
                                      {lesson.content_type === "video" && <Video className="w-4 h-4 text-blue-400" />}
                                      {lesson.content_type === "text" && <FileText className="w-4 h-4 text-green-400" />}
                                      {lesson.content_type === "quiz" && <FileQuestion className="w-4 h-4 text-yellow-400" />}
                                      <span className={lesson.is_free_preview ? "text-purple-300" : "text-gray-300"}>
                                        {lesson.title}
                                      </span>
                                      {lesson.is_free_preview && (
                                        <Badge variant="secondary" className="text-xs">Free Preview</Badge>
                                      )}
                                      {lesson.duration_seconds && (
                                        <span className="text-gray-500 text-xs ml-auto">
                                          {Math.floor(lesson.duration_seconds / 60)} min
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {(!course.modules || course.modules.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Curriculum is being prepared</p>
                  </div>
                )}
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
                      <span className="text-white font-medium">{course.average_rating?.toFixed(1)}</span>
                      <span className="text-gray-400">({course.total_reviews} reviews)</span>
                    </div>
                  </div>
                  
                  {isAuthenticated && !isEnrolledState && (
                    <GlowButton variant="secondary" size="sm" onClick={handleEnroll}>
                      Enroll to leave a review
                    </GlowButton>
                  )}
                </div>
                
                {course.reviews && course.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {course.reviews.map((review) => (
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
                        {review.review && <p className="text-gray-300 text-sm">{review.review}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No reviews yet. Be the first to review!</p>
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
                
                {/* Tags */}
                {course.tags && course.tags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {course.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
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
                              <span>{offering.members?.filter(m => m.role === 'student').length || 0} students</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              <span>Course chat available</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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