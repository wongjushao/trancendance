"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Calendar,
  BookOpen,
  Award,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  TrendingUp,
  Download,
  Send,
  Trash2,
  Edit2,
  Shield,
  UserCheck,
  UserX,
  BarChart3,
  MessageSquare,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRole } from "@/components/providers/RoleProvider";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  enrolled_at: string;
  progress: number;
  completed_lessons: number;
  total_lessons: number;
  average_grade: number;
  last_active: string;
  status: "active" | "inactive" | "blocked";
  assignments_completed: number;
  assignments_total: number;
}

interface CourseData {
  id: number;
  title: string;
  description: string;
  instructor: string;
  total_students: number;
  total_lessons: number;
  average_progress: number;
  completion_rate: number;
}

interface StudentStats {
  total_students: number;
  active_students: number;
  average_progress: number;
  average_grade: number;
  completion_rate: number;
}

interface InviteStudentData {
  email: string;
  message?: string;
  send_email: boolean;
}

export default function CourseStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { roleData } = useRole();
  const isTeacher = roleData.role === "teacher" || roleData.role === "org_admin";
  const isAdmin = roleData.role === "org_admin";

  const [students, setStudents] = useState<Student[]>([]);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [inviteData, setInviteData] = useState<InviteStudentData>({
    email: "",
    message: "",
    send_email: true,
  });
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    if (!isTeacher && !isAdmin) {
      toast.error("You don't have permission to view this page");
      router.push(`/courses/${courseId}`);
      return;
    }
    fetchCourseData();
    fetchStudents();
  }, [courseId]);

  const fetchCourseData = async () => {
    // Mock data - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setCourse({
      id: parseInt(courseId),
      title: "Advanced React Development",
      description: "Master React with advanced concepts and best practices",
      instructor: "Dr. Sarah Johnson",
      total_students: 45,
      total_lessons: 24,
      average_progress: 68,
      completion_rate: 72,
    });
  };

  const fetchStudents = async () => {
    // Mock data - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockStudents: Student[] = [
      {
        id: "user1",
        name: "Alice Johnson",
        email: "alice@example.com",
        enrolled_at: "2026-04-01T10:00:00",
        progress: 85,
        completed_lessons: 20,
        total_lessons: 24,
        average_grade: 92,
        last_active: "2026-05-14T15:30:00",
        status: "active",
        assignments_completed: 8,
        assignments_total: 10,
      },
      {
        id: "user2",
        name: "Bob Smith",
        email: "bob@example.com",
        enrolled_at: "2026-04-03T14:20:00",
        progress: 62,
        completed_lessons: 15,
        total_lessons: 24,
        average_grade: 78,
        last_active: "2026-05-13T09:15:00",
        status: "active",
        assignments_completed: 5,
        assignments_total: 10,
      },
      {
        id: "user3",
        name: "Carol Davis",
        email: "carol@example.com",
        enrolled_at: "2026-04-05T11:45:00",
        progress: 95,
        completed_lessons: 23,
        total_lessons: 24,
        average_grade: 96,
        last_active: "2026-05-14T18:20:00",
        status: "active",
        assignments_completed: 9,
        assignments_total: 10,
      },
      {
        id: "user4",
        name: "David Wilson",
        email: "david@example.com",
        enrolled_at: "2026-04-10T09:30:00",
        progress: 25,
        completed_lessons: 6,
        total_lessons: 24,
        average_grade: 65,
        last_active: "2026-05-10T14:00:00",
        status: "inactive",
        assignments_completed: 2,
        assignments_total: 10,
      },
      {
        id: "user5",
        name: "Emma Brown",
        email: "emma@example.com",
        enrolled_at: "2026-04-12T13:15:00",
        progress: 45,
        completed_lessons: 11,
        total_lessons: 24,
        average_grade: 82,
        last_active: "2026-05-12T11:30:00",
        status: "active",
        assignments_completed: 4,
        assignments_total: 10,
      },
    ];
    
    setStudents(mockStudents);
    
    // Calculate stats
    const activeStudents = mockStudents.filter(s => s.status === "active").length;
    const avgProgress = mockStudents.reduce((sum, s) => sum + s.progress, 0) / mockStudents.length;
    const avgGrade = mockStudents.reduce((sum, s) => sum + s.average_grade, 0) / mockStudents.length;
    const completionRate = (mockStudents.filter(s => s.progress >= 80).length / mockStudents.length) * 100;
    
    setStats({
      total_students: mockStudents.length,
      active_students: activeStudents,
      average_progress: Math.round(avgProgress),
      average_grade: Math.round(avgGrade),
      completion_rate: Math.round(completionRate),
    });
    
    setLoading(false);
  };

  const handleInviteStudent = async () => {
    if (!inviteData.email) {
      toast.error("Please enter an email address");
      return;
    }

    setInviting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success(`Invitation sent to ${inviteData.email}`);
    setShowInviteModal(false);
    setInviteData({ email: "", message: "", send_email: true });
    setInviting(false);
    
    // Refresh student list
    await fetchStudents();
  };

  const handleRemoveStudent = async () => {
    if (!selectedStudent) return;
    
    setRemoving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success(`${selectedStudent.name} has been removed from the course`);
    setShowRemoveConfirm(false);
    setSelectedStudent(null);
    setRemoving(false);
    
    // Refresh student list
    await fetchStudents();
  };

  const handleBulkRemove = async () => {
    if (selectedStudents.length === 0) return;
    
    if (!confirm(`Are you sure you want to remove ${selectedStudents.length} students from this course?`)) {
      return;
    }
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success(`${selectedStudents.length} students have been removed`);
    setSelectedStudents([]);
    setShowBulkActions(false);
    
    // Refresh student list
    await fetchStudents();
  };

  const handleSendReminder = async (student: Student) => {
    toast.success(`Reminder sent to ${student.name}`);
  };

  const handleMessageStudent = async (student: Student) => {
    router.push(`/messages?user=${student.id}`);
  };

  const handleViewProgress = (student: Student) => {
    router.push(`/courses/${courseId}/students/${student.id}/progress`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-400 bg-green-400/10";
      case "inactive":
        return "text-yellow-400 bg-yellow-400/10";
      case "blocked":
        return "text-red-400 bg-red-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "text-green-400";
    if (progress >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return "text-green-400";
    if (grade >= 70) return "text-yellow-400";
    return "text-red-400";
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || student.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleAllStudents = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  if (!isTeacher && !isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/courses/${courseId}`}
          className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Manage Students</h1>
            <p className="text-gray-400">
              {course?.title} • {stats?.total_students} students enrolled
            </p>
          </div>
          <div className="flex gap-3">
            <GlowButton onClick={() => setShowInviteModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Students
            </GlowButton>
            <GlowButton variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export List
            </GlowButton>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <GlowCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Students</p>
                <p className="text-2xl font-bold text-white">{stats?.total_students || 0}</p>
              </div>
              <Users className="w-8 h-8 text-purple-400 opacity-50" />
            </div>
          </div>
        </GlowCard>
        
        <GlowCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Students</p>
                <p className="text-2xl font-bold text-green-400">{stats?.active_students || 0}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </div>
        </GlowCard>
        
        <GlowCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg. Progress</p>
                <p className="text-2xl font-bold text-blue-400">{stats?.average_progress || 0}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400 opacity-50" />
            </div>
          </div>
        </GlowCard>
        
        <GlowCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg. Grade</p>
                <p className="text-2xl font-bold text-purple-400">{stats?.average_grade || 0}%</p>
              </div>
              <Award className="w-8 h-8 text-purple-400 opacity-50" />
            </div>
          </div>
        </GlowCard>
        
        <GlowCard>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Completion Rate</p>
                <p className="text-2xl font-bold text-green-400">{stats?.completion_rate || 0}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Filters and Search */}
      <GlowCard className="mb-6">
        <div className="p-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search students by name or email..."
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
            
            {selectedStudents.length > 0 && (
              <GlowButton variant="outline" onClick={handleBulkRemove}>
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Selected ({selectedStudents.length})
              </GlowButton>
            )}
          </div>
        </div>
      </GlowCard>

      {/* Students List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <GlowCard>
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No students found</h3>
              <p className="text-gray-400">
                {searchQuery || filterStatus !== "all"
                  ? "Try adjusting your search or filters"
                  : "No students are enrolled in this course yet"}
              </p>
              {!searchQuery && filterStatus === "all" && (
                <GlowButton onClick={() => setShowInviteModal(true)} className="mt-4">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Your First Student
                </GlowButton>
              )}
            </div>
          </GlowCard>
        ) : (
          <>
            {/* Student Cards */}
            {filteredStudents.map((student) => (
              <GlowCard key={student.id}>
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Selection Checkbox */}
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleStudentSelection(student.id)}
                        className="mt-1 w-4 h-4 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-500"
                      />
                      
                      {/* Student Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-white">
                            {student.name}
                          </h3>
                          <Badge className={getStatusColor(student.status)}>
                            {student.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm text-gray-400 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {student.email}
                          </p>
                          <p className="text-sm text-gray-400 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Enrolled: {new Date(student.enrolled_at).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-400 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Last Active: {new Date(student.last_active).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-1">Progress</p>
                        <p className={`text-xl font-bold ${getProgressColor(student.progress)}`}>
                          {student.progress}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {student.completed_lessons}/{student.total_lessons} lessons
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-1">Avg. Grade</p>
                        <p className={`text-xl font-bold ${getGradeColor(student.average_grade)}`}>
                          {student.average_grade}%
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-1">Assignments</p>
                        <p className="text-xl font-bold text-white">
                          {student.assignments_completed}/{student.assignments_total}
                        </p>
                        <p className="text-xs text-gray-500">completed</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="w-full bg-gray-800 rounded-full h-2 mb-1">
                          <div
                            className="bg-purple-500 h-2 rounded-full transition-all"
                            style={{ width: `${student.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400">Course Progress</p>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      <GlowButton
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendReminder(student)}
                      >
                        <Send className="w-4 h-4" />
                      </GlowButton>
                      <GlowButton
                        variant="outline"
                        size="sm"
                        onClick={() => handleMessageStudent(student)}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </GlowButton>
                      <GlowButton
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProgress(student)}
                      >
                        <BarChart3 className="w-4 h-4" />
                      </GlowButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <GlowButton variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </GlowButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewProgress(student)}
                            className="cursor-pointer"
                          >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Detailed Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleMessageStudent(student)}
                            className="cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Send Message
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSendReminder(student)}
                            className="cursor-pointer"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send Reminder
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowRemoveConfirm(true);
                            }}
                            className="cursor-pointer text-red-400"
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Remove from Course
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </GlowCard>
            ))}
          </>
        )}
      </div>

      {/* Invite Student Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Invite Students</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="student@example.com"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Separate multiple emails with commas
              </p>
            </div>
            
            <div>
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Welcome to the course! I'm excited to have you join..."
                value={inviteData.message}
                onChange={(e) => setInviteData({ ...inviteData, message: e.target.value })}
                rows={3}
                className="mt-1"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="send_email"
                checked={inviteData.send_email}
                onChange={(e) => setInviteData({ ...inviteData, send_email: e.target.checked })}
                className="rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-500"
              />
              <Label htmlFor="send_email" className="text-sm">
                Send email notification
              </Label>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-400">
                Students will receive an invitation to join this course. They'll need to accept the invitation to get started.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <GlowButton
              variant="outline"
              onClick={() => setShowInviteModal(false)}
            >
              Cancel
            </GlowButton>
            <GlowButton
              onClick={handleInviteStudent}
              isLoading={inviting}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Invitation
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Student Confirmation Modal */}
      <Dialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Remove Student</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-300">
              Are you sure you want to remove <span className="font-semibold text-white">{selectedStudent?.name}</span> from this course?
            </p>
            <p className="text-sm text-red-400 mt-2">
              This action cannot be undone. The student will lose access to all course materials and their progress will be deleted.
            </p>
          </div>
          
          <DialogFooter>
            <GlowButton
              variant="outline"
              onClick={() => setShowRemoveConfirm(false)}
            >
              Cancel
            </GlowButton>
            <GlowButton
              onClick={handleRemoveStudent}
              isLoading={removing}
              variant="outline"
              className="border-red-500 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Student
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}