// frontend/app/(main)/courses/[id]/analytics/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  BookOpen,
  TrendingUp,
  Award,
  FileText,
  Loader2,
  Eye,
  UserCheck,
  Target,
  Activity,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface CourseAnalytics {
  // Course Info
  course_id: number;
  course_title: string;
  course_status: string;
  
  // Student Stats
  total_students: number;
  active_students: number;
  completed_course: number;
  average_progress: number;
  
  // Lesson Stats
  total_lessons: number;
  average_lessons_completed: number;
  most_completed_lesson: { id: number; title: string; completions: number } | null;
  least_completed_lesson: { id: number; title: string; completions: number } | null;
  
  // Assignment Stats
  total_assignments: number;
  average_grade: number;
  submissions_count: number;
  pending_grading: number;
  
  // Engagement
  total_views: number;
  average_time_spent: number; // in minutes
  last_30_days_growth: number;
  
  // Recent Activity
  recent_enrollments: { user_name: string; enrolled_at: string }[];
  recent_submissions: { user_name: string; assignment_title: string; submitted_at: string }[];
}

export default function CourseAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null);
  const [courseTitle, setCourseTitle] = useState("");

  useEffect(() => {
    fetchAnalytics();
  }, [courseId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      // 1. Get course details
      const { data: course } = await supabase
        .from("courses")
        .select("id, title, status")
        .eq("id", courseId)
        .single();
      
      if (!course) return;
      setCourseTitle(course.title);
      
      // 2. Get all course offerings for this course
      const { data: offerings } = await supabase
        .from("course_classes")
        .select("id")
        .eq("course_id", courseId);
      
      const offeringIds = offerings?.map(o => o.id) || [];
      
      // 3. Get all students enrolled in this course (from class_members)
      let allStudents: any[] = [];
      let completedStudents = 0;
      let totalProgress = 0;
      
      if (offeringIds.length > 0) {
        const { data: classMembers } = await supabase
          .from("class_members")
          .select("user_id, enrolled_at")
          .in("course_class_id", offeringIds)
          .eq("role", "student");
        
        allStudents = classMembers || [];
        
        // Get unique user IDs
        const studentIds = [...new Set(allStudents.map(s => s.user_id))];
        
        // Get profiles for student names
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", studentIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        // Get lesson progress for each student
        const { data: modules } = await supabase
          .from("modules")
          .select("id")
          .eq("course_id", courseId);
        
        const moduleIds = modules?.map(m => m.id) || [];
        
        let totalLessons = 0;
        let allLessons: any[] = [];
        
        if (moduleIds.length > 0) {
          const { data: classes } = await supabase
            .from("classes")
            .select("id")
            .in("module_id", moduleIds);
          
          const classIds = classes?.map(c => c.id) || [];
          
          if (classIds.length > 0) {
            const { data: lessons } = await supabase
              .from("lessons")
              .select("id, title")
              .in("class_id", classIds);
            
            allLessons = lessons || [];
            totalLessons = allLessons.length;
          }
        }
        
        // Calculate student progress
        let lessonCompletions: Record<number, number> = {};
        
        for (const studentId of studentIds) {
          const { data: progress } = await supabase
            .from("lesson_progress")
            .select("lesson_id, status")
            .eq("user_id", studentId)
            .eq("status", "completed");
          
          const completedLessons = progress?.length || 0;
          const studentProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
          totalProgress += studentProgress;
          
          if (studentProgress === 100) {
            completedStudents++;
          }
          
          // Track lesson completions
          progress?.forEach(p => {
            lessonCompletions[p.lesson_id] = (lessonCompletions[p.lesson_id] || 0) + 1;
          });
        }
        
        // Find most and least completed lessons
        let mostCompleted = null;
        let leastCompleted = null;
        
        for (const lesson of allLessons) {
          const completions = lessonCompletions[lesson.id] || 0;
          if (!mostCompleted || completions > mostCompleted.completions) {
            mostCompleted = { id: lesson.id, title: lesson.title, completions };
          }
          if (!leastCompleted || completions < leastCompleted.completions) {
            leastCompleted = { id: lesson.id, title: lesson.title, completions };
          }
        }
        
        // 4. Get assignment stats
        const { data: assignments } = await supabase
          .from("assignments")
          .select("id, title")
          .eq("course_id", courseId);
        
        const totalAssignments = assignments?.length || 0;
        let totalGrade = 0;
        let gradedCount = 0;
        let submissionsCount = 0;
        
        if (assignments && assignments.length > 0) {
          const assignmentIds = assignments.map(a => a.id);
          
          const { data: submissions } = await supabase
            .from("submissions")
            .select("grade")
            .in("assignment_id", assignmentIds);
          
          submissionsCount = submissions?.length || 0;
          
          const gradedSubmissions = submissions?.filter(s => s.grade !== null) || [];
          gradedCount = gradedSubmissions.length;
          
          totalGrade = gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0);
        }
        
        const averageGrade = gradedCount > 0 ? totalGrade / gradedCount : 0;
        const pendingGrading = submissionsCount - gradedCount;
        
        // 5. Calculate average progress
        const averageProgress = studentIds.length > 0 ? totalProgress / studentIds.length : 0;
        
        // 6. Get recent enrollments (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentEnrollments = allStudents
          .filter(s => new Date(s.enrolled_at) >= thirtyDaysAgo)
          .slice(0, 5)
          .map(s => ({
            user_name: profileMap.get(s.user_id)?.first_name || "User",
            enrolled_at: new Date(s.enrolled_at).toLocaleDateString(),
          }));
        
        // 7. Get recent submissions
        let recentSubmissions: any[] = [];
        if (assignments && assignments.length > 0) {
          const assignmentIds = assignments.map(a => a.id);
          
          const { data: submissions } = await supabase
            .from("submissions")
            .select("user_id, assignment_id, submitted_at")
            .in("assignment_id", assignmentIds)
            .order("submitted_at", { ascending: false })
            .limit(5);
          
          if (submissions) {
            const submissionUserIds = [...new Set(submissions.map(s => s.user_id))];
            const { data: submissionProfiles } = await supabase
              .from("profiles")
              .select("id, first_name, last_name")
              .in("id", submissionUserIds);
            
            const submissionProfileMap = new Map(submissionProfiles?.map(p => [p.id, p]) || []);
            
            recentSubmissions = submissions.map(s => {
              const assignment = assignments.find(a => a.id === s.assignment_id);
              return {
                user_name: submissionProfileMap.get(s.user_id)?.first_name || "User",
                assignment_title: assignment?.title || "Assignment",
                submitted_at: new Date(s.submitted_at).toLocaleDateString(),
              };
            });
          }
        }
        
        // 8. Calculate active students (progress > 0)
        const activeStudents = studentIds.filter(id => {
          // Simplified - in real implementation, check last_accessed_at
          return true;
        }).length;
        
        setAnalytics({
          course_id: course.id,
          course_title: course.title,
          course_status: course.status,
          total_students: studentIds.length,
          active_students: activeStudents,
          completed_course: completedStudents,
          average_progress: Math.round(averageProgress),
          total_lessons: totalLessons,
          average_lessons_completed: Math.round((averageProgress / 100) * totalLessons),
          most_completed_lesson: mostCompleted,
          least_completed_lesson: leastCompleted,
          total_assignments: totalAssignments,
          average_grade: Math.round(averageGrade),
          submissions_count: submissionsCount,
          pending_grading: pendingGrading,
          total_views: 0, // Would need tracking table
          average_time_spent: 0, // Would need tracking table
          last_30_days_growth: 0, // Compare enrollments from previous 30 days
          recent_enrollments: recentEnrollments,
          recent_submissions: recentSubmissions,
        });
      } else {
        // No offerings yet
        setAnalytics({
          course_id: course.id,
          course_title: course.title,
          course_status: course.status,
          total_students: 0,
          active_students: 0,
          completed_course: 0,
          average_progress: 0,
          total_lessons: 0,
          average_lessons_completed: 0,
          most_completed_lesson: null,
          least_completed_lesson: null,
          total_assignments: 0,
          average_grade: 0,
          submissions_count: 0,
          pending_grading: 0,
          total_views: 0,
          average_time_spent: 0,
          last_30_days_growth: 0,
          recent_enrollments: [],
          recent_submissions: [],
        });
      }
      
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href={`/courses/`}>
              <GlowButton variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Course
              </GlowButton>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">{courseTitle}</h1>
              <p className="text-gray-400 mt-1">Course Analytics & Insights</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <GlowCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Students</p>
                <p className="text-3xl font-bold text-white">{analytics?.total_students || 0}</p>
              </div>
              <Users className="w-10 h-10 text-purple-400 opacity-70" />
            </div>
            <div className="mt-2 text-xs text-green-400">
              +{analytics?.last_30_days_growth || 0} this month
            </div>
          </GlowCard>

          <GlowCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Average Progress</p>
                <p className="text-3xl font-bold text-white">{analytics?.average_progress || 0}%</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-400 opacity-70" />
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-green-500 rounded-full h-2 transition-all"
                  style={{ width: `${analytics?.average_progress || 0}%` }}
                />
              </div>
            </div>
          </GlowCard>

          <GlowCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Completed Course</p>
                <p className="text-3xl font-bold text-white">{analytics?.completed_course || 0}</p>
              </div>
              <Award className="w-10 h-10 text-yellow-400 opacity-70" />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {analytics?.total_students ? Math.round((analytics.completed_course / analytics.total_students) * 100) : 0}% completion rate
            </div>
          </GlowCard>

          <GlowCard className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Average Grade</p>
                <p className="text-3xl font-bold text-white">{analytics?.average_grade || 0}%</p>
              </div>
              <Target className="w-10 h-10 text-blue-400 opacity-70" />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {analytics?.submissions_count || 0} submissions, {analytics?.pending_grading || 0} pending grading
            </div>
          </GlowCard>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Lesson Engagement */}
          <GlowCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Lesson Engagement</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Most Completed</span>
                  <span className="text-gray-400">{analytics?.most_completed_lesson?.completions || 0} completions</span>
                </div>
                <div className="text-white font-medium">{analytics?.most_completed_lesson?.title || "N/A"}</div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Least Completed</span>
                  <span className="text-gray-400">{analytics?.least_completed_lesson?.completions || 0} completions</span>
                </div>
                <div className="text-white font-medium">{analytics?.least_completed_lesson?.title || "N/A"}</div>
              </div>
              <div className="pt-2 border-t border-slate-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Lessons</span>
                  <span className="text-white">{analytics?.total_lessons || 0}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Avg Lessons Completed per Student</span>
                  <span className="text-white">{analytics?.average_lessons_completed || 0}</span>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Assignment Stats */}
          <GlowCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Assignment Overview</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Total Assignments</span>
                  <span className="text-white">{analytics?.total_assignments || 0}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Submissions Received</span>
                  <span className="text-white">{analytics?.submissions_count || 0}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Pending Grading</span>
                  <span className="text-yellow-400">{analytics?.pending_grading || 0}</span>
                </div>
              </div>
            </div>
          </GlowCard>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Enrollments */}
          <GlowCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Recent Enrollments</h3>
            </div>
            {analytics?.recent_enrollments && analytics.recent_enrollments.length > 0 ? (
              <div className="space-y-3">
                {analytics.recent_enrollments.map((enrollment, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{enrollment.user_name}</span>
                    <span className="text-gray-500">{enrollment.enrolled_at}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recent enrollments</p>
              </div>
            )}
          </GlowCard>

          {/* Recent Submissions */}
          <GlowCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Recent Submissions</h3>
            </div>
            {analytics?.recent_submissions && analytics.recent_submissions.length > 0 ? (
              <div className="space-y-3">
                {analytics.recent_submissions.map((submission, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">{submission.user_name}</span>
                      <span className="text-gray-500">{submission.submitted_at}</span>
                    </div>
                    <div className="text-gray-500 text-xs mt-1">{submission.assignment_title}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No submissions yet</p>
              </div>
            )}
          </GlowCard>
        </div>

        {/* Empty State for No Data */}
        {analytics?.total_students === 0 && (
          <div className="mt-8">
            <GlowCard className="p-12 text-center">
              <Eye className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Student Data Yet</h3>
              <p className="text-gray-400">
                Once students enroll in this course, you'll see analytics here.
              </p>
              <div className="mt-4">
                <GlowButton variant="outline" onClick={() => router.push(`/courses/${courseId}/edit?tab=offerings`)}>
                  Manage Offerings
                </GlowButton>
              </div>
            </GlowCard>
          </div>
        )}
      </div>
    </div>
  );
}