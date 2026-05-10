// frontend/app/(main)/courses/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, BookOpen, Users, Plus, Clock, ChevronRight, Eye, Edit, Archive, RotateCcw, AlertCircle, BarChart3, Badge, Building2 } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/components/providers/RoleProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

// Types based on existing schema
interface Course {
  id: number;
  title: string;
  description: string | null;
  visibility: "public" | "org" | "private";
  status?: "draft" | "published" | "archived";
  organization_id: number;
  created_by: string;
  created_at: string;
  instructor_name?: string;
  instructor_avatar?: string;
  enrolled?: boolean;
  progress?: number;
  total_lessons?: number;
  completed_lessons?: number;
}

interface EnrolledCourse extends Course {
  progress: number;
  last_accessed?: string;
}

export default function CoursesPage() {
  const router = useRouter();
  const { roleData } = useRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"my" | "discover" | "created" | "archived">("discover");
  const [loading, setLoading] = useState(true);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [discoverCourses, setDiscoverCourses] = useState<Course[]>([]);
  const [createdCourses, setCreatedCourses] = useState<Course[]>([]);
  const [archivedCourses, setArchivedCourses] = useState<Course[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Archive/Unarchive modal states
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [unarchiveModalOpen, setUnarchiveModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }
      
      setUserId(user.id);
      
      // ========== OPTIMIZATION 1: Batch fetch all profiles once ==========
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url");
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      // ========== OPTIMIZATION 2: Get enrolled course IDs efficiently ==========
      const enrolledCourseIds = new Set<number>();
      
      // 2a. From course_members (direct course enrollment)
      const { data: courseMembers } = await supabase
        .from("course_members")
        .select("course_id")
        .eq("user_id", user.id)
        .eq("role", "student")
        .eq("status", "active");
      
      courseMembers?.forEach(cm => enrolledCourseIds.add(cm.course_id));
      
      // 2b. From class_members (offering-based enrollment)
      const { data: classMembers } = await supabase
        .from("class_members")
        .select(`
          course_class_id,
          course_classes!inner(course_id)
        `)
        .eq("user_id", user.id)
        .eq("role", "student");
      
      classMembers?.forEach(cm => {
        if (cm.course_classes?.course_id) {
          enrolledCourseIds.add(cm.course_classes.course_id);
        }
      });
      
      console.log("Enrolled course IDs:", Array.from(enrolledCourseIds));
      
      // ========== OPTIMIZATION 3: Batch fetch ALL enrolled courses data ==========
      let enrolledCoursesData: EnrolledCourse[] = [];
      
      if (enrolledCourseIds.size > 0) {
        const enrolledIdsArray = Array.from(enrolledCourseIds);
        
        // Single query for all enrolled courses
        const { data: coursesData } = await supabase
          .from("courses")
          .select("*")
          .in("id", enrolledIdsArray)
          .eq("status", "published");
        
        if (coursesData && coursesData.length > 0) {
          // Get ALL lesson IDs for ALL enrolled courses in one query
          const { data: allLessonsForEnrolled } = await supabase
            .from("lessons")
            .select(`
              id,
              classes!inner (
                module_id,
                modules!inner (
                  course_id
                )
              )
            `)
            .in("classes.modules.course_id", enrolledIdsArray);
          
          // Build lesson count per course
          const lessonCountMap = new Map<number, number>();
          const lessonIdsByCourse = new Map<number, number[]>();
          
          allLessonsForEnrolled?.forEach((lesson: any) => {
            const courseId = lesson.classes?.modules?.course_id;
            if (courseId) {
              // Count lessons
              lessonCountMap.set(courseId, (lessonCountMap.get(courseId) || 0) + 1);
              // Store lesson IDs for progress calculation
              if (!lessonIdsByCourse.has(courseId)) {
                lessonIdsByCourse.set(courseId, []);
              }
              lessonIdsByCourse.get(courseId)!.push(lesson.id);
            }
          });
          
          // Get ALL lesson progress for the user across ALL enrolled courses
          const allLessonIds = Array.from(lessonIdsByCourse.values()).flat();
          const { data: allProgress } = await supabase
            .from("lesson_progress")
            .select("lesson_id")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .in("lesson_id", allLessonIds);
          
          const completedLessonSet = new Set(allProgress?.map(p => p.lesson_id) || []);
          
          // Build enrolled courses data using the batched data
          for (const course of coursesData) {
            const totalLessons = lessonCountMap.get(course.id) || 0;
            const lessonIds = lessonIdsByCourse.get(course.id) || [];
            const completedLessons = lessonIds.filter(id => completedLessonSet.has(id)).length;
            const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
            
            enrolledCoursesData.push({
              id: course.id,
              title: course.title,
              description: course.description,
              visibility: course.visibility,
              status: course.status,
              organization_id: course.organization_id,
              created_by: course.created_by,
              created_at: course.created_at,
              instructor_name: getInstructorName(course.created_by, profileMap),
              instructor_avatar: getInstructorAvatar(course.created_by, profileMap),
              enrolled: true,
              progress,
              total_lessons: totalLessons,
              completed_lessons: completedLessons,
            });
          }
        }
      }
      
      setEnrolledCourses(enrolledCoursesData);
      
      // ========== OPTIMIZATION 4: Get user's organization memberships ==========
      const { data: orgMemberships } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .not("member_role", "eq", "pending");
      
      const userOrgIds = orgMemberships?.map(m => m.organization_id) || [];
      console.log("User organization IDs:", userOrgIds);
      
      // ========== OPTIMIZATION 5: Fetch discoverable courses (already efficient) ==========
      let discoverQuery = supabase
        .from("courses")
        .select("*")
        .eq("status", "published");
      
      if (enrolledCourseIds.size > 0) {
        const idsArray = Array.from(enrolledCourseIds);
        discoverQuery = discoverQuery.not("id", "in", `(${idsArray.join(",")})`);
      }
      
      discoverQuery = discoverQuery.neq("created_by", user.id);
      
      if (userOrgIds.length > 0) {
        discoverQuery = discoverQuery.or(
          `visibility.eq.public,` +
          `and(visibility.eq.org,organization_id.in.(${userOrgIds.join(",")}))`
        );
      } else {
        discoverQuery = discoverQuery.eq("visibility", "public");
      }
      
      const { data: discoverData, error: discoverError } = await discoverQuery;
      
      if (discoverError) {
        console.error("Error fetching discover courses:", discoverError);
      }
      
      if (discoverData && discoverData.length > 0) {
        const formattedCourses = discoverData.map(course => ({
          ...course,
          instructor_name: getInstructorName(course.created_by, profileMap),
          instructor_avatar: getInstructorAvatar(course.created_by, profileMap),
          enrolled: false,
        }));
        setDiscoverCourses(formattedCourses);
        console.log("Discover courses count:", formattedCourses.length);
      } else {
        setDiscoverCourses([]);
      }
      
      // ========== OPTIMIZATION 6: Get user's created courses ==========
      if (roleData.role === "teacher" || roleData.role === "admin") {
        // Get created courses (draft and published)
        const { data: createdData } = await supabase
          .from("courses")
          .select("*")
          .eq("created_by", user.id)
          .in("status", ["draft", "published"]);
        
        if (createdData) {
          const formattedCreated = createdData.map(course => ({
            ...course,
            instructor_name: "You",
            enrolled: false,
          }));
          setCreatedCourses(formattedCreated);
          console.log("Created courses count:", formattedCreated.length);
        }
        
        // Get archived courses
        const { data: archivedData } = await supabase
          .from("courses")
          .select("*")
          .eq("created_by", user.id)
          .eq("status", "archived");
        
        if (archivedData) {
          const formattedArchived = archivedData.map(course => ({
            ...course,
            instructor_name: "You",
            enrolled: false,
          }));
          setArchivedCourses(formattedArchived);
          console.log("Archived courses count:", formattedArchived.length);
        }
      }
      
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const getInstructorName = (createdBy: string, profileMap: Map<string, any>): string => {
    const profile = profileMap.get(createdBy);
    if (profile) {
      const firstName = profile.first_name || "";
      const lastName = profile.last_name || "";
      if (firstName || lastName) return `${firstName} ${lastName}`.trim();
    }
    return "Instructor";
  };
  
  const getInstructorAvatar = (createdBy: string, profileMap: Map<string, any>): string | undefined => {
    return profileMap.get(createdBy)?.avatar_url;
  };

  const filterCourses = (courses: Course[]) => {
    let filtered = courses;
    
    if (searchQuery) {
      filtered = filtered.filter(course => 
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return filtered;
  };

  const filteredDiscoverCourses = filterCourses(discoverCourses);
  const filteredEnrolledCourses = filterCourses(enrolledCourses);
  const filteredCreatedCourses = filterCourses(createdCourses);
  const filteredArchivedCourses = filterCourses(archivedCourses);

  const handleCreateCourse = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    try {
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .in('member_role', ['admin', 'sub_admin', 'teacher'])
        .limit(1);
      
      if (memberships && memberships.length > 0) {
        router.push('/courses/create');
      } else {
        router.push('/organizations/propose');
      }
    } catch (error) {
      console.error("Error checking organization:", error);
      router.push('/organizations/propose');
    }
  };

  const handleContinueLearning = (courseId: number) => {
    router.push(`/courses/${courseId}/learn`);
  };

  const handleViewCourse = (courseId: number) => {
    router.push(`/courses/${courseId}`);
  };

  const handleEditCourse = (courseId: number) => {
    router.push(`/courses/${courseId}/edit`);
  };

  const handleManageStudents = async (courseId: number) => {
    const supabase = getSupabaseBrowserClient();
    
    try {
      const { data: offerings, error } = await supabase
        .from('course_classes')
        .select('id, name, status')
        .eq('course_id', courseId)
        .in('status', ['ongoing', 'upcoming'])
        .order('start_date', { ascending: true })
        .limit(1);
      
      if (error) throw error;
      
      if (offerings && offerings.length > 0) {
        router.push(`/courses/${courseId}/offerings/${offerings[0].id}/students`);
      } else {
        toast.error('No active course offerings found. Please create an offering first.');
        const shouldCreate = confirm('Would you like to create an offering for this course?');
        if (shouldCreate) {
          router.push(`/courses/${courseId}/edit?tab=offerings`);
        }
      }
    } catch (error) {
      console.error('Error fetching course offerings:', error);
      toast.error('Failed to load course offerings');
    }
  };

  const handleArchiveCourse = async () => {
    if (!selectedCourse) return;
    
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("courses")
        .update({ status: "archived" })
        .eq("id", selectedCourse.id);
      
      if (error) throw error;
      
      toast.success(`"${selectedCourse.title}" has been archived`);
      setArchiveModalOpen(false);
      setSelectedCourse(null);
      
      await fetchData();
    } catch (error) {
      console.error("Error archiving course:", error);
      toast.error("Failed to archive course");
    }
  };

  const handleUnarchiveCourse = async () => {
    if (!selectedCourse) return;
    
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("courses")
        .update({ status: "draft" })
        .eq("id", selectedCourse.id);
      
      if (error) throw error;
      
      toast.success(`"${selectedCourse.title}" has been restored`);
      setUnarchiveModalOpen(false);
      setSelectedCourse(null);
      
      await fetchData();
      setActiveTab("created");
    } catch (error) {
      console.error("Error unarchiving course:", error);
      toast.error("Failed to restore course");
    }
  };

  const getOrgName = (orgId: number): string => {
    if ((roleData.role === 'teacher' || roleData.role === 'admin') && roleData.organizationId === orgId) {
      return roleData.organizationName || `Org ${orgId}`;
    }
    return `Org ${orgId}`;
  };

  const isTeacher = roleData.role === "teacher" || roleData.role === "admin";
  const isStudent = roleData.role === "student";
  const hasArchivedCourses = archivedCourses.length > 0;

  // Determine if My Courses tab should show (user has enrollments OR is teacher/admin)
  const showMyCoursesTab = enrolledCourses.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Courses</h1>
          <p className="text-gray-400">
            {isTeacher 
              ? "Manage your courses or discover new ones" 
              : "Explore and continue your learning journey"}
          </p>
        </div>
        {isTeacher && (
          <GlowButton variant="primary" onClick={handleCreateCourse}>
            <Plus className="w-4 h-4 mr-2" />
            Create Course
          </GlowButton>
        )}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 bg-gray-900/50 border-purple-500/20 text-white rounded-xl h-12"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="bg-gray-900/50 border border-gray-800">
            {showMyCoursesTab && (
              <TabsTrigger value="my">My Courses ({enrolledCourses.length})</TabsTrigger>
            )}
            <TabsTrigger value="discover">Discover ({discoverCourses.length})</TabsTrigger>
            {isTeacher && createdCourses.length > 0 && (
              <TabsTrigger value="created">My Created Courses ({createdCourses.length})</TabsTrigger>
            )}
            {isTeacher && hasArchivedCourses && (
              <TabsTrigger value="archived">Archived ({archivedCourses.length})</TabsTrigger>
            )}
          </TabsList>

          {/* My Courses Tab */}
          {showMyCoursesTab && (
            <TabsContent value="my" className="mt-6">
              {filteredEnrolledCourses.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredEnrolledCourses.map((course) => (
                    <GlowCard key={course.id} className="overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all">
                      <div className="flex flex-col md:flex-row">
                        <div className="relative md:w-48 h-48 md:h-auto overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-gray-500" />
                          <div className="absolute top-3 left-3 px-2 py-1 bg-purple-500/90 backdrop-blur-sm rounded text-xs text-white">
                            {course.progress || 0}% Complete
                          </div>
                        </div>
                        
                        <div className="flex-1 p-5">
                          <div>
                            <h3 className="text-xl font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">
                              {course.title}
                            </h3>
                            <p className="text-sm text-gray-400">{course.instructor_name || "Instructor"}</p>
                          </div>
                          
                          <p className="text-gray-400 text-sm mb-4 line-clamp-2">{course.description}</p>
                          
                          <div className="mb-4">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Your Progress</span>
                              <span>{course.progress || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2">
                              <div 
                                className="bg-purple-500 rounded-full h-2 transition-all duration-500"
                                style={{ width: `${course.progress || 0}%` }}
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-4 h-4" />
                                {course.total_lessons || 0} lessons
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {course.completed_lessons || 0} completed
                              </span>
                            </div>
                            <GlowButton 
                              size="sm" 
                              variant="primary"
                              onClick={() => handleContinueLearning(course.id)}
                            >
                              Continue
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </GlowButton>
                          </div>
                        </div>
                      </div>
                    </GlowCard>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No enrolled courses yet</h3>
                  <p className="text-gray-400 mb-4">Start your learning journey by exploring courses</p>
                  <GlowButton variant="primary" onClick={() => setActiveTab("discover")}>
                    Discover Courses
                  </GlowButton>
                </div>
              )}
            </TabsContent>
          )}

          {/* Discover Courses Tab */}
          <TabsContent value="discover" className="mt-6">
            {filteredDiscoverCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDiscoverCourses.map((course) => (
                  <GlowCard key={course.id} className="h-full hover:scale-[1.02] transition-all cursor-pointer group">
                    <div className="relative overflow-hidden rounded-xl mb-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 h-48 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-gray-500" />
                      {course.visibility === "org" && (
                        <div className="absolute bottom-3 left-3 px-2 py-1 bg-blue-500/90 backdrop-blur-sm rounded text-xs text-white">
                          Organization Only
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                          {course.title}
                        </h3>
                        <p className="text-gray-400 text-sm line-clamp-2">{course.description}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {course.instructor_name?.charAt(0) || "I"}
                          </span>
                        </div>
                        <span className="text-gray-400">{course.instructor_name || "Instructor"}</span>
                      </div>
                    </div>  {/* ← CLOSE the space-y-3 div */}
                    
                    <div className="flex gap-2 mt-4">
                      <GlowButton 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleViewCourse(course.id)}
                      >
                        View Course
                      </GlowButton>
                    </div>
                  </GlowCard>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No courses found</h3>
                <p className="text-gray-400">
                  {searchQuery 
                    ? "Try adjusting your search" 
                    : "There are no public courses available yet. Check back later!"}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Created Courses Tab */}
          {isTeacher && (
            <TabsContent value="created" className="mt-6">

              {filteredCreatedCourses.length > 0 ? (
                <div className="space-y-4">
                  {filteredCreatedCourses.map((course) => (
                    <GlowCard key={course.id} className="overflow-hidden group">
                      <div className="flex flex-col md:flex-row">
                        <div className="md:w-48 h-32 md:h-auto overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-gray-500" />
                        </div>
                        <div className="flex-1 p-5">
                          <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="text-xl font-semibold text-white">
                                  {course.title}
                                </h3>
                                {course.organization_id && (
                                  <Badge variant="outline" className="text-xs">
                                    {getOrgName(course.organization_id)}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-400">
                                {course.visibility === "public" && (
                                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
                                    Public
                                  </span>
                                )}
                                {course.visibility === "org" && (
                                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                                    Organization
                                  </span>
                                )}
                                {course.visibility === "private" && (
                                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs">
                                    Private
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {new Date(course.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <GlowButton 
                                size="sm" 
                                variant="secondary"
                                onClick={() => router.push(`/courses/${course.id}/analytics`)}
                              >
                                <BarChart3 className="w-4 h-4 mr-1" />
                                Analytics
                              </GlowButton>
                              <GlowButton 
                                size="sm" 
                                variant="secondary"
                                onClick={() => handleEditCourse(course.id)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </GlowButton>
                              <GlowButton 
                                size="sm" 
                                variant="primary"
                                onClick={() => handleManageStudents(course.id)}
                              >
                                <Users className="w-4 h-4 mr-1" />
                                Students
                              </GlowButton>
                              <GlowButton 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  setSelectedCourse(course);
                                  setArchiveModalOpen(true);
                                }}
                              >
                                <Archive className="w-4 h-4" />
                              </GlowButton>
                            </div>
                          </div>
                          <p className="text-gray-400 text-sm line-clamp-2">{course.description}</p>
                        </div>
                      </div>
                    </GlowCard>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No courses created yet</h3>
                  <p className="text-gray-400 mb-4">Start creating your first course</p>
                  <GlowButton variant="primary" onClick={handleCreateCourse}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Course
                  </GlowButton>
                </div>
              )}
            </TabsContent>
          )}

          {/* Archived Courses Tab */}
          {isTeacher && hasArchivedCourses && (
            <TabsContent value="archived" className="mt-6">
              <div className="space-y-4">
                {filteredArchivedCourses.map((course) => (
                  <GlowCard key={course.id} className="overflow-hidden group opacity-75 hover:opacity-100 transition-opacity">
                    <div className="flex flex-col md:flex-row">
                      <div className="md:w-48 h-32 md:h-auto overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                        <Archive className="w-8 h-8 text-gray-500" />
                      </div>
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                          <div>
                            <h3 className="text-xl font-semibold text-white mb-1">
                              {course.title}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-gray-400">
                              <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded-full text-xs">
                                Archived
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(course.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <GlowButton 
                              size="sm" 
                              variant="secondary"
                              onClick={() => handleViewCourse(course.id)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </GlowButton>
                            <GlowButton 
                              size="sm" 
                              variant="secondary"
                              onClick={() => handleEditCourse(course.id)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </GlowButton>
                            <GlowButton 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                setSelectedCourse(course);
                                setUnarchiveModalOpen(true);
                              }}
                              title="Restore course"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </GlowButton>
                          </div>
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-2">{course.description}</p>
                      </div>
                    </div>
                  </GlowCard>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Archive Confirmation Modal */}
      <Dialog open={archiveModalOpen} onOpenChange={setArchiveModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Archive Course?</DialogTitle>
            <DialogDescription>
              This course will be hidden from students but you can restore it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to archive <span className="font-semibold text-white">{selectedCourse?.title}</span>?
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                <p className="text-sm text-yellow-300">
                  Students will no longer see this course, and new enrollments will be disabled.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <GlowButton variant="ghost" onClick={() => setArchiveModalOpen(false)}>
              Cancel
            </GlowButton>
            <GlowButton variant="primary" onClick={handleArchiveCourse} className="bg-yellow-600 hover:bg-yellow-700">
              <Archive className="w-4 h-4 mr-2" />
              Archive Course
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unarchive Confirmation Modal */}
      <Dialog open={unarchiveModalOpen} onOpenChange={setUnarchiveModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Restore Course?</DialogTitle>
            <DialogDescription>
              This course will be moved back to drafts and can be published again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to restore <span className="font-semibold text-white">{selectedCourse?.title}</span>?
            </p>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <RotateCcw className="w-4 h-4 text-green-400 mt-0.5" />
                <p className="text-sm text-green-300">
                  The course will be restored to draft status. You can edit and republish it.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <GlowButton variant="ghost" onClick={() => setUnarchiveModalOpen(false)}>
              Cancel
            </GlowButton>
            <GlowButton variant="primary" onClick={handleUnarchiveCourse} className="bg-green-600 hover:bg-green-700">
              <RotateCcw className="w-4 h-4 mr-2" />
              Restore Course
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}