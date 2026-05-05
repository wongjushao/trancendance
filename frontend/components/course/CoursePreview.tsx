"use client";

import { useState, useEffect } from "react";
import { Lock, Play, CheckCircle, Clock, BookOpen, Users, Star } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface CoursePreviewProps {
  courseId: number;
  courseTitle: string;
  courseDescription: string;
  onEnroll?: () => void;
}

interface PreviewLesson {
  id: number;
  title: string;
  content_type: string;
  order_index: number;
}

export function CoursePreview({ courseId, courseTitle, courseDescription, onEnroll }: CoursePreviewProps) {
  const [previewLessons, setPreviewLessons] = useState<PreviewLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    checkEnrollment();
    fetchPreviewLessons();
  }, [courseId]);

  const checkEnrollment = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from("course_members")
        .select("id")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      setIsEnrolled(!!data);
    }
  };

  const fetchPreviewLessons = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      
      // Get first module
      const { data: firstModule } = await supabase
        .from("modules")
        .select("id")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true })
        .limit(1)
        .single();

      if (firstModule) {
        // Get first class
        const { data: firstClass } = await supabase
          .from("classes")
          .select("id")
          .eq("module_id", firstModule.id)
          .order("order_index", { ascending: true })
          .limit(1)
          .single();

        if (firstClass) {
          // Get preview lessons (first 2 lessons)
          const { data: lessons } = await supabase
            .from("lessons")
            .select("id, title, content_type, order_index")
            .eq("class_id", firstClass.id)
            .order("order_index", { ascending: true })
            .limit(2);
          
          setPreviewLessons(lessons || []);
        }
      }
    } catch (error) {
      console.error("Error fetching preview lessons:", error);
    } finally {
      setLoading(false);
    }
  };

  if (isEnrolled) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Course Header Preview */}
      <GlowCard>
        <div className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{courseTitle}</h1>
              <p className="text-gray-400 mb-4">{courseDescription}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1 text-gray-400">
                  <BookOpen className="w-4 h-4" />
                  {previewLessons.length}+ lessons
                </span>
                <span className="flex items-center gap-1 text-gray-400">
                  <Clock className="w-4 h-4" />
                  Self-paced
                </span>
                <span className="flex items-center gap-1 text-gray-400">
                  <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  4.8 (123 ratings)
                </span>
              </div>
            </div>
            <GlowButton variant="primary" onClick={onEnroll}>
              Enroll Now
            </GlowButton>
          </div>
        </div>
      </GlowCard>

      {/* Preview Lessons */}
      <GlowCard>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Course Preview</h2>
            <span className="text-sm text-purple-400">First 2 lessons</span>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : previewLessons.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No preview lessons available</p>
          ) : (
            <div className="space-y-3">
              {previewLessons.map((lesson, index) => (
                <div key={lesson.id} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <span className="text-purple-400 text-sm">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{lesson.title}</p>
                    <p className="text-xs text-gray-500 capitalize">{lesson.content_type} lesson</p>
                  </div>
                  <Play className="w-4 h-4 text-gray-500" />
                </div>
              ))}
            </div>
          )}
          
          {previewLessons.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-800">
              <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg opacity-60">
                <Lock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-500">Additional lessons locked</span>
                <span className="text-sm text-gray-500 ml-auto">Enroll to unlock</span>
              </div>
            </div>
          )}
        </div>
      </GlowCard>

      {/* What You'll Learn */}
      <GlowCard>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">What You'll Learn</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">Build real-world applications</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">Master industry best practices</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">Get certified upon completion</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">Lifetime access to materials</span>
            </div>
          </div>
        </div>
      </GlowCard>
    </div>
  );
}