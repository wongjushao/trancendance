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
  DialogDescription
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

// Helper to get auth token
const getAuthToken = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

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

interface Offering {
  id: number;
  name: string;
  status: string;
  max_students: number | null;
  start_date: string | null;
  end_date: string | null;
}

export default function CourseStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);
  const { roleData } = useRole();
  const isTeacher = roleData.role === "teacher" || roleData.role === "admin";
  const isAdmin = roleData.role === "admin";

  const [students, setStudents] = useState<Student[]>([]);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [enrollData, setEnrollData] = useState({
    email: "",
    offeringId: 0,
  });
  const [enrolling, setEnrolling] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [courseOfferings, setCourseOfferings] = useState<Offering[]>([]);
  const [loadingOfferings, setLoadingOfferings] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Get auth token on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = await getAuthToken();
      setAccessToken(token);
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (!isTeacher && !isAdmin) {
      toast.error("You don't have permission to view this page");
      router.push(`/courses/${courseId}`);
      return;
    }
    if (accessToken) {
      fetchCourseData();
      fetchStudents();
      fetchCourseOfferings();
    }
  }, [courseId, accessToken]);

  const fetchCourseOfferings = async () => {
    if (!accessToken) return;
    
    setLoadingOfferings(true);
    
    try {
      const response = await fetch(`/api/org-service/courses/${courseId}/detail`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const offerings = data.course_classes || [];
        const activeOfferings = offerings.filter((o: any) => 
          o.status === 'upcoming' || o.status === 'ongoing'
        );
        
        setCourseOfferings(activeOfferings);
        
        // Auto-select first offering if available
        if (activeOfferings.length > 0 && enrollData.offeringId === 0) {
          setEnrollData(prev => ({ ...prev, offeringId: activeOfferings[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching course offerings:', error);
    } finally {
      setLoadingOfferings(false);
    }
  };

  const fetchCourseData = async () => {
    if (!accessToken) return;
    
    try {
      const response = await fetch(`/api/org-service/courses/${courseId}/detail`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch course');
      
      const data = await response.json();
      const courseData = data.course;
      
      // Get instructor name
      let instructorName = "Unknown Instructor";
      if (courseData.instructor_id) {
        const profileResponse = await fetch(`/api/auth-service/profile/public/${courseData.instructor_id}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          instructorName = profile.first_name 
            ? `${profile.first_name} ${profile.last_name || ''}`.trim()
            : profile.username || instructorName;
        }
      }
      
      // Count total lessons from modules
      let totalLessons = 0;
      const modules = data.modules || [];
      for (const module of modules) {
        for (const classItem of module.classes || []) {
          totalLessons += (classItem.lessons || []).length;
        }
      }
      
      setCourse({
        id: courseData.id,
        title: courseData.title,
        description: courseData.description || '',
        instructor: instructorName,
        total_students: courseData.students_count || 0,
        total_lessons: totalLessons,
        average_progress: 0,
        completion_rate: 0,
      });
    } catch (error) {
      console.error('Error fetching course data:', error);
      toast.error('Failed to load course data');
    }
  };

  const fetchStudents = async () => {
    if (!accessToken) return;
    
    setLoading(true);

    try {
      // First, get all offerings for this course
      const courseResponse = await fetch(`/api/org-service/courses/${courseId}/detail`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!courseResponse.ok) throw new Error('Failed to fetch course');
      
      const courseData = await courseResponse.json();
      const offerings = courseData.course_classes || [];
      const offeringIds = offerings.map((o: any) => o.id);
      
      if (offeringIds.length === 0) {
        setStudents([]);
        setStats({
          total_students: 0,
          active_students: 0,
          average_progress: 0,
          average_grade: 0,
          completion_rate: 0,
        });
        setLoading(false);
        return;
      }
      
      // Fetch students for each offering
      let allStudents: any[] = [];
      let emailMap: Record<string, string> = {};
      let userIds: string[] = [];
      
      for (const offeringId of offeringIds) {
        const studentsResponse = await fetch(`/api/org-service/course-classes/${offeringId}/students`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (studentsResponse.ok) {
          const data = await studentsResponse.json();
          const newStudents = data.students || [];
          allStudents = [...allStudents, ...newStudents];
          
          // Collect user IDs for email fetching
          for (const student of newStudents) {
            if (student.user_id && !userIds.includes(student.user_id)) {
              userIds.push(student.user_id);
            }
          }
        }
      }
      
      // Fetch emails for all students
      if (userIds.length > 0) {
        try {
          const emailResponse = await fetch('/api/org-service/users/batch-emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ user_ids: userIds }),
          });
          
          if (emailResponse.ok) {
            const emailData = await emailResponse.json();
            emailMap = emailData.users || {};
          }
        } catch (emailError) {
          console.error('Error fetching emails:', emailError);
        }
      }
      
      // Get total lessons from course modules
      const modules = courseData.modules || [];
      let totalLessons = 0;
      for (const module of modules) {
        for (const classItem of module.classes || []) {
          totalLessons += (classItem.lessons || []).length;
        }
      }
      
      // Get assignments for this course
      const assignments = courseData.assignments || [];
      const assignmentIds = assignments.map((a: any) => a.id);
      
      // Get submissions for all assignments (batch)
      let submissionsByStudent: Record<string, { grade: number; count: number }> = {};
      
      if (assignmentIds.length > 0) {
        for (const student of allStudents) {
          submissionsByStudent[student.user_id] = { grade: 0, count: 0 };
        }
        
        for (const assignmentId of assignmentIds) {
          const submissionsResponse = await fetch(`/api/org-service/assignments/${assignmentId}/submissions`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          
          if (submissionsResponse.ok) {
            const data = await submissionsResponse.json();
            const submissions = data.submissions || [];
            
            for (const sub of submissions) {
              if (submissionsByStudent[sub.user_id]) {
                submissionsByStudent[sub.user_id].grade += sub.grade || 0;
                submissionsByStudent[sub.user_id].count++;
              }
            }
          }
        }
      }
      
      // Build student list
      const studentList: Student[] = allStudents.map((student: any) => {
        const userSubmissions = submissionsByStudent[student.user_id] || { grade: 0, count: 0 };
        const avgGrade = userSubmissions.count > 0 
          ? Math.round(userSubmissions.grade / userSubmissions.count)
          : 0;
        
        const displayName = student.user?.first_name 
          ? `${student.user.first_name || ''} ${student.user.last_name || ''}`.trim()
          : student.user?.username || 'Unknown';
        
        // Get progress from student data (if available)
        const progress = student.progress || 0;
        const completedLessons = Math.round((progress / 100) * totalLessons);
        
        return {
          id: student.user_id,
          name: displayName,
          email: emailMap[student.user_id] || student.user?.email || '',
          avatar: student.user?.avatar_url,
          enrolled_at: student.enrolled_at,
          progress: progress,
          completed_lessons: completedLessons,
          total_lessons: totalLessons,
          average_grade: avgGrade,
          last_active: student.enrolled_at,
          status: "active",
          assignments_completed: userSubmissions.count,
          assignments_total: assignmentIds.length,
        };
      });
      
      // Sort by enrollment date
      studentList.sort((a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime());
      
      setStudents(studentList);
      
      // Calculate stats
      const activeStudents = studentList.filter(s => s.status === "active").length;
      const avgProgress = studentList.length > 0 
        ? Math.round(studentList.reduce((sum, s) => sum + s.progress, 0) / studentList.length)
        : 0;
      const avgGrade = studentList.length > 0
        ? Math.round(studentList.reduce((sum, s) => sum + s.average_grade, 0) / studentList.length)
        : 0;
      const completionRate = studentList.length > 0
        ? Math.round((studentList.filter(s => s.progress >= 80).length / studentList.length) * 100)
        : 0;
      
      setStats({
        total_students: studentList.length,
        active_students: activeStudents,
        average_progress: avgProgress,
        average_grade: avgGrade,
        completion_rate: completionRate,
      });
      
      setCourse(prev => prev ? {
        ...prev,
        total_students: studentList.length,
        average_progress: avgProgress,
        completion_rate: completionRate,
      } : null);
      
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollStudent = async () => {
    if (!enrollData.email) {
      toast.error("Please enter an email address");
      return;
    }
    
    if (!accessToken) {
      toast.error("Please log in");
      return;
    }

    setEnrolling(true);

    try {
      const response = await fetch('/api/org-service/users/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: enrollData.email.trim(),
          course_class_id: enrollData.offeringId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to enroll student");
      }

      if (data.success) {
        if (data.user?.added_to_organization) {
          toast.success(`${data.user.first_name || data.user.username || data.user.email} has been added to the organization and enrolled in the course!`);
        } else {
          toast.success(data.message);
        }
        
        await fetchStudents();
        setShowEnrollModal(false);
        setEnrollData({ email: "", offeringId: courseOfferings[0]?.id || 0 });
      } else {
        throw new Error(data.error || "Failed to enroll student");
      }

    } catch (error: any) {
      console.error('Error enrolling student:', error);
      toast.error(error.message || "Failed to enroll student. Please try again.");
    } finally {
      setEnrolling(false);
    }
  };

  const handleRemoveStudent = async () => {
    if (!selectedStudent) return;
    if (!accessToken) return;
    
    setRemoving(true);

    try {
      // Get offerings for this course
      const courseResponse = await fetch(`/api/org-service/courses/${courseId}/detail`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!courseResponse.ok) throw new Error('Failed to fetch course');
      
      const courseData = await courseResponse.json();
      const offerings = courseData.course_classes || [];
      const offeringIds = offerings.map((o: any) => o.id);
      
      // Remove student from each offering (backend handles cascade)
      for (const offeringId of offeringIds) {
        const response = await fetch(`/api/org-service/course-classes/${offeringId}/students/${selectedStudent.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        
        if (!response.ok) {
          console.error(`Failed to remove from offering ${offeringId}`);
        }
      }

      toast.success(`${selectedStudent.name} has been removed from the course`);
      setShowRemoveConfirm(false);
      setSelectedStudent(null);
      
      await fetchStudents();
      
    } catch (error) {
      console.error('Error removing student:', error);
      toast.error('Failed to remove student');
    } finally {
      setRemoving(false);
    }
  };

  const handleBulkRemove = async () => {
    if (selectedStudents.length === 0) return;
    
    if (!confirm(`Are you sure you want to remove ${selectedStudents.length} students from this course?`)) {
      return;
    }
    
    if (!accessToken) return;

    try {
      // Get offerings for this course
      const courseResponse = await fetch(`/api/org-service/courses/${courseId}/detail`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!courseResponse.ok) throw new Error('Failed to fetch course');
      
      const courseData = await courseResponse.json();
      const offerings = courseData.course_classes || [];
      const offeringIds = offerings.map((o: any) => o.id);
      
      // Remove each student from each offering
      for (const studentId of selectedStudents) {
        for (const offeringId of offeringIds) {
          await fetch(`/api/org-service/course-classes/${offeringId}/students/${studentId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }).catch(err => console.error(`Failed to remove student ${studentId}:`, err));
        }
      }

      toast.success(`${selectedStudents.length} students have been removed`);
      setSelectedStudents([]);
      
      await fetchStudents();
      
    } catch (error) {
      console.error('Error bulk removing students:', error);
      toast.error('Failed to remove students');
    }
  };

  const handleSendReminder = async (student: Student) => {
    toast.info(`Reminder functionality would send an email to ${student.email}. This requires email service integration.`);
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
            <GlowButton onClick={() => setShowEnrollModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Enroll Student
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
            <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
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
                <GlowButton onClick={() => setShowEnrollModal(true)} className="mt-4">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Enroll Your First Student
                </GlowButton>
              )}
            </div>
          </GlowCard>
        ) : (
          filteredStudents.map((student) => (
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
                      title="Send reminder email"
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
          ))
        )}
      </div>

      {/* Enroll Student Modal */}
      <Dialog open={showEnrollModal} onOpenChange={setShowEnrollModal}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Enroll Student</DialogTitle>
            <DialogDescription>
              Enter the student's email address to enroll them in this course.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="email">Student Email <span className="text-red-400">*</span></Label>
              <Input
                id="email"
                type="email"
                placeholder="student@example.com"
                value={enrollData.email}
                onChange={(e) => setEnrollData({ ...enrollData, email: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Enter the student's email address. They will be automatically added to the organization if needed.
              </p>
            </div>

            <div>
              <Label htmlFor="offering">Course Offering <span className="text-red-400">*</span></Label>
              <Select
                value={enrollData.offeringId.toString()}
                onValueChange={(value) => setEnrollData({ ...enrollData, offeringId: parseInt(value) })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select offering" />
                </SelectTrigger>
                <SelectContent>
                  {courseOfferings.map((offering) => (
                    <SelectItem key={offering.id} value={offering.id.toString()}>
                      {offering.name} ({offering.status})
                      {offering.max_students && ` - Max: ${offering.max_students}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {courseOfferings.length === 0 && !loadingOfferings && (
                <p className="text-xs text-yellow-400 mt-1">
                  No active course offerings available. Please create an offering first.
                </p>
              )}
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-400">
                The student will be:
              </p>
              <ul className="text-xs text-blue-300 mt-2 space-y-1 list-disc list-inside">
                <li>Automatically added to the organization (if not already a member)</li>
                <li>Enrolled in the selected course offering</li>
                <li>Notified by email (if email service is configured)</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <GlowButton
              variant="outline"
              onClick={() => {
                setShowEnrollModal(false);
                setEnrollData({ email: "", offeringId: courseOfferings[0]?.id || 0 });
              }}
            >
              Cancel
            </GlowButton>
            <GlowButton
              onClick={handleEnrollStudent}
              isLoading={enrolling}
              disabled={courseOfferings.length === 0 || !enrollData.email}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Enroll Student
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Student Confirmation Modal */}
      <Dialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Remove Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this student from the course?
            </DialogDescription>
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