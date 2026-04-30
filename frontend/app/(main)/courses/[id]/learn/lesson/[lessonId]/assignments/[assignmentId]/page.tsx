"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Upload,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Send,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface AssignmentData {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  points: number;
  status: "pending" | "submitted" | "graded";
  grade?: number;
  feedback?: string;
  submittedAt?: string;
  attachments?: { id: number; name: string; url: string }[];
}

export default function AssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.assignmentId as string;
  const lessonId = params.lessonId as string;
  const courseId = params.id as string;

  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  const fetchAssignment = async () => {
    // Mock data - replace with actual API call
    setTimeout(() => {
      setAssignment({
        id: parseInt(assignmentId),
        title: "Introduction to React Hooks",
        description: "Complete the following exercises to demonstrate your understanding of React Hooks...",
        dueDate: "2026-05-15T23:59:59",
        points: 100,
        status: "pending",
      });
      setLoading(false);
    }, 500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!content && !file) {
      toast.error("Please provide either text content or upload a file");
      return;
    }

    setSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success("Assignment submitted successfully!");
    setSubmitting(false);
    router.push(`/courses/${courseId}/learn/lesson/${lessonId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Assignment Not Found</h2>
        <Link href={`/courses/${courseId}/learn/lesson/${lessonId}`}>
          <GlowButton variant="outline">Back to Lesson</GlowButton>
        </Link>
      </div>
    );
  }

  const isOverdue = new Date(assignment.dueDate) < new Date();
  const isSubmitted = assignment.status === "submitted" || assignment.status === "graded";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href={`/courses/${courseId}/learn/lesson/${lessonId}`}
          className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Lesson
        </Link>
      </div>

      {/* Assignment Header */}
      <GlowCard className="mb-6">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{assignment.title}</h1>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-gray-400">
                  <Clock className="w-4 h-4" />
                  Due: {new Date(assignment.dueDate).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1 text-gray-400">
                  <FileText className="w-4 h-4" />
                  {assignment.points} points
                </span>
              </div>
            </div>
            {isOverdue && !isSubmitted && (
              <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-3 py-1 rounded-full">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Overdue</span>
              </div>
            )}
          </div>
          
          <div className="prose prose-invert max-w-none mt-4">
            <p className="text-gray-300">{assignment.description}</p>
          </div>
        </div>
      </GlowCard>

      {/* Submission Section */}
      {!isSubmitted ? (
        <GlowCard>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Your Submission</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="content">Text Response</Label>
                <Textarea
                  id="content"
                  placeholder="Write your answer here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="file">Attachment (Optional)</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  className="mt-1"
                />
                {file && (
                  <p className="text-sm text-green-400 mt-1">
                    Selected: {file.name}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <GlowButton
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </GlowButton>
                <GlowButton
                  onClick={handleSubmit}
                  isLoading={submitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Assignment
                </GlowButton>
              </div>
            </div>
          </div>
        </GlowCard>
      ) : (
        <GlowCard>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-semibold text-white">Assignment Submitted</h2>
            </div>
            <p className="text-gray-300 mb-2">
              Submitted on: {assignment.submittedAt ? new Date(assignment.submittedAt).toLocaleString() : "Just now"}
            </p>
            
            {assignment.status === "graded" && (
              <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                <h3 className="font-semibold text-white mb-2">Grade & Feedback</h3>
                <p className="text-2xl font-bold text-purple-400 mb-2">
                  {assignment.grade}/{assignment.points}
                </p>
                <p className="text-gray-300">{assignment.feedback}</p>
              </div>
            )}
            
            <div className="mt-6">
              <GlowButton variant="outline" onClick={() => router.back()}>
                Back to Lesson
              </GlowButton>
            </div>
          </div>
        </GlowCard>
      )}
    </div>
  );
}