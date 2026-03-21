"use client";

import { useState, use } from "react"; // Added use for async params
import Link from "next/link";
import { Upload, FileText, Download, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";

const assignmentData = {
  id: 1,
  title: "React Hooks Implementation",
  course: "Advanced React Development",
  instructor: "Sarah Johnson",
  dueDate: "2026-03-08",
  points: 100,
  status: "pending",
  description: `
    In this assignment, you will implement custom React hooks for form validation.
    
    **Requirements:**
    - Create at least 3 custom hooks
    - Implement proper error handling
    - Write unit tests for your hooks
    - Document your code with JSDoc comments
    
    **Deliverables:**
    - Source code in a GitHub repository
    - README with setup instructions
    - Test coverage report
  `,
  attachments: [
    { id: 1, name: "Assignment Instructions.pdf", size: "1.2 MB" },
    { id: 2, name: "Starter Template.zip", size: "450 KB" },
  ],
  rubric: [
    { criteria: "Code Quality", points: 30, description: "Clean, well-organized code" },
    { criteria: "Functionality", points: 40, description: "All requirements met" },
    { criteria: "Testing", points: 20, description: "Comprehensive test coverage" },
    { criteria: "Documentation", points: 10, description: "Clear documentation" },
  ],
};

const submissions = [
  {
    id: 1,
    studentName: "You",
    submittedDate: "2026-03-07",
    files: [
      { name: "hooks-implementation.zip", size: "2.1 MB" },
    ],
    status: "submitted",
    grade: null,
    feedback: null,
  },
];

export default function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15 requires "use" to unwrap the params promise in client components
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };
  
  const handleSubmit = () => {
    console.log("Submitting files for ID:", id, selectedFiles);
  };
  
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[#A0A0B5] text-sm">
        <Link href="/assignments" className="hover:text-white transition-colors">Assignments</Link>
        <span>/</span>
        <span className="text-white">{assignmentData.title}</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assignment Header */}
          <GlowCard>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">{assignmentData.title}</h1>
                <p className="text-[#A0A0B5]">{assignmentData.course} • {assignmentData.instructor}</p>
              </div>
              <span className={`
                px-4 py-2 rounded-xl text-sm font-medium
                ${assignmentData.status === "pending" && "bg-yellow-500/20 text-yellow-400"}
                ${assignmentData.status === "submitted" && "bg-purple-500/20 text-purple-400"}
                ${assignmentData.status === "graded" && "bg-green-500/20 text-green-400"}
              `}>
                {assignmentData.status.charAt(0).toUpperCase() + assignmentData.status.slice(1)}
              </span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-[#6B6B80] pb-4 border-b border-white/5">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Due: {assignmentData.dueDate}
              </span>
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {assignmentData.points} points
              </span>
            </div>
            
            <div className="mt-6 prose prose-invert max-w-none">
              <div className="text-[#A0A0B5] whitespace-pre-wrap">{assignmentData.description}</div>
            </div>
          </GlowCard>
          
          {/* Attachments */}
          {assignmentData.attachments.length > 0 && (
            <GlowCard>
              <h2 className="text-xl font-semibold text-white mb-4">Assignment Resources</h2>
              <div className="space-y-2">
                {assignmentData.attachments.map((file) => (
                  <button
                    key={file.id}
                    className="w-full flex items-center justify-between p-4 bg-[#12121A] rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Download className="w-5 h-5 text-purple-400" />
                      <div className="text-left">
                        <p className="text-white font-medium">{file.name}</p>
                        <p className="text-[#6B6B80] text-sm">{file.size}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </GlowCard>
          )}
          
          {/* Submission */}
          {assignmentData.status === "pending" ? (
            <GlowCard>
              <h2 className="text-xl font-semibold text-white mb-4">Submit Assignment</h2>
              
              <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center mb-4">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <p className="text-white font-medium mb-2">
                    {selectedFiles.length > 0 
                      ? `${selectedFiles.length} file(s) selected` 
                      : "Drop files here or click to browse"
                    }
                  </p>
                  <p className="text-[#6B6B80] text-sm">
                    Supported formats: ZIP, PDF, DOC, TXT (Max 10MB)
                  </p>
                </label>
              </div>
              
              {selectedFiles.length > 0 && (
                <div className="space-y-2 mb-4">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-[#12121A] rounded-lg">
                      <span className="text-white text-sm">{file.name}</span>
                      <span className="text-[#6B6B80] text-sm">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              )}
              
              <GlowButton 
                variant="primary" 
                fullWidth 
                onClick={handleSubmit}
                disabled={selectedFiles.length === 0}
              >
                Submit Assignment
              </GlowButton>
            </GlowCard>
          ) : (
            <GlowCard>
              <h2 className="text-xl font-semibold text-white mb-4">Your Submission</h2>
              
              {submissions.map((submission) => (
                <div key={submission.id} className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-[#A0A0B5]">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>Submitted on {submission.submittedDate}</span>
                  </div>
                  
                  <div className="space-y-2">
                    {submission.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-[#12121A] rounded-xl">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-purple-400" />
                          <div>
                            <p className="text-white font-medium">{file.name}</p>
                            <p className="text-[#6B6B80] text-sm">{file.size}</p>
                          </div>
                        </div>
                        <Download className="w-5 h-5 text-[#A0A0B5]" />
                      </div>
                    ))}
                  </div>
                  
                  {submission.grade ? (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">Grade</span>
                        <span className="text-green-400 font-bold text-xl">
                          {submission.grade}/{assignmentData.points}
                        </span>
                      </div>
                      {submission.feedback && (
                        <p className="text-[#A0A0B5] text-sm mt-2">{submission.feedback}</p>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                      <span className="text-yellow-400">Waiting for grade</span>
                    </div>
                  )}
                </div>
              ))}
            </GlowCard>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assignment Info */}
          <GlowCard>
            <h3 className="text-xl font-semibold text-white mb-4">Assignment Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[#6B6B80] text-sm mb-1">Due Date</p>
                <p className="text-white font-medium">{assignmentData.dueDate}</p>
              </div>
              <div>
                <p className="text-[#6B6B80] text-sm mb-1">Points</p>
                <p className="text-white font-medium">{assignmentData.points}</p>
              </div>
              <div>
                <p className="text-[#6B6B80] text-sm mb-1">Status</p>
                <p className="text-white font-medium capitalize">{assignmentData.status}</p>
              </div>
            </div>
          </GlowCard>
          
          {/* Rubric */}
          <GlowCard>
            <h3 className="text-xl font-semibold text-white mb-4">Grading Rubric</h3>
            <div className="space-y-3">
              {assignmentData.rubric.map((item, index) => (
                <div key={index} className="p-3 bg-[#12121A] rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{item.criteria}</span>
                    <span className="text-purple-400">{item.points}pts</span>
                  </div>
                  <p className="text-[#6B6B80] text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </GlowCard>
          
          {/* Quick Actions */}
          <GlowCard>
            <h3 className="text-xl font-semibold text-white mb-4">Actions</h3>
            <div className="space-y-2">
              <Link href={`/courses/${1}`}>
                <GlowButton variant="outline" fullWidth>
                  View Course
                </GlowButton>
              </Link>
              <GlowButton variant="outline" fullWidth>
                Ask Question
              </GlowButton>
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}