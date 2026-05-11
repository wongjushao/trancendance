// frontend/app/(main)/courses/[id]/learn/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  FileText,
  CheckCircle,
  Clock,
  Download,
  BookOpen,
  HelpCircle,
  AlertCircle,
  Loader2,
  Award,
  Send,
  Upload,
  X,
  ChevronDown,
  XCircle,
  Check,
  Star,
  MessageSquare,
  ArrowLeft,
  FileQuestion,
  Video,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

// Types
interface CourseData {
  id: number;
  title: string;
  description: string;
  thumbnail: string | null;
  modules: ModuleData[];
  organization_id: number;
  organization_name?: string;
  instructor_name?: string;
  instructor_avatar?: string;
}

interface ModuleData {
  id: number;
  title: string;
  order_index: number;
  classes: ClassData[];
  progress: number;
  completed_count: number;
  total_count: number;
}

interface ClassData {
  id: number;
  title: string;
  order_index: number;
  lessons: LessonData[];
  progress: number;
  completed_count: number;
  total_count: number;
}

interface LessonData {
  id: number;
  title: string;
  content_type: "video" | "text" | "quiz";
  content_url: string | null;
  content_json: any;
  duration_seconds: number | null;
  order_index: number;
  is_free_preview: boolean;
  is_completed: boolean;
  progress_percent: number;
  assignments?: AssignmentData[];
}

interface AssignmentData {
  id: number;
  title: string;
  description: string;
  due_at: string | null;
  points: number;
  submission?: {
    id: number;
    submitted_at: string;
    content_url: string | null;
    text_content: string | null;
    grade: number | null;
    feedback: string | null;
  };
  status: "pending" | "submitted" | "graded" | "overdue";
}

// Video Player Component
function VideoPlayer({ 
  url, 
  title, 
  onProgress, 
  onComplete, 
  initialProgress = 0 
}: { 
  url: string; 
  title?: string; 
  onProgress?: (percent: number) => void;
  onComplete?: () => void;
  initialProgress?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [progressPercent, setProgressPercent] = useState(initialProgress);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<number>(0);

  const isYouTube = url?.includes("youtube.com") || url?.includes("youtu.be");
  const isVimeo = url?.includes("vimeo.com");

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (!document.fullscreenElement) {
        videoRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && duration > 0) {
      const time = videoRef.current.currentTime;
      const percent = (time / duration) * 100;
      setCurrentTime(time);
      
      if (Math.abs(percent - lastSavedRef.current) >= 2) {
        const roundedPercent = Math.floor(percent);
        setProgressPercent(roundedPercent);
        onProgress?.(roundedPercent);
        lastSavedRef.current = percent;
      }
      
      if (percent >= 90 && percent < 100) {
        onComplete?.();
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (initialProgress > 0 && initialProgress < 100) {
        const seekTime = (initialProgress / 100) * videoRef.current.duration;
        videoRef.current.currentTime = seekTime;
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const hideControls = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    hideControls();
  };

  if (isYouTube) {
    const videoId = url.split("v=")[1]?.split("&")[0] || url.split("youtu.be/")[1]?.split("?")[0];
    return (
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&enablejsapi=1`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title || "Video player"}
        />
      </div>
    );
  }

  if (isVimeo) {
    const videoId = url.split("/").pop()?.split("?")[0];
    return (
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={`https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0&app_id=58479`}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={title || "Video player"}
        />
      </div>
    );
  }

  return (
    <div 
      className="relative group bg-black rounded-lg overflow-hidden"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => setShowControls(true)}
    >
      <video
        ref={videoRef}
        src={url}
        className="w-full"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={handlePlayPause}
      />
      
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-white text-xs">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500"
          />
          <span className="text-white text-xs">{formatTime(duration)}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={handlePlayPause} className="text-white hover:text-purple-400 transition-colors">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-2">
            <button onClick={handleMute} className="text-white hover:text-purple-400 transition-colors">
              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500"
            />
          </div>
          
          <button onClick={handleFullscreen} className="text-white hover:text-purple-400 transition-colors ml-auto">
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
        
        {progressPercent > 0 && progressPercent < 100 && (
          <div className="mt-2 text-xs text-purple-400">
            {progressPercent}% watched
          </div>
        )}
      </div>
    </div>
  );
}

// Text Lesson Component
function TextLesson({ content, onMarkComplete }: { content: string; onMarkComplete: () => void }) {
  return (
    <div className="space-y-4">
      <div 
        className="prose prose-invert prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
      <div className="flex justify-end pt-4">
        <GlowButton onClick={onMarkComplete}>
          <CheckCircle className="w-4 h-4 mr-2" />
          Mark as Complete
        </GlowButton>
      </div>
    </div>
  );
}

// Quiz Component
function QuizComponent({ 
  quizData, 
  lessonId, 
  classMemberId,
  onComplete 
}: { 
  quizData: any; 
  lessonId: number;
  classMemberId: number | null;
  onComplete: (score: number, passed: boolean) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    quizData?.time_limit_minutes ? quizData.time_limit_minutes * 60 : null
  );
  const [submitting, setSubmitting] = useState(false);

  const questions = quizData?.questions || [];
  const passingScore = quizData?.passing_score || 70;

  useEffect(() => {
    if (!timeRemaining || submitted || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          if (prev === 0 || prev === 1) {
            handleSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, submitted]);

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleMultipleChoice = (questionId: string, option: string) => {
    const current = answers[questionId] || [];
    if (current.includes(option)) {
      handleAnswer(questionId, current.filter((o: string) => o !== option));
    } else {
      handleAnswer(questionId, [...current, option]);
    }
  };

  const calculateScore = () => {
    let totalPoints = 0;
    let earnedPoints = 0;

    questions.forEach((question: any) => {
      const userAnswer = answers[question.id];
      if (!userAnswer) return;

      totalPoints += question.points || 10;

      if (question.type === "multiple_choice") {
        const userAnswers = userAnswer as string[];
        const correctAnswers = question.correct_answer.split(",");
        const isCorrect =
          userAnswers.length === correctAnswers.length &&
          userAnswers.every((a) => correctAnswers.includes(a));
        if (isCorrect) earnedPoints += question.points || 10;
      } else if (question.type === "single_choice" || question.type === "true_false") {
        const isCorrect = userAnswer === question.correct_answer;
        if (isCorrect) earnedPoints += question.points || 10;
      }
    });

    const calculatedScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    return { score: calculatedScore, earnedPoints, totalPoints };
  };

  const handleSubmit = async () => {
    const allAnswered = questions.every((q: any) => answers[q.id]);
    if (!allAnswered) {
      toast.error("Please answer all questions before submitting");
      return;
    }

    setSubmitting(true);

    const { score: calculatedScore } = calculateScore();
    const hasPassed = calculatedScore >= passingScore;

    setScore(calculatedScore);
    setPassed(hasPassed);
    setSubmitted(true);
    onComplete(calculatedScore, hasPassed);

    setSubmitting(false);
    toast.success(
      hasPassed
        ? `Quiz passed! Score: ${calculatedScore.toFixed(1)}%`
        : `Quiz failed. Score: ${calculatedScore.toFixed(1)}%. Minimum passing: ${passingScore}%`
    );
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className={`p-6 rounded-lg border ${
          passed
            ? "bg-green-500/10 border-green-500/30"
            : "bg-red-500/10 border-red-500/30"
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {passed ? (
              <CheckCircle className="w-8 h-8 text-green-400" />
            ) : (
              <XCircle className="w-8 h-8 text-red-400" />
            )}
            <div>
              <h3 className="text-xl font-semibold text-white">
                {passed ? "Quiz Passed!" : "Quiz Failed"}
              </h3>
              <p className="text-gray-400">
                Your Score: {score.toFixed(1)}% (Required: {passingScore}%)
              </p>
            </div>
          </div>
          <Progress value={score} className="h-3" />
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-white">Review Answers</h4>
          {questions.map((question: any, idx: number) => {
            const userAnswer = answers[question.id];
            let isCorrect = false;

            if (question.type === "multiple_choice") {
              const userAnswers = userAnswer as string[];
              const correctAnswers = question.correct_answer.split(",");
              isCorrect =
                userAnswers?.length === correctAnswers.length &&
                userAnswers?.every((a) => correctAnswers.includes(a));
            } else {
              isCorrect = userAnswer === question.correct_answer;
            }

            return (
              <div
                key={question.id}
                className={`p-4 rounded-lg border ${
                  isCorrect
                    ? "bg-green-500/5 border-green-500/20"
                    : "bg-red-500/5 border-red-500/20"
                }`}
              >
                <p className="text-white font-medium">{idx + 1}. {question.text}</p>
                <p className="text-sm text-gray-400 mt-1">
                  Your answer: {Array.isArray(userAnswer) ? userAnswer.join(", ") : userAnswer || "Not answered"}
                </p>
                {!isCorrect && (
                  <p className="text-sm text-green-400 mt-1">
                    Correct answer: {Array.isArray(question.correct_answer) 
                      ? question.correct_answer.join(", ") 
                      : question.correct_answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-gray-800">
        <div>
          <p className="text-sm text-gray-400">Quiz</p>
          <p className="text-sm text-gray-400">{questions.length} questions</p>
        </div>
        {timeRemaining !== null && (
          <div className={`px-3 py-1 rounded-lg ${
            timeRemaining < 60 ? "bg-red-500/20 text-red-400" : "bg-gray-800 text-gray-300"
          }`}>
            <span className="text-sm font-mono">⏱ {formatTime(timeRemaining)}</span>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {questions.map((question: any, idx: number) => (
          <div key={question.id} className="space-y-4">
            <h3 className="text-lg font-medium text-white">
              {idx + 1}. {question.text}
              <span className="text-sm text-gray-400 ml-2">({question.points || 10} pts)</span>
            </h3>

            {question.type === "single_choice" && question.options && (
              <div className="space-y-2">
                {question.options.map((option: string, optIdx: number) => (
                  <label
                    key={optIdx}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      answers[question.id] === option
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-gray-700 bg-gray-800/50 hover:bg-gray-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option}
                      checked={answers[question.id] === option}
                      onChange={() => handleAnswer(question.id, option)}
                      className="w-4 h-4"
                    />
                    <span className="text-white">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {question.type === "multiple_choice" && question.options && (
              <div className="space-y-2">
                {question.options.map((option: string, optIdx: number) => (
                  <label
                    key={optIdx}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      answers[question.id]?.includes(option)
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-gray-700 bg-gray-800/50 hover:bg-gray-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={answers[question.id]?.includes(option) || false}
                      onChange={() => handleMultipleChoice(question.id, option)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-white">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {question.type === "true_false" && (
              <div className="flex gap-4">
                <label
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                    answers[question.id] === "true"
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-gray-700 bg-gray-800/50 hover:bg-gray-800"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value="true"
                    checked={answers[question.id] === "true"}
                    onChange={() => handleAnswer(question.id, "true")}
                    className="w-4 h-4"
                  />
                  <span className="text-white">True</span>
                </label>
                <label
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                    answers[question.id] === "false"
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-gray-700 bg-gray-800/50 hover:bg-gray-800"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value="false"
                    checked={answers[question.id] === "false"}
                    onChange={() => handleAnswer(question.id, "false")}
                    className="w-4 h-4"
                  />
                  <span className="text-white">False</span>
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-800">
        <GlowButton onClick={handleSubmit} isLoading={submitting}>
          Submit Quiz
        </GlowButton>
      </div>
    </div>
  );
}

// Assignment Submission Component - Refactored to use backend API
function AssignmentSubmission({ 
  assignment, 
  lessonId, 
  classMemberId,
  onSubmitted 
}: { 
  assignment: AssignmentData;
  lessonId: number;
  classMemberId: number | null;
  onSubmitted: () => void;
}) {
  const [textContent, setTextContent] = useState(assignment.submission?.text_content || "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      formData.append('assignment_id', assignment.id.toString());

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

      let response;
      
      if (assignment.submission) {
        response = await fetch(`/api/org-service/submissions/${assignment.submission.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            text_content: content || null,
            content_url: fileUrl || null,
          }),
        });
      } else {
        response = await fetch('/api/org-service/submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            assignment_id: assignment.id,
            text_content: content || null,
            file_url: fileUrl || null,
          }),
        });
      }

      if (!response?.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Submission failed');
      }

      toast.success(assignment.submission ? "Assignment updated!" : "Assignment submitted!");
      onSubmitted?.();
      
    } catch (error: any) {
      console.error("Error submitting assignment:", error);
      toast.error(error.message || "Failed to submit assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  const isSubmitted = assignment.submission && assignment.status !== "pending";
  const isGraded = assignment.status === "graded";

  if (isGraded && assignment.submission?.grade !== undefined) {
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
              {assignment.submission.grade}/{assignment.points}
            </span>
          </div>
          {assignment.submission.content_url && (
            <a 
              href={assignment.submission.content_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 bg-gray-800/50 rounded text-purple-400 hover:text-purple-300"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Download Your Submission</span>
            </a>
          )}
          {assignment.submission.feedback && (
            <div className="p-3 bg-gray-800/50 rounded">
              <p className="text-gray-400 mb-1">Feedback:</p>
              <p className="text-white whitespace-pre-wrap">{assignment.submission.feedback}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="bg-gray-800/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-6 h-6 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Assignment Submitted</h3>
        </div>
        <p className="text-gray-400 mb-2">
          Submitted on: {new Date(assignment.submission!.submitted_at).toLocaleString()}
        </p>
        {assignment.submission!.content_url && (
          <a 
            href={assignment.submission!.content_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
          >
            <Download className="w-4 h-4" />
            View Submission
          </a>
        )}
        <p className="text-xs text-gray-500 mt-4">
          Your submission is pending grading. You'll receive feedback soon.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <p className="text-sm text-yellow-400">
          {assignment.due_at && new Date(assignment.due_at) < new Date() 
            ? "⚠️ This assignment is overdue. Submit as soon as possible."
            : `📝 Due: ${assignment.due_at ? new Date(assignment.due_at).toLocaleString() : "No due date"}`}
        </p>
      </div>

      <div>
        <Label className="text-white mb-2 block">Text Response</Label>
        <Textarea
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Write your answer here..."
          rows={8}
          className="bg-gray-800/50 border-gray-700"
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

      <div className="flex justify-end">
        <GlowButton onClick={() => submitAssignment(undefined, textContent)} isLoading={submitting}>
          <Send className="w-4 h-4 mr-2" />
          Submit Assignment
        </GlowButton>
      </div>
    </div>
  );
}

// Sidebar Component
interface SidebarProps {
  course: CourseData;
  modules: ModuleData[];
  currentLessonId: number | null;
  onLessonSelect: (lessonId: number) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  overallProgress: number;
  classMemberId: number | null;
  userReview: any;
  onRateClick: () => void;
  averageRating: number;
  courseReviews: any[];
  dashboardSidebarCollapsed: boolean;
}

function Sidebar({ 
  course, 
  modules, 
  currentLessonId, 
  onLessonSelect, 
  isCollapsed, 
  onToggleCollapse,
  overallProgress,
  classMemberId,
  userReview,
  onRateClick,
  averageRating,
  courseReviews,
  dashboardSidebarCollapsed 
}: SidebarProps) {
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set(modules.map(m => m.id)));

  const toggleModule = (moduleId: number) => {
    const newSet = new Set(expandedModules);
    if (newSet.has(moduleId)) {
      newSet.delete(moduleId);
    } else {
      newSet.add(moduleId);
    }
    setExpandedModules(newSet);
  };

  return (
    <div className={`fixed top-16 bottom-0 z-20 bg-gray-900 border-r border-gray-800 transition-all duration-300 flex flex-col ${
      isCollapsed ? "w-16" : "w-80"
    } ${dashboardSidebarCollapsed ? "left-16" : "left-64"}`}>
      <div className="p-4 border-b border-gray-800">
        {!isCollapsed && (
          <div className="mb-3">
            <h2 className="font-semibold text-white truncate text-lg">{course.title}</h2>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Progress</span>
                <span>{Math.floor(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-1.5" />
            </div>
          </div>
        )}
        <button          onClick={onToggleCollapse}
          className={`p-2 rounded-lg hover:bg-gray-800 transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        <div className="space-y-2">
          {!isCollapsed && (
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">Curriculum</h3>
          )}
          {modules.map((module) => (
            <div key={module.id} className="space-y-1">
              <button
                onClick={() => toggleModule(module.id)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-colors ${
                  isCollapsed ? "justify-center" : ""
                }`}
              >
                {expandedModules.has(module.id) ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                {!isCollapsed && (
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white truncate">{module.title}</p>
                    {module.progress > 0 && (
                      <Progress value={module.progress} className="h-1 mt-1" />
                    )}
                  </div>
                )}
              </button>

              {expandedModules.has(module.id) && !isCollapsed && (
                <div className="ml-6 space-y-1">
                  {module.classes.map((classItem) => (
                    <div key={classItem.id} className="space-y-1">
                      <p className="text-xs font-medium text-gray-400 px-2 py-1">
                        {classItem.title}
                      </p>
                      <div className="space-y-1">
                        {classItem.lessons.map((lesson) => (
                          <button
                            key={lesson.id}
                            onClick={() => onLessonSelect(lesson.id)}
                            className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left ${
                              currentLessonId === lesson.id
                                ? "bg-purple-500/20 text-purple-400"
                                : lesson.is_completed
                                ? "text-green-400 hover:bg-gray-800"
                                : "text-gray-300 hover:bg-gray-800"
                            }`}
                          >
                            {lesson.is_completed ? (
                              <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            ) : (
                              <div className="w-4 h-4 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{lesson.title}</p>
                              {lesson.progress_percent > 0 && lesson.progress_percent < 100 && (
                                <Progress value={lesson.progress_percent} className="h-0.5 mt-1" />
                              )}
                            </div>
                            {lesson.duration_seconds && (
                              <span className="text-xs text-gray-500 flex-shrink-0">
                                {Math.floor(lesson.duration_seconds / 60)}min
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {!isCollapsed && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-purple-600 text-white">
                {course.instructor_name?.charAt(0) || "I"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400">Instructor</p>
              <p className="text-sm text-white font-medium truncate">{course.instructor_name}</p>
            </div>
          </div>

          <div className="space-y-2">
            {userReview ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= userReview.rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">You rated this</span>
                </div>
              </div>
            ) : (
              <GlowButton variant="outline" size="sm" fullWidth onClick={onRateClick}>
                <Star className="w-4 h-4 mr-2" />
                Rate This Course
              </GlowButton>
            )}
          </div>

          {courseReviews.length > 0 && (
            <div className="pt-2 border-t border-gray-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Course Rating</span>
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          star <= averageRating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-400">{averageRating.toFixed(1)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {courseReviews.length} {courseReviews.length === 1 ? "review" : "reviews"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CourseLearnPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);
  const supabase = getSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [currentLesson, setCurrentLesson] = useState<LessonData | null>(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<{ moduleIndex: number; classIndex: number; lessonIndex: number } | null>(null);
  const [classMemberId, setClassMemberId] = useState<number | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardSidebarCollapsed, setDashboardSidebarCollapsed] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<"content" | "assignments" | "resources" | "discussion">("content");
  const [user, setUser] = useState<any>(null);
  const [courseReviews, setCourseReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [userReview, setUserReview] = useState<any>(null);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // ========== HELPER FUNCTIONS ==========
  const getAuthToken = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const token = await getAuthToken();
    if (!token) throw new Error("Not authenticated");
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `Request failed: ${response.status}`);
    }
    
    return response.json();
  };

  const getCurrentUserProfile = async () => {
    return apiRequest('/api/auth-service/profile');
  };

  // ========== LOAD DATA ==========
  const loadData = async () => {
    setLoading(true);
    try {
      const userProfile = await getCurrentUserProfile();
      if (!userProfile) {
        router.push("/login");
        return;
      }
      setUser(userProfile);

      const courseDetail = await apiRequest(`/api/org-service/courses/${courseId}/detail`);
      
      if (!courseDetail.course) {
        toast.error("Course not found");
        router.push(`/courses/${courseId}`);
        return;
      }

      let cmId = courseDetail.class_member_id;

      if (!cmId && courseDetail.course.created_by === userProfile.id) {
        console.log("Course creator accessing without enrollment");
        cmId = -1;
      }

      if (!cmId) {
        toast.error("You are not enrolled in this course");
        router.push(`/courses/${courseId}`);
        return;
      }
      setClassMemberId(cmId);

      const progressMap = new Map();
      const rawModules = courseDetail.modules || [];

      for (const module of rawModules) {
        for (const classItem of module.classes || []) {
          for (const lesson of classItem.lessons || []) {
            try {
              const progress = await apiRequest(`/api/org-service/lesson-progress?lesson_id=${lesson.id}&class_member_id=${cmId}`);
              if (progress && progress.status) {
                progressMap.set(lesson.id, {
                  status: progress.status,
                  progress_percent: progress.progress_percent || 0,
                });
              }
            } catch (e) {
              // No progress record yet
            }
          }
        }
      }

      const reviews = courseDetail.reviews || [];
      setCourseReviews(reviews);
      if (reviews.length > 0) {
        const avg = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
        setAverageRating(avg);
      }
      const userReviewData = reviews.find((r: any) => r.user?.id === userProfile.id);
      setUserReview(userReviewData);

      let totalLessons = 0;
      let completedLessons = 0;

      const modulesWithProgress: ModuleData[] = rawModules.map((module: any) => {
        const classesWithProgress: ClassData[] = (module.classes || []).map((classItem: any) => {
          const lessonsWithProgress: LessonData[] = (classItem.lessons || []).map((lesson: any) => {
            const progress = progressMap.get(lesson.id);
            const isCompleted = progress?.status === "completed";

            totalLessons++;
            if (isCompleted) completedLessons++;

            let assignments: AssignmentData[] = [];
            if (lesson.assignments && lesson.assignments.length > 0) {
              assignments = lesson.assignments.map((assignment: any) => {
                let status: AssignmentData["status"] = "pending";
                if (assignment.submission) {
                  status = assignment.submission.grade !== null ? "graded" : "submitted";
                } else if (assignment.due_at && new Date(assignment.due_at) < new Date()) {
                  status = "overdue";
                }
                return {
                  id: assignment.id,
                  title: assignment.title,
                  description: assignment.description || "",
                  due_at: assignment.due_at,
                  points: assignment.points,
                  submission: assignment.submission,
                  status,
                };
              });
            }

            return {
              id: lesson.id,
              title: lesson.title,
              content_type: lesson.content_type,
              content_url: lesson.content_url,
              content_json: lesson.content_json,
              duration_seconds: lesson.duration_seconds,
              order_index: lesson.order_index,
              is_free_preview: lesson.is_free_preview,
              is_completed: isCompleted,
              progress_percent: progress?.progress_percent || 0,
              assignments,
            };
          }).sort((a, b) => a.order_index - b.order_index);

          const completedInClass = lessonsWithProgress.filter(l => l.is_completed).length;
          const classProgress = lessonsWithProgress.length > 0 ? (completedInClass / lessonsWithProgress.length) * 100 : 0;

          return {
            id: classItem.id,
            title: classItem.title,
            order_index: classItem.order_index,
            lessons: lessonsWithProgress,
            completed_count: completedInClass,
            total_count: lessonsWithProgress.length,
            progress: classProgress,
          };
        }).sort((a, b) => a.order_index - b.order_index);

        const completedInModule = classesWithProgress.reduce((sum, c) => sum + c.completed_count, 0);
        const totalInModule = classesWithProgress.reduce((sum, c) => sum + c.total_count, 0);
        const moduleProgress = totalInModule > 0 ? (completedInModule / totalInModule) * 100 : 0;

        return {
          id: module.id,
          title: module.title,
          order_index: module.order_index,
          classes: classesWithProgress,
          completed_count: completedInModule,
          total_count: totalInModule,
          progress: moduleProgress,
        };
      }).sort((a, b) => a.order_index - b.order_index);

      setModules(modulesWithProgress);
      setOverallProgress(totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0);

      setCourse({
        id: courseDetail.course.id,
        title: courseDetail.course.title,
        description: courseDetail.course.description || "",
        thumbnail: courseDetail.course.thumbnail,
        modules: modulesWithProgress,
        organization_id: courseDetail.course.organization_id,
        organization_name: courseDetail.course.organization_name,
        instructor_name: courseDetail.course.instructor_name || "Instructor",
        instructor_avatar: courseDetail.course.instructor_avatar,
      });

      let firstLesson: LessonData | null = null;
      let firstLessonIndices = { moduleIndex: -1, classIndex: -1, lessonIndex: -1 };

      for (let mIdx = 0; mIdx < modulesWithProgress.length; mIdx++) {
        for (let cIdx = 0; cIdx < modulesWithProgress[mIdx].classes.length; cIdx++) {
          for (let lIdx = 0; lIdx < modulesWithProgress[mIdx].classes[cIdx].lessons.length; lIdx++) {
            const lesson = modulesWithProgress[mIdx].classes[cIdx].lessons[lIdx];
            if (!lesson.is_completed) {
              firstLesson = lesson;
              firstLessonIndices = { moduleIndex: mIdx, classIndex: cIdx, lessonIndex: lIdx };
              break;
            }
          }
          if (firstLesson) break;
        }
        if (firstLesson) break;
      }

      if (firstLesson) {
        setCurrentLesson(firstLesson);
        setCurrentLessonIndex(firstLessonIndices);
      } else if (modulesWithProgress[0]?.classes[0]?.lessons[0]) {
        setCurrentLesson(modulesWithProgress[0].classes[0].lessons[0]);
        setCurrentLessonIndex({ moduleIndex: 0, classIndex: 0, lessonIndex: 0 });
      }

    } catch (error) {
      console.error("Error loading course:", error);
      toast.error("Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  // ========== USE EFFECT ==========
  useEffect(() => {
    loadData();
  }, [courseId, router]);

  useEffect(() => {
    const handleSidebarToggle = (event: CustomEvent) => {
      setDashboardSidebarCollapsed(event.detail.collapsed);
    };
    
    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    
    const savedState = localStorage.getItem("sidebar_collapsed");
    if (savedState !== null) {
      setDashboardSidebarCollapsed(savedState === "true");
    }
    
    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    };
  }, []);

  // ========== NAVIGATION FUNCTIONS ==========
  const navigateToLesson = (moduleIndex: number, classIndex: number, lessonIndex: number) => {
    const lesson = modules[moduleIndex]?.classes[classIndex]?.lessons[lessonIndex];
    if (lesson) {
      setCurrentLesson(lesson);
      setCurrentLessonIndex({ moduleIndex, classIndex, lessonIndex });
      setActiveTab("content");
    }
  };

  const navigateNextLesson = () => {
    if (!currentLessonIndex) return;
    
    let { moduleIndex, classIndex, lessonIndex } = currentLessonIndex;
    const currentModule = modules[moduleIndex];
    const currentClass = currentModule?.classes[classIndex];
    
    if (lessonIndex + 1 < currentClass.lessons.length) {
      navigateToLesson(moduleIndex, classIndex, lessonIndex + 1);
      return;
    }
    
    if (classIndex + 1 < currentModule.classes.length) {
      navigateToLesson(moduleIndex, classIndex + 1, 0);
      return;
    }
    
    if (moduleIndex + 1 < modules.length) {
      navigateToLesson(moduleIndex + 1, 0, 0);
      return;
    }
    
    toast.success("Congratulations! You've completed all lessons in this course!");
    router.push(`/courses/${courseId}`);
  };

  const navigatePreviousLesson = () => {
    if (!currentLessonIndex) return;
    
    let { moduleIndex, classIndex, lessonIndex } = currentLessonIndex;
    const currentModule = modules[moduleIndex];
    const currentClass = currentModule?.classes[classIndex];
    
    if (lessonIndex - 1 >= 0) {
      navigateToLesson(moduleIndex, classIndex, lessonIndex - 1);
      return;
    }
    
    if (classIndex - 1 >= 0) {
      const prevClass = currentModule.classes[classIndex - 1];
      navigateToLesson(moduleIndex, classIndex - 1, prevClass.lessons.length - 1);
      return;
    }
    
    if (moduleIndex - 1 >= 0) {
      const prevModule = modules[moduleIndex - 1];
      const prevClass = prevModule.classes[prevModule.classes.length - 1];
      navigateToLesson(moduleIndex - 1, prevModule.classes.length - 1, prevClass.lessons.length - 1);
      return;
    }
  };

  // ========== PROGRESS UPDATE ==========
  const updateLessonProgress = async (lessonId: number, progressPercent: number, status: "not_started" | "in_progress" | "completed") => {
    if (!classMemberId || !user) return;

    try {
      await apiRequest('/api/org-service/lesson-progress', {
        method: 'POST',
        body: JSON.stringify({
          class_member_id: classMemberId,
          lesson_id: lessonId,
          user_id: user.id,
          status: status,
          progress_percent: Math.floor(progressPercent),
          last_accessed_at: new Date().toISOString(),
          completed_at: status === "completed" ? new Date().toISOString() : null,
        })
      });

      setModules(prevModules => {
        const newModules = [...prevModules];
        for (let mIdx = 0; mIdx < newModules.length; mIdx++) {
          for (let cIdx = 0; cIdx < newModules[mIdx].classes.length; cIdx++) {
            for (let lIdx = 0; lIdx < newModules[mIdx].classes[cIdx].lessons.length; lIdx++) {
              if (newModules[mIdx].classes[cIdx].lessons[lIdx].id === lessonId) {
                newModules[mIdx].classes[cIdx].lessons[lIdx].is_completed = status === "completed";
                newModules[mIdx].classes[cIdx].lessons[lIdx].progress_percent = progressPercent;
                
                const classLessons = newModules[mIdx].classes[cIdx].lessons;
                const completedInClass = classLessons.filter(l => l.is_completed).length;
                newModules[mIdx].classes[cIdx].completed_count = completedInClass;
                newModules[mIdx].classes[cIdx].progress = classLessons.length > 0 ? (completedInClass / classLessons.length) * 100 : 0;
                
                const moduleClasses = newModules[mIdx].classes;
                const completedInModule = moduleClasses.reduce((sum, c) => sum + c.completed_count, 0);
                const totalInModule = moduleClasses.reduce((sum, c) => sum + c.total_count, 0);
                newModules[mIdx].completed_count = completedInModule;
                newModules[mIdx].progress = totalInModule > 0 ? (completedInModule / totalInModule) * 100 : 0;
                
                let total = 0, completed = 0;
                for (const module of newModules) {
                  completed += module.completed_count;
                  total += module.total_count;
                }
                setOverallProgress(total > 0 ? (completed / total) * 100 : 0);
                break;
              }
            }
          }
        }
        return newModules;
      });

      if (currentLesson?.id === lessonId && status === "completed") {
        setCurrentLesson(prev => prev ? { ...prev, is_completed: true, progress_percent: progressPercent } : prev);
      }

    } catch (error) {
      console.error("Error updating lesson progress:", error);
    }
  };

  // ========== EVENT HANDLERS ==========
  const handleVideoProgress = (percent: number) => {
    if (currentLesson && currentLesson.content_type === "video" && !currentLesson.is_completed) {
      const roundedPercent = Math.floor(percent);
      const status = roundedPercent >= 90 ? "completed" : "in_progress";
      updateLessonProgress(currentLesson.id, roundedPercent, status);
    }
  };

  const handleVideoComplete = () => {
    if (currentLesson && currentLesson.content_type === "video" && !currentLesson.is_completed) {
      updateLessonProgress(currentLesson.id, 100, "completed");
      toast.success("Lesson completed!");
    }
  };

  const handleTextComplete = () => {
    if (currentLesson && currentLesson.content_type === "text" && !currentLesson.is_completed) {
      updateLessonProgress(currentLesson.id, 100, "completed");
      toast.success("Lesson marked as complete!");
      setTimeout(() => navigateNextLesson(), 1500);
    }
  };

  const handleQuizComplete = (score: number, passed: boolean) => {
    if (currentLesson && currentLesson.content_type === "quiz") {
      const progressPercent = passed ? 100 : Math.floor(Math.min(score, 99));
      const status = passed ? "completed" : "in_progress";
      updateLessonProgress(currentLesson.id, progressPercent, status);
      
      if (passed) {
        toast.success(`Quiz passed! Score: ${score.toFixed(1)}%`);
        setTimeout(() => navigateNextLesson(), 2000);
      } else {
        toast.warning(`Quiz not passed. Score: ${score.toFixed(1)}%. Try again.`);
      }
    }
  };

  const handleAssignmentSubmitted = () => {
    window.location.reload();
  };

  const handleSubmitRating = async () => {
    if (ratingValue === 0) {
      toast.error("Please select a rating");
      return;
    }
    
    setSubmittingRating(true);
    
    try {
      await apiRequest(`/api/org-service/courses/${courseId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating: ratingValue,
          review: reviewText.trim() || null,
        })
      });
      
      toast.success("Thank you for your rating!");
      setShowRatingModal(false);
      setRatingValue(0);
      setReviewText("");
      
      const courseDetail = await apiRequest(`/api/org-service/courses/${courseId}/detail`);
      const reviews = courseDetail.reviews || [];
      setCourseReviews(reviews);
      if (reviews.length > 0) {
        const avg = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
        setAverageRating(avg);
      }
      const userProfile = await getCurrentUserProfile();
      const userReviewData = reviews.find((r: any) => r.user?.id === userProfile.id);
      setUserReview(userReviewData);
      
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Failed to submit rating. Please try again.");
    } finally {
      setSubmittingRating(false);
    }
  };

  // ========== HELPER FUNCTIONS FOR RENDER ==========
  const getContentIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="w-5 h-5" />;
      case "text": return <FileText className="w-5 h-5" />;
      case "quiz": return <FileQuestion className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const hasNextLesson = (): boolean => {
    if (!currentLessonIndex) return false;
    let { moduleIndex, classIndex, lessonIndex } = currentLessonIndex;
    const currentModule = modules[moduleIndex];
    const currentClass = currentModule?.classes[classIndex];
    
    if (lessonIndex + 1 < currentClass.lessons.length) return true;
    if (classIndex + 1 < currentModule.classes.length) return true;
    if (moduleIndex + 1 < modules.length) return true;
    return false;
  };

  const hasPreviousLesson = (): boolean => {
    if (!currentLessonIndex) return false;
    let { moduleIndex, classIndex, lessonIndex } = currentLessonIndex;
    
    if (lessonIndex - 1 >= 0) return true;
    if (classIndex - 1 >= 0) return true;
    if (moduleIndex - 1 >= 0) return true;
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Course Not Found</h2>
        <Link href={`/courses/${courseId}`}>
          <GlowButton variant="outline">Back to Course</GlowButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Sidebar
        course={course}
        modules={modules}
        currentLessonId={currentLesson?.id ?? null}
        onLessonSelect={(lessonId) => {
          for (let mIdx = 0; mIdx < modules.length; mIdx++) {
            for (let cIdx = 0; cIdx < modules[mIdx].classes.length; cIdx++) {
              for (let lIdx = 0; lIdx < modules[mIdx].classes[cIdx].lessons.length; lIdx++) {
                if (modules[mIdx].classes[cIdx].lessons[lIdx].id === lessonId) {
                  navigateToLesson(mIdx, cIdx, lIdx);
                  return;
                }
              }
            }
          }
        }}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        overallProgress={overallProgress}
        classMemberId={classMemberId}
        userReview={userReview}
        averageRating={averageRating}
        courseReviews={courseReviews}
        onRateClick={() => setShowRatingModal(true)}
        dashboardSidebarCollapsed={dashboardSidebarCollapsed}
      />

      <div 
        className={`transition-all duration-300 ${
          sidebarCollapsed 
            ? dashboardSidebarCollapsed ? "ml-80" : "ml-96"
            : dashboardSidebarCollapsed ? "ml-96" : "ml-[576px]"
        }`}
      >
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
          <div className="flex items-center justify-between px-6 py-3">
            <Link href={`/courses/${courseId}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Course</span>
            </Link>
            <div className="flex items-center gap-3">
              <Badge className="bg-purple-500/20 text-purple-400">
                {Math.floor(overallProgress)}% Complete
              </Badge>
              <div className="w-32">
                <Progress value={overallProgress} className="h-1.5" />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">{currentLesson.title}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                {getContentIcon(currentLesson.content_type)}
                <span className="capitalize">{currentLesson.content_type} Lesson</span>
              </div>
              {currentLesson.duration_seconds && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{Math.floor(currentLesson.duration_seconds / 60)} min {currentLesson.duration_seconds % 60} sec</span>
                  </div>
                </>
              )}
              {currentLesson.is_completed && (
                <>
                  <span>•</span>
                  <Badge className="bg-green-500/20 text-green-400">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                </>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
            <TabsList className="bg-gray-800/50 border border-gray-700">
              <TabsTrigger value="content">Lesson Content</TabsTrigger>
              {currentLesson.assignments && currentLesson.assignments.length > 0 && (
                <TabsTrigger value="assignments">
                  Assignments ({currentLesson.assignments.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-6">
              <GlowCard>
                <div className="p-6">
                  {currentLesson.content_type === "video" && currentLesson.content_url && (
                    <VideoPlayer
                      url={currentLesson.content_url}
                      title={currentLesson.title}
                      onProgress={handleVideoProgress}
                      onComplete={handleVideoComplete}
                      initialProgress={currentLesson.progress_percent}
                    />
                  )}
                  
                  {currentLesson.content_type === "text" && currentLesson.content_json && (
                    <TextLesson
                      content={currentLesson.content_json}
                      onMarkComplete={handleTextComplete}
                    />
                  )}
                  
                  {currentLesson.content_type === "quiz" && currentLesson.content_json && (
                    <QuizComponent
                      quizData={currentLesson.content_json}
                      lessonId={currentLesson.id}
                      classMemberId={classMemberId}
                      onComplete={handleQuizComplete}
                    />
                  )}
                </div>
              </GlowCard>

              <div className="flex justify-between gap-4 mt-6">
                <GlowButton
                  variant="outline"
                  onClick={navigatePreviousLesson}
                  disabled={!hasPreviousLesson()}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous Lesson
                </GlowButton>
                
                {!currentLesson.is_completed && currentLesson.content_type !== "quiz" && currentLesson.content_type !== "text" && (
                  <GlowButton
                    onClick={() => updateLessonProgress(currentLesson.id, 100, "completed")}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Complete
                  </GlowButton>
                )}
                
                {currentLesson.is_completed && hasNextLesson() && (
                  <GlowButton onClick={navigateNextLesson}>
                    Next Lesson
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </GlowButton>
                )}
              </div>
            </TabsContent>

            {currentLesson.assignments && currentLesson.assignments.length > 0 && (
              <TabsContent value="assignments" className="mt-6">
                <GlowCard>
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Assignments</h2>
                    <div className="space-y-6">
                      {currentLesson.assignments.map((assignment) => (
                        <div key={assignment.id} className="border border-gray-800 rounded-lg p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-white">{assignment.title}</h3>
                              <p className="text-sm text-gray-400 mt-1">
                                {assignment.points} points • 
                                {assignment.due_at 
                                  ? ` Due: ${new Date(assignment.due_at).toLocaleString()}`
                                  : " No due date"}
                              </p>
                            </div>
                            <Badge className={
                              assignment.status === "graded" ? "bg-green-500/20 text-green-400" :
                              assignment.status === "submitted" ? "bg-yellow-500/20 text-yellow-400" :
                              assignment.status === "overdue" ? "bg-red-500/20 text-red-400" :
                              "bg-gray-500/20 text-gray-400"
                            }>
                              {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                            </Badge>
                          </div>
                          
                          {assignment.description && (
                            <div 
                              className="prose prose-invert prose-sm max-w-none mb-4"
                              dangerouslySetInnerHTML={{ __html: assignment.description }}
                            />
                          )}
                          
                          <AssignmentSubmission
                            assignment={assignment}
                            lessonId={currentLesson.id}
                            classMemberId={classMemberId}
                            onSubmitted={handleAssignmentSubmitted}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </GlowCard>
              </TabsContent>
            )}

            <TabsContent value="resources" className="mt-6">
              <GlowCard>
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">Lesson Resources</h2>
                  {currentLesson.content_json?.resources && currentLesson.content_json.resources.length > 0 ? (
                    <div className="space-y-3">
                      {currentLesson.content_json.resources.map((resource: any, idx: number) => (
                        <a
                          key={idx}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                        >
                          <Download className="w-5 h-5 text-purple-400" />
                          <div className="flex-1">
                            <p className="text-white font-medium">{resource.name}</p>
                            <p className="text-xs text-gray-500">{resource.type}</p>
                          </div>
                          <span className="text-sm text-gray-400">
                            {(resource.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No resources available for this lesson</p>
                    </div>
                  )}
                </div>
              </GlowCard>
            </TabsContent>

            <TabsContent value="discussion" className="mt-6">
              <GlowCard>
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">Course Discussion</h2>
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                    <p className="text-gray-400">Join the conversation with fellow students</p>
                    <Link href={`/courses/${courseId}/chat`}>
                      <GlowButton className="mt-4">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Go to Course Chat
                      </GlowButton>
                    </Link>
                  </div>
                </div>
              </GlowCard>
            </TabsContent>
          </Tabs>

          {showRatingModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
              <div className="bg-gray-900 rounded-xl max-w-md w-full mx-4 p-6 border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">Rate This Course</h3>
                  <button onClick={() => setShowRatingModal(false)} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-center gap-2 py-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRatingValue(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-10 h-10 ${
                            star <= (hoverRating || ratingValue)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-600"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  
                  <div>
                    <Label className="text-gray-300">Your Review (Optional)</Label>
                    <Textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Share your thoughts about this course..."
                      rows={4}
                      className="mt-2 bg-gray-800/50 border-gray-700"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <GlowButton variant="outline" onClick={() => setShowRatingModal(false)} fullWidth>
                      Cancel
                    </GlowButton>
                    <GlowButton onClick={handleSubmitRating} isLoading={submittingRating} fullWidth>
                      Submit Rating
                    </GlowButton>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}