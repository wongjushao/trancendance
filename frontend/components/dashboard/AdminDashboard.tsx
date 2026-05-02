"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Calendar,
  Activity,
  Award,
  ChevronRight,
  Clock,
  CheckCircle,
  MessageSquare,
  UserPlus,
  Star,
  Target,
  Zap,
  Sparkles,
  Settings, Trophy, Plus, BarChart3, AlertCircle, Loader2
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { useRole } from "@/components/providers/RoleProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { motion } from "framer-motion";

interface AdminDashboardProps {
  user: any;
  organizationId?: number | null;
  organizationName?: string | null;
}

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalCourses: number;
  publishedCourses: number;
  averageRating: number;
  completionRate: number;
  monthlyGrowth: number;
  pendingApprovals: number;
}

interface RecentActivity {
  id: string;
  user_name: string;
  action: string;
  item: string;
  time: string;
  type: string;
}

interface TopCourse {
  id: number;
  title: string;
  students: number;
  rating: number;
  completion: number;
}

interface PendingItem {
  id: string;
  type: string;
  user?: string;
  role?: string;
  course?: string;
  reviewer?: string;
  time: string;
}

export default function AdminDashboard({ user, organizationId, organizationName }: AdminDashboardProps) {
  const supabase = getSupabaseBrowserClient();
  const { roleData } = useRole();
  const [greeting, setGreeting] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeStudents: 0,
    totalCourses: 0,
    publishedCourses: 0,
    averageRating: 0,
    completionRate: 0,
    monthlyGrowth: 0,
    pendingApprovals: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
    
    if (organizationId) {
      loadDashboardData();
    }
  }, [organizationId]);

  const loadDashboardData = async () => {
    setLoading(true);
    
    try {
      // 1. Get all courses for this organization
      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .eq("organization_id", organizationId);

      if (coursesError) throw coursesError;

      const totalCourses = courses?.length || 0;
      const publishedCourses = courses?.filter(c => c.status === "published").length || 0;

      // 2. Get course reviews to calculate average rating
      const courseIds = courses?.map(c => c.id) || [];
      let averageRating = 0;
      if (courseIds.length > 0) {
        const { data: reviews } = await supabase
          .from("course_reviews")
          .select("rating")
          .in("course_id", courseIds);
        
        if (reviews && reviews.length > 0) {
          averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        }
      }

      // 3. Get class members (students) for all course offerings in this org
      const { data: courseClasses } = await supabase
        .from("course_classes")
        .select("id")
        .in("course_id", courseIds);

      const classIds = courseClasses?.map(cc => cc.id) || [];
      
      let totalStudents = 0;
      let activeStudents = 0;
      if (classIds.length > 0) {
        const { data: classMembers, count } = await supabase
          .from("class_members")
          .select("user_id, enrolled_at", { count: "exact" })
          .in("course_class_id", classIds);
        
        totalStudents = count || 0;
        
        // Count active students (enrolled in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        activeStudents = classMembers?.filter(cm => 
          new Date(cm.enrolled_at) > thirtyDaysAgo
        ).length || 0;
      }

      // 4. Get completion rate from lesson_progress
      let completionRate = 0;
      if (classIds.length > 0) {
        const { data: classMembersWithProgress } = await supabase
          .from("class_members")
          .select("id")
          .in("course_class_id", classIds);
        
        const classMemberIds = classMembersWithProgress?.map(cm => cm.id) || [];
        
        if (classMemberIds.length > 0) {
          const { data: lessonProgress } = await supabase
            .from("lesson_progress")
            .select("status")
            .in("class_member_id", classMemberIds);
          
          const totalProgress = lessonProgress?.length || 0;
          const completedProgress = lessonProgress?.filter(lp => lp.status === "completed").length || 0;
          completionRate = totalProgress > 0 ? (completedProgress / totalProgress) * 100 : 0;
        }
      }

      // 5. Calculate monthly growth (compare last 30 days to previous 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const { data: recentEnrollments } = await supabase
        .from("class_members")
        .select("enrolled_at")
        .in("course_class_id", classIds)
        .gte("enrolled_at", thirtyDaysAgo.toISOString());
      
      const { data: previousEnrollments } = await supabase
        .from("class_members")
        .select("enrolled_at")
        .in("course_class_id", classIds)
        .gte("enrolled_at", sixtyDaysAgo.toISOString())
        .lt("enrolled_at", thirtyDaysAgo.toISOString());
      
      const recentCount = recentEnrollments?.length || 0;
      const previousCount = previousEnrollments?.length || 0;
      const monthlyGrowth = previousCount > 0 ? Math.round((recentCount - previousCount) / previousCount * 100) : recentCount > 0 ? 100 : 0;

      // 6. Get pending approvals (role requests and join requests)
      const { data: roleRequests } = await supabase
        .from("organization_members")
        .select("created_at, member_role, user:user_id (first_name, last_name, username)")
        .eq("organization_id", organizationId)
        .eq("member_role", "pending");
      
      const pendingApprovals = (roleRequests?.length || 0);

      // 7. Get recent activities
      const { data: recentSubmissions } = await supabase
        .from("submissions")
        .select(`
          id,
          submitted_at,
          assignment:assignment_id (
            title,
            course:course_id (
              title
            )
          ),
          user:user_id (
            first_name,
            last_name,
            username
          )
        `)
        .order("submitted_at", { ascending: false })
        .limit(10);

      const activities: RecentActivity[] = (recentSubmissions || []).map(sub => ({
        id: sub.id.toString(),
        user_name: sub.user?.first_name 
          ? `${sub.user.first_name} ${sub.user.last_name || ""}`.trim()
          : sub.user?.username || "User",
        action: "submitted",
        item: sub.assignment?.title || "Assignment",
        time: formatTimeAgo(new Date(sub.submitted_at)),
        type: "submission",
      }));

      // 8. Get top performing courses
      const courseStats = await Promise.all((courses || []).map(async (course) => {
        const { data: reviews } = await supabase
          .from("course_reviews")
          .select("rating")
          .eq("course_id", course.id);
        
        const avgRating = reviews?.length 
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
          : 0;
        
        // Get student count for this course
        const { data: courseClassesForCourse } = await supabase
          .from("course_classes")
          .select("id")
          .eq("course_id", course.id);
        
        const classIdsForCourse = courseClassesForCourse?.map(cc => cc.id) || [];
        let studentCount = 0;
        let completion = 0;
        
        if (classIdsForCourse.length > 0) {
          const { count } = await supabase
            .from("class_members")
            .select("id", { count: "exact", head: true })
            .in("course_class_id", classIdsForCourse);
          studentCount = count || 0;
          
          // Get completion rate for this course
          const { data: classMembersForCourse } = await supabase
            .from("class_members")
            .select("id")
            .in("course_class_id", classIdsForCourse);
          
          const cmIds = classMembersForCourse?.map(cm => cm.id) || [];
          if (cmIds.length > 0) {
            const { data: progress } = await supabase
              .from("lesson_progress")
              .select("status")
              .in("class_member_id", cmIds);
            
            const total = progress?.length || 0;
            const completed = progress?.filter(p => p.status === "completed").length || 0;
            completion = total > 0 ? (completed / total) * 100 : 0;
          }
        }
        
        return {
          id: course.id,
          title: course.title,
          students: studentCount,
          rating: avgRating,
          completion: Math.round(completion),
        };
      }));

      const topCoursesSorted = courseStats.sort((a, b) => b.students - a.students).slice(0, 3);
      setTopCourses(topCoursesSorted);
      setRecentActivities(activities.slice(0, 5));
      
      setStats({
        totalStudents,
        activeStudents,
        totalCourses,
        publishedCourses,
        averageRating: Math.round(averageRating * 10) / 10,
        completionRate: Math.round(completionRate),
        monthlyGrowth: Math.max(0, monthlyGrowth),
        pendingApprovals,
      });

      // 9. Get pending items
      const pending: PendingItem[] = [];
      
      if (roleRequests) {
        roleRequests.forEach(req => {
          pending.push({
            id: `role-${Date.now()}-${Math.random()}`,
            type: "role_request",
            user: req.user?.first_name 
              ? `${req.user.first_name} ${req.user.last_name || ""}`.trim()
              : req.user?.username || "Unknown",
            role: req.member_role,
            time: formatTimeAgo(new Date(req.created_at)),
          });
        });
      }
      
      setPendingItems(pending.slice(0, 3));

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "completion": return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "enrollment": return <UserPlus className="w-4 h-4 text-blue-400" />;
      case "course": return <BookOpen className="w-4 h-4 text-purple-400" />;
      case "submission": return <MessageSquare className="w-4 h-4 text-yellow-400" />;
      case "achievement": return <Award className="w-4 h-4 text-orange-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {greeting}, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
          </h1>
          <p className="text-gray-400">
            Welcome back to {organizationName || "your organization"} dashboard
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/organizations/${organizationId}/admin`}>
            <GlowButton variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              Admin Panel
            </GlowButton>
          </Link>
        </div>
      </div>

      {/* Stats Grid - Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Users} 
          label="Total Students" 
          value={stats.totalStudents.toLocaleString()} 
          trend={`+${stats.monthlyGrowth}%`} 
          trendUp={true}
        />
        <StatCard 
          icon={BookOpen} 
          label="Active Courses" 
          value={stats.publishedCourses.toString()} 
          trend={`${stats.totalCourses - stats.publishedCourses} drafts`}
        />
        <StatCard 
          icon={TrendingUp} 
          label="Completion Rate" 
          value={`${stats.completionRate}%`} 
        />
        <StatCard 
          icon={Star} 
          label="Avg. Rating" 
          value={stats.averageRating.toString()} 
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlowCard>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Activity className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-sm text-gray-400">Active Students</span>
              </div>
              <span className="text-2xl font-bold text-white">{stats.activeStudents.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${stats.totalStudents > 0 ? (stats.activeStudents / stats.totalStudents) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.totalStudents > 0 ? Math.round((stats.activeStudents / stats.totalStudents) * 100) : 0}% of total students active
            </p>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Target className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-sm text-gray-400">Monthly Growth</span>
              </div>
              <span className="text-2xl font-bold text-green-400">+{stats.monthlyGrowth}%</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-gray-400">Increase in student enrollment</span>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Clock className="w-4 h-4 text-yellow-400" />
                </div>
                <span className="text-sm text-gray-400">Pending Approvals</span>
              </div>
              <span className="text-2xl font-bold text-yellow-400">{stats.pendingApprovals}</span>
            </div>
            <Link href={`/organizations/${organizationId}/admin?tab=role-requests`}>
              <button className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1">
                Review requests
                <ChevronRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
        </GlowCard>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Activity & Top Courses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity */}
          <GlowCard>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                </div>
                <Link href={`/organizations/${organizationId}/admin`}>
                  <button className="text-sm text-gray-400 hover:text-white transition-colors">
                    View all
                  </button>
                </Link>
              </div>
              <div className="space-y-4">
                {recentActivities.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No recent activity</p>
                ) : (
                  recentActivities.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div>
                          <p className="text-white text-sm">
                            <span className="font-medium">{activity.user_name}</span>{' '}
                            <span className="text-gray-400">{activity.action}</span>{' '}
                            <span className="font-medium">{activity.item}</span>
                          </p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </GlowCard>

          {/* Top Performing Courses */}
          <GlowCard>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Top Performing Courses</h3>
                </div>
                <Link href={`/organizations/${organizationId}/admin?tab=courses`}>
                  <button className="text-sm text-gray-400 hover:text-white transition-colors">
                    Manage courses
                  </button>
                </Link>
              </div>
              <div className="space-y-4">
                {topCourses.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No courses yet</p>
                ) : (
                  topCourses.map((course) => (
                    <div key={course.id} className="p-3 bg-gray-800/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-medium">{course.title}</h4>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                          <span className="text-sm text-white">{course.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-400">{course.students} students</span>
                        <span className="text-gray-400">{course.completion}% completion</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${course.completion}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </GlowCard>
        </div>

        {/* Right Column - Quick Actions & Pending Items */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <GlowCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
              </div>
              <div className="space-y-3">
                <Link href={`/organizations/${organizationId}/admin?tab=members`}>
                  <button className="w-full flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <UserPlus className="w-4 h-4 text-purple-400" />
                      <span className="text-white">Invite New Member</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                  </button>
                </Link>
                <Link href="/courses/create">
                  <button className="w-full flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Plus className="w-4 h-4 text-purple-400" />
                      <span className="text-white">Create New Course</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                  </button>
                </Link>
                <Link href={`/organizations/${organizationId}/admin?tab=analytics`}>
                  <button className="w-full flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-4 h-4 text-purple-400" />
                      <span className="text-white">View Analytics Report</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                  </button>
                </Link>
                <Link href={`/organizations/${organizationId}/admin?tab=settings`}>
                  <button className="w-full flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Settings className="w-4 h-4 text-purple-400" />
                      <span className="text-white">Organization Settings</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                  </button>
                </Link>
              </div>
            </div>
          </GlowCard>

          {/* Pending Items */}
          {pendingItems.length > 0 && (
            <GlowCard>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Pending Items</h3>
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                    {pendingItems.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {pendingItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                      <div className="flex-1">
                        <p className="text-white text-sm">
                          {item.type === "role_request" && `${item.user} requested ${item.role} role`}
                        </p>
                        <p className="text-xs text-gray-500">{item.time}</p>
                      </div>
                      <Link href={`/organizations/${organizationId}/admin?tab=role-requests`}>
                        <button className="text-xs text-purple-400 hover:text-purple-300">
                          Review
                        </button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </GlowCard>
          )}

          {/* Tip of the Day */}
          <GlowCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Tip of the Day</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Use the Admin Panel to manage members, courses, role requests, and organization settings in detail.
              </p>
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}