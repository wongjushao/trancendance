// frontend/app/(main)/courses/[id]/assignments/[assignmentId]/submissions/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  FileText,
  Download,
  CheckCircle,
  Clock,
  Search,
  Eye,
  MessageSquare,
  Star,
  Loader2,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface Submission {
  id: number;
  assignment_id: number;
  user_id: string;
  content_url: string | null;
  text_content: string | null;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    avatar_url: string;
  };
}

interface Assignment {
  id: number;
  title: string;
  description: string;
  due_at: string;
  points: number;
  course_id: number;
  lesson_id: number;
  lesson_title?: string;
  course_title?: string;
}

export default function AssignmentSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);
  const assignmentId = parseInt(params.assignmentId as string);
  
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "graded" | "ungraded">("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [gradeValue, setGradeValue] = useState<number>(0);
  const [feedbackValue, setFeedbackValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseBrowserClient();
        
        // Get assignment details
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("assignments")
          .select(`
            *,
            lesson:lessons!lesson_id (
              title
            ),
            course:courses!course_id (
              title
            )
          `)
          .eq("id", assignmentId)
          .single();
        
        if (assignmentError) throw assignmentError;
        
        setAssignment({
          ...assignmentData,
          lesson_title: assignmentData.lesson?.title,
          course_title: assignmentData.course?.title,
        });
        
        // Get submissions with user profiles
        const { data: submissionsData, error: submissionsError } = await supabase
          .from("submissions")
          .select(`
            *,
            user:profiles!user_id (
              id,
              first_name,
              last_name,
              username,
              email,
              avatar_url
            )
          `)
          .eq("assignment_id", assignmentId)
          .order("submitted_at", { ascending: false });
        
        if (submissionsError) throw submissionsError;
        
        setSubmissions(submissionsData || []);
        setFilteredSubmissions(submissionsData || []);
        
      } catch (error) {
        console.error("Error loading submissions:", error);
        toast.error("Failed to load submissions");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [assignmentId]);
  
  useEffect(() => {
    let filtered = [...submissions];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(sub => 
        sub.user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter === "graded") {
      filtered = filtered.filter(sub => sub.grade !== null);
    } else if (statusFilter === "ungraded") {
      filtered = filtered.filter(sub => sub.grade === null);
    }
    
    setFilteredSubmissions(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, submissions]);
  
  const getSubmissionStats = () => {
    const total = submissions.length;
    const graded = submissions.filter(s => s.grade !== null).length;
    const ungraded = total - graded;
    const averageGrade = graded > 0 
      ? submissions.filter(s => s.grade !== null).reduce((sum, s) => sum + (s.grade || 0), 0) / graded
      : 0;
    
    return { total, graded, ungraded, averageGrade };
  };
  
  const handleOpenGradeModal = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradeValue(submission.grade || 0);
    setFeedbackValue(submission.feedback || "");
    setGradeModalOpen(true);
  };
  
  const handleSubmitGrade = async () => {
    if (!selectedSubmission) return;
    
    if (gradeValue < 0 || gradeValue > (assignment?.points || 100)) {
      toast.error(`Grade must be between 0 and ${assignment?.points || 100}`);
      return;
    }
    
    setSubmitting(true);
    
    try {
      const supabase = getSupabaseBrowserClient();
      
      const { error } = await supabase
        .from("submissions")
        .update({
          grade: gradeValue,
          feedback: feedbackValue || null,
        })
        .eq("id", selectedSubmission.id);
      
      if (error) throw error;
      
      // Update local state
      setSubmissions(prev => prev.map(sub => 
        sub.id === selectedSubmission.id 
          ? { ...sub, grade: gradeValue, feedback: feedbackValue }
          : sub
      ));
      
      toast.success("Grade submitted successfully!");
      setGradeModalOpen(false);
      setSelectedSubmission(null);
      
    } catch (error) {
      console.error("Error saving grade:", error);
      toast.error("Failed to save grade");
    } finally {
      setSubmitting(false);
    }
  };
  
  const getInitials = (firstName: string, lastName: string, username: string) => {
    if (firstName) return firstName[0];
    if (lastName) return lastName[0];
    if (username) return username[0];
    return "S";
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  const stats = getSubmissionStats();
  const paginatedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/courses/${courseId}/edit`}>
              <GlowButton variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Course
              </GlowButton>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Assignment Submissions</h1>
              <p className="text-gray-400 mt-1">
                {assignment?.title} • {assignment?.course_title}
              </p>
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                  <div className="text-sm text-gray-400">Total Submissions</div>
                </div>
              </div>
            </div>
          </GlowCard>
          
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{stats.graded}</div>
                  <div className="text-sm text-gray-400">Graded</div>
                </div>
              </div>
            </div>
          </GlowCard>
          
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{stats.ungraded}</div>
                  <div className="text-sm text-gray-400">Ungraded</div>
                </div>
              </div>
            </div>
          </GlowCard>
          
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Star className="w-8 h-8 text-blue-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {stats.averageGrade.toFixed(1)} / {assignment?.points}
                  </div>
                  <div className="text-sm text-gray-400">Average Grade</div>
                </div>
              </div>
            </div>
          </GlowCard>
        </div>
        
        {/* Assignment Info */}
        <GlowCard className="mb-6">
          <div className="p-4">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h3 className="font-semibold text-white">{assignment?.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{assignment?.description}</p>
              </div>
              <Badge className="bg-purple-500/20 text-purple-300">
                Due: {assignment?.due_at ? new Date(assignment.due_at).toLocaleDateString() : "No due date"}
              </Badge>
            </div>
          </div>
        </GlowCard>
        
        {/* Submissions List */}
        <GlowCard>
          <div className="p-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by student name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value: any) => setStatusFilter(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Submissions</SelectItem>
                  <SelectItem value="ungraded">Ungraded</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Submissions Table */}
            {paginatedSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold text-white mb-2">No Submissions</h3>
                <p className="text-gray-400">
                  {searchTerm || statusFilter !== "all" 
                    ? "No submissions match your filters" 
                    : "No students have submitted this assignment yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedSubmissions.map((submission) => (
                  <div key={submission.id} className="bg-slate-800/30 rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Student Info */}
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={submission.user.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(
                              submission.user.first_name || "",
                              submission.user.last_name || "",
                              submission.user.username || ""
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-white">
                            {submission.user.first_name} {submission.user.last_name}
                          </div>
                          <div className="text-sm text-gray-400">{submission.user.email}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Submitted: {formatDate(submission.submitted_at)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Grade Info */}
                      <div className="flex items-center gap-4">
                        {submission.grade !== null ? (
                          <div className="text-right">
                            <div className="text-lg font-semibold text-green-400">
                              {submission.grade} / {assignment?.points}
                            </div>
                            <div className="text-xs text-gray-500">Graded</div>
                          </div>
                        ) : (
                          <div className="text-right">
                            <div className="text-lg font-semibold text-yellow-400">Pending</div>
                            <div className="text-xs text-gray-500">Not graded</div>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          {submission.content_url && (
                            <GlowButton
                              size="sm"
                              variant="secondary"
                              onClick={() => window.open(submission.content_url!, "_blank")}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              View
                            </GlowButton>
                          )}
                          <GlowButton
                            size="sm"
                            variant="primary"
                            onClick={() => handleOpenGradeModal(submission)}
                          >
                            <MessageSquare className="w-3 h-3 mr-1" />
                            {submission.grade !== null ? "Edit Grade" : "Grade"}
                          </GlowButton>
                        </div>
                      </div>
                    </div>
                    
                    {/* Submission Preview (if text content) */}
                    {submission.text_content && (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <div className="text-sm text-gray-400">Submission Notes:</div>
                        <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                          {submission.text_content}
                        </p>
                      </div>
                    )}
                    
                    {/* Feedback Preview */}
                    {submission.feedback && (
                      <div className="mt-2 text-sm text-blue-400">
                        <span className="text-gray-400">Feedback: </span>
                        {submission.feedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <GlowButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </GlowButton>
                <span className="text-gray-400 px-4 py-2">
                  Page {currentPage} of {totalPages}
                </span>
                <GlowButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </GlowButton>
              </div>
            )}
          </div>
        </GlowCard>
      </div>
      
      {/* Grade Modal */}
      <Dialog open={gradeModalOpen} onOpenChange={setGradeModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Grade Submission
            </DialogTitle>
            <DialogDescription>
              Provide a grade and feedback for this submission
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="text-sm text-gray-400">Student</div>
                <div className="text-white font-medium">
                  {selectedSubmission.user.first_name} {selectedSubmission.user.last_name}
                </div>
                <div className="text-xs text-gray-500">{selectedSubmission.user.email}</div>
              </div>
              
              <div>
                <Label htmlFor="grade">Grade (out of {assignment?.points})</Label>
                <Input
                  id="grade"
                  type="number"
                  min="0"
                  max={assignment?.points}
                  value={gradeValue}
                  onChange={(e) => setGradeValue(parseInt(e.target.value) || 0)}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="feedback">Feedback (Optional)</Label>
                <Textarea
                  id="feedback"
                  value={feedbackValue}
                  onChange={(e) => setFeedbackValue(e.target.value)}
                  placeholder="Provide feedback to the student..."
                  rows={4}
                  className="mt-2"
                />
              </div>
              
              {selectedSubmission.content_url && (
                <div>
                  <GlowButton
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => window.open(selectedSubmission.content_url!, "_blank")}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Submission
                  </GlowButton>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <GlowButton variant="ghost" onClick={() => setGradeModalOpen(false)}>
              Cancel
            </GlowButton>
            <GlowButton onClick={handleSubmitGrade} isLoading={submitting}>
              <Send className="w-4 h-4 mr-2" />
              Save Grade
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}