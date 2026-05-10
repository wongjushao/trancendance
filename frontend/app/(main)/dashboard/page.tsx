// frontend/app/(main)/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  TrendingUp,
  Calendar,
  Activity,
  Award,
  ChevronRight,
  Users,
  Star,
  Target,
  Zap,
  Sparkles,
  Settings,
  Plus,
  BarChart3,
  AlertCircle,
  Loader2,
  Building2,
  ChevronDown,
  Check,
  Crown,
  GraduationCap,
  School,
  FileText,
  MessageSquare,
  UserPlus,
  Edit,
  Eye,
  Filter,
  Search,
  Download,
  PlayCircle,
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { LearningCalendar } from "@/components/dashboard/LearningCalendar";
import { UpcomingItems } from "@/components/dashboard/UpcomingItems";
import { RecentItems } from "@/components/dashboard/RecentItems";
import { fetchUserRoleFromBackend } from "@/lib/role-api";

// Types
interface Organization {
  id: number;
  name: string;
  role: "student" | "teacher" | "admin";
}

interface EnrolledCourse {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  instructor_name: string;
  progress: number;
  completed_lessons: number;
  total_lessons: number;
  last_accessed_at: string;
  rating: number;
  certificate_earned: boolean;
}

interface TeacherCourse {
  id: number;
  title: string;
  thumbnail: string;
  students: number;
  progress: number;
  rating: number;
  status: "published" | "draft";
}

interface PendingGrading {
  id: number;
  title: string;
  course_name: string;
  submissions: number;
  due_date: string;
}

interface AdminStats {
  total_students: number;
  active_students: number;
  total_courses: number;
  published_courses: number;
  average_rating: number;
  completion_rate: number;
  pending_approvals: number;
}

interface TopCourse {
  id: number;
  title: string;
  students: number;
  rating: number;
  completion: number;
}

// Helper to get auth token
const getAuthToken = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

export default function UnifiedDashboardPage() {
  const router = useRouter();
  
  // User & Organization State
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [userRoles, setUserRoles] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // UI State
  const [greeting, setGreeting] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [activeTab, setActiveTab] = useState("learning");
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  
  // Student Section State
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [studentStats, setStudentStats] = useState({
    total_courses: 0,
    completed_courses: 0,
    average_progress: 0,
    streak_days: 0,
    pending_tasks: 0,
  });
  
  // Teacher Section State
  const [teacherCourses, setTeacherCourses] = useState<TeacherCourse[]>([]);
  const [pendingGrading, setPendingGrading] = useState<PendingGrading[]>([]);
  const [teacherStats, setTeacherStats] = useState({
    total_students: 0,
    active_courses: 0,
    average_rating: 0,
    completion_rate: 0,
  });
  
  // Admin Section State
  const [adminStats, setAdminStats] = useState<AdminStats>({
    total_students: 0,
    active_students: 0,
    total_courses: 0,
    published_courses: 0,
    average_rating: 0,
    completion_rate: 0,
    pending_approvals: 0,
  });
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
    
    loadUserData();
  }, []);

  useEffect(() => {
    if (selectedOrgId && initialLoadComplete && activeTab === "admin") {
      loadAdminDashboard();
    }
  }, [selectedOrgId, activeTab, initialLoadComplete]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setDataLoadError(null);
      
      const supabase = getSupabaseBrowserClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!user) {
        router.push("/login");
        return;
      }
      
      setCurrentUserId(user.id);

      // Get user profile via backend
      const token = await getAuthToken();
      if (!token) {
        throw new Error("No auth token");
      }

      const profileResponse = await fetch('/api/auth-service/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        if (profile.first_name && profile.last_name) {
          setDisplayName(`${profile.first_name} ${profile.last_name}`);
        } else if (profile.first_name) {
          setDisplayName(profile.first_name);
        } else if (profile.username) {
          setDisplayName(profile.username);
        } else {
          setDisplayName(user.email?.split('@')[0] || "Learner");
        }
      } else {
        setDisplayName(user.email?.split('@')[0] || "Learner");
      }

      // Get user's organizations and roles via new backend endpoint
      const membershipsResponse = await fetch('/api/org-service/organizations/memberships', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (membershipsResponse.ok) {
        const data = await membershipsResponse.json();
        setOrganizations(data.organizations || []);
        setUserRoles(new Set(data.roles || ["student"]));
        
        // Set default organization
        if (data.organizations && data.organizations.length > 0) {
          setSelectedOrgId(data.organizations[0].id);
        }

        // Set default active tab based on highest role
        const roles = new Set(data.roles || []);
        if (roles.has("admin")) {
          setActiveTab("admin");
        } else if (roles.has("teacher")) {
          setActiveTab("teaching");
        } else {
          setActiveTab("learning");
        }
      } else {
        // Fallback: user has no organization memberships
        setUserRoles(new Set(["student"]));
        setActiveTab("learning");
      }
      
      setInitialLoadComplete(true);
      
      // Load initial dashboard data
      await loadDashboardData();

    } catch (error) {
      console.error("Error loading user data:", error);
      setDataLoadError("Failed to load user data. Please refresh the page.");
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    const token = await getAuthToken();
    if (!token) return;

    try {
      // Load based on active tab
      if (activeTab === "learning") {
        await loadStudentDashboard(token);
      } else if (activeTab === "teaching") {
        await loadTeacherDashboard(token);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    }
  };

  const loadStudentDashboard = async (token: string) => {
    try {
      const response = await fetch('/api/org-service/dashboard/student', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error("Failed to load student dashboard");
      }

      const data = await response.json();
      
      setEnrolledCourses(data.enrolled_courses || []);
      setStudentStats(data.stats || {
        total_courses: 0,
        completed_courses: 0,
        average_progress: 0,
        streak_days: 0,
        pending_tasks: 0,
      });
      setUpcomingDeadlines(data.upcoming_deadlines || []);
      setRecentActivity(data.recent_activity || []);

    } catch (error) {
      console.error("Error loading student dashboard:", error);
      toast.error("Failed to load your learning data");
    }
  };

  const loadTeacherDashboard = async (token: string) => {
    try {
      const response = await fetch('/api/org-service/dashboard/teacher', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error("Failed to load teacher dashboard");
      }

      const data = await response.json();
      
      setTeacherCourses(data.courses || []);
      setTeacherStats(data.stats || {
        total_students: 0,
        active_courses: 0,
        average_rating: 0,
        completion_rate: 0,
      });
      setPendingGrading(data.pending_grading || []);

    } catch (error) {
      console.error("Error loading teacher dashboard:", error);
      toast.error("Failed to load your teaching data");
    }
  };

  const loadAdminDashboard = async () => {
    if (!selectedOrgId) return;
    
    const token = await getAuthToken();
    if (!token) return;

    try {
      const response = await fetch(`/api/org-service/dashboard/admin?organization_id=${selectedOrgId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error("Failed to load admin dashboard");
      }

      const data = await response.json();
      
      setAdminStats(data.stats || {
        total_students: 0,
        active_students: 0,
        total_courses: 0,
        published_courses: 0,
        average_rating: 0,
        completion_rate: 0,
        pending_approvals: 0,
      });
      setTopCourses(data.top_courses || []);

    } catch (error) {
      console.error("Error loading admin dashboard:", error);
      toast.error("Failed to load organization analytics");
    }
  };

  const switchOrganization = (orgId: number) => {
    setSelectedOrgId(orgId);
    setShowOrgSwitcher(false);
    // Reload admin dashboard when switching orgs
    if (activeTab === "admin") {
      loadAdminDashboard();
    }
  };

  const currentOrg = organizations.find(o => o.id === selectedOrgId);

  // Available tabs based on user roles
  const availableTabs = [
    { id: "learning", label: "My Learning", icon: BookOpen, show: true },
    { id: "teaching", label: "My Teaching", icon: GraduationCap, show: userRoles.has("teacher") || userRoles.has("admin") },
    { id: "admin", label: "Organization Admin", icon: Crown, show: userRoles.has("admin") },
  ];

  // Show loading only during initial load
  if (loading && !initialLoadComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Show error if data load failed
  if (dataLoadError && organizations.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <GlowCard className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-400 mb-6">{dataLoadError}</p>
          <GlowButton onClick={() => window.location.reload()}>
            Refresh Page
          </GlowButton>
        </GlowCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with Organization Switcher */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {greeting}, {displayName}! 👋
            </h1>
            <p className="text-gray-400">
              Welcome to your dashboard
            </p>
          </div>

          {/* Organization Switcher */}
          {organizations.length > 1 && (userRoles.has("admin") || userRoles.has("teacher")) ? (
            // Teachers/Admins: Show organization name as text, not a switcher
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg">
              <Building2 className="w-4 h-4 text-purple-400" />
              <span className="text-white">{currentOrg?.name}</span>
            </div>
          ) : organizations.length > 1 ? (
            // Students: Show organization switcher
            <div className="relative">
              <button
                onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Building2 className="w-4 h-4 text-purple-400" />
                <span className="text-white">{currentOrg?.name}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showOrgSwitcher ? "rotate-180" : ""}`} />
              </button>

              {showOrgSwitcher && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowOrgSwitcher(false)} />
                  <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 rounded-lg border border-slate-700 shadow-xl z-50">
                    {organizations.map(org => (
                      <button
                        key={org.id}
                        onClick={() => switchOrganization(org.id)}
                        className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-700 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          {org.role === "admin" && <Crown className="w-3 h-3 text-yellow-400" />}
                          {org.role === "teacher" && <GraduationCap className="w-3 h-3 text-blue-400" />}
                          {org.role === "student" && <School className="w-3 h-3 text-green-400" />}
                          <span className="text-sm text-white">{org.name}</span>
                        </div>
                        {selectedOrgId === org.id && (
                          <Check className="w-3 h-3 text-purple-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* Role-based Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            {availableTabs.filter(tab => tab.show).map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="data-[state=active]:bg-purple-600">
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* ========== STUDENT / MY LEARNING TAB ========== */}
          <TabsContent value="learning" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={BookOpen} label="Enrolled Courses" value={studentStats.total_courses} />
              <StatCard icon={Award} label="Completed Courses" value={studentStats.completed_courses} />
              <StatCard icon={Target} label="Avg. Progress" value={`${studentStats.average_progress}%`} />
              <StatCard icon={Clock} label="Current Streak" value={`${studentStats.streak_days} days`} />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Calendar */}
              <div className="lg:col-span-2">
                <LearningCalendar />
              </div>
              
              {/* Right Column - Upcoming Items */}
              <div className="space-y-6">
                <UpcomingItems items={upcomingDeadlines} />
                <RecentItems items={recentActivity} />
              </div>
            </div>

            {/* Continue Learning Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Continue Learning</h2>
                <Link href="/courses">
                  <GlowButton variant="ghost" size="sm">View All →</GlowButton>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrolledCourses.length === 0 ? (
                  <GlowCard>
                    <div className="p-8 text-center">
                      <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No courses enrolled yet</p>
                      <Link href="/courses">
                        <GlowButton size="sm" className="mt-3">Browse Courses</GlowButton>
                      </Link>
                    </div>
                  </GlowCard>
                ) : (
                  enrolledCourses.slice(0, 4).map((course) => (
                    <GlowCard key={course.id} className="hover:shadow-lg transition-all">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white line-clamp-1">{course.title}</h3>
                            <p className="text-xs text-gray-400">{course.instructor_name}</p>
                          </div>
                          {course.certificate_earned && (
                            <Award className="w-5 h-5 text-yellow-400" />
                          )}
                        </div>

                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{course.progress}%</span>
                          </div>
                          <Progress value={course.progress} className="h-2" />
                        </div>

                        <div className="flex justify-between text-xs text-gray-400 mb-3">
                          <span>{course.completed_lessons}/{course.total_lessons} lessons</span>
                        </div>

                        <Link href={`/courses/${course.id}/learn`}>
                          <GlowButton variant="outline" size="sm" fullWidth>
                            Continue Learning
                          </GlowButton>
                        </Link>
                      </div>
                    </GlowCard>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* ========== TEACHER / MY TEACHING TAB ========== */}
          <TabsContent value="teaching" className="space-y-6">
            {/* Teacher Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Students" value={teacherStats.total_students} />
              <StatCard icon={BookOpen} label="Active Courses" value={teacherStats.active_courses} />
              <StatCard icon={Star} label="Avg. Rating" value={teacherStats.average_rating.toFixed(1)} />
              <StatCard icon={Target} label="Completion Rate" value={`${Math.round(teacherStats.completion_rate)}%`} />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <GlowButton onClick={() => router.push("/courses/create")}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Course
              </GlowButton>
            </div>

            {/* Pending Grading */}
            {pendingGrading.length > 0 && (
              <GlowCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Pending Grading</h3>
                  <div className="space-y-3">
                    {pendingGrading.map(assignment => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{assignment.title}</p>
                          <p className="text-sm text-gray-400">{assignment.course_name}</p>
                          <p className="text-xs text-orange-400 mt-1">{assignment.submissions} submissions pending</p>
                        </div>
                        <GlowButton size="sm" onClick={() => router.push(`/assignments/${assignment.id}/grade`)}>
                          Grade Now
                        </GlowButton>
                      </div>
                    ))}
                  </div>
                </div>
              </GlowCard>
            )}

            {/* My Courses */}
            <GlowCard>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">My Courses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teacherCourses.length === 0 ? (
                    <div className="col-span-2 text-center py-8 text-gray-400">
                      No courses created yet
                    </div>
                  ) : (
                    teacherCourses.map(course => (
                      <div key={course.id} className="flex items-center gap-4 p-3 bg-slate-800/30 rounded-lg">
                        <div className="w-16 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{course.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>{course.students} students</span>
                            <span>⭐ {course.rating.toFixed(1)}</span>
                            <Badge className={course.status === "published" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                              {course.status}
                            </Badge>
                          </div>
                        </div>
                        <GlowButton size="sm" variant="ghost" onClick={() => router.push(`/courses/${course.id}/edit`)}>
                          <Edit className="w-4 h-4" />
                        </GlowButton>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </GlowCard>
          </TabsContent>

          {/* ========== ADMIN / ORGANIZATION ADMIN TAB ========== */}
          <TabsContent value="admin" className="space-y-6">
            {/* Admin Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Students" value={adminStats.total_students} />
              <StatCard icon={Activity} label="Active Students" value={adminStats.active_students} />
              <StatCard icon={BookOpen} label="Published Courses" value={adminStats.published_courses} />
              <StatCard icon={Star} label="Avg. Rating" value={adminStats.average_rating.toFixed(1)} />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <Link href={`/organizations/${selectedOrgId}/admin`}>
                <GlowButton variant="primary">
                  <Settings className="w-4 h-4 mr-2" />
                  Organization Admin Panel
                </GlowButton>
              </Link>
            </div>

            {/* Top Courses */}
            {topCourses.length > 0 ? (
              <GlowCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Top Performing Courses</h3>
                  <div className="space-y-4">
                    {topCourses.map(course => (
                      <div key={course.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-white">{course.title}</p>
                          <p className="text-sm text-gray-400">{course.students} students</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span className="text-white">{course.rating.toFixed(1)}</span>
                          </div>
                          <p className="text-sm text-gray-400">{course.completion}% completion</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlowCard>
            ) : (
              <GlowCard>
                <div className="p-12 text-center">
                  <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Courses Yet</h3>
                  <p className="text-gray-400 mb-6">Create your first course to get started</p>
                  <Link href="/courses/create">
                    <GlowButton variant="primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Course
                    </GlowButton>
                  </Link>
                </div>
              </GlowCard>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}