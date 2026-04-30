"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  Search,
  Filter,
  ChevronRight,
  BookOpen,
  Download,
  Users,
  TrendingUp,
  Eye,
  CheckSquare,
  Star,
  Filter as FilterIcon,
  X
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/components/providers/RoleProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

interface Assignment {
  id: number;
  title: string;
  description: string;
  course_id: number;
  course_title: string;
  lesson_id: number;
  lesson_title: string;
  due_date: string;
  points: number;
  status: "pending" | "submitted" | "graded" | "overdue";
  submitted_at?: string;
  grade?: number;
  feedback?: string;
}

interface TeacherAssignment extends Assignment {
  total_submissions: number;
  graded_count: number;
  pending_count: number;
  average_grade?: number;
}

interface Submission {
  id: number;
  student_id: string;
  student_name: string;
  student_email: string;
  submitted_at: string;
  content?: string;
  attachments?: { name: string; url: string }[];
  grade?: number;
  feedback?: string;
  status: "submitted" | "graded";
}

export default function AssignmentsPage() {
  const router = useRouter();
  const { roleData } = useRole();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [courses, setCourses] = useState<{ id: number; title: string }[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<TeacherAssignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [showGradingPanel, setShowGradingPanel] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [grade, setGrade] = useState<number>(0);
  const [feedback, setFeedback] = useState("");

  const isTeacher = roleData.role === "teacher" || roleData.role === "org_admin";
  const isAdmin = roleData.role === "org_admin";

  useEffect(() => {
    if (isTeacher) {
      fetchTeacherAssignments();
    } else {
      fetchStudentAssignments();
    }
  }, []);

  const fetchStudentAssignments = async () => {
    // Mock data for students
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockAssignments: Assignment[] = [
      {
        id: 1,
        title: "Introduction to React Hooks",
        description: "Complete the exercises to demonstrate understanding of React Hooks",
        course_id: 1,
        course_title: "Advanced React Development",
        lesson_id: 1,
        lesson_title: "Understanding React Hooks",
        due_date: "2026-05-15T23:59:59",
        points: 100,
        status: "pending",
      },
      {
        id: 2,
        title: "State Management with useState",
        description: "Implement a counter app using useState hook",
        course_id: 1,
        course_title: "Advanced React Development",
        lesson_id: 2,
        lesson_title: "useState in Depth",
        due_date: "2026-05-10T23:59:59",
        points: 50,
        status: "submitted",
        submitted_at: "2026-05-09T15:30:00",
      },
      {
        id: 3,
        title: "Database Design Project",
        description: "Design a database schema for an e-commerce platform",
        course_id: 2,
        course_title: "Database Fundamentals",
        lesson_id: 5,
        lesson_title: "Database Design Principles",
        due_date: "2026-05-05T23:59:59",
        points: 150,
        status: "graded",
        grade: 85,
        feedback: "Good work! Could improve on indexing strategy.",
        submitted_at: "2026-05-03T10:15:00",
      },
      {
        id: 4,
        title: "API Testing with Jest",
        description: "Write unit tests for REST API endpoints",
        course_id: 3,
        course_title: "Backend Development",
        lesson_id: 8,
        lesson_title: "Testing Strategies",
        due_date: "2026-04-30T23:59:59",
        points: 75,
        status: "overdue",
      },
    ];
    
    setAssignments(mockAssignments);
    
    const uniqueCourses = Array.from(
      new Map(mockAssignments.map(a => [a.course_id, { id: a.course_id, title: a.course_title }])).values()
    );
    setCourses(uniqueCourses);
    setLoading(false);
  };

  const fetchTeacherAssignments = async () => {
    // Mock data for teachers
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockAssignments: TeacherAssignment[] = [
      {
        id: 1,
        title: "Introduction to React Hooks",
        description: "Complete the exercises to demonstrate understanding of React Hooks",
        course_id: 1,
        course_title: "Advanced React Development",
        lesson_id: 1,
        lesson_title: "Understanding React Hooks",
        due_date: "2026-05-15T23:59:59",
        points: 100,
        status: "pending",
        total_submissions: 15,
        graded_count: 8,
        pending_count: 7,
        average_grade: 78.5,
      },
      {
        id: 2,
        title: "State Management with useState",
        description: "Implement a counter app using useState hook",
        course_id: 1,
        course_title: "Advanced React Development",
        lesson_id: 2,
        lesson_title: "useState in Depth",
        due_date: "2026-05-10T23:59:59",
        points: 50,
        status: "pending",
        total_submissions: 12,
        graded_count: 12,
        pending_count: 0,
        average_grade: 82.3,
      },
      {
        id: 3,
        title: "Database Design Project",
        description: "Design a database schema for an e-commerce platform",
        course_id: 2,
        course_title: "Database Fundamentals",
        lesson_id: 5,
        lesson_title: "Database Design Principles",
        due_date: "2026-05-05T23:59:59",
        points: 150,
        status: "graded",
        total_submissions: 8,
        graded_count: 8,
        pending_count: 0,
        average_grade: 88.2,
      },
      {
        id: 4,
        title: "API Testing with Jest",
        description: "Write unit tests for REST API endpoints",
        course_id: 3,
        course_title: "Backend Development",
        lesson_id: 8,
        lesson_title: "Testing Strategies",
        due_date: "2026-04-30T23:59:59",
        points: 75,
        status: "overdue",
        total_submissions: 10,
        graded_count: 5,
        pending_count: 5,
        average_grade: 65.0,
      },
    ];
    
    setTeacherAssignments(mockAssignments);
    
    const uniqueCourses = Array.from(
      new Map(mockAssignments.map(a => [a.course_id, { id: a.course_id, title: a.course_title }])).values()
    );
    setCourses(uniqueCourses);
    setLoading(false);
  };

  const fetchSubmissions = async (assignmentId: number) => {
    // Mock submissions data
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockSubmissions: Submission[] = [
      {
        id: 1,
        student_id: "user1",
        student_name: "Alice Johnson",
        student_email: "alice@example.com",
        submitted_at: "2026-05-14T10:30:00",
        content: "Here's my implementation of React hooks...",
        status: "submitted",
      },
      {
        id: 2,
        student_id: "user2",
        student_name: "Bob Smith",
        student_email: "bob@example.com",
        submitted_at: "2026-05-13T15:45:00",
        content: "I've completed all the exercises...",
        status: "submitted",
      },
      {
        id: 3,
        student_id: "user3",
        student_name: "Carol Davis",
        student_email: "carol@example.com",
        submitted_at: "2026-05-12T09:20:00",
        content: "My solution includes custom hooks...",
        grade: 92,
        feedback: "Excellent work! Great understanding of hooks.",
        status: "graded",
      },
    ];
    
    setSubmissions(mockSubmissions);
  };

  const handleViewSubmissions = async (assignment: TeacherAssignment) => {
    setSelectedAssignment(assignment);
    await fetchSubmissions(assignment.id);
    setShowGradingPanel(true);
  };

  const handleGradeSubmission = async (submission: Submission) => {
    setSelectedSubmission(submission);
    setGrade(submission.grade || 0);
    setFeedback(submission.feedback || "");
  };

  const handleSubmitGrade = async () => {
    if (!selectedSubmission || !selectedAssignment) return;
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    toast.success(`Grade submitted for ${selectedSubmission.student_name}`);
    
    // Update local state
    setSubmissions(prev => prev.map(s => 
      s.id === selectedSubmission.id 
        ? { ...s, grade, feedback, status: "graded" as const }
        : s
    ));
    
    setSelectedSubmission(null);
    setGrade(0);
    setFeedback("");
    
    // Refresh assignment stats
    await fetchTeacherAssignments();
  };

  const navigateToAssignment = (assignment: Assignment) => {
    router.push(`/assignments/${assignment.id}`);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Pending" };
      case "submitted":
        return { icon: CheckCircle, color: "text-blue-400", bg: "bg-blue-400/10", label: "Submitted" };
      case "graded":
        return { icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10", label: "Graded" };
      case "overdue":
        return { icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10", label: "Overdue" };
      default:
        return { icon: FileText, color: "text-gray-400", bg: "bg-gray-400/10", label: "Unknown" };
    }
  };

  const getFilteredAssignments = () => {
    const items = isTeacher ? teacherAssignments : assignments;
    return items.filter(assignment => {
      const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            assignment.course_title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || assignment.status === filterStatus;
      const matchesCourse = filterCourse === "all" || assignment.course_id.toString() === filterCourse;
      return matchesSearch && matchesStatus && matchesCourse;
    });
  };

  const getStats = () => {
    if (isTeacher) {
      const total = teacherAssignments.length;
      const totalSubmissions = teacherAssignments.reduce((sum, a) => sum + a.total_submissions, 0);
      const totalGraded = teacherAssignments.reduce((sum, a) => sum + a.graded_count, 0);
      const pendingGrading = totalSubmissions - totalGraded;
      const avgGrade = teacherAssignments.reduce((sum, a) => sum + (a.average_grade || 0), 0) / total || 0;
      
      return { total, totalSubmissions, totalGraded, pendingGrading, avgGrade };
    } else {
      const total = assignments.length;
      const pending = assignments.filter(a => a.status === "pending" || a.status === "overdue").length;
      const submitted = assignments.filter(a => a.status === "submitted").length;
      const graded = assignments.filter(a => a.status === "graded").length;
      return { total, pending, submitted, graded };
    }
  };

  const stats = getStats();

  // Student View
  if (!isTeacher) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Assignments</h1>
          <p className="text-gray-400">Track and submit your course assignments</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Assignments</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-purple-400 opacity-50" />
              </div>
            </div>
          </GlowCard>
          
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pending</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400 opacity-50" />
              </div>
            </div>
          </GlowCard>
          
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Submitted</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.submitted}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-400 opacity-50" />
              </div>
            </div>
          </GlowCard>
          
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Graded</p>
                  <p className="text-2xl font-bold text-green-400">{stats.graded}</p>
                </div>
                <Star className="w-8 h-8 text-green-400 opacity-50" />
              </div>
            </div>
          </GlowCard>
        </div>

        {/* Filters */}
        <GlowCard className="mb-6">
          <div className="p-5">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search assignments by title or course..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="graded">Graded</option>
                <option value="overdue">Overdue</option>
              </select>
              
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Courses</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </GlowCard>

        {/* Assignments List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
          ) : getFilteredAssignments().length === 0 ? (
            <GlowCard>
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No assignments found</h3>
                <p className="text-gray-400">
                  {searchQuery || filterStatus !== "all" || filterCourse !== "all"
                    ? "Try adjusting your filters"
                    : "You don't have any assignments yet"}
                </p>
              </div>
            </GlowCard>
          ) : (
            getFilteredAssignments().map((assignment) => {
              const StatusIcon = getStatusConfig(assignment.status).icon;
              const statusConfig = getStatusConfig(assignment.status);
              const isOverdue = assignment.status === "overdue";
              const dueDate = new Date(assignment.due_date);
              const isDueSoon = dueDate.getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000 && dueDate > new Date();
              
              return (
                <GlowCard
                  key={assignment.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200"
                  onClick={() => navigateToAssignment(assignment as Assignment)}
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-white hover:text-purple-400 transition-colors">
                            {assignment.title}
                          </h3>
                          <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                          {isDueSoon && !isOverdue && assignment.status === "pending" && (
                            <Badge className="bg-orange-400/10 text-orange-400 border-0">
                              Due Soon
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                          {assignment.description}
                        </p>
                        
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-1 text-gray-400">
                            <BookOpen className="w-4 h-4" />
                            <span>{assignment.course_title}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400">
                            <FileText className="w-4 h-4" />
                            <span>{assignment.lesson_title}</span>
                          </div>
                          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : isDueSoon ? 'text-orange-400' : 'text-gray-400'}`}>
                            <Calendar className="w-4 h-4" />
                            <span>Due: {dueDate.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>{assignment.points} points</span>
                          </div>
                        </div>
                        
                        {assignment.status === "graded" && assignment.grade !== undefined && (
                          <div className="mt-3 flex items-center gap-2">
                            <Badge className="bg-green-500/20 text-green-400">
                              Grade: {assignment.grade}/{assignment.points} ({Math.round((assignment.grade / assignment.points) * 100)}%)
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </GlowCard>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Teacher/Admin View
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Assignments Management</h1>
        <p className="text-gray-400">Grade submissions and track student progress</p>
      </div>

      {/* Stats Cards for Teachers */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <GlowCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Assignments</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-400 opacity-50" />
            </div>
          </div>
        </GlowCard>
        
        <GlowCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Submissions</p>
                <p className="text-2xl font-bold text-blue-400">{stats.totalSubmissions}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400 opacity-50" />
            </div>
          </div>
        </GlowCard>
        
        <GlowCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Graded</p>
                <p className="text-2xl font-bold text-green-400">{stats.totalGraded}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </div>
        </GlowCard>
        
        <GlowCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending Grading</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pendingGrading}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400 opacity-50" />
            </div>
          </div>
        </GlowCard>
        
        <GlowCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Average Grade</p>
                <p className="text-2xl font-bold text-purple-400">{stats.avgGrade.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400 opacity-50" />
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Filters */}
      <GlowCard className="mb-6">
        <div className="p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search assignments by title or course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="graded">Graded</option>
              <option value="overdue">Overdue</option>
            </select>
            
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </GlowCard>

      {/* Assignments List for Teachers */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : getFilteredAssignments().length === 0 ? (
          <GlowCard>
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No assignments found</h3>
              <p className="text-gray-400">No assignments match your filters</p>
            </div>
          </GlowCard>
        ) : (
          getFilteredAssignments().map((assignment) => {
            const teacherAssignment = assignment as TeacherAssignment;
            const dueDate = new Date(teacherAssignment.due_date);
            const completionRate = (teacherAssignment.graded_count / teacherAssignment.total_submissions) * 100;
            
            return (
              <GlowCard key={teacherAssignment.id}>
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-white">
                          {teacherAssignment.title}
                        </h3>
                        {teacherAssignment.status === "overdue" && (
                          <Badge className="bg-red-400/10 text-red-400 border-0">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-3">
                        {teacherAssignment.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-4 text-sm mb-4">
                        <div className="flex items-center gap-1 text-gray-400">
                          <BookOpen className="w-4 h-4" />
                          <span>{teacherAssignment.course_title}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <FileText className="w-4 h-4" />
                          <span>{teacherAssignment.lesson_title}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {dueDate.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>{teacherAssignment.points} points</span>
                        </div>
                      </div>
                      
                      {/* Progress Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Submissions</p>
                          <p className="text-lg font-semibold text-white">
                            {teacherAssignment.total_submissions} / {teacherAssignment.total_submissions}
                          </p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Graded</p>
                          <p className="text-lg font-semibold text-green-400">
                            {teacherAssignment.graded_count}
                          </p>
                          <p className="text-xs text-yellow-400">
                            Pending: {teacherAssignment.pending_count}
                          </p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Average Grade</p>
                          <p className="text-lg font-semibold text-purple-400">
                            {teacherAssignment.average_grade?.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Completion Rate</span>
                          <span>{completionRate.toFixed(0)}%</span>
                        </div>
                        <Progress value={completionRate} className="h-2" />
                      </div>
                    </div>
                    
                    <div>
                      <GlowButton
                        onClick={() => handleViewSubmissions(teacherAssignment)}
                        variant="primary"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Grade Submissions
                        {teacherAssignment.pending_count > 0 && (
                          <Badge className="ml-2 bg-yellow-500 text-white">
                            {teacherAssignment.pending_count}
                          </Badge>
                        )}
                      </GlowButton>
                    </div>
                  </div>
                </div>
              </GlowCard>
            );
          })
        )}
      </div>

      {/* Grading Panel Modal */}
      {showGradingPanel && selectedAssignment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {selectedAssignment.title}
                </h2>
                <p className="text-sm text-gray-400">
                  {selectedAssignment.course_title} • {selectedAssignment.total_submissions} submissions
                </p>
              </div>
              <button
                onClick={() => {
                  setShowGradingPanel(false);
                  setSelectedSubmission(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedSubmission ? (
                // Grading Form
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {selectedSubmission.student_name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {selectedSubmission.student_email}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Submitted: {new Date(selectedSubmission.submitted_at).toLocaleString()}
                      </p>
                    </div>
                    <GlowButton
                      variant="outline"
                      onClick={() => setSelectedSubmission(null)}
                    >
                      Back to List
                    </GlowButton>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">Submission Content</h4>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {selectedSubmission.content || "No text content provided."}
                    </p>
                    {selectedSubmission.attachments && selectedSubmission.attachments.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-400 mb-2">Attachments:</p>
                        {selectedSubmission.attachments.map((file, idx) => (
                          <a
                            key={idx}
                            href={file.url}
                            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
                          >
                            <Download className="w-4 h-4" />
                            {file.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-4">Grade & Feedback</h4>
                    <div className="space-y-4">
                      <div>
                        <Label>Grade (out of {selectedAssignment.points})</Label>
                        <Input
                          type="number"
                          value={grade}
                          onChange={(e) => setGrade(Number(e.target.value))}
                          max={selectedAssignment.points}
                          min={0}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Feedback</Label>
                        <Textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows={5}
                          placeholder="Provide feedback to the student..."
                          className="mt-1"
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <GlowButton
                          variant="outline"
                          onClick={() => setSelectedSubmission(null)}
                        >
                          Cancel
                        </GlowButton>
                        <GlowButton onClick={handleSubmitGrade}>
                          Submit Grade
                        </GlowButton>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Submissions List
                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2">
                      <Badge className="bg-gray-800 text-white">
                        Total: {submissions.length}
                      </Badge>
                      <Badge className="bg-yellow-400/10 text-yellow-400">
                        Pending: {submissions.filter(s => s.status === "submitted").length}
                      </Badge>
                      <Badge className="bg-green-400/10 text-green-400">
                        Graded: {submissions.filter(s => s.status === "graded").length}
                      </Badge>
                    </div>
                  </div>
                  
                  {submissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-white">
                            {submission.student_name}
                          </h4>
                          <p className="text-sm text-gray-400">
                            {submission.student_email}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Submitted: {new Date(submission.submitted_at).toLocaleString()}
                          </p>
                          {submission.status === "graded" && submission.grade !== undefined && (
                            <div className="mt-2">
                              <Badge className="bg-green-500/20 text-green-400">
                                Grade: {submission.grade}/{selectedAssignment.points}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <GlowButton
                          variant={submission.status === "graded" ? "outline" : "primary"}
                          size="sm"
                          onClick={() => handleGradeSubmission(submission)}
                        >
                          {submission.status === "graded" ? "Edit Grade" : "Grade"}
                        </GlowButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}