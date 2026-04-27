// frontend/components/dashboard/TeacherDashboard.tsx
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

interface TeacherDashboardProps {
  user: any;
  organizationId?: number | null;
  organizationName?: string | null;
}

// Mock data
const mockCourses = [
  {
    id: 1,
    title: "Advanced React Patterns",
    thumbnail: "",
    students: 245,
    progress: 78,
    rating: 4.8,
    lessons: 24,
    modules: 6,
    status: "published" as const,
    lastUpdated: new Date("2024-03-15"),
  },
  {
    id: 2,
    title: "TypeScript Mastery",
    thumbnail: "",
    students: 189,
    progress: 65,
    rating: 4.9,
    lessons: 32,
    modules: 8,
    status: "published" as const,
    lastUpdated: new Date("2024-03-10"),
  },
  {
    id: 3,
    title: "UI/UX Design Fundamentals",
    thumbnail: "",
    students: 92,
    progress: 45,
    rating: 4.7,
    lessons: 18,
    modules: 5,
    status: "draft" as const,
    lastUpdated: new Date("2024-03-01"),
  },
];

const mockPendingAssignments = [
  {
    id: 1,
    title: "React Component Design",
    courseName: "Advanced React Patterns",
    submissions: 45,
    totalStudents: 245,
    dueDate: new Date("2024-03-20"),
    status: "pending" as const,
  },
  {
    id: 2,
    title: "TypeScript Generics Exercise",
    courseName: "TypeScript Mastery",
    submissions: 28,
    totalStudents: 189,
    dueDate: new Date("2024-03-22"),
    status: "pending" as const,
  },
];

const mockStudents = [
  {
    id: "1",
    name: "Alice Johnson",
    email: "alice@example.com",
    avatar: "",
    progress: 85,
    lastActive: new Date("2024-03-18"),
    grade: 92,
  },
  {
    id: "2",
    name: "Bob Smith",
    email: "bob@example.com",
    avatar: "",
    progress: 67,
    lastActive: new Date("2024-03-17"),
    grade: 78,
  },
  {
    id: "3",
    name: "Carol Davis",
    email: "carol@example.com",
    avatar: "",
    progress: 94,
    lastActive: new Date("2024-03-18"),
    grade: 96,
  },
];

const analyticsData = {
  totalStudents: 526,
  activeCourses: 3,
  averageRating: 4.8,
  completionRate: 72,
  monthlyGrowth: 15,
  totalRevenue: 12450,
};

export default function TeacherDashboard({
  user,
  organizationId,
  organizationName,
}: TeacherDashboardProps) {
  const router = useRouter();
  const { roleData } = useRole();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const handleCreateCourse = () => {
    router.push("/teacher/courses/create");
  };

  const handleEditCourse = (courseId: number) => {
    router.push(`/teacher/courses/${courseId}/edit`);
  };

  const handleGradeSubmissions = (assignmentId: number) => {
    router.push(`/teacher/assignments/${assignmentId}/grade`);
  };

  const filteredCourses = mockCourses.filter((course) =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          value={`${analyticsData.completionRate}%`}
          trend="+5%"
          trendUp={true}
        />
        <StatCard
          icon={Star}
          label="Average Rating"
          value={analyticsData.averageRating}
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
                    {mockCourses.map((course) => (
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
                    {[
                      {
                        icon: Users,
                        message: "15 new students enrolled this week",
                        time: "2 hours ago",
                        color: "blue",
                      },
                      {
                        icon: FileText,
                        message: "45 submissions pending for grading",
                        time: "5 hours ago",
                        color: "yellow",
                      },
                      {
                        icon: Star,
                        message: "New 5-star review on Advanced React",
                        time: "1 day ago",
                        color: "purple",
                      },
                    ].map((activity, idx) => {
                      const Icon = activity.icon;
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg"
                        >
                          <div
                            className={`p-2 rounded-lg bg-${activity.color}-500/20`}
                          >
                            <Icon className={`w-4 h-4 text-${activity.color}-400`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-300">{activity.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {activity.time}
                            </p>
                          </div>
                        </div>
                      );
                    })}
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
                        Add video quizzes to increase student engagement by up
                        to 40%!
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
            {filteredCourses.map((course) => (
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
                        {course.rating}
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
            ))}
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
                {mockPendingAssignments.map((assignment) => (
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
                            {assignment.submissions} / {assignment.totalStudents}{" "}
                            submitted
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
                ))}
              </div>
            </div>
          </GlowCard>

          <GlowCard>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Recent Submissions
              </h3>
              <div className="space-y-3">
                {[
                  {
                    student: "Emma Wilson",
                    assignment: "React Patterns Exercise",
                    submitted: "2 hours ago",
                    status: "pending",
                  },
                  {
                    student: "James Lee",
                    assignment: "TypeScript Generics",
                    submitted: "5 hours ago",
                    status: "pending",
                  },
                  {
                    student: "Sophia Chen",
                    assignment: "UI Design Project",
                    submitted: "1 day ago",
                    status: "graded",
                    grade: 85,
                  },
                ].map((submission, idx) => (
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
                ))}
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
                  {mockStudents.map((student) => (
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
                          {student.grade}%
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
                  ))}
                </tbody>
              </table>
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}