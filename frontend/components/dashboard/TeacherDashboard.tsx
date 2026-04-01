// frontend/components/dashboard/TeacherDashboard.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  BookOpen, Users, Award, TrendingUp, Plus, Edit, 
  Trash2, Eye, CheckCircle, Clock, FileText,
  MessageSquare, DollarSign, BarChart3, Settings,
  Star, Calendar, Search, UserPlus, Crown, X
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TeacherDashboardProps {
  user: any;
  organizationId?: number | null;
  organizationName?: string | null;
}

const mockCourses = [
  {
    id: 1,
    title: "Advanced React Development",
    description: "Master React hooks, context, and advanced patterns",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400",
    students: 1234,
    lessons: 24,
    rating: 4.8,
    price: 99,
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
    price: 79,
    status: "published",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-03-15"),
    category: "Backend",
    level: "intermediate",
  },
];

const mockSubmissions = [
  {
    id: 1,
    assignmentId: 1,
    studentName: "Alice Johnson",
    studentAvatar: "AJ",
    submittedAt: new Date("2024-03-20"),
    grade: null,
    feedback: null,
    status: "pending",
  },
  {
    id: 2,
    assignmentId: 1,
    studentName: "Bob Smith",
    studentAvatar: "BS",
    submittedAt: new Date("2024-03-21"),
    grade: 85,
    feedback: "Great work! Consider adding more error handling.",
    status: "graded",
  },
];

export default function TeacherDashboard({ user, organizationId, organizationName }: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isGrading, setIsGrading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  
  const firstName = user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "there";

  const stats = {
    totalStudents: mockCourses.reduce((acc, c) => acc + c.students, 0),
    totalCourses: mockCourses.length,
    totalRevenue: mockCourses.reduce((acc, c) => acc + (c.students * c.price), 0),
    averageRating: mockCourses.reduce((acc, c) => acc + c.rating, 0) / mockCourses.length,
  };

  const handleGradeSubmission = (submission: any) => {
    setSelectedSubmission(submission);
    setIsGrading(true);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-600 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white">
              Teacher Dashboard
            </div>
            {organizationName && (
              <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white">
                {organizationName}
              </div>
            )}
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {firstName}!
          </h1>
          <p className="text-blue-100 text-lg">
            Manage your courses, students, and assignments.
          </p>
          
          <div className="flex gap-4 mt-6">
            <GlowButton variant="primary" className="bg-white text-blue-600 hover:bg-blue-50">
              <Plus className="w-4 h-4 mr-2" />
              Create New Course
            </GlowButton>
            <Link href="/courses">
              <GlowButton variant="ghost" className="text-white border-white/30 hover:bg-white/10">
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Courses
              </GlowButton>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={BookOpen} label="Total Courses" value={stats.totalCourses.toString()} />
        <StatCard icon={Users} label="Total Students" value={stats.totalStudents.toLocaleString()} />
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} />
        <StatCard icon={Star} label="Average Rating" value={stats.averageRating.toFixed(1)} />
      </div>

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
          <TabsTrigger value="submissions" className="rounded-xl px-6 py-2.5">
            <CheckCircle className="w-4 h-4 mr-2" />
            Pending Submissions
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
            <GlowCard>
              <h2 className="text-2xl font-bold text-white mb-6">Recent Submissions</h2>
              <div className="space-y-4">
                {mockSubmissions.map((submission) => (
                  <div key={submission.id} className="flex items-center justify-between p-4 bg-[#12121A] rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">{submission.studentAvatar}</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{submission.studentName}</p>
                        <p className="text-sm text-[#A0A0B5]">Submitted assignment</p>
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

            <GlowCard>
              <h2 className="text-2xl font-bold text-white mb-6">Top Performing Students</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: "Alice Johnson", avatar: "AJ", completed: 8, grade: 92 },
                  { name: "Bob Smith", avatar: "BS", completed: 6, grade: 88 },
                  { name: "Carol White", avatar: "CW", completed: 5, grade: 85 },
                ].map((student, i) => (
                  <div key={i} className="p-4 bg-[#12121A] rounded-xl text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto mb-3">
                      <span className="text-white font-bold text-xl">{student.avatar}</span>
                    </div>
                    <h3 className="text-white font-semibold">{student.name}</h3>
                    <p className="text-sm text-[#A0A0B5]">{student.completed} courses completed</p>
                    <p className="text-lg font-bold text-blue-400 mt-2">{student.grade}%</p>
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
              <GlowCard key={course.id} className="hover:border-blue-500/30 transition-all">
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
                      <span className="flex items-center gap-1 text-[#A0A0B5]">
                        <DollarSign className="w-4 h-4" />
                        ${course.price}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        course.status === "published" ? "bg-green-500/20 text-green-400" :
                        "bg-yellow-500/20 text-yellow-400"
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
              {mockSubmissions.filter(s => s.status === "pending").map((submission) => (
                <div key={submission.id} className="flex items-center justify-between p-4 bg-[#12121A] rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">{submission.studentAvatar}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{submission.studentName}</p>
                      <p className="text-sm text-[#A0A0B5]">Assignment: React Hooks Implementation</p>
                      <p className="text-xs text-[#6B6B80]">Submitted: {submission.submittedAt.toLocaleString()}</p>
                    </div>
                  </div>
                  <GlowButton variant="primary" size="sm" onClick={() => handleGradeSubmission(submission)}>
                    Grade Submission
                  </GlowButton>
                </div>
              ))}
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
              {[
                { name: "Alice Johnson", email: "alice@tech.edu", avatar: "AJ", enrolled: 3, completed: 2, grade: 87 },
                { name: "Bob Smith", email: "bob@tech.edu", avatar: "BS", enrolled: 2, completed: 1, grade: 78 },
                { name: "Carol White", email: "carol@gmail.com", avatar: "CW", enrolled: 4, completed: 3, grade: 92 },
              ].map((student, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-[#12121A] rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{student.avatar}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{student.name}</p>
                      <p className="text-sm text-[#A0A0B5]">{student.email}</p>
                      <div className="flex gap-4 mt-1 text-xs text-[#6B6B80]">
                        <span>{student.enrolled} enrolled</span>
                        <span>{student.completed} completed</span>
                        <span>Avg: {student.grade}%</span>
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
                      <span className="text-blue-400">{course.students} students</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#A0A0B5]">
                      <span>Rating: {course.rating} ★</span>
                      <span>Revenue: ${(course.students * course.price).toLocaleString()}</span>
                      <span>Completion: 72%</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlowCard>

            <GlowCard>
              <h2 className="text-xl font-bold text-white mb-6">Revenue Overview</h2>
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <p className="text-3xl font-bold text-white mb-2">${stats.totalRevenue.toLocaleString()}</p>
                <p className="text-[#A0A0B5]">Total earnings from course sales</p>
                <p className="text-sm text-green-400 mt-2">↑ 12% from last month</p>
              </div>
            </GlowCard>
          </div>
        </TabsContent>
      </Tabs>

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
              <GlowButton variant="primary" className="flex-1">
                Submit Grade
              </GlowButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}