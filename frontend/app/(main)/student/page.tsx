// frontend/app/(main)/student/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, PlayCircle, FileText, Award, Star,
  TrendingUp, Clock, CheckCircle, Calendar, Users,
  MessageSquare, ChevronRight, Download, Share2,
  ThumbsUp, Flag, Filter, Search, Plus
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRole } from "@/components/providers/RoleProvider";
import { toast } from "sonner";

// Mock data for student dashboard
interface EnrolledCourse {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  instructor: string;
  instructorAvatar: string;
  progress: number;
  lessonsCompleted: number;
  totalLessons: number;
  lastAccessed: Date;
  rating: number;
  certificateEarned: boolean;
  certificateUrl?: string;
}

interface Assignment {
  id: number;
  title: string;
  courseId: number;
  courseTitle: string;
  dueDate: Date;
  points: number;
  status: "pending" | "submitted" | "graded" | "late";
  grade?: number;
  feedback?: string;
  submittedAt?: Date;
}

interface CourseReview {
  id: number;
  courseId: number;
  courseTitle: string;
  rating: number;
  review: string;
  createdAt: Date;
}

interface Certificate {
  id: number;
  courseId: number;
  courseTitle: string;
  issuedAt: Date;
  credentialId: string;
  downloadUrl: string;
}

const mockEnrolledCourses: EnrolledCourse[] = [
  {
    id: 1,
    title: "Advanced React Development",
    description: "Master React hooks, context, and advanced patterns",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400",
    instructor: "Sarah Johnson",
    instructorAvatar: "SJ",
    progress: 65,
    lessonsCompleted: 16,
    totalLessons: 24,
    lastAccessed: new Date("2024-03-22"),
    rating: 4.8,
    certificateEarned: false,
  },
  {
    id: 2,
    title: "Backend with Node.js",
    description: "Build scalable backend services with Node.js and Express",
    thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400",
    instructor: "Michael Chen",
    instructorAvatar: "MC",
    progress: 45,
    lessonsCompleted: 8,
    totalLessons: 18,
    lastAccessed: new Date("2024-03-20"),
    rating: 4.6,
    certificateEarned: false,
  },
  {
    id: 3,
    title: "UI/UX Design Fundamentals",
    description: "Learn design principles and create stunning user interfaces",
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400",
    instructor: "Emily Rodriguez",
    instructorAvatar: "ER",
    progress: 80,
    lessonsCompleted: 26,
    totalLessons: 32,
    lastAccessed: new Date("2024-03-21"),
    rating: 4.9,
    certificateEarned: true,
    certificateUrl: "#",
  },
];

const mockAssignments: Assignment[] = [
  {
    id: 1,
    title: "React Hooks Implementation",
    courseId: 1,
    courseTitle: "Advanced React Development",
    dueDate: new Date("2024-03-25"),
    points: 100,
    status: "pending",
  },
  {
    id: 2,
    title: "Database Design Project",
    courseId: 2,
    courseTitle: "Backend with Node.js",
    dueDate: new Date("2024-03-28"),
    points: 150,
    status: "submitted",
    submittedAt: new Date("2024-03-20"),
  },
  {
    id: 3,
    title: "Prototype Challenge",
    courseId: 3,
    courseTitle: "UI/UX Design Fundamentals",
    dueDate: new Date("2024-03-15"),
    points: 120,
    status: "graded",
    grade: 85,
    feedback: "Great work! Excellent attention to detail.",
  },
];

const mockCertificates: Certificate[] = [
  {
    id: 1,
    courseId: 3,
    courseTitle: "UI/UX Design Fundamentals",
    issuedAt: new Date("2024-02-28"),
    credentialId: "CR-2024-001",
    downloadUrl: "#",
  },
];

const mockReviews: CourseReview[] = [
  {
    id: 1,
    courseId: 1,
    courseTitle: "Advanced React Development",
    rating: 5,
    review: "Excellent course! The instructor explains concepts clearly and the projects are very practical.",
    createdAt: new Date("2024-03-10"),
  },
];

export default function StudentDashboardPage() {
  const router = useRouter();
  const { roleData } = useRole();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCourse, setSelectedCourse] = useState<EnrolledCourse | null>(null);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  // Check if user is a student
  useEffect(() => {
    if (roleData.role !== 'student' && roleData.role !== 'pending_teacher' && roleData.role !== 'pending_admin') {
      router.push('/dashboard');
    }
  }, [roleData, router]);

  const stats = {
    totalCourses: mockEnrolledCourses.length,
    completedCourses: mockEnrolledCourses.filter(c => c.progress === 100).length,
    totalHours: 158,
    streakDays: 12,
    averageScore: 87,
  };

  const handleSubmitAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setIsSubmittingAssignment(true);
  };

  const handleUploadSubmission = (file: File) => {
    toast.success("Assignment submitted successfully!");
    setIsSubmittingAssignment(false);
    setSelectedAssignment(null);
  };

  const handleSubmitReview = () => {
    toast.success("Review submitted! Thank you for your feedback.");
    setIsWritingReview(false);
    setReviewRating(5);
    setReviewText("");
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-violet-600 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white">
              Student Dashboard
            </div>
            <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white">
              {stats.streakDays} Day Streak
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back!
          </h1>
          <p className="text-purple-100 text-lg">
            Continue your learning journey. You have {mockEnrolledCourses.length} active courses.
          </p>
          
          <div className="flex gap-4 mt-6">
            <Link href="/courses">
              <GlowButton variant="primary" className="bg-white text-purple-600 hover:bg-purple-50">
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Courses
              </GlowButton>
            </Link>
            <Link href="/analytics">
              <GlowButton variant="ghost" className="text-white border-white/30 hover:bg-white/10">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Progress
              </GlowButton>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="bg-gradient-to-br from-[#16161F] to-[#12121A] rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <BookOpen className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.totalCourses}</p>
          <p className="text-sm text-[#6B6B80]">Enrolled Courses</p>
        </div>

        <div className="bg-gradient-to-br from-[#16161F] to-[#12121A] rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Award className="w-5 h-5 text-green-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.completedCourses}</p>
          <p className="text-sm text-[#6B6B80]">Completed Courses</p>
        </div>

        <div className="bg-gradient-to-br from-[#16161F] to-[#12121A] rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.totalHours}</p>
          <p className="text-sm text-[#6B6B80]">Learning Hours</p>
        </div>

        <div className="bg-gradient-to-br from-[#16161F] to-[#12121A] rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.streakDays}</p>
          <p className="text-sm text-[#6B6B80]">Day Streak</p>
        </div>

        <div className="bg-gradient-to-br from-[#16161F] to-[#12121A] rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.averageScore}%</p>
          <p className="text-sm text-[#6B6B80]">Average Score</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#12121A] border border-white/5 p-1 rounded-2xl mb-8 flex-wrap h-auto">
          <TabsTrigger value="overview" className="rounded-xl px-6 py-2.5">
            <BookOpen className="w-4 h-4 mr-2" />
            My Learning
          </TabsTrigger>
          <TabsTrigger value="assignments" className="rounded-xl px-6 py-2.5">
            <FileText className="w-4 h-4 mr-2" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="certificates" className="rounded-xl px-6 py-2.5">
            <Award className="w-4 h-4 mr-2" />
            Certificates
          </TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-xl px-6 py-2.5">
            <Star className="w-4 h-4 mr-2" />
            My Reviews
          </TabsTrigger>
        </TabsList>

        {/* My Learning Tab */}
        <TabsContent value="overview">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Continue Learning</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockEnrolledCourses.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <GlowCard className="h-full hover:scale-[1.02] transition-all cursor-pointer group">
                    <div className="relative overflow-hidden rounded-xl mb-4">
                      <img 
                        src={course.thumbnail} 
                        alt={course.title}
                        className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      {course.progress === 100 && (
                        <div className="absolute top-3 right-3 px-2 py-1 bg-green-500/90 rounded-full text-xs text-white">
                          Completed
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-white group-hover:text-purple-400 transition-colors">
                        {course.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">{course.instructorAvatar}</span>
                        </div>
                        <span className="text-[#A0A0B5]">{course.instructor}</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#A0A0B5]">Progress</span>
                          <span className="text-purple-400 font-medium">{course.progress}%</span>
                        </div>
                        <div className="h-2 bg-[#1A1A24] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-violet-600 rounded-full"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-[#6B6B80]">
                          {course.lessonsCompleted}/{course.totalLessons} lessons completed
                        </p>
                      </div>
                    </div>
                  </GlowCard>
                </Link>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-6">Your Assignments</h2>
            {mockAssignments.map((assignment) => (
              <GlowCard key={assignment.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">{assignment.title}</h3>
                    <p className="text-[#A0A0B5] text-sm mt-1">{assignment.courseTitle}</p>
                    <div className="flex flex-wrap items-center gap-6 mt-3 text-sm">
                      <span className="flex items-center gap-1 text-[#A0A0B5]">
                        <Calendar className="w-4 h-4" />
                        Due: {assignment.dueDate.toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 text-[#A0A0B5]">
                        <FileText className="w-4 h-4" />
                        {assignment.points} points
                      </span>
                      {assignment.status === "graded" && assignment.grade && (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          Grade: {assignment.grade}/{assignment.points}
                        </span>
                      )}
                      {assignment.feedback && (
                        <div className="mt-2 p-3 bg-[#12121A] rounded-lg">
                          <p className="text-sm text-[#A0A0B5]">Feedback: {assignment.feedback}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {assignment.status === "pending" ? (
                      <GlowButton variant="primary" onClick={() => handleSubmitAssignment(assignment)}>
                        Submit Assignment
                      </GlowButton>
                    ) : assignment.status === "submitted" ? (
                      <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-xl text-sm">
                        Awaiting Grade
                      </span>
                    ) : assignment.status === "graded" ? (
                      <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm">
                        Graded
                      </span>
                    ) : null}
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockCertificates.map((cert) => (
              <GlowCard key={cert.id}>
                <div className="text-center p-6">
                  <Award className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">{cert.courseTitle}</h3>
                  <p className="text-[#A0A0B5] text-sm mb-4">
                    Issued: {cert.issuedAt.toLocaleDateString()}
                  </p>
                  <p className="text-xs text-[#6B6B80] mb-4">Credential ID: {cert.credentialId}</p>
                  <GlowButton variant="primary" fullWidth>
                    <Download className="w-4 h-4 mr-2" />
                    Download Certificate
                  </GlowButton>
                </div>
              </GlowCard>
            ))}
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Your Course Reviews</h2>
              <GlowButton variant="primary" onClick={() => setIsWritingReview(true)}>
                <Star className="w-4 h-4 mr-2" />
                Write a Review
              </GlowButton>
            </div>
            
            {mockReviews.map((review) => (
              <GlowCard key={review.id}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">{review.courseTitle}</h3>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-[#6B6B80]'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-[#A0A0B5]">{review.review}</p>
                  <p className="text-xs text-[#6B6B80]">Posted: {review.createdAt.toLocaleDateString()}</p>
                </div>
              </GlowCard>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Assignment Submission Modal */}
      {isSubmittingAssignment && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setIsSubmittingAssignment(false)}>
          <div className="bg-[#16161F] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white">Submit Assignment</h2>
              <p className="text-[#A0A0B5] mt-1">{selectedAssignment.title}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Upload Your Work</Label>
                <input
                  type="file"
                  onChange={(e) => e.target.files && handleUploadSubmission(e.target.files[0])}
                  className="w-full p-3 bg-[#12121A] border border-white/10 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-500/20 file:text-purple-400 hover:file:bg-purple-500/30"
                />
                <p className="text-xs text-[#6B6B80] mt-2">Supported formats: PDF, DOC, ZIP, TXT (Max 10MB)</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Comments (Optional)</Label>
                <Textarea rows={3} placeholder="Add any comments for the instructor..." className="bg-[#12121A] border-white/10" />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-white/10">
              <GlowButton variant="ghost" onClick={() => setIsSubmittingAssignment(false)} className="flex-1">
                Cancel
              </GlowButton>
              <GlowButton variant="primary" className="flex-1">
                Submit
              </GlowButton>
            </div>
          </div>
        </div>
      )}

      {/* Write Review Modal */}
      {isWritingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setIsWritingReview(false)}>
          <div className="bg-[#16161F] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white">Write a Review</h2>
              <p className="text-[#A0A0B5] mt-1">Share your learning experience</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Select Course</Label>
                <select className="w-full bg-[#12121A] border border-white/10 rounded-xl h-12 px-4 text-white">
                  {mockEnrolledCourses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Rating</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-8 h-8 ${star <= reviewRating ? 'fill-yellow-500 text-yellow-500' : 'text-[#6B6B80]'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Your Review</Label>
                <Textarea
                  rows={4}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="What did you think about this course? What did you like or dislike?"
                  className="bg-[#12121A] border-white/10"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-white/10">
              <GlowButton variant="ghost" onClick={() => setIsWritingReview(false)} className="flex-1">
                Cancel
              </GlowButton>
              <GlowButton variant="primary" onClick={handleSubmitReview} className="flex-1">
                Submit Review
              </GlowButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}