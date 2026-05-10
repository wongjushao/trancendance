"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, CheckCircle, Clock, FileText, Loader2 } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";

interface LessonPlayerProps {
  lesson: {
    id: number;
    title: string;
    description?: string;
    content_type: "video" | "text" | "quiz";
    content_url?: string;
    content_json?: any;
    duration_seconds?: number;
    is_free_preview?: boolean;
  };
  courseClassId: number;
  onComplete?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

const getAuthToken = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

export function LessonPlayer({
  lesson,
  courseClassId,
  onComplete,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}: LessonPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [classMemberId, setClassMemberId] = useState<number | null>(null);

  // Get class member ID
  useEffect(() => {
    const getClassMemberId = async () => {
      const token = await getAuthToken();
      if (!token) return;

      // Get user profile to get user ID
      const profileResponse = await fetch('/api/auth-service/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!profileResponse.ok) return;
      const user = await profileResponse.json();

      // Get class member ID via backend
      const classMemberResponse = await fetch(`/api/org-service/class-members/${courseClassId}/user/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (classMemberResponse.ok) {
        const classMember = await classMemberResponse.json();
        setClassMemberId(classMember.id);

        // Load existing progress
        const progressResponse = await fetch(`/api/org-service/lesson-progress?lesson_id=${lesson.id}&class_member_id=${classMember.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (progressResponse.ok) {
          const progress = await progressResponse.json();
          setIsCompleted(progress.status === 'completed');
          setProgressPercent(progress.progress_percent || 0);
        }
      }
    };
    
    getClassMemberId();
  }, [courseClassId, lesson.id, duration]);

  // Save video progress periodically
  useEffect(() => {
    if (!classMemberId || lesson.content_type !== 'video') return;
    
    const saveProgress = async () => {
      if (duration === 0) return;
      
      const newProgressPercent = Math.floor((currentTime / duration) * 100);
      if (newProgressPercent !== progressPercent) {
        setProgressPercent(newProgressPercent);
        
        const token = await getAuthToken();
        if (!token) return;

        const status = newProgressPercent >= 90 ? 'completed' : 'in_progress';
        
        await fetch('/api/org-service/lesson-progress', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            class_member_id: classMemberId,
            lesson_id: lesson.id,
            status: status,
            progress_percent: newProgressPercent,
            completed_at: newProgressPercent >= 90 ? new Date().toISOString() : null,
          })
        });
        
        if (newProgressPercent >= 90 && !isCompleted) {
          setIsCompleted(true);
          onComplete?.();
        }
      }
    };
    
    const interval = setInterval(saveProgress, 5000);
    return () => clearInterval(interval);
  }, [currentTime, duration, classMemberId, lesson.id, progressPercent, isCompleted, onComplete]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolume = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleMarkComplete = async () => {
    if (!classMemberId) {
      toast.error("Unable to save progress");
      return;
    }
    
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Authentication required");

      const response = await fetch('/api/org-service/lesson-progress', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          class_member_id: classMemberId,
          lesson_id: lesson.id,
          status: 'completed',
          progress_percent: 100,
          completed_at: new Date().toISOString(),
        })
      });

      if (!response.ok) throw new Error("Failed to mark complete");

      setIsCompleted(true);
      setProgressPercent(100);
      toast.success("Lesson marked as complete!");
      onComplete?.();
    } catch (error) {
      console.error("Error marking lesson complete:", error);
      toast.error("Failed to mark lesson as complete");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderVideoContent = () => {
    // Handle YouTube URLs
    const isYouTube = lesson.content_url?.includes('youtube.com/watch') || lesson.content_url?.includes('youtu.be/');
    let embedUrl = lesson.content_url;
    
    if (isYouTube) {
      const videoId = lesson.content_url?.split('v=')[1]?.split('&')[0] || 
                      lesson.content_url?.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
        return (
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <iframe
              src={`${embedUrl}?controls=1&modestbranding=1&rel=0`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={lesson.title}
            />
          </div>
        );
      }
    }
    
    // Regular video player
    return (
      <div className="relative">
        <video
          ref={videoRef}
          src={lesson.content_url}
          className="w-full rounded-lg"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          controls={false}
        />
        
        {/* Custom Video Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-4">
            <button onClick={handlePlayPause} className="text-white hover:text-purple-400 transition-colors">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            
            <div className="flex-1">
              <div className="bg-gray-600 rounded-full h-1 cursor-pointer">
                <div 
                  className="bg-purple-500 h-1 rounded-full relative"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-purple-500 rounded-full opacity-0 hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            
            <button onClick={handleVolume} className="text-white hover:text-purple-400 transition-colors">
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            
            <button onClick={handleFullscreen} className="text-white hover:text-purple-400 transition-colors">
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTextContent = () => {
    if (!lesson.content_json) {
      return <p className="text-gray-400">No content available.</p>;
    }
    
    return (
      <div 
        className="prose prose-invert prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: lesson.content_json }}
      />
    );
  };

  const renderQuizContent = () => {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-purple-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Quiz Content</h3>
        <p className="text-gray-400">
          Quiz functionality is integrated with the QuizComponent.
          Please use the QuizComponent wrapper for full quiz functionality.
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Content Player */}
      <div className="bg-slate-800/50 rounded-lg overflow-hidden">
        {lesson.content_type === "video" && renderVideoContent()}
        {lesson.content_type === "text" && (
          <div className="p-6 max-h-[600px] overflow-y-auto">
            {renderTextContent()}
          </div>
        )}
        {lesson.content_type === "quiz" && renderQuizContent()}
      </div>
      
      {/* Description (if any) */}
      {lesson.description && (
        <div className="bg-slate-800/30 rounded-lg p-4">
          <p className="text-gray-300">{lesson.description}</p>
        </div>
      )}
      
      {/* Progress and Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">
            {lesson.duration_seconds 
              ? `${Math.floor(lesson.duration_seconds / 60)} min ${lesson.duration_seconds % 60} sec`
              : "No duration set"}
          </span>
          {progressPercent > 0 && (
            <span className="text-sm text-green-400 ml-2">
              {progressPercent}% complete
            </span>
          )}
        </div>
        
        <div className="flex gap-3">
          {hasPrevious && (
            <GlowButton variant="secondary" onClick={onPrevious}>
              Previous
            </GlowButton>
          )}
          
          {!isCompleted && (
            <GlowButton 
              variant="primary" 
              onClick={handleMarkComplete}
              isLoading={isLoading}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Complete
            </GlowButton>
          )}
          
          {isCompleted && hasNext && (
            <GlowButton variant="primary" onClick={onNext}>
              Next Lesson
            </GlowButton>
          )}
        </div>
      </div>
    </div>
  );
}