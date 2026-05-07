"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUp, Award, Clock, CheckCircle, BookOpen, ChevronRight, Trophy } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { getCourseProgress } from "@/lib/course-progress";
import { getCertificatesForUser, downloadCertificate, printCertificate } from "@/lib/certificate";

interface CourseStats {
  courseId: number;
  courseTitle: string;
  totalLessons: number;
  completedLessons: number;
  progress: number;
  lastAccessed: string;
  hasCertificate: boolean;
}

export function StudentProgress() {
  const [stats, setStats] = useState<CourseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProgress, setTotalProgress] = useState(0);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [showCertificates, setShowCertificates] = useState(false);

  useEffect(() => {
    fetchProgress();
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    const userCertificates = getCertificatesForUser();
    setCertificates(userCertificates);
  };

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Get enrolled courses
      const { data: memberships } = await supabase
        .from("course_members")
        .select("course_id")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (!memberships || memberships.length === 0) {
        setStats([]);
        setTotalProgress(0);
        return;
      }

      const courseStats: CourseStats[] = [];
      let totalProgressSum = 0;

      for (const membership of memberships) {
        // Get course details
        const { data: course } = await supabase
          .from("courses")
          .select("title")
          .eq("id", membership.course_id)
          .single();

        const { totalLessons, completedLessons, progressPercentage } = await getCourseProgress(membership.course_id);

        // Check if certificate exists (mock check - in real implementation, check certificates table)
        const hasCertificate = certificates.some(c => c.courseId === membership.course_id);

        courseStats.push({
          courseId: membership.course_id,
          courseTitle: course?.title || "Unknown Course",
          totalLessons,
          completedLessons,
          progress: progressPercentage,
          lastAccessed: new Date().toISOString(),
          hasCertificate,
        });

        totalProgressSum += progressPercentage;
      }

      setStats(courseStats);
      setTotalProgress(courseStats.length > 0 ? Math.round(totalProgressSum / courseStats.length) : 0);
    } catch (error) {
      console.error("Error fetching progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCertificate = async (courseId: number, courseTitle: string) => {
    try {
      const { generateCertificate } = await import("@/lib/certificate");
      const certId = await generateCertificate(courseId, courseTitle);
      alert(`Certificate generated! You can download it from the Certificates tab.`);
      fetchCertificates();
      fetchProgress();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <GlowCard>
        <div className="p-8 text-center">
          <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No courses enrolled yet</h3>
          <p className="text-gray-400 mb-4">Start your learning journey by exploring courses</p>
          <Link href="/courses">
            <GlowButton variant="primary">Browse Courses</GlowButton>
          </Link>
        </div>
      </GlowCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress Card */}
      <GlowCard>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-white">Your Learning Progress</h3>
              <p className="text-sm text-gray-400">Track your journey across all courses</p>
            </div>
            <Trophy className={`w-8 h-8 ${totalProgress === 100 ? "text-yellow-400" : "text-gray-600"}`} />
          </div>
          <div className="mb-2 flex justify-between">
            <span className="text-sm text-gray-400">Overall Completion</span>
            <span className="text-sm font-medium text-purple-400">{totalProgress}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-800">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stats.length}</p>
              <p className="text-xs text-gray-400">Courses Enrolled</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {stats.reduce((acc, c) => acc + c.completedLessons, 0)}
              </p>
              <p className="text-xs text-gray-400">Lessons Completed</p>
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Course Stats */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-white">Course Breakdown</h4>
        {stats.map((course) => (
          <GlowCard key={course.courseId}>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                <div className="flex-1">
                  <h4 className="text-white font-semibold text-lg">{course.courseTitle}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {course.completedLessons} of {course.totalLessons} lessons completed
                  </p>
                </div>
                {course.progress === 100 && !course.hasCertificate && (
                  <button
                    onClick={() => handleGenerateCertificate(course.courseId, course.courseTitle)}
                    className="px-3 py-1.5 text-xs bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Award className="w-3 h-3" />
                    Get Certificate
                  </button>
                )}
                {course.hasCertificate && (
                  <span className="px-3 py-1.5 text-xs bg-purple-600/20 text-purple-400 rounded-lg flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    Certified
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 mb-3">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 text-xs">
                  <span className={`flex items-center gap-1 ${course.progress === 100 ? 'text-green-400' : 'text-gray-500'}`}>
                    <CheckCircle className="w-3 h-3" />
                    {course.progress}% Complete
                  </span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-3 h-3" />
                    {course.progress === 100 ? "Completed" : "In Progress"}
                  </span>
                </div>
                <Link href={`/courses/${course.courseId}/learn`}>
                  <button className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1">
                    Continue
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </Link>
              </div>
            </div>
          </GlowCard>
        ))}
      </div>

      {/* Certificates Section */}
      {certificates.length > 0 && (
        <GlowCard>
          <div className="p-5">
            <button
              onClick={() => setShowCertificates(!showCertificates)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-400" />
                <h4 className="font-semibold text-white">Your Certificates</h4>
                <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                  {certificates.length}
                </span>
              </div>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showCertificates ? 'rotate-90' : ''}`} />
            </button>
            
            {showCertificates && (
              <div className="mt-4 space-y-2">
                {certificates.map((cert) => (
                  <div key=cert.id className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{cert.courseTitle}</p>
                      <p className="text-xs text-gray-500">Issued: {new Date(cert.issuedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadCertificate(cert.id)}
                        className="px-2 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded transition-colors"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => printCertificate(cert.id)}
                        className="px-2 py-1 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded transition-colors"
                      >
                        Print
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlowCard>
      )}
    </div>
  );
}