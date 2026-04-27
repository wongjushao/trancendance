// frontend/app/(main)/teacher/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  BookOpen, Users, TrendingUp, Plus, Edit, Eye, CheckCircle, FileText,
  MessageSquare, BarChart3,
  Star, Calendar, Search,
  Link
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRole } from "@/components/providers/RoleProvider";
import { toast } from "sonner";
import { InviteStudentModal } from '@/components/teacher/InviteStudentModal';

// Mock data for teacher dashboard
interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  students: number;
  lessons: number;
  rating: number;
  status: "published" | "draft" | "archived";
  createdAt: Date;
  updatedAt: Date;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
}

interface Lesson {
  id: number;
  courseId: number;
  title: string;
  content: string;
  duration: string;
  orderIndex: number;
  isPublished: boolean;
  type: "video" | "text" | "quiz" | "assignment";
}

interface Assignment {
  id: number;
  courseId: number;
  title: string;
  description: string;
  dueDate: Date;
  points: number;
  submissions: number;
  graded: number;
  status: "active" | "expired" | "draft";
}

interface Submission {
  id: number;
  assignmentId: number;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  submittedAt: Date;
  grade: number | null;
  feedback: string | null;
  content: string;
  status: "pending" | "graded" | "late";
}

interface Student {
  id: string;
  name: string;
  email: string;
  avatar: string;
  enrolledCourses: number;
  completedCourses: number;
  averageGrade: number;
  lastActive: Date;
}

const mockCourses: Course[] = [
  {
    id: 1,
    title: "Advanced React Development",
    description: "Master React hooks, context, and advanced patterns",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400",
    students: 1234,
    lessons: 24,
    rating: 4.8,
    status: "published",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-03-10"),
    category: "Web Development",
    level: "advanced",
  },
  {
    id: 2,
    title: "Backend with Node.js",
    description: "Build scalable backend services with Node.js and Express",
    thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400",
    students: 892,
    lessons: 18,
    rating: 4.6,
    status: "published",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-03-15"),
    category: "Backend",
    level: "intermediate",
  },
  {
    id: 3,
    title: "UI/UX Design Fundamentals",
    description: "Learn design principles and create stunning user interfaces",
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400",
    students: 2341,
    lessons: 32,
    rating: 4.9,
    status: "draft",
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-20"),
    category: "Design",
    level: "beginner",
  },
];

const mockLessons: Lesson[] = [
  {
    id: 1,
    courseId: 1,
    title: "Getting Started with React Hooks",
    content: "Learn the basics of React hooks...",
    duration: "15:30",
    orderIndex: 1,
    isPublished: true,
    type: "video",
  },
  {
    id: 2,
    courseId: 1,
    title: "useState Deep Dive",
    content: "Understanding useState and its applications...",
    duration: "22:45",
    orderIndex: 2,
    isPublished: true,
    type: "video",
  },
  {
    id: 3,
    courseId: 1,
    title: "useEffect and Side Effects",
    content: "Managing side effects with useEffect...",
    duration: "18:20",
    orderIndex: 3,
    isPublished: false,
    type: "video",
  },
];

const mockAssignments: Assignment[] = [
  {
    id: 1,
    courseId: 1,
    title: "React Hooks Implementation",
    description: "Implement custom hooks for form validation and data fetching",
    dueDate: new Date("2024-03-25"),
    points: 100,
    submissions: 45,
    graded: 32,
    status: "active",
  },
  {
    id: 2,
    courseId: 1,
    title: "Context API Project",
    description: "Build a theme switcher using Context API",
    dueDate: new Date("2024-04-01"),
    points: 150,
    submissions: 28,
    graded: 15,
    status: "active",
  },
];

const mockSubmissions: Submission[] = [
  {
    id: 1,
    assignmentId: 1,
    studentId: "student-1",
    studentName: "Alice Johnson",
    studentAvatar: "AJ",
    submittedAt: new Date("2024-03-20"),
    grade: null,
    feedback: null,
    content: "https://github.com/student/react-hooks-project",
    status: "pending",
  },
  {
    id: 2,
    assignmentId: 1,
    studentId: "student-2",
    studentName: "Bob Smith",
    studentAvatar: "BS",
    submittedAt: new Date("2024-03-21"),
    grade: 85,
    feedback: "Great work! Consider adding more error handling.",
    content: "https://github.com/student/react-hooks-submission",
    status: "graded",
  },
];

const mockStudents: Student[] = [
  {
    id: "student-1",
    name: "Alice Johnson",
    email: "alice@tech.edu",
    avatar: "AJ",
    enrolledCourses: 3,
    completedCourses: 2,
    averageGrade: 87,
    lastActive: new Date("2024-03-22"),
  },
  {
    id: "student-2",
    name: "Bob Smith",
    email: "bob@tech.edu",
    avatar: "BS",
    enrolledCourses: 2,
    completedCourses: 1,
    averageGrade: 78,
    lastActive: new Date("2024-03-21"),
  },
];

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { roleData } = useRole();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Check if user is a teacher
  useEffect(() => {
    if (roleData.role !== 'teacher' && roleData.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [roleData, router]);

  if (roleData.role !== 'teacher' && roleData.role !== 'admin') {
    return null;
  }

  const stats = {
    totalStudents: mockCourses.reduce((acc, c) => acc + c.students, 0),
    totalCourses: mockCourses.length,
    averageRating: mockCourses.reduce((acc, c) => acc + c.rating, 0) / mockCourses.length,
  };

  const handleCreateCourse = () => {
    setIsCreatingCourse(true);
  };

  const handleGradeSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setIsGrading(true);
  };

  const handleSubmitGrade = (grade: number, feedback: string) => {
    toast.success(`Graded submission: ${grade}/100`);
    setIsGrading(false);
    setSelectedSubmission(null);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Teacher Dashboard</h1>
          <p className="text-[#A0A0B5]">Manage your courses, students, and assignments</p>
        </div>
        <GlowButton variant="primary" onClick={handleCreateCourse}>
          <Plus className="w-5 h-5 mr-2" />
          Create New Course
        </GlowButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={BookOpen} label="Total Courses" value={stats.totalCourses.toString()} />
        <StatCard icon={Users} label="Total Students" value={stats.totalStudents.toLocaleString()} />
        <StatCard icon={Star} label="Average Rating" value={stats.averageRating.toFixed(1)} />
      </div>

      <GlowButton 
        variant="primary" 
        onClick={() => setShowInviteModal(true)}
        className="flex items-center gap-2"
      >
        <UserPlus className="w-4 h-4" />
        Invite Student
      </GlowButton>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#12121A] border border-white/5 p-1 rounded-2xl mb-8 flex-wrap h-auto">
          <TabsTrigger value="overview" className="rounded-xl px-6 py-2.5">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="courses" className="rounded-xl px-6 py-2.5">
            <BookOpen className="w-4 h-4 mr-2" />
            My Courses
          </TabsTrigger>
          <TabsTrigger value="assignments" className="rounded-xl px-6 py-2.5">
            <FileText className="w-4 h-4 mr-2" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="submissions" className="rounded-xl px-6 py-2.5">
            <CheckCircle className="w-4 h-4 mr-2" />
            Submissions
          </TabsTrigger>
          <TabsTrigger value="students" className="rounded-xl px-6 py-2.5">
            <Users className="w-4 h-4 mr-2" />
            Students
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl px-6 py-2.5">
            <TrendingUp className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Recent Activity */}
            <GlowCard>
              <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {mockSubmissions.map((submission) => (
                  <div key={submission.id} className="flex items-center justify-between p-4 bg-[#12121A] rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">{submission.studentAvatar}</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{submission.studentName}</p>
                        <p className="text-sm text-[#A0A0B5]">Submitted assignment: {mockAssignments.find(a => a.id === submission.assignmentId)?.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-[#6B6B80]">{submission.submittedAt.toLocaleDateString()}</span>
                      {submission.status === "pending" ? (
                        <GlowButton variant="primary" size="sm" onClick={() => handleGradeSubmission(submission)}>
                          Grade
                        </GlowButton>
                      ) : (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Graded</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </GlowCard>

            {/* Top Performing Students */}
            <GlowCard>
              <h2 className="text-2xl font-bold text-white mb-6">Top Performing Students</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mockStudents.slice(0, 3).map((student) => (
                  <div key={student.id} className="p-4 bg-[#12121A] rounded-xl text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-3">
                      <span className="text-white font-bold text-xl">{student.avatar}</span>
                    </div>
                    <h3 className="text-white font-semibold">{student.name}</h3>
                    <p className="text-sm text-[#A0A0B5]">{student.completedCourses} courses completed</p>
                    <p className="text-lg font-bold text-purple-400 mt-2">{student.averageGrade}%</p>
                  </div>
                ))}
              </div>
            </GlowCard>
          </div>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses">
          <div className="space-y-4">
            {mockCourses.map((course) => (
              <GlowCard key={course.id} className="hover:border-purple-500/30 transition-all">
                <div className="flex gap-6">
                  <div className="w-48 h-32 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-white">{course.title}</h3>
                        <p className="text-[#A0A0B5] text-sm mt-1">{course.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <GlowButton variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </GlowButton>
                        <GlowButton variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </GlowButton>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 mt-4 text-sm">
                      <span className="flex items-center gap-1 text-[#A0A0B5]">
                        <Users className="w-4 h-4" />
                        {course.students} students
                      </span>
                      <span className="flex items-center gap-1 text-[#A0A0B5]">
                        <BookOpen className="w-4 h-4" />
                        {course.lessons} lessons
                      </span>
                      <span className="flex items-center gap-1 text-[#A0A0B5]">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        {course.rating}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        course.status === "published" ? "bg-green-500/20 text-green-400" :
                        course.status === "draft" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-gray-500/20 text-gray-400"
                      }`}>
                        {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <div className="space-y-4">
            {mockAssignments.map((assignment) => {
              const course = mockCourses.find(c => c.id === assignment.courseId);
              return (
                <GlowCard key={assignment.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white">{assignment.title}</h3>
                      <p className="text-[#A0A0B5] text-sm mt-1">{assignment.description}</p>
                      <div className="flex flex-wrap items-center gap-6 mt-3 text-sm">
                        <span className="flex items-center gap-1 text-[#A0A0B5]">
                          <BookOpen className="w-4 h-4" />
                          {course?.title}
                        </span>
                        <span className="flex items-center gap-1 text-[#A0A0B5]">
                          <Calendar className="w-4 h-4" />
                          Due: {assignment.dueDate.toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1 text-[#A0A0B5]">
                          <FileText className="w-4 h-4" />
                          {assignment.points} points
                        </span>
                        <span className="flex items-center gap-1 text-[#A0A0B5]">
                          <CheckCircle className="w-4 h-4" />
                          {assignment.graded}/{assignment.submissions} graded
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <GlowButton variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </GlowButton>
                      <GlowButton variant="primary" size="sm">
                        View Submissions
                      </GlowButton>
                    </div>
                  </div>
                </GlowCard>
              );
            })}
          </div>
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions">
          <GlowCard>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Pending Submissions</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                <Input placeholder="Search submissions..." className="pl-10 w-64 bg-[#12121A] border-white/10" />
              </div>
            </div>
            <div className="space-y-4">
              {mockSubmissions.filter(s => s.status === "pending").map((submission) => {
                const assignment = mockAssignments.find(a => a.id === submission.assignmentId);
                return (
                  <div key={submission.id} className="flex items-center justify-between p-4 bg-[#12121A] rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">{submission.studentAvatar}</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{submission.studentName}</p>
                        <p className="text-sm text-[#A0A0B5]">Assignment: {assignment?.title}</p>
                        <p className="text-xs text-[#6B6B80]">Submitted: {submission.submittedAt.toLocaleString()}</p>
                      </div>
                    </div>
                    <GlowButton variant="primary" size="sm" onClick={() => handleGradeSubmission(submission)}>
                      Grade Submission
                    </GlowButton>
                  </div>
                );
              })}
            </div>
          </GlowCard>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students">
          <GlowCard>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Your Students</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                <Input placeholder="Search students..." className="pl-10 w-64 bg-[#12121A] border-white/10" />
              </div>
            </div>
            <div className="space-y-4">
              {mockStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-4 bg-[#12121A] rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{student.avatar}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{student.name}</p>
                      <p className="text-sm text-[#A0A0B5]">{student.email}</p>
                      <div className="flex gap-4 mt-1 text-xs text-[#6B6B80]">
                        <span>{student.enrolledCourses} enrolled</span>
                        <span>{student.completedCourses} completed</span>
                        <span>Avg: {student.averageGrade}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <GlowButton variant="outline" size="sm">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Message
                    </GlowButton>
                    <GlowButton variant="outline" size="sm">
                      View Progress
                    </GlowButton>
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlowCard>
              <h2 className="text-xl font-bold text-white mb-6">Course Performance</h2>
              <div className="space-y-4">
                {mockCourses.map((course) => (
                  <div key={course.id} className="p-4 bg-[#12121A] rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{course.title}</span>
                      <span className="text-purple-400">{course.students} students</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#A0A0B5]">
                      <span>Rating: {course.rating} ★</span>
                      <span>Completion: 72%</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlowCard>
          </div>
        </TabsContent>
      </Tabs>

      <InviteStudentModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        courses={courses.map(c => ({
          id: c.id,
          title: c.title,
          organization_id: 1, // This would come from context
          organization_name: "Current Organization"
        }))}
        invitedByName="Current Teacher"
      />

      {/* Grading Modal */}
      {isGrading && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setIsGrading(false)}>
          <div className="bg-[#16161F] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white">Grade Submission</h2>
              <p className="text-[#A0A0B5] mt-1">Student: {selectedSubmission.studentName}</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Submission Content</Label>
                <div className="p-4 bg-[#12121A] rounded-xl">
                  <a href={selectedSubmission.content} target="_blank" className="text-purple-400 hover:underline flex items-center gap-2">
                    <Link className="w-4 h-4" />
                    View Submission
                  </a>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Grade (0-100)</Label>
                <Input type="number" min="0" max="100" placeholder="Enter grade..." className="bg-[#12121A] border-white/10" />
              </div>
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Feedback</Label>
                <Textarea rows={4} placeholder="Provide feedback to the student..." className="bg-[#12121A] border-white/10" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-white/10">
              <GlowButton variant="ghost" onClick={() => setIsGrading(false)} className="flex-1">
                Cancel
              </GlowButton>
              <GlowButton variant="primary" onClick={() => handleSubmitGrade(85, "Great work!")} className="flex-1">
                Submit Grade
              </GlowButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}