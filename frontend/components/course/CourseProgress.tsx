// frontend/components/course/CourseProgress.tsx
"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Circle, Lock, PlayCircle, Trophy, TrendingUp } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { Progress } from "@/components/ui/progress";

interface CourseProgressProps {
  courseId: number;
  courseClassId: number;
  userId?: string;
  showDetailed?: boolean;
  onLessonClick?: (lessonId: number, lessonTitle: string) => void;
}

interface ModuleProgress {
  id: number;
  title: string;
  order_index: number;
  classes: ClassProgress[];
  totalLessons: number;
  completedLessons: number;
  progress: number;
}

interface ClassProgress {
  id: number;
  title: string;
  order_index: number;
  lessons: LessonProgress[];
  totalLessons: number;
  completedLessons: number;
  progress: number;
}

interface LessonProgress {
  id: number;
  title: string;
  order_index: number;
  status: "not_started" | "in_progress" | "completed";
  progress_percent: number;
  is_locked: boolean;
}

export function CourseProgress({
  courseId,
  courseClassId,
  userId,
  showDetailed = false,
  onLessonClick,
}: CourseProgressProps) {
  const supabase = getSupabaseBrowserClient();
  const [modules, setModules] = useState<ModuleProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  const getAuthToken = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  useEffect(() => {
    loadProgress();
  }, [courseId, courseClassId, userId]);

  const getUserId = async () => {
    if (userId) return userId;
    const token = await getAuthToken();
    if (!token) return null;
    
    const response = await fetch('/api/auth-service/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) return null;
    const profile = await response.json();
    return profile.id;
  };

  const loadProgress = async () => {
    setLoading(true);
    const currentUserId = await getUserId();
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    const token = await getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Get class member ID via backend
      const classMemberResponse = await fetch(`/api/org-service/class-members/${courseClassId}/user/${currentUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!classMemberResponse.ok) {
        setLoading(false);
        return;
      }

      const classMember = await classMemberResponse.json();

      // Get course modules with classes and lessons
      const modulesResponse = await fetch(`/api/org-service/courses/${courseId}/modules?include_lessons=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!modulesResponse.ok) {
        setLoading(false);
        return;
      }

      const moduleData = await modulesResponse.json();

      if (!moduleData || moduleData.length === 0) {
        setLoading(false);
        return;
      }

      // Get all lesson progress for this user from backend
      const progressPromises = [];
      for (const module of moduleData) {
        for (const classItem of module.classes || []) {
          for (const lesson of classItem.lessons || []) {
            progressPromises.push(
              fetch(`/api/org-service/lesson-progress?lesson_id=${lesson.id}&class_member_id=${classMember.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              }).then(res => res.ok ? res.json() : null)
            );
          }
        }
      }

      const progressResults = await Promise.all(progressPromises);
      const progressMap = new Map();
      progressResults.forEach(progress => {
        if (progress && progress.lesson_id) {
          progressMap.set(progress.lesson_id, progress);
        }
      });

      // Build module progress structure
      let totalLessonsCount = 0;
      let totalCompletedCount = 0;

      const modulesWithProgress = moduleData.map((module: any) => {
        const classesWithProgress = (module.classes || []).map((classItem: any) => {
          const lessonsWithProgress = (classItem.lessons || []).map((lesson: any) => {
            const progress = progressMap.get(lesson.id);
            totalLessonsCount++;
            if (progress?.status === "completed") totalCompletedCount++;

            return {
              id: lesson.id,
              title: lesson.title,
              order_index: lesson.order_index,
              status: (progress?.status as "not_started" | "in_progress" | "completed") || "not_started",
              progress_percent: progress?.progress_percent || 0,
              is_locked: false,
            };
          });

          const completedInClass = lessonsWithProgress.filter((l: any) => l.status === "completed").length;
          const classProgress = lessonsWithProgress.length > 0 
            ? (completedInClass / lessonsWithProgress.length) * 100 
            : 0;

          return {
            id: classItem.id,
            title: classItem.title,
            order_index: classItem.order_index,
            lessons: lessonsWithProgress,
            totalLessons: lessonsWithProgress.length,
            completedLessons: completedInClass,
            progress: classProgress,
          };
        });

        const completedInModule = classesWithProgress.reduce((sum: number, c: any) => sum + c.completedLessons, 0);
        const totalInModule = classesWithProgress.reduce((sum: number, c: any) => sum + c.totalLessons, 0);
        const moduleProgress = totalInModule > 0 ? (completedInModule / totalInModule) * 100 : 0;

        return {
          id: module.id,
          title: module.title,
          order_index: module.order_index,
          classes: classesWithProgress,
          totalLessons: totalInModule,
          completedLessons: completedInModule,
          progress: moduleProgress,
        };
      });

      setModules(modulesWithProgress);
      setTotalLessons(totalLessonsCount);
      setCompletedLessons(totalCompletedCount);
      setOverallProgress(totalLessonsCount > 0 ? (totalCompletedCount / totalLessonsCount) * 100 : 0);
      
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: number) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "in_progress":
        return <PlayCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Circle className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-2 bg-gray-700 rounded-full animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-sm font-medium text-white">Overall Progress</span>
          </div>
          <span className="text-2xl font-bold text-purple-400">{Math.floor(overallProgress)}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
        <p className="text-xs text-gray-400 mt-2">
          {completedLessons} of {totalLessons} lessons completed
        </p>
      </div>

      {/* Module List */}
      <div className="space-y-4">
        {modules.map((module) => (
          <div key={module.id} className="border border-gray-700 rounded-lg overflow-hidden">
            {/* Module Header */}
            <button
              onClick={() => toggleModule(module.id)}
              className="w-full p-4 bg-gray-800/50 hover:bg-gray-800 transition-colors flex justify-between items-center"
            >
              <div className="flex-1">
                <h3 className="font-semibold text-white text-left">{module.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={module.progress} className="h-1 flex-1 max-w-[200px]" />
                  <span className="text-xs text-gray-400">{Math.floor(module.progress)}%</span>
                </div>
              </div>
              <div className="text-gray-400">
                {expandedModules.has(module.id) ? "▼" : "▶"}
              </div>
            </button>

            {/* Module Content */}
            {expandedModules.has(module.id) && (
              <div className="p-4 space-y-3 border-t border-gray-700">
                {module.classes.map((classItem) => (
                  <div key={classItem.id} className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-300 pl-2">
                      {classItem.title}
                    </h4>
                    <div className="space-y-1 pl-4">
                      {classItem.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => !lesson.is_locked && onLessonClick?.(lesson.id, lesson.title)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                            lesson.is_locked
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-gray-800 cursor-pointer"
                          }`}
                          disabled={lesson.is_locked}
                        >
                          <div className="flex items-center gap-2">
                            {getStatusIcon(lesson.status)}
                            <span className="text-sm text-gray-300">{lesson.title}</span>
                          </div>
                          {lesson.is_locked && <Lock className="w-3 h-3 text-gray-500" />}
                          {lesson.status === "in_progress" && (
                            <span className="text-xs text-yellow-400">{Math.floor(lesson.progress_percent)}%</span>
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

      {/* Detailed Stats (optional) */}
      {showDetailed && (
        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <h4 className="text-sm font-medium text-white">Learning Statistics</h4>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Completion Rate</p>
              <p className="text-white font-semibold">{Math.floor(overallProgress)}%</p>
            </div>
            <div>
              <p className="text-gray-400">Lessons Completed</p>
              <p className="text-white font-semibold">{completedLessons} / {totalLessons}</p>
            </div>
            <div>
              <p className="text-gray-400">Modules</p>
              <p className="text-white font-semibold">{modules.length}</p>
            </div>
            <div>
              <p className="text-gray-400">Estimated Remaining</p>
              <p className="text-white font-semibold">-</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}