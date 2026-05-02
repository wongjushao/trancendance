// frontend/components/course/LessonPlayer.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, ChevronLeft, ChevronRight, CheckCircle, Clock, FileText } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { QuizComponent } from "./QuizComponent";
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

export function LessonPlayer({
  lesson,
  courseClassId,
  onComplete,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}: LessonPlayerProps) {
  const supabase = getSupabaseBrowserClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [classMemberId, setClassMemberId] = useState<number | null>(null);

  // Get class member ID
  useEffect(() => {
    const getClassMemberId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: classMember } = await supabase
        .from("class_members")
        .select("id")
        .eq("course_class_id", courseClassId)
        .eq("user_id", user.id)
        .single();

      if (classMember) {
        setClassMemberId(classMember.id);
        
        // Load existing progress
        const { data: progress } = await supabase
          .from("lesson_progress")
          .select("status, progress_percent")
          .eq("lesson_id", lesson.id)
          .eq("class_member_id", classMember.id)
          .single();

        if (progress) {
          setIsCompleted(progress.status === "completed");
          if (progress.progress_percent) {
            setProgress(progress.progress_percent);
          }
        }
      }
    };

    getClassMemberId();
  }, [courseClassId, lesson.id]);

  // Save video progress periodically
  useEffect(() => {
    if (!videoRef.current || lesson.content_type !== "video") return;

    const saveInterval = setInterval(async () => {
      if (videoRef.current && currentTime > 0 && !isCompleted) {
        const percentComplete = (currentTime / duration) * 100;
        setProgress(percentComplete);

        const { data: { user } } = await supabase.auth.getUser();
        if (user && classMemberId) {
          await supabase
            .from("lesson_progress")
            .upsert({
              user_id: user.id,
              lesson_id: lesson.id,
              class_member_id: classMemberId,
              status: percentComplete >= 90 ? "completed" : "in_progress",
              progress_percent: Math.min(percentComplete, 100),
              last_accessed_at: new Date().toISOString(),
              completed_at: percentComplete >= 90 && !isCompleted ? new Date().toISOString() : null,
            }, {
              onConflict: "user_id,lesson_id,class_member_id",
            });

          if (percentComplete >= 90 && !isCompleted) {
            setIsCompleted(true);
            toast.success("Lesson completed!");
            onComplete?.();
          }
        }
      }
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [currentTime, duration, isCompleted, classMemberId, lesson.id, lesson.content_type]);

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
      videoRef.current.requestFullscreen();
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
    if (isCompleted) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (user && classMemberId) {
      await supabase
        .from("lesson_progress")
        .upsert({
          user_id: user.id,
          lesson_id: lesson.id,
          class_member_id: classMemberId,
          status: "completed",
          progress_percent: 100,
          completed_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,lesson_id,class_member_id",
        });

      setIsCompleted(true);
      toast.success("Lesson marked as complete!");
      onComplete?.();
    }
    setLoading(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Quiz content type
  if (lesson.content_type === "quiz") {
    const quizData = {
      questions: lesson.content_json?.questions || [],
      passing_score: lesson.content_json?.passing_score || 70,
      time_limit_minutes: lesson.content_json?.time_limit_minutes,
      attempts_allowed: lesson.content_json?.attempts_allowed || 3,
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Lesson
          </button>
          <button
            onClick={onNext}
            disabled={!hasNext || !isCompleted}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next Lesson
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <QuizComponent
          lessonId={lesson.id}
          courseClassId={courseClassId}
          quizData={quizData}
          onComplete={() => {
            setIsCompleted(true);
            onComplete?.();
          }}
        />
      </div>
    );
  }

  // Text content type
  if (lesson.content_type === "text") {
    return (
      <div className="space-y-6">
        <div className="prose prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: lesson.content_json?.content || lesson.description || "" }} />
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-gray-800">
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Lesson
          </button>

          {!isCompleted && (
            <GlowButton onClick={handleMarkComplete} isLoading={loading}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Complete
            </GlowButton>
          )}

          {isCompleted && (
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Lesson
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Video content type
  return (
    <div className="space-y-6">
      {/* Video Player */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={lesson.content_url}
          className="w-full aspect-video"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onClick={handlePlayPause}
        />

        {/* Video Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center gap-4">
            <button onClick={handlePlayPause} className="text-white hover:text-purple-400">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <div className="flex-1">
              <div className="w-full bg-gray-600 rounded-full h-1 cursor-pointer">
                <div
                  className="bg-purple-500 h-1 rounded-full transition-all"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <button onClick={handleVolume} className="text-white hover:text-purple-400">
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <button onClick={handleFullscreen} className="text-white hover:text-purple-400">
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Lesson Info & Progress */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">{lesson.title}</h2>
          {lesson.duration_seconds && (
            <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              {Math.floor(lesson.duration_seconds / 60)} minutes
            </p>
          )}
        </div>

        {!isCompleted && progress > 0 && progress < 90 && (
          <div className="text-right">
            <p className="text-sm text-gray-400">Watched: {Math.floor(progress)}%</p>
            <div className="w-32 bg-gray-700 rounded-full h-1 mt-1">
              <div className="bg-purple-500 h-1 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {!isCompleted && progress >= 90 && (
          <GlowButton onClick={handleMarkComplete} isLoading={loading} size="sm">
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete Lesson
          </GlowButton>
        )}

        {isCompleted && (
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm">Completed</span>
          </div>
        )}
      </div>

      {/* Description */}
      {lesson.description && (
        <div className="p-4 bg-gray-800/50 rounded-lg">
          <p className="text-gray-300">{lesson.description}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-800">
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous Lesson
        </button>

        {isCompleted && (
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next Lesson
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}