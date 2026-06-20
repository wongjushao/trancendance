"use client";

import { useState, useEffect } from "react";
import { Users, Trash2, Mail, Loader2, UserPlus } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface ManageStudentsProps {
  courseClassId: number;
  courseName: string;
}

interface Student {
  id: number;
  user_id: string;
  enrolled_at: string;
  role: string;
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    email: string;
    avatar_url: string | null;
  };
}

const getAuthToken = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

export function ManageStudents({ courseClassId, courseName }: ManageStudentsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(`/api/org-service/course-classes/${courseClassId}/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error("Failed to load students");
      }

      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error("Error loading students:", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [courseClassId]);

  const handleRemoveStudent = async (userId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from this course?`)) {
      return;
    }
    
    setRemovingId(userId);
    try {
      const token = await getAuthToken();
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(`/api/org-service/course-classes/${courseClassId}/students/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove student");
      }

      toast.success(`${studentName} has been removed from the course`);
      await loadStudents();
    } catch (error) {
      console.error("Error removing student:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove student");
    } finally {
      setRemovingId(null);
    }
  };

  const handleInviteStudent = () => {
    toast.info("Invite feature - send email invitation to join organization first");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <GlowCard>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Enrolled Students</h3>
            <p className="text-sm text-gray-400">{students.length} students enrolled</p>
          </div>
          <GlowButton size="sm" variant="secondary" onClick={handleInviteStudent}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Student
          </GlowButton>
        </div>
        
        {students.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-500" />
            <p className="text-gray-400">No students enrolled yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((student) => (
              <div key={student.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={student.user?.avatar_url || undefined} />
                    <AvatarFallback>
                      {student.user?.first_name?.[0] || student.user?.username?.[0] || "S"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-white">
                      {student.user?.first_name} {student.user?.last_name}
                    </div>
                    <div className="text-sm text-gray-400">{student.user?.email}</div>
                    <div className="text-xs text-gray-500">
                      Enrolled: {new Date(student.enrolled_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <GlowButton
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveStudent(student.user_id, student.user?.first_name || "Student")}
                    isLoading={removingId === student.user_id}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </GlowButton>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 p-3 bg-blue-500/10 rounded-lg text-sm text-blue-400">
          <p>Students must be members of the organization to enroll in this course.</p>
        </div>
      </div>
    </GlowCard>
  );
}