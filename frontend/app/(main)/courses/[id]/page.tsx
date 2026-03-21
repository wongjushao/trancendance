"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Play, FileText, Users, MessageSquare, BookOpen, Clock, Star, Award } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock data remains the same
const courseData = {
  id: 1,
  title: "Advanced React Development",
  instructor: "Sarah Johnson",
  description: "Master React hooks, context, and advanced patterns. Build production-ready applications with best practices.",
  thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800",
  students: 1234,
  rating: 4.8,
  reviews: 324,
  level: "Advanced",
  duration: "8 weeks",
  enrolled: true,
  progress: 65,
};

const modules = [
  {
    id: 1,
    title: "Getting Started",
    lessons: [
      { id: 1, title: "Course Introduction", duration: "5:30", completed: true, type: "video" },
      { id: 2, title: "Setting Up Environment", duration: "12:45", completed: true, type: "video" },
      { id: 3, title: "Project Overview", duration: "8:20", completed: true, type: "video" },
    ],
  },
  {
    id: 2,
    title: "React Hooks Deep Dive",
    lessons: [
      { id: 4, title: "useState and useEffect", duration: "15:30", completed: true, type: "video" },
      { id: 5, title: "useContext and useReducer", duration: "18:45", completed: true, type: "video" },
      { id: 6, title: "Custom Hooks", duration: "22:10", completed: false, type: "video" },
      { id: 7, title: "Hooks Best Practices", duration: "14:20", completed: false, type: "video" },
    ],
  },
  {
    id: 3,
    title: "Advanced Patterns",
    lessons: [
      { id: 8, title: "Compound Components", duration: "20:15", completed: false, type: "video" },
      { id: 9, title: "Render Props", duration: "16:30", completed: false, type: "video" },
      { id: 10, title: "Higher Order Components", duration: "19:45", completed: false, type: "video" },
    ],
  },
];

const assignments = [
  { id: 1, title: "Build a Custom Hook", dueDate: "2026-03-10", status: "pending" },
  { id: 2, title: "Implement Compound Components", dueDate: "2026-03-15", status: "pending" },
];

const students = [
  { id: 1, name: "Alice Johnson", avatar: "AJ", progress: 85 },
  { id: 2, name: "Bob Smith", avatar: "BS", progress: 72 },
  { id: 3, name: "Carol White", avatar: "CW", progress: 91 },
  { id: 4, name: "David Brown", avatar: "DB", progress: 68 },
];

export default function CourseDetailPage() {
  const params = useParams();
  const id = params.id;
  
  return (
    <div className="space-y-8">
      {/* Course Header */}
      <div className="relative">
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <img 
            src={courseData.thumbnail} 
            alt={courseData.title}
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/80 to-transparent"></div>
        </div>
        
        <div className="relative p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="inline-block px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-400 text-sm mb-4">
                {courseData.level}
              </div>
              <h1 className="text-5xl font-bold text-white mb-4">{courseData.title}</h1>
              <p className="text-xl text-[#A0A0B5] mb-6 max-w-3xl">{courseData.description}</p>
              
              <div className="flex items-center gap-6 text-[#A0A0B5] mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                    <span className="text-white font-semibold">SJ</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{courseData.instructor}</p>
                    <p className="text-sm">Instructor</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                  <span className="text-white font-medium">{courseData.rating}</span>
                  <span>({courseData.reviews} reviews)</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>{courseData.students.toLocaleString()} students</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{courseData.duration}</span>
                </div>
              </div>
              
              {courseData.enrolled && (
                <div className="space-y-2 max-w-md">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#A0A0B5]">Your Progress</span>
                    <span className="text-purple-400 font-medium">{courseData.progress}%</span>
                  </div>
                  <div className="h-3 bg-[#12121A] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-violet-600 rounded-full"
                      style={{ width: `${courseData.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              {!courseData.enrolled ? (
                <GlowButton variant="primary" className="text-lg px-8">
                  Enroll Now
                </GlowButton>
              ) : (
                <>
                  <GlowButton variant="primary">
                    <Play className="w-5 h-5" />
                    Continue Learning
                  </GlowButton>
                  <GlowButton variant="secondary">
                    <Award className="w-5 h-5" />
                    Certificate
                  </GlowButton>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Course Content */}
      <Tabs defaultValue="lessons" className="w-full">
        <TabsList className="bg-[#12121A] border border-white/10 p-1 rounded-xl">
          <TabsTrigger value="lessons" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            <BookOpen className="w-4 h-4 mr-2" />
            Lessons
          </TabsTrigger>
          <TabsTrigger value="assignments" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            <FileText className="w-4 h-4 mr-2" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="students" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            <Users className="w-4 h-4 mr-2" />
            Students
          </TabsTrigger>
          <TabsTrigger value="discussion" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            <MessageSquare className="w-4 h-4 mr-2" />
            Discussion
          </TabsTrigger>
        </TabsList>
        
        {/* Lessons Tab */}
        <TabsContent value="lessons" className="mt-6">
          <div className="space-y-4">
            {modules.map((module) => (
              <GlowCard key={module.id}>
                <h3 className="text-xl font-semibold text-white mb-4">{module.title}</h3>
                <div className="space-y-2">
                  {module.lessons.map((lesson) => (
                    <Link key={lesson.id} href={`/courses/${id}/lessons/${lesson.id}`}>
                      <div className="flex items-center gap-4 p-4 bg-[#12121A] rounded-xl hover:bg-white/5 transition-colors group cursor-pointer">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center
                          ${lesson.completed 
                            ? "bg-gradient-to-r from-purple-500 to-violet-600" 
                            : "bg-[#16161F] border border-white/10"
                          }
                        `}>
                          {lesson.completed ? (
                            <Play className="w-5 h-5 text-white fill-white" />
                          ) : (
                            <Play className="w-5 h-5 text-[#6B6B80]" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <p className={`font-medium ${lesson.completed ? "text-white" : "text-[#A0A0B5]"} group-hover:text-purple-400 transition-colors`}>
                            {lesson.title}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 text-[#6B6B80]">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{lesson.duration}</span>
                        </div>
                        
                        {lesson.completed && (
                          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </GlowCard>
            ))}
          </div>
        </TabsContent>
        
        {/* Other TabContents follow same pattern... */}
        <TabsContent value="assignments" className="mt-6">
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <Link key={assignment.id} href={`/assignments/${assignment.id}`}>
                <GlowCard className="hover:scale-[1.01] transition-transform cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">{assignment.title}</h3>
                      <p className="text-[#A0A0B5] text-sm">Due: {assignment.dueDate}</p>
                    </div>
                    <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-xl text-sm">
                      {assignment.status}
                    </span>
                  </div>
                </GlowCard>
              </Link>
            ))}
          </div>
        </TabsContent>
        {/* ... remaining Students/Discussion tabs */}
      </Tabs>
    </div>
  );
}