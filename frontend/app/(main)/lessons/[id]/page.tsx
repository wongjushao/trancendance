"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  ChevronLeft, 
  ChevronRight, 
  FileDown, 
  MessageSquare, 
  CheckCircle 
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";

const lessonData = {
  id: 1,
  title: "useState and useEffect Deep Dive",
  courseId: 1,
  courseName: "Advanced React Development",
  videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  description: "Learn the fundamentals of React hooks including useState and useEffect. Understand when and how to use them effectively in your React applications.",
  duration: "15:30",
  completed: false,
  resources: [
    { id: 1, name: "Lesson Slides.pdf", size: "2.3 MB" },
    { id: 2, name: "Code Examples.zip", size: "1.1 MB" },
    { id: 3, name: "Additional Resources.md", size: "15 KB" },
  ],
  nextLesson: { id: 2, title: "useContext and useReducer" },
  prevLesson: { id: 0, title: "Custom Hooks Introduction" },
};

const comments = [
  {
    id: 1,
    user: "Alice Johnson",
    avatar: "AJ",
    text: "Great explanation! This really helped me understand the useEffect cleanup function.",
    time: "2 hours ago",
    likes: 12,
  },
  {
    id: 2,
    user: "Bob Smith",
    avatar: "BS",
    text: "Could you provide more examples on the dependency array?",
    time: "5 hours ago",
    likes: 8,
  },
  {
    id: 3,
    user: "Carol White",
    avatar: "CW",
    text: "This lesson is perfect! The code examples were very helpful.",
    time: "1 day ago",
    likes: 15,
  },
];

export default function LessonViewerPage() {
  const params = useParams();
  const courseId = params.courseId;
  const lessonId = params.lessonId;
  
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[#A0A0B5] text-sm">
        <Link href="/courses" className="hover:text-white transition-colors">Courses</Link>
        <span>/</span>
        <Link href={`/courses/${courseId}`} className="hover:text-white transition-colors">
          {lessonData.courseName}
        </Link>
        <span>/</span>
        <span className="text-white">{lessonData.title}</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          <GlowCard className="p-0 overflow-hidden">
            <div className="aspect-video bg-black">
              <iframe
                className="w-full h-full"
                src={lessonData.videoUrl}
                title={lessonData.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white mb-2">{lessonData.title}</h1>
                  <p className="text-[#A0A0B5]">{lessonData.description}</p>
                </div>
                {!lessonData.completed && (
                  <GlowButton variant="primary" className="shrink-0">
                    <CheckCircle className="w-5 h-5" />
                    Mark Complete
                  </GlowButton>
                )}
              </div>
              
              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-white/5 gap-4">
                {lessonData.prevLesson ? (
                  <Link href={`/courses/${courseId}/lessons/${lessonData.prevLesson.id}`}>
                    <GlowButton variant="secondary">
                      <ChevronLeft className="w-5 h-5" />
                      <span className="hidden sm:inline">Previous Lesson</span>
                    </GlowButton>
                  </Link>
                ) : (
                  <div />
                )}
                
                {lessonData.nextLesson && (
                  <Link href={`/courses/${courseId}/lessons/${lessonData.nextLesson.id}`}>
                    <GlowButton variant="primary">
                      <span className="hidden sm:inline">Next Lesson</span>
                      <ChevronRight className="w-5 h-5" />
                    </GlowButton>
                  </Link>
                )}
              </div>
            </div>
          </GlowCard>
          
          {/* Discussion */}
          <GlowCard>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">Discussion</h2>
              <MessageSquare className="w-6 h-6 text-purple-400" />
            </div>
            
            <div className="space-y-4 mb-6">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-4 p-4 bg-[#12121A] rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm">{comment.avatar}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium truncate">{comment.user}</span>
                      <span className="text-[#6B6B80] text-xs shrink-0">{comment.time}</span>
                    </div>
                    <p className="text-[#A0A0B5] text-sm mb-2">{comment.text}</p>
                    <button className="text-sm text-purple-400 hover:text-purple-300">
                      👍 {comment.likes}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Add a comment..."
                className="flex-1 px-4 py-3 bg-[#12121A] border border-white/10 rounded-xl text-white placeholder:text-[#6B6B80] outline-none focus:ring-2 focus:ring-purple-500/50"
              />
              <GlowButton variant="primary">Post</GlowButton>
            </div>
          </GlowCard>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Resources */}
          <GlowCard>
            <h3 className="text-xl font-semibold text-white mb-4">Resources</h3>
            <div className="space-y-2">
              {lessonData.resources.map((resource) => (
                <button
                  key={resource.id}
                  className="w-full flex items-center justify-between p-4 bg-[#12121A] rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <FileDown className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                      <p className="text-white font-medium text-sm">{resource.name}</p>
                      <p className="text-[#6B6B80] text-xs">{resource.size}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </GlowCard>
          
          {/* Lesson Info */}
          <GlowCard>
            <h3 className="text-xl font-semibold text-white mb-4">Lesson Info</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#A0A0B5]">Duration</span>
                <span className="text-white font-medium">{lessonData.duration}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#A0A0B5]">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  lessonData.completed 
                    ? "bg-green-500/20 text-green-400" 
                    : "bg-yellow-500/20 text-yellow-400"
                }`}>
                  {lessonData.completed ? "Completed" : "In Progress"}
                </span>
              </div>
            </div>
          </GlowCard>
          
          {/* Quick Actions */}
          <GlowCard>
            <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <GlowButton variant="outline" fullWidth>
                Take Notes
              </GlowButton>
              <GlowButton variant="outline" fullWidth>
                Report Issue
              </GlowButton>
              <Link href={`/courses/${courseId}`} className="block w-full">
                <GlowButton variant="outline" fullWidth>
                  Back to Course
                </GlowButton>
              </Link>
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}