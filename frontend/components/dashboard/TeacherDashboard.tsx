// frontend/components/dashboard/TeacherDashboard.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  BookOpen, Users, Award, TrendingUp, Plus, Edit, 
  Trash2, Eye, CheckCircle, Clock, FileText,
  MessageSquare, BarChart3, Settings,
  Star, Calendar, Search, UserPlus, Crown, X,
  GraduationCap, Target, Activity, Bell, Filter,
  Download, Share2, MoreVertical, PlayCircle
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

interface TeacherDashboardProps {
  user: any;
  organizationId?: number | null;
  organizationName?: string | null;
}

// Mock data for teacher's courses
const teacherCourses = [
  {
    id: 1,
    title: "Advanced React Development",
    description: "Master React hooks, context API, and advanced patterns",
    thumbnail: "",
    students: 45,
    lessons: 20,
    rating: 4.8,
    status: "published" as const,
    createdAt: new Date(2024, 0, 1),
    updatedAt: new Date(2024, 0, 15),
    category: "Development",
    level: "advanced" as const,
  },
  {
    id: 2,
    title: "Full-Stack TypeScript",
    description: "Build scalable applications with TypeScript, Node.js, and React",
    thumbnail: "",
    students: 32,
    lessons: 20,
    rating: 4.9,
    status: "published" as const,
    createdAt: new Date(2024, 0, 5),
    updatedAt: new Date(2024, 0, 10),
    category: "Development",
    level: "intermediate" as const,
  },
  {
    id: 3,
    title: "UI/UX Design Fundamentals",
    description: "Learn design principles, wireframing, and prototyping",
    thumbnail: "",
    students: 28,
    lessons: 15,
    rating: 4.7,
    status: "draft" as const,
    createdAt: new Date(2024, 0, 10),
    updatedAt: new Date(2024, 0, 12),
    category: "Design",
    level: "beginner" as const,
  },
];

// Mock data for pending assignments to grade
const pendingSubmissions = [
  {
    id: 1,
    assignmentId: 1,
    assignmentTitle: "Build a Custom Hook",
    courseId: 1,
    courseTitle: "Advanced React Development",
    studentId: "S001",
    studentName: "Alice Johnson",
    studentAvatar: "AJ",
    submittedAt: new Date(2024, 0, 16, 14, 30),
    grade: null,
    feedback: null,
    content: "https://example.com/submission1",
    status: "pending" as const,
  },
  {
    id: 2,
    assignmentId: 2,
    assignmentTitle: "API Integration",
    courseId: 2,
    courseTitle: "Full-Stack TypeScript",
    studentId: "S002",
    studentName: "Bob Smith",
    studentAvatar: "BS",
    submittedAt: new Date(2024, 0, 16, 10, 15),
    grade: null,
    feedback: null,
    content: "https://example.com/submission2",
    status: "pending" as const,
  },
  {
    id: 3,
    assignmentId: 1,
    assignmentTitle: "Build a Custom Hook",
    courseId: 1,
    courseTitle: "Advanced React Development",
    studentId: "S003",
    studentName: "Carol Davis",
    studentAvatar: "CD",
    submittedAt: new Date(2024, 0, 15, 16, 45),
    grade: 85,
    feedback: "Great work! Check the comments for improvements.",
    content: "https://example.com/submission3",
    status: "graded" as const,
  },
];

// Mock data for students
const students = [
  {
    id: "S001",
    name: "Alice Johnson",
    email: "alice@example.com",
    avatar: "AJ",
    enrolledCourses: 3,
    completedCourses: 1,
    averageGrade: 85,
    lastActive: new Date(2024, 0, 16, 9, 30),
  },
  {
    id: "S002",
    name: "Bob Smith",
    email: "bob@example.com",
    avatar: "BS",
    enrolledCourses: 2,
    completedCourses: 0,
    averageGrade: 78,
    lastActive: new Date(2024, 0, 15, 14, 20),
  },
  {
    id: "S003",
    name: "Carol Davis",
    email: "carol@example.com",
    avatar: "CD",
    enrolledCourses: 4,
    completedCourses: 2,
    averageGrade: 92,
    lastActive: new Date(2024, 0, 16, 11, 0),
  },
];

// Mock analytics data
const analyticsData = {
  totalStudents: 105,
  averageRating: 4.8,
  completionRate: 72,
  monthlyGrowth: 15,
  topPerformingCourse: "Advanced React Development",
};

export default function TeacherDashboard({ 
  user, 
  organizationId, 
  organizationName 
}: TeacherDashboardProps) {
  const [greeting, setGreeting] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const publishedCourses = teacherCourses.filter(c => c.status === "published").length;
  const draftCourses = teacherCourses.filter(c => c.status === "draft").length;
  const pendingGrading = pendingSubmissions.filter(s => s.status === "pending").length;
  const totalStudents = students.length;

  const handleGradeSubmit = () => {
    // Handle grading submission
    console.log("Grading:", { grade, feedback, submissionId: selectedSubmission?.id });
    setShowGradingModal(false);
    setGrade("");
    setFeedback("");
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {greeting}, {user?.user_metadata?.first_name || user?.email?.split('@')[0]}! 👋
          </h1>
          <p className="text-gray-400">
            {organizationName 
              ? `Teaching at ${organizationName} • ${publishedCourses} active courses` 
              : `Teaching Dashboard • ${publishedCourses} active courses`}
          </p>
        </div>
        <div className="flex gap-3">
          <GlowButton size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Create New Course
          </GlowButton>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Total Courses"
          value={teacherCourses.length}
          trend={`${publishedCourses} published, ${draftCourses} draft`}
        />
        <StatCard
          icon={Users}
          label="Total Students"
          value={totalStudents}
          trend="Across all courses"
          trendUp={true}
        />
        <StatCard
          icon={FileText}
          label="Pending Grading"
          value={pendingGrading}
          trend={`${pendingSubmissions.filter(s => s.status === "graded").length} graded`}
          trendUp={pendingGrading === 0}
        />
        <StatCard
          icon={Star}
          label="Avg. Rating"
          value={analyticsData.averageRating}
          trend="From 150+ reviews"
          trendUp={true}
        />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="courses" className="space-y-4">
        <TabsList className="bg-gray-800/50 border border-gray-700">
          <TabsTrigger value="courses">My Courses</TabsTrigger>
          <TabsTrigger value="submissions">Submissions to Grade</TabsTrigger>
          <TabsTrigger value="students">My Students</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teacherCourses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlowCard className="hover:shadow-lg transition-all duration-300">
                  <div className="p-4">
                    {/* Course Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-white text-lg mb-1">
                          {course.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            course.status === "published" 
                              ? "bg-green-500/20 text-green-400" 
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}>
                            {course.status}
                          </span>
                          <span className="text-xs text-gray-400">{course.level}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-1 hover:bg-gray-700 rounded transition-colors">
                          <Edit className="w-4 h-4 text-gray-400" />
                        </button>
                        <button className="p-1 hover:bg-gray-700 rounded transition-colors">
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>

                    {/* Course Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                        <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                        <p className="text-sm font-semibold text-white">{course.students}</p>
                        <p className="text-xs text-gray-400">Students</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                        <Star className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                        <p className="text-sm font-semibold text-white">{course.rating}</p>
                        <p className="text-xs text-gray-400">Rating</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <GlowButton size="sm" variant="outline" className="flex-1 text-sm">
                        <PlayCircle className="w-4 h-4 mr-1" />
                        Preview
                      </GlowButton>
                      <GlowButton size="sm" className="flex-1 text-sm">
                        Edit Course
                      </GlowButton>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="space-y-4">
          <GlowCard>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-white">Pending Submissions</h3>
                  <p className="text-sm text-gray-400 mt-1">Grade student assignments</p>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input placeholder="Search submissions..." className="pl-9 w-64" />
                </div>
              </div>

              <div className="space-y-3">
                {pendingSubmissions.filter(s => s.status === "pending").map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                        {submission.studentAvatar}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{submission.studentName}</p>
                        <p className="text-sm text-gray-400">{submission.assignmentTitle}</p>
                        <p className="text-xs text-gray-500">{submission.courseTitle}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">
                          Submitted: {submission.submittedAt.toLocaleDateString()}
                        </p>
                        <GlowButton 
                          size="sm" 
                          className="mt-2"
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setShowGradingModal(true);
                          }}
                        >
                          Grade Assignment
                        </GlowButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          <GlowCard>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-white">Enrolled Students</h3>
                  <p className="text-sm text-gray-400 mt-1">Track student progress</p>
                </div>
                <GlowButton size="sm" variant="outline" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Invite Students
                </GlowButton>
              </div>

              <div className="space-y-3">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                        {student.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-white">{student.name}</p>
                        <p className="text-sm text-gray-400">{student.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <p className="text-sm font-semibold text-white">{student.enrolledCourses}</p>
                        <p className="text-xs text-gray-400">Enrolled</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{student.completedCourses}</p>
                        <p className="text-xs text-gray-400">Completed</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{student.averageGrade}%</p>
                        <p className="text-xs text-gray-400">Avg. Grade</p>
                      </div>
                    </div>
                    <GlowButton size="sm" variant="ghost">
                      <MessageSquare className="w-4 h-4" />
                    </GlowButton>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlowCard>
              <div className="p-4">
                <div className="text-center py-6">
                  <div className="mt-3 inline-flex items-center gap-1 text-green-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>+{analyticsData.monthlyGrowth}% this month</span>
                  </div>
                </div>
              </div>
            </GlowCard>

            <GlowCard>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-3">Course Performance</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">Completion Rate</span>
                      <span className="text-white">{analyticsData.completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${analyticsData.completionRate}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">Student Satisfaction</span>
                      <span className="text-white">{analyticsData.averageRating}/5.0</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${(analyticsData.averageRating / 5) * 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-purple-500/10 rounded-lg">
                  <p className="text-sm text-gray-300">🏆 Top Performing Course</p>
                  <p className="font-semibold text-white mt-1">{analyticsData.topPerformingCourse}</p>
                </div>
              </div>
            </GlowCard>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/courses/new">
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <Plus className="w-6 h-6 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">New Course</p>
          </div>
        </Link>
        <Link href="/analytics">
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <BarChart3 className="w-6 h-6 text-blue-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">Analytics</p>
          </div>
        </Link>
        <Link href="/messages">
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <MessageSquare className="w-6 h-6 text-green-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">Messages</p>
          </div>
        </Link>
        <Link href="/settings">
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <Settings className="w-6 h-6 text-gray-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">Settings</p>
          </div>
        </Link>
      </div>

      {/* Grading Modal */}
      {showGradingModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Grade Assignment</h3>
              <button onClick={() => setShowGradingModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Student</label>
                <p className="text-white">{selectedSubmission.studentName}</p>
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Assignment</label>
                <p className="text-white">{selectedSubmission.assignmentTitle}</p>
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Grade (0-100)</label>
                <Input 
                  type="number" 
                  placeholder="Enter grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Feedback</label>
                <textarea
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={4}
                  placeholder="Provide feedback to the student..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <GlowButton variant="outline" onClick={() => setShowGradingModal(false)} fullWidth>
                  Cancel
                </GlowButton>
                <GlowButton onClick={handleGradeSubmit} fullWidth>
                  Submit Grade
                </GlowButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}