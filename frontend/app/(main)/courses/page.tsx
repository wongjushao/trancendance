// frontend/app/(main)/courses/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, BookOpen, Users, Plus, Clock, ChevronRight, Eye, Edit, Archive, RotateCcw, BarChart3, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { fetchUserRoleFromBackend, refreshUserRole } from "@/lib/role-api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

// Types
interface Course {
  id: number;
  title: string;
  description: string | null;
  visibility: "public" | "org" | "private";
  status?: "draft" | "published" | "archived";
  organization_id: number;
  organization_name?: string | null;
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

interface UserRoleInfo {
  role: "student" | "teacher" | "admin";
  organizationId: number | null;
  organizationName: string | null;
  hasOrganization: boolean;
}

// Helper to get auth token
const getAuthToken = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

// Helper for authenticated API calls
const apiRequest = async (url: string, options: RequestInit = {}) => {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }
  
  return response.json();
};

export default function CoursesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"my" | "discover" | "created" | "archived">("discover");
  const [loading, setLoading] = useState(true);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [discoverCourses, setDiscoverCourses] = useState<Course[]>([]);
  const [createdCourses, setCreatedCourses] = useState<Course[]>([]);
  const [archivedCourses, setArchivedCourses] = useState<Course[]>([]);
  
  // Role state from backend API
  const [userRole, setUserRole] = useState<UserRoleInfo>({
    role: "student",
    organizationId: null,
    organizationName: null,
    hasOrganization: false,
  });
  const [roleLoading, setRoleLoading] = useState(true);

  // Unarchive modal (archive is only from course edit page)
  const [unarchiveModalOpen, setUnarchiveModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Fetch user role from backend API
  useEffect(() => {
    const loadUserRole = async () => {
      setRoleLoading(true);
      try {
        const roleData = await fetchUserRoleFromBackend();
        if (roleData) {
          setUserRole({
            role: roleData.role,
            organizationId: roleData.organizationId,
            organizationName: roleData.organizationName,
            hasOrganization: roleData.organizationId !== null,
          });
          // console.log("[CoursesPage] User role loaded:", roleData);
        } else {
          setUserRole({
            role: "student",
            organizationId: null,
            organizationName: null,
            hasOrganization: false,
          });
        }
      } catch (error) {
        console.error("[CoursesPage] Error loading user role:", error);
      } finally {
        setRoleLoading(false);
      }
    };
    
    loadUserRole();
  }, []);

  // Fetch courses data
  useEffect(() => {
    if (!roleLoading) {
      fetchData();
    }
  }, [roleLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch enrolled courses
      try {
        const data = await apiRequest('/api/org-service/users/me/enrolled-courses');
        setEnrolledCourses(data.courses || []);
        // console.log("[CoursesPage] Enrolled courses:", data.courses?.length);
      } catch (error) {
        console.error("Error fetching enrolled courses:", error);
      }
      
      // Fetch discoverable courses
      try {
        const url = `/api/org-service/users/me/discover-courses${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`;
        const data = await apiRequest(url);
        setDiscoverCourses(data.courses || []);
        // console.log("[CoursesPage] Discover courses:", data.courses?.length);
      } catch (error) {
        console.error("Error fetching discover courses:", error);
      }
      
      // Fetch created courses (only for teachers/admins)
      if (userRole.role === "teacher" || userRole.role === "admin") {
        try {
          const data = await apiRequest('/api/org-service/users/me/created-courses');
          setCreatedCourses(data.courses || []);
          // console.log("[CoursesPage] Created courses:", data.courses?.length);
        } catch (error) {
          console.error("Error fetching created courses:", error);
        }
        
        // Fetch archived courses
        try {
          const data = await apiRequest('/api/org-service/users/me/created-courses?include_archived=true');
          const archived = data.courses?.filter((c: Course) => c.status === "archived") || [];
          setArchivedCourses(archived);
        } catch (error) {
          console.error("Error fetching archived courses:", error);
        }
      }
      
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const filterCourses = (courses: Course[]) => {
    if (!searchQuery) return courses;
    return courses.filter(course => 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const filteredDiscoverCourses = filterCourses(discoverCourses);
  const filteredEnrolledCourses = filterCourses(enrolledCourses);
  const filteredCreatedCourses = filterCourses(createdCourses);
  const filteredArchivedCourses = filterCourses(archivedCourses);

  const handleCreateCourse = async () => {
    if (userRole.role === "teacher" || userRole.role === "admin") {
      router.push('/courses/create');
    } else {
      // Check if user has any organization membership via backend
      try {
        const data = await apiRequest('/api/org-service/organizations/memberships');
        const hasTeachingRole = data.organizations?.some(
          (org: any) => org.role === 'admin' || org.role === 'sub_admin' || org.role === 'teacher'
        );
        
        if (hasTeachingRole) {
          await refreshUserRole();
          router.push('/courses/create');
        } else {
          router.push('/organizations/propose');
        }
      } catch (error) {
        console.error("Error checking memberships:", error);
        router.push('/organizations/propose');
      }
    }
  };

  const archivedNotice = (organizationName?: string | null) =>
    organizationName
      ? `This course has been archived by ${organizationName}.`
      : "This course has been archived.";

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
    try {
      // Get course details including offerings via backend
      const data = await apiRequest(`/api/org-service/courses/${courseId}/detail`);
      const offerings = data.course_classes || [];
      const activeOffering = offerings.find(
        (o: any) => o.status === 'ongoing' || o.status === 'upcoming'
      );
      
      if (activeOffering) {
        router.push(`/courses/${courseId}/offerings/${activeOffering.id}/students`);
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

  const handleUnarchiveCourse = async () => {
    if (!selectedCourse) return;
    
    try {
      await apiRequest(`/api/org-service/courses/${selectedCourse.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'draft' })
      });
      
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
    if ((userRole.role === 'teacher' || userRole.role === 'admin') && userRole.organizationId === orgId) {
      return userRole.organizationName || `Org ${orgId}`;
    }
    return `Org ${orgId}`;
  };

  const isTeacher = userRole.role === "teacher" || userRole.role === "admin";
  const hasArchivedCourses = archivedCourses.length > 0;
  const showMyCoursesTab = enrolledCourses.length > 0;

  if (roleLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

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
                          {course.status === "archived" ? (
                            <p className="text-sm text-amber-400/90 text-right sm:max-w-[240px] leading-snug shrink-0">
                              {archivedNotice(course.organization_name)}
                            </p>
                          ) : (
                            <GlowButton
                              size="sm"
                              variant="primary"
                              onClick={() => handleContinueLearning(course.id)}
                            >
                              Continue
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </GlowButton>
                          )}
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
                    {(course.visibility === "org" || course.visibility === "private") && (
                      <div
                        className={`absolute bottom-3 left-3 px-2 py-1 backdrop-blur-sm rounded text-xs text-white ${
                          course.visibility === "org"
                            ? "bg-blue-500/90"
                            : "bg-slate-600/95 border border-slate-500/50"
                        }`}
                      >
                        {course.visibility === "org" ? "Organization Only" : "Private"}
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
                  </div>
                  
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
                                <span className="px-2 py-0.5 bg-slate-500/20 text-slate-300 rounded-full text-xs border border-slate-500/25">
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