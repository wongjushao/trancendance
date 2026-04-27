// frontend/app/(main)/teacher/assignments/[id]/grade/page.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Download,
  Send,
  FileText,
  User,
  Calendar,
  Clock,
  Star,
  MessageSquare,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Submission {
  id: number;
  studentName: string;
  studentEmail: string;
  submittedAt: Date;
  content: string;
  attachments: { name: string; url: string }[];
  grade: number | null;
  feedback: string | null;
  status: "pending" | "graded";
}

const mockSubmissions: Submission[] = [
  {
    id: 1,
    studentName: "Alice Johnson",
    studentEmail: "alice@example.com",
    submittedAt: new Date("2024-03-18T14:30:00"),
    content:
      "This is my assignment submission. I've implemented all the required components...",
    attachments: [{ name: "assignment.zip", url: "#" }],
    grade: null,
    feedback: null,
    status: "pending",
  },
  {
    id: 2,
    studentName: "Bob Smith",
    studentEmail: "bob@example.com",
    submittedAt: new Date("2024-03-17T10:15:00"),
    content:
      "Here's my solution. I focused on creating reusable components...",
    attachments: [],
    grade: 85,
    feedback: "Good work! Could improve error handling.",
    status: "graded",
  },
];

export default function GradeAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id;

  const [submissions, setSubmissions] = useState(mockSubmissions);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [grade, setGrade] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  const handleGradeSubmit = (submissionId: number) => {
    const submission = submissions.find((s) => s.id === submissionId);
    if (!submission) return;

    if (!grade || grade < 0 || grade > 100) {
      toast.error("Please enter a valid grade (0-100)");
      return;
    }

    setSubmissions(
      submissions.map((s) =>
        s.id === submissionId
          ? { ...s, grade, feedback, status: "graded" }
          : s
      )
    );

    toast.success(`Graded ${submission.studentName}'s submission`);
    setSelectedSubmission(null);
    setGrade(0);
    setFeedback("");
  };

  const pendingSubmissions = submissions.filter((s) => s.status === "pending");
  const gradedSubmissions = submissions.filter((s) => s.status === "graded");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/teacher"
          className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Submission List */}
          <div className="lg:col-span-1">
            <GlowCard>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Submissions
                </h2>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="pending">
                      Pending ({pendingSubmissions.length})
                    </TabsTrigger>
                    <TabsTrigger value="graded">
                      Graded ({gradedSubmissions.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="pending" className="space-y-3">
                    {pendingSubmissions.map((submission) => (
                      <button
                        key={submission.id}
                        onClick={() => setSelectedSubmission(submission)}
                        className={`w-full text-left p-4 rounded-lg transition-all ${
                          selectedSubmission?.id === submission.id
                            ? "bg-purple-600/20 border border-purple-500/50"
                            : "bg-gray-800/30 hover:bg-gray-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                            {submission.studentName.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium">
                              {submission.studentName}
                            </p>
                            <p className="text-xs text-gray-400">
                              {submission.submittedAt.toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className="bg-yellow-500/20 text-yellow-400">
                            Pending
                          </Badge>
                        </div>
                      </button>
                    ))}
                    {pendingSubmissions.length === 0 && (
                      <p className="text-center text-gray-400 py-8">
                        No pending submissions
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="graded" className="space-y-3">
                    {gradedSubmissions.map((submission) => (
                      <button
                        key={submission.id}
                        onClick={() => setSelectedSubmission(submission)}
                        className={`w-full text-left p-4 rounded-lg transition-all ${
                          selectedSubmission?.id === submission.id
                            ? "bg-purple-600/20 border border-purple-500/50"
                            : "bg-gray-800/30 hover:bg-gray-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                            {submission.studentName.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium">
                              {submission.studentName}
                            </p>
                            <p className="text-xs text-gray-400">
                              Grade: {submission.grade}%
                            </p>
                          </div>
                          <Badge className="bg-green-500/20 text-green-400">
                            Graded
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            </GlowCard>
          </div>

          {/* Right Column - Grading Interface */}
          <div className="lg:col-span-2">
            {selectedSubmission ? (
              <GlowCard>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        Grade Submission
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          {selectedSubmission.studentName}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-400 text-sm">
                          {selectedSubmission.studentEmail}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {selectedSubmission.submittedAt.toLocaleString()}
                    </div>
                  </div>

                  {/* Submission Content */}
                  <div className="mb-6">
                    <h3 className="text-white font-medium mb-3">
                      Submission
                    </h3>
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <p className="text-gray-300 whitespace-pre-wrap">
                        {selectedSubmission.content}
                      </p>
                    </div>
                    {selectedSubmission.attachments.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-400 mb-2">
                          Attachments:
                        </p>
                        {selectedSubmission.attachments.map((file, idx) => (
                          <a
                            key={idx}
                            href={file.url}
                            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
                          >
                            <Download className="w-3 h-3" />
                            {file.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Grading Form */}
                  {selectedSubmission.status === "pending" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-white mb-2 block">
                          Grade (0-100)
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={grade}
                          onChange={(e) => setGrade(parseInt(e.target.value))}
                          className="bg-gray-800/50 border-gray-700 text-white w-32"
                          placeholder="e.g., 85"
                        />
                      </div>

                      <div>
                        <Label className="text-white mb-2 block">
                          Feedback
                        </Label>
                        <Textarea
                          rows={5}
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Provide constructive feedback to the student..."
                          className="bg-gray-800/50 border-gray-700 text-white"
                        />
                      </div>

                      <div className="flex gap-3">
                        <GlowButton
                          variant="primary"
                          onClick={() => handleGradeSubmit(selectedSubmission.id)}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Submit Grade
                        </GlowButton>
                        <GlowButton
                          variant="outline"
                          onClick={() => setSelectedSubmission(null)}
                        >
                          Cancel
                        </GlowButton>
                      </div>
                    </div>
                  )}

                  {/* View Graded Submission */}
                  {selectedSubmission.status === "graded" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center gap-2 text-green-400 mb-2">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">Graded</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-sm text-gray-400">Grade</p>
                            <p className="text-2xl font-bold text-white">
                              {selectedSubmission.grade}%
                            </p>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-400">Feedback</p>
                            <p className="text-gray-300">
                              {selectedSubmission.feedback}
                            </p>
                          </div>
                        </div>
                      </div>
                      <GlowButton
                        variant="outline"
                        onClick={() => setSelectedSubmission(null)}
                      >
                        Close
                      </GlowButton>
                    </div>
                  )}
                </div>
              </GlowCard>
            ) : (
              <GlowCard>
                <div className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-white font-medium mb-2">
                    No Submission Selected
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Select a submission from the list to grade it
                  </p>
                </div>
              </GlowCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}