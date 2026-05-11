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
import { toast } from "sonner";

// Helper to get auth token
const getAuthToken = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

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
  average_time_spent: number;
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
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = await getAuthToken();
      setAccessToken(token);
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (accessToken) {
      fetchAnalytics();
    }
  }, [courseId, accessToken]);

  const fetchAnalytics = async () => {
    if (!accessToken) return;
    
    setLoading(true);
    try {
      // 1. Get course details from backend
      const courseResponse = await fetch(`/api/org-service/courses/${courseId}/detail`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!courseResponse.ok) {
        throw new Error('Failed to fetch course details');
      }
      
      const courseData = await courseResponse.json();
      const course = courseData.course;
      setCourseTitle(course.title);
      
      // 2. Get enrolled students via backend
      let totalStudents = 0;
      let completedStudents = 0;
      let totalProgress = 0;
      let totalLessons = 0;
      let lessonCompletions: Record<number, number> = {};
      let recentEnrollments: { user_name: string; enrolled_at: string }[] = [];
      
      // Get students from class members (offering-based enrollment)
      const offerings = courseData.course_classes || [];
      const offeringIds = offerings.map((o: any) => o.id);
      
      if (offeringIds.length > 0) {
        // Fetch class members for all offerings
        let allClassMembers: any[] = [];
        for (const offeringId of offeringIds) {
          const membersResponse = await fetch(`/api/org-service/course-classes/${offeringId}/students`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (membersResponse.ok) {
            const membersData = await membersResponse.json();
            allClassMembers = [...allClassMembers, ...(membersData.students || [])];
          }
        }
        
        totalStudents = allClassMembers.length;
        
        // Get unique student IDs and their enrollment dates
        const studentMap = new Map();
        for (const member of allClassMembers) {
          if (!studentMap.has(member.user_id)) {
            studentMap.set(member.user_id, {
              user_id: member.user_id,
              enrolled_at: member.enrolled_at,
              user_name: member.user?.first_name 
                ? `${member.user.first_name} ${member.user.last_name || ''}`.trim()
                : member.user?.username || 'Student'
            });
          }
        }
        
        // Get total lessons from course modules
        const modules = courseData.modules || [];
        for (const module of modules) {
          for (const classItem of module.classes || []) {
            totalLessons += (classItem.lessons || []).length;
          }
        }
        
        // Get lesson progress for all students via backend
        const studentIds = Array.from(studentMap.keys());
        
        for (const studentId of studentIds) {
          // Get class member ID for this student
          const classMember = allClassMembers.find(m => m.user_id === studentId);
          if (!classMember) continue;
          
          // Get lesson progress for this student (batch API call would be better)
          const progressResponse = await fetch(`/api/org-service/lesson-progress?lesson_id=all&class_member_id=${classMember.id}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            const completedCount = progressData.filter((p: any) => p.status === 'completed').length;
            const studentProgress = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;
            totalProgress += studentProgress;
            
            if (studentProgress === 100) {
              completedStudents++;
            }
            
            // Track lesson completions
            progressData.forEach((p: any) => {
              if (p.status === 'completed') {
                lessonCompletions[p.lesson_id] = (lessonCompletions[p.lesson_id] || 0) + 1;
              }
            });
          }
        }
        
        // Get recent enrollments (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        recentEnrollments = Array.from(studentMap.values())
          .filter(s => new Date(s.enrolled_at) >= thirtyDaysAgo)
          .slice(0, 5)
          .map(s => ({
            user_name: s.user_name,
            enrolled_at: new Date(s.enrolled_at).toLocaleDateString(),
          }));
      }
      
      // Get lessons list to map IDs to titles
      let allLessons: { id: number; title: string }[] = [];
      const modules = (await fetch(`/api/org-service/courses/${courseId}/modules?include_lessons=true`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }).then(res => res.ok ? res.json() : [])) || [];
      
      for (const module of modules) {
        for (const classItem of module.classes || []) {
          for (const lesson of classItem.lessons || []) {
            allLessons.push({ id: lesson.id, title: lesson.title });
          }
        }
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
      
      // 3. Get assignment stats from course detail
      const assignments = courseData.assignments || [];
      const totalAssignments = assignments.length;
      
      let submissionsCount = 0;
      let gradedCount = 0;
      let totalGrade = 0;
      
      // Fetch submissions for each assignment
      for (const assignment of assignments) {
        const submissionsResponse = await fetch(`/api/org-service/assignments/${assignment.id}/submissions`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (submissionsResponse.ok) {
          const submissionsData = await submissionsResponse.json();
          const submissions = submissionsData.submissions || [];
          submissionsCount += submissions.length;
          
          const gradedSubmissions = submissions.filter((s: any) => s.grade !== null);
          gradedCount += gradedSubmissions.length;
          
          for (const sub of gradedSubmissions) {
            totalGrade += sub.grade || 0;
          }
        }
      }
      
      const averageGrade = gradedCount > 0 ? totalGrade / gradedCount : 0;
      const pendingGrading = submissionsCount - gradedCount;
      const averageProgress = totalStudents > 0 ? totalProgress / totalStudents : 0;
      
      // 4. Get recent submissions
      let recentSubmissions: { user_name: string; assignment_title: string; submitted_at: string }[] = [];
      
      // Get all assignments with their submissions
      for (const assignment of assignments.slice(0, 5)) {
        const submissionsResponse = await fetch(`/api/org-service/assignments/${assignment.id}/submissions?limit=3`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (submissionsResponse.ok) {
          const submissionsData = await submissionsResponse.json();
          const submissions = submissionsData.submissions || [];
          
          for (const submission of submissions) {
            // Get user profile
            const profileResponse = await fetch(`/api/auth-service/profile/public/${submission.user_id}`, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            let userName = "Student";
            if (profileResponse.ok) {
              const profile = await profileResponse.json();
              userName = profile.first_name 
                ? `${profile.first_name} ${profile.last_name || ''}`.trim()
                : profile.username || userName;
            }
            
            recentSubmissions.push({
              user_name: userName,
              assignment_title: assignment.title,
              submitted_at: new Date(submission.submitted_at).toLocaleDateString(),
            });
          }
        }
      }
      
      // Limit to 5 most recent
      recentSubmissions = recentSubmissions.slice(0, 5);
      
      setAnalytics({
        course_id: course.id,
        course_title: course.title,
        course_status: course.status,
        total_students: totalStudents,
        active_students: totalStudents, // Would need last_accessed_at for accurate count
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
        total_views: 0,
        average_time_spent: 0,
        last_30_days_growth: 0,
        recent_enrollments: recentEnrollments,
        recent_submissions: recentSubmissions,
      });
      
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics data");
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
            <Link href={`/courses/${courseId}`}>
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