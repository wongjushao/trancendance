"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
  Clock,
  Download,
  BookOpen,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface LessonData {
  id: number;
  title: string;
  description: string;
  content_type: "video" | "text" | "quiz";
  content_url?: string;
  content_json?: any;
  duration: string;
  order_index: number;
  is_completed: boolean;
  assignments?: {
    id: number;
    title: string;
    due_date: string;
    points: number;
    status: "pending" | "submitted" | "graded";
  }[];
}

interface CourseData {
  id: number;
  title: string;
  modules: {
    id: number;
    title: string;
    lessons: {
      id: number;
      title: string;
      is_completed: boolean;
    }[];
  }[];
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingComplete, setMarkingComplete] = useState(false);

  useEffect(() => {
    fetchData();
  }, [lessonId]);

  const fetchData = async () => {
    // Mock data - replace with actual API calls
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setLesson({
      id: parseInt(lessonId),
      title: "Understanding React Hooks",
      description: "Learn how to use React Hooks to manage state and side effects in functional components.",
      content_type: "video",
      content_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      duration: "15:30",
      order_index: 1,
      is_completed: false,
      assignments: [
        {
          id: 1,
          title: "Hooks Exercise",
          due_date: "2026-05-15T23:59:59",
          points: 100,
          status: "pending",
        },
      ],
    });
    
    setCourse({
      id: parseInt(courseId),
      title: "Advanced React Development",
      modules: [
        {
          id: 1,
          title: "Module 1: React Fundamentals",
          lessons: [
            { id: 1, title: "Understanding React Hooks", is_completed: false },
            { id: 2, title: "useState in Depth", is_completed: false },
            { id: 3, title: "useEffect Explained", is_completed: false },
          ],
        },
      ],
    });
    
    setLoading(false);
  };

  const markAsComplete = async () => {
    setMarkingComplete(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    setLesson(prev => prev ? { ...prev, is_completed: true } : null);
    toast.success("Lesson marked as complete!");
    setMarkingComplete(false);
  };

  const navigateToNextLesson = () => {
    const currentModule = course?.modules[0];
    const currentIndex = currentModule?.lessons.findIndex(l => l.id === parseInt(lessonId));
    
    if (currentIndex !== undefined && currentModule && currentIndex < currentModule.lessons.length - 1) {
      const nextLesson = currentModule.lessons[currentIndex + 1];
      router.push(`/courses/${courseId}/learn/lesson/${nextLesson.id}`);
    } else {
      router.push(`/courses/${courseId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Lesson Not Found</h2>
        <Link href={`/courses/${courseId}`}>
          <GlowButton variant="outline">Back to Course</GlowButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href={`/courses/${courseId}`}
          className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Course
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lesson Header */}
          <GlowCard>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-2">{lesson.title}</h1>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{lesson.duration}</span>
                    {lesson.is_completed && (
                      <Badge className="bg-green-500/20 text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Content Player */}
          <GlowCard>
            <div className="p-6">
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="resources">Resources</TabsTrigger>
                  <TabsTrigger value="discussion">Discussion</TabsTrigger>
                </TabsList>
                
                <TabsContent value="content">
                  {lesson.content_type === "video" && lesson.content_url && (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <iframe
                        src={lesson.content_url}
                        title={lesson.title}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  )}
                  
                  {lesson.content_type === "text" && (
                    <div className="prose prose-invert max-w-none">
                      <p>{lesson.description}</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="resources">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-white">Lesson Resources</h3>
                    <a href="#" className="flex items-center gap-2 text-purple-400 hover:text-purple-300">
                      <Download className="w-4 h-4" />
                      Download Lesson Slides
                    </a>
                    <a href="#" className="flex items-center gap-2 text-purple-400 hover:text-purple-300">
                      <Download className="w-4 h-4" />
                      Download Exercise Files
                    </a>
                  </div>
                </TabsContent>
                
                <TabsContent value="discussion">
                  <div className="text-center py-8 text-gray-400">
                    <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Discussion forum coming soon</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </GlowCard>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-4">
            <GlowButton variant="outline" onClick={() => router.back()}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous Lesson
            </GlowButton>
            
            {!lesson.is_completed ? (
              <GlowButton onClick={markAsComplete} isLoading={markingComplete}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Complete
              </GlowButton>
            ) : (
              <GlowButton onClick={navigateToNextLesson}>
                Next Lesson
                <ChevronRight className="w-4 h-4 ml-2" />
              </GlowButton>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Progress */}
          <GlowCard>
            <div className="p-5">
              <h3 className="font-semibold text-white mb-3">Course Progress</h3>
              <div className="text-sm text-gray-400 mb-2">
                {course?.title}
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 mb-3">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: "33%" }}
                />
              </div>
              <p className="text-xs text-gray-400">1 of 3 lessons completed</p>
            </div>
          </GlowCard>

          {/* Assignments */}
          {lesson.assignments && lesson.assignments.length > 0 && (
            <GlowCard>
              <div className="p-5">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Assignments
                </h3>
                {lesson.assignments.map((assignment) => (
                  <Link
                    key={assignment.id}
                    href={`/courses/${courseId}/learn/lesson/${lessonId}/assignments/${assignment.id}`}
                    className="block p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors mb-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-white">{assignment.title}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={assignment.status === "pending" ? "outline" : "default"}>
                          {assignment.status}
                        </Badge>
                        <p className="text-xs text-gray-400 mt-1">{assignment.points} pts</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </GlowCard>
          )}
        </div>
      </div>
    </div>
  );
}