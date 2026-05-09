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
  ChevronRight,
  BookOpen,
  Download,
  Star,
  Upload,
  X,
  Loader2,
  Send,
  Eye,
  Users,
  Plus,
  Edit,
  Trash2,
  Filter,
  MessageSquare,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useRole } from "@/components/providers/RoleProvider";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

// ============ TYPES ============

interface StudentAssignment {
  id: number;
  title: string;
  description: string;
  course_id: number;
  course_title: string;
  lesson_id: number;
  lesson_title: string;
  due_at: string;
  points: number;
  status: "pending" | "submitted" | "graded" | "overdue";
  submitted_at?: string;
  grade?: number;
  feedback?: string;
  submission_id?: number;
  content_url?: string;
  text_content?: string;
}

interface TeacherAssignment {
  id: number;
  title: string;
  description: string;
  course_id: number;
  course_title: string;
  lesson_id: number;
  lesson_title: string;
  due_at: string;
  points: number;
  status: "pending" | "overdue";
  total_submissions: number;
  graded_count: number;
  pending_count: number;
  average_grade: number;
}

interface Submission {
  id: number;
  assignment_id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  content_url: string | null;
  text_content: string | null;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  status: "submitted" | "graded";
}

interface Course {
  id: number;
  title: string;
}

interface Lesson {
  id: number;
  title: string;
  class_id: number;
  class_title?: string;
}

// ============ MAIN COMPONENT ============

export default function AssignmentsPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const { roleData } = useRole();
  
  // Check if user has teacher or admin capabilities
  const canTeach = roleData.role === "teacher" || roleData.role === "admin";
  
  // State
  const [activeTab, setActiveTab] = useState<"learning" | "teaching">("learning");
  const [loading, setLoading] = useState(true);
  
  // Student view state
  const [studentAssignments, setStudentAssignments] = useState<StudentAssignment[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentFilterStatus, setStudentFilterStatus] = useState<string>("all");
  const [studentFilterCourse, setStudentFilterCourse] = useState<string>("all");
  const [studentCourses, setStudentCourses] = useState<{ id: number; title: string }[]>([]);
  
  // Teacher view state
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [teacherCourses, setTeacherCourses] = useState<Course[]>([]);
  const [teacherLessons, setTeacherLessons] = useState<Lesson[]>([]);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [teacherFilterCourse, setTeacherFilterCourse] = useState<string>("all");
  
  // Assignment modal state (teacher)
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<TeacherAssignment | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    course_id: "",
    lesson_id: "",
    due_at: "",
    points: 100,
  });
  const [savingAssignment, setSavingAssignment] = useState(false);
  
  // Submission modal state (student)
  const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignment | null>(null);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
  const [showResubmit, setShowResubmit] = useState(false);
  
  // Grading panel state (teacher)
  const [gradingPanelOpen, setGradingPanelOpen] = useState(false);
  const [selectedTeacherAssignment, setSelectedTeacherAssignment] = useState<TeacherAssignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradeValue, setGradeValue] = useState<number>(0);
  const [feedbackValue, setFeedbackValue] = useState("");
  const [submittingGrade, setSubmittingGrade] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  
  // Results modal state (student)
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultAssignment, setResultAssignment] = useState<StudentAssignment | null>(null);
  
  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<TeacherAssignment | null>(null);
  
  // Load lessons when course changes (teacher form)
  useEffect(() => {
    if (assignmentForm.course_id && assignmentModalOpen) {
      fetchLessonsForCourse(parseInt(assignmentForm.course_id));
    } else {
      setTeacherLessons([]);
    }
  }, [assignmentForm.course_id, assignmentModalOpen]);
  
  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "learning") {
      fetchStudentAssignments();
    } else if (activeTab === "teaching" && canTeach) {
      fetchTeacherAssignments();
    }
  }, [activeTab]);
  
  // ============ STUDENT FUNCTIONS ============
  
  const fetchStudentAssignments = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      // Get all class members for the user (enrolled courses via offerings)
      const { data: classMembers } = await supabase
        .from("class_members")
        .select(`
          id,
          course_class_id,
          course_classes!inner (
            id,
            course_id,
            courses!inner (
              id,
              title
            )
          )
        `)
        .eq("user_id", user.id);
      
      if (!classMembers || classMembers.length === 0) {
        setStudentAssignments([]);
        setLoading(false);
        return;
      }
      
      // Get all unique course IDs
      const courseIds = [...new Set(
        classMembers
          .map(cm => cm.course_classes?.courses?.id)
          .filter(id => id != null)
      )];
      
      if (courseIds.length === 0) {
        setStudentAssignments([]);
        setLoading(false);
        return;
      }
      
      // Get all assignments for these courses
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select(`
          *,
          lesson:lesson_id (
            id,
            title,
            class:class_id (
              id,
              title,
              module:module_id (
                id,
                title,
                course:course_id (
                  id,
                  title
                )
              )
            )
          )
        `)
        .in("course_id", courseIds);
      
      if (assignmentsError) throw assignmentsError;
      
      // Get submissions for these assignments
      const assignmentIds = assignmentsData?.map(a => a.id) || [];
      let submissionsMap = new Map<number, Submission>();

      if (assignmentIds.length > 0) {
        // Get user's submissions for all assignments in one query
        const { data: submissionsData, error: subError } = await supabase
          .from("submissions")
          .select(`
            id,
            assignment_id,
            grade,
            feedback,
            submitted_at,
            content_url,
            text_content
          `)
          .in("assignment_id", assignmentIds)
          .eq("user_id", user.id);
        
        if (subError) {
          console.error("Error fetching submissions:", subError);
        } else {
          submissionsData?.forEach(sub => {
            submissionsMap.set(sub.assignment_id, sub);
          });
        }
      }
      
      // Format assignments with status
      const formattedAssignments: StudentAssignment[] = (assignmentsData || []).map(assignment => {
        const submission = submissionsMap.get(assignment.id);
        const dueDate = new Date(assignment.due_at);
        const now = new Date();
        let status: StudentAssignment["status"] = "pending";
        
        if (submission) {
          if (submission.grade !== null) {
            status = "graded";
          } else {
            status = "submitted";
          }
        } else if (dueDate < now) {
          status = "overdue";
        }
        
        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description || "",
          course_id: assignment.lesson?.class?.module?.course?.id || assignment.course_id,
          course_title: assignment.lesson?.class?.module?.course?.title || "Unknown Course",
          lesson_id: assignment.lesson_id || 0,
          lesson_title: assignment.lesson?.title || "Unknown Lesson",
          due_at: assignment.due_at,
          points: assignment.points,
          status,
          submitted_at: submission?.submitted_at,
          grade: submission?.grade,
          feedback: submission?.feedback,
          submission_id: submission?.id,
          content_url: submission?.content_url,
          text_content: submission?.text_content,
        };
      });
      
      setStudentAssignments(formattedAssignments);
      
      // Get unique courses for filter
      const uniqueCourses = Array.from(
        new Map(formattedAssignments.map(a => [a.course_id, { id: a.course_id, title: a.course_title }])).values()
      );
      setStudentCourses(uniqueCourses);
      
    } catch (error) {
      console.error("Error fetching student assignments:", error);
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };
  
  // ============ TEACHER FUNCTIONS ============
  
  const fetchTeacherAssignments = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      // Get courses where user is instructor (via course_classes)
      const { data: courseClasses } = await supabase
        .from("course_classes")
        .select(`
          course_id,
          courses:course_id (
            id,
            title
          )
        `)
        .eq("instructor_id", user.id);
      
      const uniqueCourses = new Map<number, Course>();
      courseClasses?.forEach(cc => {
        if (cc.courses && !uniqueCourses.has(cc.courses.id)) {
          uniqueCourses.set(cc.courses.id, {
            id: cc.courses.id,
            title: cc.courses.title,
          });
        }
      });
      
      // Also check courses created by user
      const { data: createdCourses } = await supabase
        .from("courses")
        .select("id, title")
        .eq("created_by", user.id);
      
      createdCourses?.forEach(course => {
        if (!uniqueCourses.has(course.id)) {
          uniqueCourses.set(course.id, course);
        }
      });
      
      const courseList = Array.from(uniqueCourses.values());
      setTeacherCourses(courseList);
      
      if (courseList.length === 0) {
        setTeacherAssignments([]);
        setLoading(false);
        return;
      }
      
      const courseIds = courseList.map(c => c.id);
      
      // --- OPTIMIZATION: Get ALL assignments in one query ---
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select(`
          *,
          lesson:lesson_id (
            id,
            title,
            class:class_id (
              id,
              title
            )
          ),
          course:courses!course_id (
            id,
            title
          )
        `)
        .in("course_id", courseIds);
      
      if (assignmentsError) throw assignmentsError;
      
      if (!assignmentsData || assignmentsData.length === 0) {
        setTeacherAssignments([]);
        setLoading(false);
        return;
      }
      
      const assignmentIds = assignmentsData.map(a => a.id);
      
      // --- OPTIMIZATION: Get ALL submissions for ALL assignments in ONE query ---
      const { data: allSubmissions, error: submissionsError } = await supabase
        .from("submissions")
        .select("assignment_id, id, grade")
        .in("assignment_id", assignmentIds);
      
      if (submissionsError) {
        console.error("Error fetching submissions:", submissionsError);
      }
      
      // Build stats maps from the single query result
      const submissionsByAssignment = new Map<number, { total: number; graded: number; gradeSum: number }>();
      
      // Initialize map for all assignments
      assignmentIds.forEach(id => {
        submissionsByAssignment.set(id, { total: 0, graded: 0, gradeSum: 0 });
      });
      
      // Process all submissions in one pass
      allSubmissions?.forEach((sub: any) => {
        const stats = submissionsByAssignment.get(sub.assignment_id);
        if (stats) {
          stats.total++;
          if (sub.grade !== null) {
            stats.graded++;
            stats.gradeSum += sub.grade;
          }
        }
      });
      
      // Build teacher assignments using the pre-processed stats
      const assignmentsWithStats: TeacherAssignment[] = assignmentsData.map(assignment => {
        const stats = submissionsByAssignment.get(assignment.id) || { total: 0, graded: 0, gradeSum: 0 };
        const pendingCount = stats.total - stats.graded;
        const avgGrade = stats.graded > 0 ? stats.gradeSum / stats.graded : 0;
        
        const dueDate = new Date(assignment.due_at);
        const now = new Date();
        const status = dueDate < now ? "overdue" : "pending";
        
        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description || "",
          course_id: assignment.course_id,
          course_title: assignment.course?.title || "Unknown Course",
          lesson_id: assignment.lesson_id || 0,
          lesson_title: assignment.lesson?.title || "Unknown Lesson",
          due_at: assignment.due_at,
          points: assignment.points,
          status,
          total_submissions: stats.total,
          graded_count: stats.graded,
          pending_count: pendingCount,
          average_grade: Math.round(avgGrade),
        };
      });
      
      setTeacherAssignments(assignmentsWithStats);
      
    } catch (error) {
      console.error("Error fetching teacher assignments:", error);
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLessonsForCourse = async (courseId: number) => {
    try {
      const { data: modules } = await supabase
        .from("modules")
        .select(`
          id,
          classes!inner (
            id,
            title,
            lessons!inner (
              id,
              title
            )
          )
        `)
        .eq("course_id", courseId);
      
      const lessonList: Lesson[] = [];
      modules?.forEach(module => {
        module.classes?.forEach(classItem => {
          classItem.lessons?.forEach(lesson => {
            lessonList.push({
              id: lesson.id,
              title: lesson.title,
              class_id: classItem.id,
              class_title: classItem.title,
            });
          });
        });
      });
      
      setTeacherLessons(lessonList);
    } catch (error) {
      console.error("Error fetching lessons:", error);
    }
  };
  
  const handleCreateAssignment = () => {
    setEditingAssignment(null);
    setAssignmentForm({
      title: "",
      description: "",
      course_id: teacherCourses[0]?.id.toString() || "",
      lesson_id: "",
      due_at: "",
      points: 100,
    });
    setAssignmentModalOpen(true);
  };
  
  const handleEditAssignment = (assignment: TeacherAssignment) => {
    setEditingAssignment(assignment);
    setAssignmentForm({
      title: assignment.title,
      description: assignment.description,
      course_id: assignment.course_id.toString(),
      lesson_id: assignment.lesson_id.toString(),
      due_at: assignment.due_at?.split(".")[0] || "",
      points: assignment.points,
    });
    setAssignmentModalOpen(true);
  };
  
  const saveAssignment = async () => {
    if (!assignmentForm.title.trim()) {
      toast.error("Please enter an assignment title");
      return;
    }
    if (!assignmentForm.course_id) {
      toast.error("Please select a course");
      return;
    }
    
    setSavingAssignment(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const assignmentData = {
        title: assignmentForm.title.trim(),
        description: assignmentForm.description.trim() || null,
        course_id: parseInt(assignmentForm.course_id),
        lesson_id: assignmentForm.lesson_id ? parseInt(assignmentForm.lesson_id) : null,
        due_at: assignmentForm.due_at || null,
        points: assignmentForm.points,
      };
      
      if (editingAssignment) {
        const { error } = await supabase
          .from("assignments")
          .update(assignmentData)
          .eq("id", editingAssignment.id);
        
        if (error) throw error;
        toast.success("Assignment updated successfully");
      } else {
        const { error } = await supabase
          .from("assignments")
          .insert(assignmentData);
        
        if (error) throw error;
        toast.success("Assignment created successfully");
      }
      
      setAssignmentModalOpen(false);
      await fetchTeacherAssignments();
      await fetchStudentAssignments();
      
    } catch (error) {
      console.error("Error saving assignment:", error);
      toast.error("Failed to save assignment");
    } finally {
      setSavingAssignment(false);
    }
  };
  
  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    
    try {
      // Delete submissions first
      const { error: submissionsError } = await supabase
        .from("submissions")
        .delete()
        .eq("assignment_id", assignmentToDelete.id);
      
      if (submissionsError && submissionsError.code !== "PGRST116") {
        throw submissionsError;
      }
      
      // Delete assignment
      const { error } = await supabase
        .from("assignments")
        .delete()
        .eq("id", assignmentToDelete.id);
      
      if (error) throw error;
      
      toast.success("Assignment deleted successfully");
      setDeleteConfirmOpen(false);
      setAssignmentToDelete(null);
      await fetchTeacherAssignments();
      await fetchStudentAssignments();
      
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast.error("Failed to delete assignment");
    }
  };
  
  // ============ STUDENT SUBMISSION FUNCTIONS ============
  
  const handleViewAssignment = (assignment: StudentAssignment) => {
    if (assignment.status === "graded") {
      setResultAssignment(assignment);
      setResultModalOpen(true);
    } else {
      setSelectedAssignment(assignment);
      setExistingSubmission(assignment.submission_id ? {
        id: assignment.submission_id!,
        assignment_id: assignment.id,
        content_url: assignment.content_url || null,
        text_content: assignment.text_content || null,
        grade: assignment.grade || null,
        feedback: assignment.feedback || null,
        submitted_at: assignment.submitted_at || "",
        user_id: "",
        user_name: "",
        user_email: "",
        status: assignment.grade !== null ? "graded" : "submitted",
      } : null);
      setTextContent(assignment.text_content || "");
      setUploadedFile(null);
      setShowResubmit(false);
      setSubmissionModalOpen(true);
    }
  };
  
  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${selectedAssignment!.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `submissions/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from("submissions")
        .getPublicUrl(filePath);
      
      setUploadedFile(null);
      await submitAssignment(publicUrl, textContent);
      
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };
  
  const submitAssignment = async (fileUrl?: string, content?: string) => {
    if (!fileUrl && !content?.trim()) {
      toast.error("Please provide either text or upload a file");
      return;
    }
    
    setSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      if (existingSubmission && !showResubmit) {
        // Update existing submission
        const { error } = await supabase
          .from("submissions")
          .update({
            content_url: fileUrl || existingSubmission.content_url,
            text_content: content || existingSubmission.text_content,
            submitted_at: new Date().toISOString(),
          })
          .eq("id", existingSubmission.id);
        
        if (error) throw error;
        toast.success("Assignment updated successfully!");
      } else {
        // Delete old submission if resubmitting
        if (existingSubmission && showResubmit) {
          await supabase.from("submissions").delete().eq("id", existingSubmission.id);
        }
        
        // Create new submission
        const { error } = await supabase
          .from("submissions")
          .insert({
            assignment_id: selectedAssignment!.id,
            user_id: user.id,
            content_url: fileUrl || null,
            text_content: content || null,
            submitted_at: new Date().toISOString(),
          });
        
        if (error) throw error;
        toast.success("Assignment submitted successfully!");
      }
      
      // Refresh assignments
      await fetchStudentAssignments();
      setSubmissionModalOpen(false);
      setSelectedAssignment(null);
      setExistingSubmission(null);
      setTextContent("");
      setUploadedFile(null);
      setShowResubmit(false);
      
    } catch (error: any) {
      console.error("Error submitting assignment:", error);
      toast.error(error.message || "Failed to submit assignment");
    } finally {
      setSubmitting(false);
    }
  };
  
  // ============ TEACHER GRADING FUNCTIONS ============
  
  const handleViewSubmissions = async (assignment: TeacherAssignment) => {
    setSelectedTeacherAssignment(assignment);
    setGradingPanelOpen(true);
    setLoadingSubmissions(true);
    
    try {
      const { data: submissionsData, error } = await supabase
        .from("submissions")
        .select(`
          *,
          user:user_id (
            id,
            first_name,
            last_name,
            email,
            username
          )
        `)
        .eq("assignment_id", assignment.id)
        .order("submitted_at", { ascending: false });
      
      if (error) throw error;
      
      const formattedSubmissions: Submission[] = (submissionsData || []).map(sub => ({
        id: sub.id,
        assignment_id: sub.assignment_id,
        user_id: sub.user_id,
        user_name: sub.user?.first_name
          ? `${sub.user.first_name} ${sub.user.last_name || ""}`.trim()
          : sub.user?.username || sub.user?.email || "Unknown",
        user_email: sub.user?.email || "",
        content_url: sub.content_url,
        text_content: sub.text_content,
        grade: sub.grade,
        feedback: sub.feedback,
        submitted_at: sub.submitted_at,
        status: sub.grade !== null ? "graded" : "submitted",
      }));
      
      setSubmissions(formattedSubmissions);
      
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Failed to load submissions");
    } finally {
      setLoadingSubmissions(false);
    }
  };
  
  const handleGradeSubmission = async () => {
    if (!selectedSubmission) return;
    
    if (gradeValue < 0 || gradeValue > (selectedTeacherAssignment?.points || 100)) {
      toast.error(`Grade must be between 0 and ${selectedTeacherAssignment?.points || 100}`);
      return;
    }
    
    setSubmittingGrade(true);
    
    try {
      const { error } = await supabase
        .from("submissions")
        .update({
          grade: gradeValue,
          feedback: feedbackValue.trim() || null,
        })
        .eq("id", selectedSubmission.id);
      
      if (error) throw error;
      
      toast.success(`Grade submitted for ${selectedSubmission.user_name}`);
      
      // Update local state
      setSubmissions(prev => prev.map(s =>
        s.id === selectedSubmission.id
          ? { ...s, grade: gradeValue, feedback: feedbackValue, status: "graded" as const }
          : s
      ));
      
      setSelectedSubmission(null);
      setGradeValue(0);
      setFeedbackValue("");
      
      // Refresh assignment stats and student view
      await fetchTeacherAssignments();
      await fetchStudentAssignments();
      
    } catch (error) {
      console.error("Error submitting grade:", error);
      toast.error("Failed to submit grade");
    } finally {
      setSubmittingGrade(false);
    }
  };
  
  // ============ HELPER FUNCTIONS ============
  
  const getStudentStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Pending" };
      case "submitted":
        return { icon: CheckCircle, color: "text-blue-400", bg: "bg-blue-400/10", label: "Submitted" };
      case "graded":
        return { icon: Star, color: "text-green-400", bg: "bg-green-400/10", label: "Graded" };
      case "overdue":
        return { icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10", label: "Overdue" };
      default:
        return { icon: FileText, color: "text-gray-400", bg: "bg-gray-400/10", label: "Unknown" };
    }
  };
  
  const getFilteredStudentAssignments = () => {
    return studentAssignments.filter(assignment => {
      const matchesSearch = assignment.title.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        assignment.course_title.toLowerCase().includes(studentSearchQuery.toLowerCase());
      const matchesStatus = studentFilterStatus === "all" || assignment.status === studentFilterStatus;
      const matchesCourse = studentFilterCourse === "all" || assignment.course_id.toString() === studentFilterCourse;
      return matchesSearch && matchesStatus && matchesCourse;
    });
  };
  
  const getFilteredTeacherAssignments = () => {
    return teacherAssignments.filter(assignment => {
      const matchesSearch = assignment.title.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
        assignment.course_title.toLowerCase().includes(teacherSearchQuery.toLowerCase());
      const matchesCourse = teacherFilterCourse === "all" || assignment.course_id.toString() === teacherFilterCourse;
      return matchesSearch && matchesCourse;
    });
  };
  
  const studentStats = {
    total: studentAssignments.length,
    pending: studentAssignments.filter(a => a.status === "pending" || a.status === "overdue").length,
    submitted: studentAssignments.filter(a => a.status === "submitted").length,
    graded: studentAssignments.filter(a => a.status === "graded").length,
  };
  
  const teacherStats = {
    total: teacherAssignments.length,
    totalSubmissions: teacherAssignments.reduce((sum, a) => sum + (a.total_submissions || 0), 0),
    totalGraded: teacherAssignments.reduce((sum, a) => sum + (a.graded_count || 0), 0),
    pendingGrading: teacherAssignments.reduce((sum, a) => sum + (a.pending_count || 0), 0),
    avgGrade: teacherAssignments.reduce((sum, a) => sum + (a.average_grade || 0), 0) / (teacherAssignments.length || 1),
  };
  
  const filteredStudentAssignments = getFilteredStudentAssignments();
  const filteredTeacherAssignments = getFilteredTeacherAssignments();
  
  if (loading && activeTab === "learning" && studentAssignments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Assignments</h1>
        <p className="text-gray-400">Track, submit, and manage your course assignments</p>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "learning" | "teaching")} className="space-y-6">
        <TabsList className="bg-gray-800/50 border border-gray-700">
          <TabsTrigger value="learning" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            My Learning
          </TabsTrigger>
          {canTeach && (
            <TabsTrigger value="teaching" className="gap-2">
              <Briefcase className="w-4 h-4" />
              Teaching
            </TabsTrigger>
          )}
        </TabsList>
        
        {/* ========== STUDENT / LEARNING TAB ========== */}
        <TabsContent value="learning" className="space-y-6">
          {/* Student Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <GlowCard>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Assignments</p>
                    <p className="text-2xl font-bold text-white">{studentStats.total}</p>
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
                    <p className="text-2xl font-bold text-yellow-400">{studentStats.pending}</p>
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
                    <p className="text-2xl font-bold text-blue-400">{studentStats.submitted}</p>
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
                    <p className="text-2xl font-bold text-green-400">{studentStats.graded}</p>
                  </div>
                  <Star className="w-8 h-8 text-green-400 opacity-50" />
                </div>
              </div>
            </GlowCard>
          </div>
          
          {/* Student Filters */}
          <GlowCard className="mb-6">
            <div className="p-5">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search assignments by title or course..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                
                <select
                  value={studentFilterStatus}
                  onChange={(e) => setStudentFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="submitted">Submitted</option>
                  <option value="graded">Graded</option>
                  <option value="overdue">Overdue</option>
                </select>
                
                <select
                  value={studentFilterCourse}
                  onChange={(e) => setStudentFilterCourse(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Courses</option>
                  {studentCourses.map(course => (
                    <option key={course.id} value={course.id.toString()}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </GlowCard>
          
          {/* Student Assignments List */}
          <div className="space-y-4">
            {filteredStudentAssignments.length === 0 ? (
              <GlowCard>
                <div className="p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No assignments found</h3>
                  <p className="text-gray-400">
                    {studentSearchQuery || studentFilterStatus !== "all" || studentFilterCourse !== "all"
                      ? "Try adjusting your filters"
                      : "You don't have any assignments yet"}
                  </p>
                </div>
              </GlowCard>
            ) : (
              filteredStudentAssignments.map((assignment) => {
                const StatusIcon = getStudentStatusConfig(assignment.status).icon;
                const statusConfig = getStudentStatusConfig(assignment.status);
                const isOverdue = assignment.status === "overdue";
                const dueDate = new Date(assignment.due_at);
                const isDueSoon = dueDate.getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000 && dueDate > new Date();
                
                return (
                  <GlowCard
                    key={assignment.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200"
                    onClick={() => handleViewAssignment(assignment)}
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
        </TabsContent>
        
        {/* ========== TEACHER TAB ========== */}
        {canTeach && (
          <TabsContent value="teaching" className="space-y-6">
            {/* Teacher Header with Create Button */}
            <div className="flex justify-end">
              <GlowButton onClick={handleCreateAssignment}>
                <Plus className="w-4 h-4 mr-2" />
                Create Assignment
              </GlowButton>
            </div>
            
            {/* Teacher Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <GlowCard>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Assignments</p>
                      <p className="text-2xl font-bold text-white">{teacherStats.total}</p>
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
                      <p className="text-2xl font-bold text-blue-400">{teacherStats.totalSubmissions}</p>
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
                      <p className="text-2xl font-bold text-green-400">{teacherStats.totalGraded}</p>
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
                      <p className="text-2xl font-bold text-yellow-400">{teacherStats.pendingGrading}</p>
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
                      <p className="text-2xl font-bold text-purple-400">{teacherStats.avgGrade.toFixed(1)}%</p>
                    </div>
                    <Star className="w-8 h-8 text-purple-400 opacity-50" />
                  </div>
                </div>
              </GlowCard>
            </div>
            
            {/* Teacher Filters */}
            <GlowCard className="mb-6">
              <div className="p-5">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search assignments by title or course..."
                        value={teacherSearchQuery}
                        onChange={(e) => setTeacherSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  
                  <select
                    value={teacherFilterCourse}
                    onChange={(e) => setTeacherFilterCourse(e.target.value)}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="all">All Courses</option>
                    {teacherCourses.map(course => (
                      <option key={course.id} value={course.id.toString()}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </GlowCard>
            
            {/* Teacher Assignments List */}
            <div className="space-y-4">
              {filteredTeacherAssignments.length === 0 ? (
                <GlowCard>
                  <div className="p-12 text-center">
                    <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No assignments found</h3>
                    <p className="text-gray-400">
                      {teacherSearchQuery || teacherFilterCourse !== "all"
                        ? "Try adjusting your filters"
                        : "Create your first assignment to get started"}
                    </p>
                    <GlowButton onClick={handleCreateAssignment} className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Assignment
                    </GlowButton>
                  </div>
                </GlowCard>
              ) : (
                filteredTeacherAssignments.map((assignment) => {
                  const dueDate = new Date(assignment.due_at);
                  const completionRate = assignment.total_submissions > 0
                    ? (assignment.graded_count / assignment.total_submissions) * 100
                    : 0;
                  
                  return (
                    <GlowCard key={assignment.id}>
                      <div className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="text-lg font-semibold text-white">
                                {assignment.title}
                              </h3>
                              {assignment.status === "overdue" && (
                                <Badge className="bg-red-400/10 text-red-400 border-0">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                              {assignment.description}
                            </p>
                            
                            <div className="flex flex-wrap gap-4 text-sm mb-4">
                              <div className="flex items-center gap-1 text-gray-400">
                                <BookOpen className="w-4 h-4" />
                                <span>{assignment.course_title}</span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-400">
                                <FileText className="w-4 h-4" />
                                <span>{assignment.lesson_title}</span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-400">
                                <Calendar className="w-4 h-4" />
                                <span>Due: {dueDate.toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-400">
                                <Clock className="w-4 h-4" />
                                <span>{assignment.points} points</span>
                              </div>
                            </div>
                            
                            {/* Progress Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <p className="text-xs text-gray-400 mb-1">Submissions</p>
                                <p className="text-lg font-semibold text-white">
                                  {assignment.total_submissions}
                                </p>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <p className="text-xs text-gray-400 mb-1">Graded</p>
                                <p className="text-lg font-semibold text-green-400">
                                  {assignment.graded_count}
                                </p>
                                <p className="text-xs text-yellow-400">
                                  Pending: {assignment.pending_count}
                                </p>
                              </div>
                              <div className="bg-gray-800/50 rounded-lg p-3">
                                <p className="text-xs text-gray-400 mb-1">Average Grade</p>
                                <p className="text-lg font-semibold text-purple-400">
                                  {assignment.average_grade}%
                                </p>
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div>
                              <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Grading Completion</span>
                                <span>{completionRate.toFixed(0)}%</span>
                              </div>
                              <Progress value={completionRate} className="h-2" />
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <GlowButton
                              variant="secondary"
                              onClick={() => handleViewSubmissions(assignment)}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Grade
                              {assignment.pending_count > 0 && (
                                <Badge className="ml-2 bg-yellow-500 text-white">
                                  {assignment.pending_count}
                                </Badge>
                              )}
                            </GlowButton>
                            <GlowButton
                              variant="outline"
                              onClick={() => handleEditAssignment(assignment)}
                            >
                              <Edit className="w-4 h-4" />
                            </GlowButton>
                            <GlowButton
                              variant="ghost"
                              onClick={() => {
                                setAssignmentToDelete(assignment);
                                setDeleteConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </GlowButton>
                          </div>
                        </div>
                      </div>
                    </GlowCard>
                  );
                })
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
      
      {/* ========== MODALS ========== */}
      
      {/* Create/Edit Assignment Modal (Teacher) */}
      <Dialog open={assignmentModalOpen} onOpenChange={setAssignmentModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              {editingAssignment ? "Edit Assignment" : "Create Assignment"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white mb-2 block">Assignment Title *</Label>
              <Input
                value={assignmentForm.title}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                placeholder="e.g., React Hooks Assignment"
                className="bg-gray-800/50 border-gray-700"
              />
            </div>
            
            <div>
              <Label>Description / Instructions</Label>
              <p className="text-xs text-gray-400 mb-2">
                Provide detailed instructions for students. You can format text, add links, images, etc.
              </p>
              <div className="mt-2">
                <RichTextEditor
                  value={assignmentForm.description}
                  onChange={(html) => setAssignmentForm({ ...assignmentForm, description: html })}
                  placeholder="Describe the assignment, provide instructions, rubric, etc..."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Course *</Label>
                <Select
                  value={assignmentForm.course_id}
                  onValueChange={(value) => setAssignmentForm({ ...assignmentForm, course_id: value, lesson_id: "" })}
                >
                  <SelectTrigger className="bg-gray-800/50 border-gray-700">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherCourses.map(course => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-white mb-2 block">Related Lesson (Optional)</Label>
                <Select
                  value={assignmentForm.lesson_id}
                  onValueChange={(value) => setAssignmentForm({ ...assignmentForm, lesson_id: value })}
                  disabled={!assignmentForm.course_id}
                >
                  <SelectTrigger className="bg-gray-800/50 border-gray-700">
                    <SelectValue placeholder="Select a lesson" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {teacherLessons.map(lesson => (
                      <SelectItem key={lesson.id} value={lesson.id.toString()}>
                        {lesson.title} {lesson.class_title && `(${lesson.class_title})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Due Date</Label>
                <Input
                  type="datetime-local"
                  value={assignmentForm.due_at}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, due_at: e.target.value })}
                  className="bg-gray-800/50 border-gray-700"
                />
              </div>
              
              <div>
                <Label className="text-white mb-2 block">Points</Label>
                <Input
                  type="number"
                  value={assignmentForm.points}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, points: parseInt(e.target.value) || 0 })}
                  className="bg-gray-800/50 border-gray-700"
                  min="0"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <GlowButton variant="ghost" onClick={() => setAssignmentModalOpen(false)}>
              Cancel
            </GlowButton>
            <GlowButton onClick={saveAssignment} isLoading={savingAssignment}>
              {editingAssignment ? "Save Changes" : "Create Assignment"}
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Student Submission Modal */}
      <Dialog open={submissionModalOpen} onOpenChange={setSubmissionModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              {selectedAssignment?.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Assignment Info */}
            <div className="bg-gray-800/30 rounded-lg p-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Course</span>
                <span className="text-white">{selectedAssignment?.course_title}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Due Date</span>
                <span className="text-yellow-400">
                  {selectedAssignment?.due_at ? new Date(selectedAssignment.due_at).toLocaleString() : "No due date"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Points</span>
                <span className="text-white">{selectedAssignment?.points}</span>
              </div>
            </div>
            
            {/* Assignment Description */}
            {selectedAssignment?.description && (
              <div>
                <h4 className="text-white font-medium mb-2">Instructions</h4>
                <div 
                  className="text-gray-300 text-sm prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedAssignment.description }}
                />
              </div>
            )}
            
            {/* Existing Submission Info */}
            {existingSubmission && !showResubmit && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-medium">Already Submitted</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Submitted on: {new Date(existingSubmission.submitted_at).toLocaleString()}
                </p>
                {existingSubmission.content_url && (
                  <a
                    href={existingSubmission.content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm mt-2"
                  >
                    <Download className="w-4 h-4" />
                    View Submission
                  </a>
                )}
                <button
                  onClick={() => setShowResubmit(true)}
                  className="mt-3 text-sm text-yellow-400 hover:text-yellow-300"
                >
                  Resubmit Assignment
                </button>
              </div>
            )}
            
            {/* Submission Form */}
            {(!existingSubmission || showResubmit) && (
              <div className="space-y-4">
                <div>
                  <Label className="text-white mb-2 block">Text Response</Label>
                  <Textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Write your answer here..."
                    rows={8}
                    className="bg-gray-800/50 border-gray-700"
                  />
                </div>
                
                <div>
                  <Label className="text-white mb-2 block">File Attachment (Optional)</Label>
                  <label className="block w-full">
                    <div className={`flex items-center justify-center w-full p-4 border-2 border-dashed rounded-lg transition-colors cursor-pointer
                      ${uploading ? 'border-gray-600 bg-gray-800/30' : 'border-gray-700 hover:border-purple-500'}`}
                    >
                      {uploading ? (
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-gray-400">Uploading...</p>
                        </div>
                      ) : uploadedFile ? (
                        <div className="text-center w-full">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-green-400" />
                              <span className="text-sm text-white">{uploadedFile.name}</span>
                              <span className="text-xs text-gray-500">
                                ({(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB)
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setUploadedFile(null);
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">Click to upload file</p>
                          <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, images up to 50MB</p>
                        </div>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload(e.target.files[0]);
                          }
                        }}
                        disabled={uploading}
                      />
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <GlowButton variant="ghost" onClick={() => setSubmissionModalOpen(false)}>
              Cancel
            </GlowButton>
            {(!existingSubmission || showResubmit) && (
              <GlowButton
                onClick={() => submitAssignment(undefined, textContent)}
                isLoading={submitting}
                disabled={!textContent.trim() && !uploadedFile}
              >
                <Send className="w-4 h-4 mr-2" />
                {existingSubmission ? "Resubmit Assignment" : "Submit Assignment"}
              </GlowButton>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Student Results Modal (Graded Assignment) */}
      <Dialog open={resultModalOpen} onOpenChange={setResultModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              {resultAssignment?.title} - Results
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Grade */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/20 border-4 border-green-500">
                <span className="text-3xl font-bold text-green-400">
                  {Math.round(((resultAssignment?.grade || 0) / (resultAssignment?.points || 1)) * 100)}%
                </span>
              </div>
              <p className="text-white text-xl mt-3">
                {resultAssignment?.grade} / {resultAssignment?.points} points
              </p>
            </div>
            
            {/* Progress Bar */}
            <div>
              <Progress 
                value={((resultAssignment?.grade || 0) / (resultAssignment?.points || 1)) * 100} 
                className="h-3" 
              />
            </div>
            
            {/* Feedback */}
            {resultAssignment?.feedback && (
              <div className="bg-gray-800/30 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Feedback</h4>
                <p className="text-gray-300 whitespace-pre-wrap">{resultAssignment.feedback}</p>
              </div>
            )}
            
            {/* Submitted Info */}
            {resultAssignment?.submitted_at && (
              <div className="text-center text-sm text-gray-400">
                Submitted: {new Date(resultAssignment.submitted_at).toLocaleString()}
              </div>
            )}
            
            {/* Submitted Content */}
            {resultAssignment?.content_url && (
              <div>
                <h4 className="text-white font-medium mb-2">Your Submission</h4>
                <a
                  href={resultAssignment.content_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300"
                >
                  <Eye className="w-4 h-4" />
                  View Submitted File
                </a>
              </div>
            )}
            
            {resultAssignment?.text_content && (
              <div className="bg-gray-800/30 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Your Response</h4>
                <p className="text-gray-300 whitespace-pre-wrap">{resultAssignment.text_content}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <GlowButton onClick={() => setResultModalOpen(false)}>
              Close
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Teacher Grading Panel */}
      {gradingPanelOpen && selectedTeacherAssignment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {selectedTeacherAssignment.title}
                </h2>
                <p className="text-sm text-gray-400">
                  {selectedTeacherAssignment.course_title} • {selectedTeacherAssignment.total_submissions} submissions
                </p>
              </div>
              <button
                onClick={() => {
                  setGradingPanelOpen(false);
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
                        {selectedSubmission.user_name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {selectedSubmission.user_email}
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
                  
                  {selectedSubmission.text_content && (
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="font-semibold text-white mb-2">Submission Content</h4>
                      <p className="text-gray-300 whitespace-pre-wrap">
                        {selectedSubmission.text_content}
                      </p>
                    </div>
                  )}
                  
                  {selectedSubmission.content_url && (
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="font-semibold text-white mb-2">Attachments</h4>
                      <a
                        href={selectedSubmission.content_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download Submission
                      </a>
                    </div>
                  )}
                  
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-4">Grade & Feedback</h4>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-300">Grade (out of {selectedTeacherAssignment.points})</Label>
                        <Input
                          type="number"
                          value={gradeValue}
                          onChange={(e) => setGradeValue(Number(e.target.value))}
                          max={selectedTeacherAssignment.points}
                          min={0}
                          className="mt-1 bg-gray-800/50"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">Feedback</Label>
                        <Textarea
                          value={feedbackValue}
                          onChange={(e) => setFeedbackValue(e.target.value)}
                          rows={5}
                          placeholder="Provide feedback to the student..."
                          className="mt-1 bg-gray-800/50"
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <GlowButton
                          variant="outline"
                          onClick={() => setSelectedSubmission(null)}
                        >
                          Cancel
                        </GlowButton>
                        <GlowButton onClick={handleGradeSubmission} isLoading={submittingGrade}>
                          <Send className="w-4 h-4 mr-2" />
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
                  
                  {loadingSubmissions ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                    </div>
                  ) : submissions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No submissions yet</p>
                    </div>
                  ) : (
                    submissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-white">
                              {submission.user_name}
                            </h4>
                            <p className="text-sm text-gray-400">
                              {submission.user_email}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Submitted: {new Date(submission.submitted_at).toLocaleString()}
                            </p>
                            {submission.status === "graded" && submission.grade !== undefined && (
                              <div className="mt-2">
                                <Badge className="bg-green-500/20 text-green-400">
                                  Grade: {submission.grade}/{selectedTeacherAssignment.points}
                                </Badge>
                              </div>
                            )}
                          </div>
                          <GlowButton
                            variant={submission.status === "graded" ? "outline" : "primary"}
                            size="sm"
                            onClick={() => {
                              setSelectedSubmission(submission);
                              setGradeValue(submission.grade || 0);
                              setFeedbackValue(submission.feedback || "");
                            }}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            {submission.status === "graded" ? "Edit Grade" : "Grade"}
                          </GlowButton>
                        </div>
                        
                        {/* Submission Preview */}
                        {submission.text_content && (
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <div className="text-sm text-gray-400">Submission Notes:</div>
                            <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                              {submission.text_content}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Delete Assignment?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-300">
              Are you sure you want to delete <span className="font-semibold text-white">{assignmentToDelete?.title}</span>?
            </p>
            <p className="text-sm text-red-400 mt-2">
              This will permanently delete all submissions associated with this assignment. This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <GlowButton variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </GlowButton>
            <GlowButton onClick={handleDeleteAssignment} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}