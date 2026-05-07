"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Users,
  Award,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  Star,
  Calendar,
  Search,
  UserPlus,
  Crown,
  X,
  GraduationCap,
  Target,
  Activity,
  Bell,
  Filter,
  Download,
  Share2,
  MoreVertical,
  PlayCircle,
  Copy,
  Layers,
  FolderOpen,
  Video,
  FileQuestion,
  ClipboardList,
  ChevronRight,
  Zap,
  Loader2
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { useRole } from "@/components/providers/RoleProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface TeacherDashboardProps {
  user: any;
  organizationId?: number | null;
  organizationName?: string | null;
}

interface Course {
  id: number;
  title: string;
  thumbnail: string;
  students: number;
  progress: number;
  rating: number;
  lessons: number;
  modules: number;
  status: "published" | "draft";
  lastUpdated: Date;
}

interface PendingAssignment {
  id: number;
  title: string;
  courseName: string;
  submissions: number;
  totalStudents: number;
  dueDate: Date;
  status: "pending" | "graded";
}

interface Student {
  id: string;
  name: string;
  email: string;
  avatar: string;
  progress: number;
  lastActive: Date;
  grade: number;
}

interface Submission {
  student: string;
  assignment: string;
  submitted: string;
  status: "pending" | "graded";
  grade?: number;
}

export default function TeacherDashboard({
  user,
  organizationId,
  organizationName,
}: TeacherDashboardProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const { roleData } = useRole();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [analyticsData, setAnalyticsData] = useState({
    totalStudents: 0,
    activeCourses: 0,
    averageRating: 0,
    completionRate: 0,
    monthlyGrowth: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    loadTeacherData();
  }, [organizationId]);

  const loadTeacherData = async () => {
    setLoading(true);
    
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // 1. Get courses created by this teacher
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .eq("created_by", currentUser.id)
        .order("created_at", { ascending: false });

      if (coursesError) throw coursesError;

      // 2. For each course, get stats
      const formattedCourses: Course[] = [];
      let totalStudentsCount = 0;
      let totalRatingSum = 0;
      let totalRatingCount = 0;
      let totalCompletionSum = 0;
      let totalCompletionCount = 0;

      for (const course of coursesData || []) {
        // Get course classes (offerings)
        const { data: courseClasses } = await supabase
          .from("course_classes")
          .select("id")
          .eq("course_id", course.id);

        const classIds = courseClasses?.map(cc => cc.id) || [];
        
        // Get student count
        let studentCount = 0;
        if (classIds.length > 0) {
          const { count } = await supabase
            .from("class_members")
            .select("id", { count: "exact", head: true })
            .in("course_class_id", classIds);
          studentCount = count || 0;
          totalStudentsCount += studentCount;
        }

        // Get course rating
        const { data: reviews } = await supabase
          .from("course_reviews")
          .select("rating")
          .eq("course_id", course.id);
        
        const avgRating = reviews?.length 
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
          : 0;
        
        if (reviews && reviews.length > 0) {
          totalRatingSum += avgRating;
          totalRatingCount++;
        }

        // Get completion rate
        let completionRate = 0;
        if (classIds.length > 0) {
          const { data: classMembers } = await supabase
            .from("class_members")
            .select("id")
            .in("course_class_id", classIds);
          
          const cmIds = classMembers?.map(cm => cm.id) || [];
          
          if (cmIds.length > 0) {
            const { data: lessonProgress } = await supabase
              .from("lesson_progress")
              .select("status")
              .in("class_member_id", cmIds);
            
            const total = lessonProgress?.length || 0;
            const completed = lessonProgress?.filter(lp => lp.status === "completed").length || 0;
            completionRate = total > 0 ? (completed / total) * 100 : 0;
            totalCompletionSum += completionRate;
            totalCompletionCount++;
          }
        }

        // Get modules and lessons count
        const { data: modules } = await supabase
          .from("modules")
          .select(`
            id,
            classes:classes (
              id,
              lessons:lessons (id)
            )
          `)
          .eq("course_id", course.id);

        let lessonsCount = 0;
        let modulesCount = modules?.length || 0;
        modules?.forEach(module => {
          module.classes?.forEach(classItem => {
            lessonsCount += classItem.lessons?.length || 0;
          });
        });

        formattedCourses.push({
          id: course.id,
          title: course.title,
          thumbnail: course.thumbnail || "",
          students: studentCount,
          progress: Math.round(completionRate),
          rating: avgRating,
          lessons: lessonsCount,
          modules: modulesCount,
          status: course.status === "published" ? "published" : "draft",
          lastUpdated: new Date(course.created_at),
        });
      }

      setCourses(formattedCourses);

      // 3. Get pending assignments for grading
      const courseIds = formattedCourses.map(c => c.id);
      const pendingAssignmentsList: PendingAssignment[] = [];
      
      if (courseIds.length > 0) {
        const { data: assignments } = await supabase
          .from("assignments")
          .select(`
            id,
            title,
            due_at,
            course_id,
            courses:course_id (title)
          `)
          .in("course_id", courseIds);

        for (const assignment of assignments || []) {
          // Get submission stats
          const { data: submissions, count } = await supabase
            .from("submissions")
            .select("id", { count: "exact" })
            .eq("assignment_id", assignment.id);
          
          const { count: gradedCount } = await supabase
            .from("submissions")
            .select("id", { count: "exact" })
            .eq("assignment_id", assignment.id)
            .not("grade", "is", null);

          // Get total students enrolled in the course
          const { data: courseClassesForAssignment } = await supabase
            .from("course_classes")
            .select("id")
            .eq("course_id", assignment.course_id);
          
          const classIdsForAssignment = courseClassesForAssignment?.map(cc => cc.id) || [];
          let totalStudents = 0;
          
          if (classIdsForAssignment.length > 0) {
            const { count: studentCount } = await supabase
              .from("class_members")
              .select("id", { count: "exact", head: true })
              .in("course_class_id", classIdsForAssignment);
            totalStudents = studentCount || 0;
          }

          pendingAssignmentsList.push({
            id: assignment.id,
            title: assignment.title,
            courseName: assignment.courses?.title || "Unknown Course",
            submissions: count || 0,
            totalStudents: totalStudents,
            dueDate: new Date(assignment.due_at),
            status: (gradedCount || 0) === (count || 0) ? "graded" : "pending",
          });
        }
      }

      setPendingAssignments(pendingAssignmentsList.filter(p => p.status === "pending").slice(0, 2));

      // 4. Get enrolled students for teacher's courses
      const studentsList: Student[] = [];
      const courseIdsForStudents = formattedCourses.map(c => c.id);
      
      if (courseIdsForStudents.length > 0) {
        const { data: courseClassesForStudents } = await supabase
          .from("course_classes")
          .select("id")
          .in("course_id", courseIdsForStudents);
        
        const classIdsForStudents = courseClassesForStudents?.map(cc => cc.id) || [];
        
        if (classIdsForStudents.length > 0) {
          const { data: classMembersWithProgress } = await supabase
            .from("class_members")
            .select(`
              id,
              user_id,
              enrolled_at,
              user:user_id (
                id,
                first_name,
                last_name,
                username,
                email,
                avatar_url
              ),
              lesson_progress:lesson_progress (status)
            `)
            .in("course_class_id", classIdsForStudents)
            .limit(50);

          for (const cm of classMembersWithProgress || []) {
            const completedLessons = cm.lesson_progress?.filter((lp: any) => lp.status === "completed").length || 0;
            const totalLessons = 1; // This is approximate - would need full calculation
            const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
            
            // Get average grade for this student
            const { data: submissions } = await supabase
              .from("submissions")
              .select("grade")
              .eq("user_id", cm.user_id);
            
            const avgGrade = submissions?.length 
              ? submissions.reduce((sum, s) => sum + (s.grade || 0), 0) / submissions.length 
              : 0;

            studentsList.push({
              id: cm.user_id,
              name: cm.user?.first_name 
                ? `${cm.user.first_name} ${cm.user.last_name || ""}`.trim()
                : cm.user?.username || cm.user?.email || "Unknown",
              email: cm.user?.email || "",
              avatar: cm.user?.avatar_url || "",
              progress: Math.round(progress),
              lastActive: new Date(cm.enrolled_at),
              grade: avgGrade,
            });
          }
        }
      }

      setStudents(studentsList.slice(0, 5));

      // 5. Get recent submissions
      const submissionsList: Submission[] = [];
      const assignmentIds = pendingAssignmentsList.map(a => a.id);
      
      if (assignmentIds.length > 0) {
        const { data: submissions } = await supabase
          .from("submissions")
          .select(`
            id,
            submitted_at,
            grade,
            assignment:assignment_id (title),
            user:user_id (first_name, last_name, username)
          `)
          .in("assignment_id", assignmentIds)
          .order("submitted_at", { ascending: false })
          .limit(5);

        for (const sub of submissions || []) {
          submissionsList.push({
            student: sub.user?.first_name 
              ? `${sub.user.first_name} ${sub.user.last_name || ""}`.trim()
              : sub.user?.username || "Student",
            assignment: sub.assignment?.title || "Assignment",
            submitted: formatTimeAgo(new Date(sub.submitted_at)),
            status: sub.grade !== null ? "graded" : "pending",
            grade: sub.grade || undefined,
          });
        }
      }

      setRecentSubmissions(submissionsList);

      // 6. Calculate analytics
      setAnalyticsData({
        totalStudents: totalStudentsCount,
        activeCourses: formattedCourses.filter(c => c.status === "published").length,
        averageRating: totalRatingCount > 0 ? totalRatingSum / totalRatingCount : 0,
        completionRate: totalCompletionCount > 0 ? totalCompletionSum / totalCompletionCount : 0,
        monthlyGrowth: 15, // Would need historical data tracking
        totalRevenue: 0, // Would need payment integration
      });

    } catch (error) {
      console.error("Error loading teacher dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleCreateCourse = () => {
    router.push("/courses/create");
  };

  const handleEditCourse = (courseId: number) => {
    router.push(`/courses/${courseId}/edit`);
  };

  const handleGradeSubmissions = (assignmentId: number) => {
    router.push(`/assignments/${assignmentId}/grade`);
  };

  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
            Teacher Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Welcome back, {user?.email?.split("@")[0] || "Teacher"}
          </p>
          {organizationName && (
            <div className="flex items-center gap-2 mt-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-400">{organizationName}</span>
            </div>
          )}
        </div>
        <GlowButton onClick={handleCreateCourse}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Course
        </GlowButton>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Active Courses"
          value={analyticsData.activeCourses}
          trend="+1 this month"
          trendUp={true}
        />
        <StatCard
          icon={Users}
          label="Total Students"
          value={analyticsData.totalStudents}
          trend={`+${analyticsData.monthlyGrowth}%`}
          trendUp={true}
        />
        <StatCard
          icon={Award}
          label="Completion Rate"
          value={`${Math.round(analyticsData.completionRate)}%`}
          trend="+5%"
          trendUp={true}
        />
        <StatCard
          icon={Star}
          label="Average Rating"
          value={analyticsData.averageRating.toFixed(1)}
          trend="4.8/5.0"
          trendUp={true}
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">My Courses</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Stats */}
            <div className="lg:col-span-2 space-y-6">
              <GlowCard>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Course Performance
                    </h3>
                    <Select defaultValue="week">
                      <SelectTrigger className="w-32 bg-gray-800/50 border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4">
                    {filteredCourses.slice(0, 3).map((course) => (
                      <div key={course.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">{course.title}</span>
                          <span className="text-gray-400">
                            {course.progress}% completion
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlowCard>

              <GlowCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Recent Activity
                  </h3>
                  <div className="space-y-4">
                    {recentSubmissions.length === 0 ? (
                      <p className="text-gray-400 text-center py-4">No recent submissions</p>
                    ) : (
                      recentSubmissions.map((submission, idx) => {
                        const Icon = submission.status === "graded" ? CheckCircle : FileText;
                        const color = submission.status === "graded" ? "green" : "yellow";
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg"
                          >
                            <div className={`p-2 rounded-lg bg-${color}-500/20`}>
                              <Icon className={`w-4 h-4 text-${color}-400`} />
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-300">
                                <span className="font-medium">{submission.student}</span>{' '}
                                submitted <span className="font-medium">{submission.assignment}</span>
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {submission.submitted}
                              </p>
                            </div>
                            {submission.status === "pending" && (
                              <GlowButton size="sm" variant="outline">
                                Grade
                              </GlowButton>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </GlowCard>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              <GlowCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    <GlowButton
                      variant="outline"
                      fullWidth
                      onClick={handleCreateCourse}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Course
                    </GlowButton>
                    <GlowButton
                      variant="outline"
                      fullWidth
                      onClick={() => router.push("/teacher/students/invite")}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite Students
                    </GlowButton>
                    <GlowButton
                      variant="outline"
                      fullWidth
                      onClick={() => router.push("/analytics")}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Analytics
                    </GlowButton>
                  </div>
                </div>
              </GlowCard>

              <GlowCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Tip of the Day
                  </h3>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Zap className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-gray-300 text-sm">
                        Add video quizzes to increase student engagement by up to 40%!
                      </p>
                      <button className="text-purple-400 text-sm mt-2 hover:text-purple-300">
                        Learn more →
                      </button>
                    </div>
                  </div>
                </div>
              </GlowCard>
            </div>
          </div>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-6">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search your courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800/50 border-gray-700"
              />
            </div>
            <GlowButton variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </GlowButton>
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.length === 0 ? (
              <div className="col-span-full">
                <GlowCard>
                  <div className="p-8 text-center">
                    <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No courses found</p>
                    <GlowButton size="sm" onClick={handleCreateCourse} className="mt-3">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Course
                    </GlowButton>
                  </div>
                </GlowCard>
              </div>
            ) : (
              filteredCourses.map((course) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlowCard>
                    <div className="relative">
                      <div className="aspect-video bg-gradient-to-br from-purple-600 to-blue-600 rounded-t-lg flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-white/50" />
                      </div>
                      <div className="absolute top-3 right-3">
                        <Badge
                          className={
                            course.status === "published"
                              ? "bg-green-600/80"
                              : "bg-yellow-600/80"
                          }
                        >
                          {course.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {course.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {course.students} students
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400" />
                          {course.rating.toFixed(1)}
                        </span>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-gray-300">
                            {course.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <GlowButton
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleEditCourse(course.id)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </GlowButton>
                        <GlowButton
                          size="sm"
                          variant="primary"
                          className="flex-1"
                          onClick={() => router.push(`/courses/${course.id}`)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </GlowButton>
                      </div>
                    </div>
                  </GlowCard>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-6">
          <GlowCard>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Pending Grading
              </h3>
              <div className="space-y-4">
                {pendingAssignments.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No pending assignments to grade</p>
                ) : (
                  pendingAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                          <FileText className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium">
                            {assignment.title}
                          </h4>
                          <p className="text-sm text-gray-400">
                            {assignment.courseName}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs">
                            <span className="text-gray-500">
                              {assignment.submissions} / {assignment.totalStudents} submitted
                            </span>
                            <span className="flex items-center gap-1 text-orange-400">
                              <Clock className="w-3 h-3" />
                              Due: {assignment.dueDate.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <GlowButton
                        size="sm"
                        onClick={() => handleGradeSubmissions(assignment.id)}
                      >
                        Grade Now
                      </GlowButton>
                    </div>
                  ))
                )}
              </div>
            </div>
          </GlowCard>

          <GlowCard>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Recent Submissions
              </h3>
              <div className="space-y-3">
                {recentSubmissions.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No recent submissions</p>
                ) : (
                  recentSubmissions.map((submission, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {submission.student}
                        </p>
                        <p className="text-sm text-gray-400">
                          {submission.assignment}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {submission.submitted}
                        </p>
                      </div>
                      <div className="text-right">
                        {submission.status === "graded" ? (
                          <div className="text-green-400">
                            Grade: {submission.grade}%
                          </div>
                        ) : (
                          <GlowButton size="sm" variant="outline">
                            Grade
                          </GlowButton>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </GlowCard>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search students..."
                className="pl-10 bg-gray-800/50 border-gray-700"
              />
            </div>
            <GlowButton variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </GlowButton>
          </div>

          <GlowCard>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-800">
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Student
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Progress
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Average Grade
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Last Active
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">
                        No students enrolled yet
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student.id} className="border-b border-gray-800/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {student.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {student.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-24">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-400">
                                {student.progress}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-1.5">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full"
                                style={{ width: `${student.progress}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={
                              student.grade >= 90
                                ? "text-green-400"
                                : student.grade >= 70
                                ? "text-yellow-400"
                                : "text-red-400"
                            }
                          >
                            {Math.round(student.grade)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400">
                          {student.lastActive.toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <GlowButton size="sm" variant="ghost">
                            <MessageSquare className="w-4 h-4" />
                          </GlowButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}