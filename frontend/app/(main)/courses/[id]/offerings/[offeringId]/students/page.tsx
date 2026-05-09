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
import { Database } from "@/types/supabase";
import { addUserToOrganization } from '@/lib/supabase/organization';

type ClassMember = Database['public']['Tables']['class_members']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type LessonProgress = Database['public']['Tables']['lesson_progress']['Row'];
type Assignment = Database['public']['Tables']['assignments']['Row'];
type Submission = Database['public']['Tables']['submissions']['Row'];
type CourseClass = Database['public']['Tables']['course_classes']['Row'];
type Course = Database['public']['Tables']['courses']['Row'];

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

interface EnrollStudentData {
  email: string;
  offeringId: number;
}

export default function CourseStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
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
  const [enrollData, setEnrollData] = useState<EnrollStudentData>({
    email: "",
    offeringId: 0,
  });
  const [enrolling, setEnrolling] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [courseOfferings, setCourseOfferings] = useState<CourseClass[]>([]);
  const [loadingOfferings, setLoadingOfferings] = useState(false);

  useEffect(() => {
    if (!isTeacher && !isAdmin) {
      toast.error("You don't have permission to view this page");
      router.push(`/courses/${courseId}`);
      return;
    }
    fetchCourseData();
    fetchStudents();
    fetchCourseOfferings();
  }, [courseId]);

  const fetchCourseOfferings = async () => {
    const supabase = getSupabaseBrowserClient();
    setLoadingOfferings(true);
    
    try {
      const { data, error } = await supabase
        .from('course_classes')
        .select('id, name, status, max_students, start_date, end_date')
        .eq('course_id', parseInt(courseId))
        .in('status', ['upcoming', 'ongoing'])
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      setCourseOfferings(data || []);
      
      // Auto-select first offering if available
      if (data && data.length > 0 && enrollData.offeringId === 0) {
        setEnrollData(prev => ({ ...prev, offeringId: data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching course offerings:', error);
    } finally {
      setLoadingOfferings(false);
    }
  };

  const fetchCourseData = async () => {
    const supabase = getSupabaseBrowserClient();
    
    try {
      // Get course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          created_by,
          profiles:created_by (
            first_name,
            last_name
          )
        `)
        .eq('id', parseInt(courseId))
        .single();

      if (courseError) throw courseError;

      // Get instructor name
      const instructorName = courseData.profiles 
        ? `${courseData.profiles.first_name || ''} ${courseData.profiles.last_name || ''}`.trim() || 'Unknown Instructor'
        : 'Unknown Instructor';

      // Get course classes for this course
      const { data: courseClasses, error: classesError } = await supabase
        .from('course_classes')
        .select('id')
        .eq('course_id', parseInt(courseId));

      if (classesError) throw classesError;

      const courseClassIds = courseClasses?.map(cc => cc.id) || [];

      // Get total lessons count
      let totalLessons = 0;
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select(`
          id,
          classes (
            id,
            lessons (id)
          )
        `)
        .eq('course_id', parseInt(courseId));

      if (!modulesError && modules) {
        for (const module of modules) {
          if (module.classes) {
            for (const classItem of module.classes) {
              if (classItem.lessons) {
                totalLessons += classItem.lessons.length;
              }
            }
          }
        }
      }

      // Get total students count
      let totalStudents = 0;
      if (courseClassIds.length > 0) {
        const { count, error: countError } = await supabase
          .from('class_members')
          .select('*', { count: 'exact', head: true })
          .in('course_class_id', courseClassIds);

        if (!countError) {
          totalStudents = count || 0;
        }
      }

      setCourse({
        id: parseInt(courseId),
        title: courseData.title,
        description: courseData.description || '',
        instructor: instructorName,
        total_students: totalStudents,
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
    const supabase = getSupabaseBrowserClient();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: courseClasses, error: classesError } = await supabase
        .from('course_classes')
        .select('id')
        .eq('course_id', parseInt(courseId));

      if (classesError) throw classesError;

      const courseClassIds = courseClasses?.map(cc => cc.id) || [];

      if (courseClassIds.length === 0) {
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

      const { data: classMembers, error: membersError } = await supabase
        .from('class_members')
        .select(`
          id,
          user_id,
          enrolled_at,
          role,
          profiles:user_id (
            id,
            first_name,
            last_name,
            username,
            avatar_url
          )
        `)
        .in('course_class_id', courseClassIds)
        .eq('role', 'student');

      if (membersError) throw membersError;

      if (!classMembers || classMembers.length === 0) {
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

      // Get all lessons for this course
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select(`
          id,
          classes (
            id,
            lessons (id)
          )
        `)
        .eq('course_id', parseInt(courseId));

      let totalLessons = 0;
      const lessonIds: number[] = [];
      
      if (!modulesError && modules) {
        for (const module of modules) {
          if (module.classes) {
            for (const classItem of module.classes) {
              if (classItem.lessons) {
                for (const lesson of classItem.lessons) {
                  totalLessons++;
                  lessonIds.push(lesson.id);
                }
              }
            }
          }
        }
      }

      // Get all assignments for this course
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id, points')
        .eq('course_id', parseInt(courseId));

      const assignmentIds = assignments?.map(a => a.id) || [];

      // Get all submissions for these assignments
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select('assignment_id, user_id, grade')
        .in('assignment_id', assignmentIds);

      const submissionsByUser: Record<string, { grade: number; assignment_id: number }[]> = {};
      if (submissions && !submissionsError) {
        for (const sub of submissions) {
          if (!submissionsByUser[sub.user_id]) {
            submissionsByUser[sub.user_id] = [];
          }
          submissionsByUser[sub.user_id].push({
            grade: sub.grade || 0,
            assignment_id: sub.assignment_id,
          });
        }
      }

      // Get lesson progress for all students
      const userIds = classMembers.map(cm => cm.user_id);
      const { data: lessonProgress, error: progressError } = await supabase
        .from('lesson_progress')
        .select('user_id, lesson_id, status')
        .in('user_id', userIds)
        .in('lesson_id', lessonIds);

      const progressByUser: Record<string, { completed: number; total: number }> = {};
      for (const userId of userIds) {
        progressByUser[userId] = { completed: 0, total: totalLessons };
      }

      if (lessonProgress && !progressError) {
        for (const prog of lessonProgress) {
          if (prog.status === 'completed') {
            progressByUser[prog.user_id].completed++;
          }
        }
      }

      // NEW: Fetch real emails from backend
      const { data: { session } } = await supabase.auth.getSession();
      let emailMap: Record<string, string> = {};
      
      try {
        const emailResponse = await fetch('/api/org/users/batch-emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
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

      // Build student list with real emails
      const studentList: Student[] = classMembers.map(cm => {
        const profile = cm.profiles as unknown as Profile;
        const progress = progressByUser[cm.user_id] || { completed: 0, total: totalLessons };
        const progressPercent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
        
        const userSubmissions = submissionsByUser[cm.user_id] || [];
        const avgGrade = userSubmissions.length > 0
          ? Math.round(userSubmissions.reduce((sum, s) => sum + s.grade, 0) / userSubmissions.length)
          : 0;

        const displayName = profile?.first_name 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
          : profile?.username || 'Unknown';

        // Use real email from auth.users, fallback to username
        const userEmail = emailMap[cm.user_id] || profile?.username || '';

        return {
          id: cm.user_id,
          name: displayName,
          email: userEmail,  // Now this will be the full email!
          avatar: profile?.avatar_url || undefined,
          enrolled_at: cm.enrolled_at,
          progress: progressPercent,
          completed_lessons: progress.completed,
          total_lessons: progress.total,
          average_grade: avgGrade,
          last_active: cm.enrolled_at,
          status: "active",
          assignments_completed: userSubmissions.length,
          assignments_total: assignmentIds.length,
        };
      });

      studentList.sort((a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime());

      setStudents(studentList);

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

  // Replace the handleEnrollStudent function with this:
  const handleEnrollStudent = async () => {
    if (!enrollData.email) {
      toast.error("Please enter an email address");
      return;
    }

    setEnrolling(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in");
        return;
      }

      // First, find the user by email via backend
      const response = await fetch('/api/org-service/users/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
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
        // The backend handles adding to organization automatically
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
    
    setRemoving(true);
    const supabase = getSupabaseBrowserClient();

    try {
      // Get course classes for this course
      const { data: courseClasses, error: classesError } = await supabase
        .from('course_classes')
        .select('id')
        .eq('course_id', parseInt(courseId));

      if (classesError) throw classesError;

      const courseClassIds = courseClasses?.map(cc => cc.id) || [];

      // Delete class members records
      const { error: deleteError } = await supabase
        .from('class_members')
        .delete()
        .in('course_class_id', courseClassIds)
        .eq('user_id', selectedStudent.id);

      if (deleteError) throw deleteError;

      toast.success(`${selectedStudent.name} has been removed from the course`);
      setShowRemoveConfirm(false);
      setSelectedStudent(null);
      
      // Refresh student list
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
    
    const supabase = getSupabaseBrowserClient();

    try {
      // Get course classes for this course
      const { data: courseClasses, error: classesError } = await supabase
        .from('course_classes')
        .select('id')
        .eq('course_id', parseInt(courseId));

      if (classesError) throw classesError;

      const courseClassIds = courseClasses?.map(cc => cc.id) || [];

      // Delete class members records for all selected students
      const { error: deleteError } = await supabase
        .from('class_members')
        .delete()
        .in('course_class_id', courseClassIds)
        .in('user_id', selectedStudents);

      if (deleteError) throw deleteError;

      toast.success(`${selectedStudents.length} students have been removed`);
      setSelectedStudents([]);
      setShowBulkActions(false);
      
      // Refresh student list
      await fetchStudents();
      
    } catch (error) {
      console.error('Error bulk removing students:', error);
      toast.error('Failed to remove students');
    }
  };

  const handleSendReminder = async (student: Student) => {
    // This would integrate with a real email service in production
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
                <GlowButton onClick={() => setShowEnrollModal(true)} className="mt-4">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Enroll Your First Student
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
            ))}
          </>
        )}
      </div>

      {/* Enroll Student Modal */}
      <Dialog open={showEnrollModal} onOpenChange={setShowEnrollModal}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Enroll Student</DialogTitle>
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