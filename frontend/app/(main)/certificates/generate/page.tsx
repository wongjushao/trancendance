// frontend/app/(main)/certificates/generate/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { CertificateGenerator } from "@/components/certificate/CertificateGenerator";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";

interface CourseData {
  id: number;
  title: string;
  description: string | null;
  level: string;
  thumbnail: string | null;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
}

export default function GenerateCertificatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const courseId = searchParams.get("courseId");
  const [course, setCourse] = useState<CourseData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [hasExistingCertificate, setHasExistingCertificate] = useState(false);
  const [courseCompletion, setCourseCompletion] = useState({ completed: 0, total: 0 });
  const [classMemberId, setClassMemberId] = useState<number | null>(null);

  useEffect(() => {
    if (!courseId) {
      toast.error("No course specified");
      router.push("/certificates");
      return;
    }

    initialize();
  }, [courseId]);

  const initialize = async () => {
    setLoading(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, username")
      .eq("id", user.id)
      .single();

    if (profile) {
      setUserProfile(profile);
    }

    // Get course details
    const { data: courseData } = await supabase
      .from("courses")
      .select("id, title, description, level, thumbnail")
      .eq("id", parseInt(courseId))
      .single();

    if (!courseData) {
      toast.error("Course not found");
      router.push("/certificates");
      return;
    }

    setCourse(courseData);

    // Check if user has completed the course
    await checkCourseCompletion(user.id, parseInt(courseId));

    // Check if certificate already exists
    const { data: existingCert } = await supabase
      .from("certificates")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", parseInt(courseId))
      .single();

    if (existingCert) {
      setHasExistingCertificate(true);
      toast.info("You already have a certificate for this course");
    }

    setLoading(false);
  };

  const checkCourseCompletion = async (userId: string, courseId: number) => {
    // Get all modules for this course
    const { data: modules } = await supabase
      .from("modules")
      .select(`
        id,
        classes:classes (
          id,
          lessons:lessons (
            id
          )
        )
      `)
      .eq("course_id", courseId);

    if (!modules) return;

    // Flatten all lesson IDs
    const allLessons: number[] = [];
    modules.forEach((module: any) => {
      module.classes?.forEach((classItem: any) => {
        classItem.lessons?.forEach((lesson: any) => {
          allLessons.push(lesson.id);
        });
      });
    });

    // Get user's class member ID for any offering of this course
    const { data: classMember } = await supabase
      .from("class_members")
      .select("id")
      .eq("user_id", userId)
      .in(
        "course_class_id",
        supabase
          .from("course_classes")
          .select("id")
          .eq("course_id", courseId)
      )
      .limit(1)
      .single();

    if (classMember) {
      setClassMemberId(classMember.id);

      // Get completed lessons
      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("class_member_id", classMember.id)
        .eq("status", "completed");

      const completedCount = progress?.length || 0;
      setCourseCompletion({
        completed: completedCount,
        total: allLessons.length,
      });
      setEligible(completedCount === allLessons.length && allLessons.length > 0);
    } else {
      setCourseCompletion({ completed: 0, total: allLessons.length });
      setEligible(false);
    }
  };

  const getUserFullName = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }
    if (userProfile?.first_name) return userProfile.first_name;
    if (userProfile?.username) return userProfile.username;
    return "Student";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Course Not Found</h1>
          <p className="text-gray-400 mb-6">
            The course you're looking for doesn't exist or you don't have access.
          </p>
          <Link href="/certificates">
            <GlowButton>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Certificates
            </GlowButton>
          </Link>
        </div>
      </div>
    );
  }

  if (hasExistingCertificate) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/certificates" className="inline-flex items-center text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Certificates
          </Link>
        </div>

        <GlowCard className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Certificate Already Issued</h1>
          <p className="text-gray-400 mb-6">
            You already have a certificate for {course.title}.
          </p>
          <div className="flex justify-center gap-4">
            <Link href={`/certificates`}>
              <GlowButton variant="secondary">
                View All Certificates
              </GlowButton>
            </Link>
            <Link href={`/courses/${course.id}/learn`}>
              <GlowButton>
                Continue Learning
              </GlowButton>
            </Link>
          </div>
        </GlowCard>
      </div>
    );
  }

  if (!eligible) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href={`/courses/${course.id}/learn`} className="inline-flex items-center text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Course
          </Link>
        </div>

        <GlowCard className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <FileText className="w-16 h-16 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Course Not Completed</h1>
          <p className="text-gray-400 mb-4">
            You need to complete all lessons in {course.title} before generating a certificate.
          </p>
          <div className="bg-gray-800/50 rounded-lg p-4 mb-6 max-w-md mx-auto">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Progress</span>
              <span className="text-white">{courseCompletion.completed} / {courseCompletion.total} lessons</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${(courseCompletion.completed / courseCompletion.total) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex justify-center gap-4">
            <Link href={`/courses/${course.id}/learn`}>
              <GlowButton>
                Continue Learning
              </GlowButton>
            </Link>
          </div>
        </GlowCard>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/certificates" className="inline-flex items-center text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Certificates
        </Link>
      </div>

      <GlowCard className="p-8">
        <CertificateGenerator
          userId={userProfile?.id || ""}
          courseId={course.id}
          courseTitle={course.title}
          courseDescription={course.description || undefined}
          userName={getUserFullName()}
          completedAt={new Date().toISOString()}
          onGenerated={(certificateUrl) => {
            toast.success("Certificate generated successfully!");
            router.push("/certificates");
          }}
        />
      </GlowCard>
    </div>
  );
}