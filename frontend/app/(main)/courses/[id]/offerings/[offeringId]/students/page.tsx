// frontend/app/(main)/courses/[id]/offerings/[offeringId]/students/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Search,
  Mail,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Calendar,
  BookOpen,
  Award,
  TrendingUp,
  Download,
  Send,
  MoreVertical,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { removeStudentFromCourse } from "@/lib/supabase/enrollment";
import { getOfferingStudentsProgress } from "@/lib/supabase/progress";

interface StudentWithProgress {
  id: number;
  user_id: string;
  enrolled_at: string;
  role: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    avatar_url: string;
  };
  progress: number;
  completed_lessons: number;
  total_lessons: number;
}

export default function ManageStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);
  const offeringId = parseInt(params.offeringId as string);
  
  const [loading, setLoading] = useState(true);
  const [offering, setOffering] = useState<any>(null);
  const [students, setStudents] = useState<StudentWithProgress[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithProgress | null>(null);
  const [removing, setRemoving] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviting, setInviting] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseBrowserClient();
        
        // Get offering details
        const { data: offeringData, error: offeringError } = await supabase
          .from("course_classes")
          .select("*, course:courses(id, title)")
          .eq("id", offeringId)
          .single();
        
        if (offeringError) throw offeringError;
        setOffering(offeringData);
        
        // Get students with progress
        const studentsData = await getOfferingStudentsProgress(offeringId);
        setStudents(studentsData as StudentWithProgress[]);
        
      } catch (error) {
        console.error("Error loading students:", error);
        toast.error("Failed to load student data");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [offeringId]);
  
  const handleRemoveStudent = async () => {
    if (!selectedStudent) return;
    
    setRemoving(true);
    try {
      await removeStudentFromCourse(offeringId, selectedStudent.user_id);
      
      // Remove from local state
      setStudents(students.filter(s => s.user_id !== selectedStudent.user_id));
      toast.success(`${selectedStudent.user.first_name || "Student"} removed from course`);
      setRemoveModalOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error("Error removing student:", error);
      toast.error("Failed to remove student");
    } finally {
      setRemoving(false);
    }
  };
  
  const handleSendReminder = async (student: StudentWithProgress) => {
    toast.info(`Reminder sent to ${student.user.email}`);
    // In production, this would call an API to send email
  };
  
  const handleInviteStudent = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    
    setInviting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check if user exists in the system
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail)
        .single();
      
      if (existingUser) {
        // User exists, check if already enrolled
        const { data: existingEnrollment } = await supabase
          .from("class_members")
          .select("id")
          .eq("course_class_id", offeringId)
          .eq("user_id", existingUser.id)
          .single();
        
        if (existingEnrollment) {
          toast.error("User is already enrolled in this course");
          setInviteModalOpen(false);
          setInviteEmail("");
          setInviteMessage("");
          return;
        }
      }
      
      // Create invitation (using mock for now - replace with actual invitation system)
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteModalOpen(false);
      setInviteEmail("");
      setInviteMessage("");
      
    } catch (error) {
      console.error("Error inviting student:", error);
      toast.error("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };
  
  const filteredStudents = students.filter(student => {
    const fullName = `${student.user.first_name || ""} ${student.user.last_name || ""}`.toLowerCase();
    const email = student.user.email?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });
  
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "text-green-400";
    if (progress >= 50) return "text-yellow-400";
    return "text-blue-400";
  };
  
  const getInitials = (firstName: string, lastName: string, username: string) => {
    if (firstName) return firstName[0];
    if (lastName) return lastName[0];
    if (username) return username[0];
    return "S";
  };
  
  const enrolledCount = students.length;
  const maxStudents = offering?.max_students || 0;
  const availableSpots = maxStudents > 0 ? maxStudents - enrolledCount : "Unlimited";
  const averageProgress = students.length > 0 
    ? Math.round(students.reduce((sum, s) => sum + s.progress, 0) / students.length)
    : 0;
  
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
            <Link href={`/courses/${courseId}/edit?tab=offerings`}>
              <GlowButton variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Course
              </GlowButton>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Manage Students</h1>
              <p className="text-gray-400 mt-1">
                {offering?.name} • {offering?.course?.title}
              </p>
            </div>
          </div>
          <GlowButton variant="primary" onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Student
          </GlowButton>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{enrolledCount}</div>
                  <div className="text-sm text-gray-400">Enrolled Students</div>
                </div>
              </div>
            </div>
          </GlowCard>
          
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <UserPlus className="w-8 h-8 text-green-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {typeof availableSpots === "number" ? availableSpots : "∞"}
                  </div>
                  <div className="text-sm text-gray-400">Available Spots</div>
                </div>
              </div>
            </div>
          </GlowCard>
          
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-yellow-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{averageProgress}%</div>
                  <div className="text-sm text-gray-400">Avg. Progress</div>
                </div>
              </div>
            </div>
          </GlowCard>
          
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-blue-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {students.filter(s => s.progress === 100).length}
                  </div>
                  <div className="text-sm text-gray-400">Completed</div>
                </div>
              </div>
            </div>
          </GlowCard>
        </div>
        
        {/* Main Content */}
        <GlowCard>
          <div className="p-6">
            {/* Search Bar */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Students List */}
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold text-white mb-2">No Students Enrolled</h3>
                <p className="text-gray-400 mb-6">
                  {searchTerm ? "No students match your search" : "This offering has no students yet"}
                </p>
                {!searchTerm && (
                  <GlowButton onClick={() => setInviteModalOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Your First Student
                  </GlowButton>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="bg-slate-800/30 rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Student Info */}
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={student.user.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(
                              student.user.first_name || "",
                              student.user.last_name || "",
                              student.user.username || ""
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-white">
                            {student.user.first_name} {student.user.last_name}
                          </div>
                          <div className="text-sm text-gray-400">{student.user.email}</div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>Enrolled: {new Date(student.enrolled_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress */}
                      <div className="flex-1 max-w-xs">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Progress</span>
                          <span className={getProgressColor(student.progress)}>
                            {student.progress}%
                          </span>
                        </div>
                        <Progress value={student.progress} className="h-2" />
                        <div className="text-xs text-gray-500 mt-1">
                          {student.completed_lessons} / {student.total_lessons} lessons
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2">
                        <GlowButton
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSendReminder(student)}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Remind
                        </GlowButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <GlowButton size="sm" variant="ghost">
                              <MoreVertical className="w-4 h-4" />
                            </GlowButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-red-400"
                              onClick={() => {
                                setSelectedStudent(student);
                                setRemoveModalOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove from Course
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlowCard>
      </div>
      
      {/* Remove Student Confirmation Modal */}
      <Dialog open={removeModalOpen} onOpenChange={setRemoveModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Remove Student</DialogTitle>
          </DialogHeader>
          <p className="text-gray-300">
            Are you sure you want to remove{" "}
            <span className="font-semibold text-white">
              {selectedStudent?.user.first_name} {selectedStudent?.user.last_name}
            </span>{" "}
            from this course? This action cannot be undone.
          </p>
          <DialogFooter>
            <GlowButton variant="ghost" onClick={() => setRemoveModalOpen(false)}>
              Cancel
            </GlowButton>
            <GlowButton
              variant="primary"
              className="bg-red-500 hover:bg-red-600"
              onClick={handleRemoveStudent}
              isLoading={removing}
            >
              Remove
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Invite Student Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Invite Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="student@example.com"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Welcome to the course! Here's what you'll learn..."
                rows={3}
                className="mt-2"
              />
            </div>
            <div className="bg-blue-500/10 rounded-lg p-3 text-sm text-blue-400">
              <p>The student will receive an email invitation to join this course.</p>
            </div>
          </div>
          <DialogFooter>
            <GlowButton variant="ghost" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </GlowButton>
            <GlowButton onClick={handleInviteStudent} isLoading={inviting}>
              Send Invitation
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}