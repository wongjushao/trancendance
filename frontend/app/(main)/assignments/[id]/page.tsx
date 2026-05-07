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
  Download
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/components/providers/RoleProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";

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

export default function AssignmentsPage() {
  const router = useRouter();
  const { roleData } = useRole();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [courses, setCourses] = useState<{ id: number; title: string }[]>([]);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    // Mock data - replace with actual API call
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
    
    // Extract unique courses for filter
    const uniqueCourses = Array.from(
      new Map(mockAssignments.map(a => [a.course_id, { id: a.course_id, title: a.course_title }])).values()
    );
    setCourses(uniqueCourses);
    
    setLoading(false);
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

  const handleAssignmentClick = (assignment: Assignment) => {
    // Navigate to the assignment within the lesson context
    router.push(`/courses/${assignment.course_id}/learn/lesson/${assignment.lesson_id}/assignments/${assignment.id}`);
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          assignment.course_title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || assignment.status === filterStatus;
    const matchesCourse = filterCourse === "all" || assignment.course_id.toString() === filterCourse;
    return matchesSearch && matchesStatus && matchesCourse;
  });

  const getStats = () => {
    const total = assignments.length;
    const pending = assignments.filter(a => a.status === "pending" || a.status === "overdue").length;
    const submitted = assignments.filter(a => a.status === "submitted").length;
    const graded = assignments.filter(a => a.status === "graded").length;
    return { total, pending, submitted, graded };
  };

  const stats = getStats();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Assignments</h1>
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
              <Download className="w-8 h-8 text-green-400 opacity-50" />
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
        ) : filteredAssignments.length === 0 ? (
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
          filteredAssignments.map((assignment) => {
            const StatusIcon = getStatusConfig(assignment.status).icon;
            const statusConfig = getStatusConfig(assignment.status);
            const isOverdue = assignment.status === "overdue";
            const dueDate = new Date(assignment.due_date);
            const isDueSoon = dueDate.getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000 && dueDate > new Date();
            
            return (
              <GlowCard
                key={assignment.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200"
                onClick={() => handleAssignmentClick(assignment)}
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
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