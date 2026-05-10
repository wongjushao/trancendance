// Updated AssignmentSubmission component using backend API
"use client";

import { useState } from "react";
import { Upload, Loader2, FileText, CheckCircle, X, Download } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";

interface AssignmentSubmissionProps {
  assignmentId: number;
  onSubmitted?: () => void;
  existingSubmission?: {
    id: number;
    content_url?: string;
    text_content?: string;
    submitted_at: string;
    grade?: number;
    feedback?: string;
  };
}

export function AssignmentSubmission({ assignmentId, onSubmitted, existingSubmission }: AssignmentSubmissionProps) {
  const [uploading, setUploading] = useState(false);
  const [textContent, setTextContent] = useState(existingSubmission?.text_content || "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showResubmit, setShowResubmit] = useState(false);

  const getAuthToken = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const handleFileUpload = async (selectedFile: File) => {
    setFile(selectedFile);
    setUploading(true);
    
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('assignment_id', assignmentId.toString());

      const response = await fetch('/api/auth-service/upload-submission', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setFile(null);
      toast.success("File uploaded successfully!");
      
      await submitAssignment(data.file_url, textContent);
      
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
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch('/api/org-service/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignment_id: assignmentId,
          text_content: content,
          file_url: fileUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Submission failed');
      }

      const data = await response.json();
      
      toast.success(existingSubmission ? "Assignment updated!" : "Assignment submitted!");
      setShowResubmit(false);
      onSubmitted?.();
      
    } catch (error: any) {
      console.error("Error submitting assignment:", error);
      toast.error(error.message || "Failed to submit assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmission = async () => {
    if (!existingSubmission?.id) return;
    
    if (!confirm("Are you sure you want to delete your submission? This will allow you to resubmit.")) {
      return;
    }
    
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/org-service/submissions/${existingSubmission.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      toast.success("Submission deleted. You can now resubmit.");
      setShowResubmit(true);
      onSubmitted?.();
      
    } catch (error: any) {
      console.error("Error deleting submission:", error);
      toast.error(error.message || "Failed to delete submission");
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  // Graded submission view
  if (existingSubmission?.grade !== undefined && existingSubmission.grade !== null) {
    return (
      <div className="bg-gray-800/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-6 h-6 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Assignment Graded</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded">
            <span className="text-gray-400">Grade:</span>
            <span className="text-2xl font-bold text-purple-400">
              {existingSubmission.grade}/100
            </span>
          </div>
          {existingSubmission.content_url && (
            <a 
              href={existingSubmission.content_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 bg-gray-800/50 rounded text-purple-400 hover:text-purple-300 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Download Your Submission</span>
            </a>
          )}
          {existingSubmission.feedback && (
            <div className="p-3 bg-gray-800/50 rounded">
              <p className="text-gray-400 mb-1">Feedback:</p>
              <p className="text-white whitespace-pre-wrap">{existingSubmission.feedback}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Submitted but not graded view
  if (existingSubmission && !showResubmit) {
    return (
      <div className="bg-gray-800/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-6 h-6 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Assignment Submitted</h3>
        </div>
        <p className="text-gray-400 mb-2">
          Submitted on: {new Date(existingSubmission.submitted_at).toLocaleString()}
        </p>
        {existingSubmission.content_url && (
          <a 
            href={existingSubmission.content_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm mb-4"
          >
            <Download className="w-4 h-4" />
            View Submission
          </a>
        )}
        <div className="mt-4">
          <GlowButton 
            variant="outline" 
            size="sm"
            onClick={handleDeleteSubmission}
          >
            Delete & Resubmit
          </GlowButton>
        </div>
      </div>
    );
  }

  // New submission or resubmit view
  return (
    <div className="space-y-6">
      {showResubmit && existingSubmission && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-2">
          <p className="text-sm text-yellow-400">
            You are resubmitting this assignment. Your previous submission will be deleted.
          </p>
        </div>
      )}

      <div>
        <Label className="text-white mb-2 block">Text Response</Label>
        <textarea
          className="w-full p-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 resize-y"
          rows={6}
          placeholder="Write your answer here..."
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
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
            ) : file ? (
              <div className="text-center w-full">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-white">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      removeFile();
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

      <div className="flex justify-end gap-3">
        {showResubmit && existingSubmission && (
          <GlowButton 
            variant="outline" 
            onClick={() => setShowResubmit(false)}
          >
            Cancel
          </GlowButton>
        )}
        <GlowButton 
          onClick={() => submitAssignment(undefined, textContent)}
          isLoading={submitting}
          disabled={!textContent.trim() && !file}
        >
          {existingSubmission ? "Resubmit Assignment" : "Submit Assignment"}
        </GlowButton>
      </div>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm font-medium ${className || ""}`}>{children}</div>;
}