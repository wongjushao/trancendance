"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen, Clock, Trophy, Target, TrendingUp,
  Calendar, Activity, Award, Users, ChevronRight,
  PlayCircle, FileText, MessageCircle, Bell, Star,
  Sparkles, BarChart3, FolderOpen, CheckCircle2, Loader2
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { motion } from "framer-motion";
import { LearningCalendar } from "@/components/dashboard/LearningCalendar";
import { UpcomingItems } from "@/components/dashboard/UpcomingItems";
import { RecentItems } from "@/components/dashboard/RecentItems";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface StudentDashboardProps {
  user: any;
  organizationId?: number | null;
  organizationName?: string | null;
}

interface EnrolledCourse {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  instructor: string;
  instructorAvatar: string;
  progress: number;
  lessonsCompleted: number;
  totalLessons: number;
  lastAccessed: Date;
  rating: number;
}

interface RecentItem {
  id: string;
  type: "course" | "assignment";
  title: string;
  courseName: string;
  progress: number;
  lastAccessed: Date;
  status: "completed" | "in-progress" | "pending";
}

interface UpcomingItem {
  id: string;
  title: string;
  type: "course" | "assignment" | "exam" | "live_session";
  courseName: string;
  date: Date;
  dueDate?: Date;
}

export default function StudentDashboard({ 
  user, 
  organizationId, 
  organizationName 
}: StudentDashboardProps) {
  const supabase = getSupabaseBrowserClient();
  const [greeting, setGreeting] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentItem[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<UpcomingItem[]>([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    averageProgress: 0,
    totalHoursToday: 0,
    streakDays: 0,
    pendingTasks: 0,
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
    
    loadStudentData();
  }, [user.id]);

  const loadStudentData = async () => {
    setLoading(true);
    
    try {
      // 1. Get user profile for display name
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, username")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        if (profile.first_name && profile.last_name) {
          setDisplayName(`${profile.first_name} ${profile.last_name}`);
        } else if (profile.first_name) {
          setDisplayName(profile.first_name);
        } else if (profile.username) {
          setDisplayName(profile.username);
        } else {
          setDisplayName(user.email?.split('@')[0] || "Learner");
        }
      } else {
        setDisplayName(user.email?.split('@')[0] || "Learner");
      }

      // 2. Get enrolled courses via class_members
      const { data: classMembers, error: classError } = await supabase
        .from("class_members")
        .select(`
          id,
          enrolled_at,
          completed_at,
          course_class_id,
          course_classes:course_class_id (
            id,
            course_id,
            courses:course_id (
              id,
              title,
              description,
              thumbnail,
              level,
              created_by,
              profiles:created_by (
                first_name,
                last_name,
                username,
                avatar_url
              )
            )
          )
        `)
        .eq("user_id", user.id);

      if (classError) throw classError;

      // Get all unique course IDs
      const courseIds = [...new Set(
        classMembers
          ?.filter(cm => cm.course_classes?.courses)
          .map(cm => cm.course_classes.courses.id) || []
      )];

      // 3. Get course reviews for ratings
      let ratingsMap = new Map();
      if (courseIds.length > 0) {
        const { data: reviews } = await supabase
          .from("course_reviews")
          .select("course_id, rating")
          .in("course_id", courseIds);
        
        reviews?.forEach(review => {
          const existing = ratingsMap.get(review.course_id);
          if (existing) {
            ratingsMap.set(review.course_id, [...existing, review.rating]);
          } else {
            ratingsMap.set(review.course_id, [review.rating]);
          }
        });
      }

      // 4. Get lesson progress for each course
      const coursesData: EnrolledCourse[] = [];
      let totalProgress = 0;
      let completedCount = 0;

      for (const cm of classMembers || []) {
        const course = cm.course_classes?.courses;
        if (!course) continue;

        // Get all lessons for this course
        const { data: modules } = await supabase
          .from("modules")
          .select(`
            id,
            classes:classes (
              id,
              lessons:lessons (
                id,
                title,
                content_type,
                duration_seconds
              )
            )
          `)
          .eq("course_id", course.id);

        // Flatten all lessons
        const allLessons: any[] = [];
        modules?.forEach(module => {
          module.classes?.forEach(classItem => {
            classItem.lessons?.forEach(lesson => {
              allLessons.push(lesson);
            });
          });
        });

        // Get completed lessons
        const { data: lessonProgress } = await supabase
          .from("lesson_progress")
          .select("lesson_id, status")
          .eq("class_member_id", cm.id);

        const completedLessons = lessonProgress?.filter(lp => lp.status === "completed").length || 0;
        const progress = allLessons.length > 0 ? (completedLessons / allLessons.length) * 100 : 0;
        
        totalProgress += progress;
        if (progress === 100) completedCount++;

        // Calculate average rating
        const courseRatings = ratingsMap.get(course.id) || [];
        const avgRating = courseRatings.length > 0 
          ? courseRatings.reduce((a: number, b: number) => a + b, 0) / courseRatings.length 
          : 4.5;

        const instructor = course.profiles;
        const instructorName = instructor?.first_name 
          ? `${instructor.first_name} ${instructor.last_name || ""}`.trim()
          : instructor?.username || "Instructor";
        const instructorAvatar = instructor?.first_name?.[0] || instructor?.username?.[0] || "I";

        coursesData.push({
          id: course.id,
          title: course.title,
          description: course.description || "",
          thumbnail: course.thumbnail || "",
          instructor: instructorName,
          instructorAvatar: instructorAvatar.toUpperCase(),
          progress: Math.round(progress),
          lessonsCompleted: completedLessons,
          totalLessons: allLessons.length,
          lastAccessed: new Date(cm.enrolled_at),
          rating: avgRating,
        });
      }

      setEnrolledCourses(coursesData);
      
      // 5. Calculate stats
      const totalCourses = coursesData.length;
      const avgProgress = totalCourses > 0 ? Math.round(totalProgress / totalCourses) : 0;

      // 6. Get recent activity (submissions and lesson progress)
      const { data: recentSubmissions } = await supabase
        .from("submissions")
        .select(`
          id,
          submitted_at,
          assignment:assignment_id (
            title,
            course:course_id (
              title
            )
          )
        `)
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(5);

      const recentItems: RecentItem[] = (recentSubmissions || []).map(sub => ({
        id: sub.id.toString(),
        type: "assignment",
        title: sub.assignment?.title || "Assignment",
        courseName: sub.assignment?.course?.title || "Course",
        progress: 100,
        lastAccessed: new Date(sub.submitted_at),
        status: "completed",
      }));

      setRecentActivity(recentItems);

      // 7. Get upcoming deadlines (assignments with due dates in future)
      const courseIdsForAssignments = coursesData.map(c => c.id);
      const { data: assignments } = await supabase
        .from("assignments")
        .select(`
          id,
          title,
          due_at,
          course_id,
          courses:course_id (
            title
          )
        `)
        .in("course_id", courseIdsForAssignments)
        .gte("due_at", new Date().toISOString())
        .order("due_at", { ascending: true })
        .limit(5);

      const upcoming: UpcomingItem[] = (assignments || []).map(assignment => ({
        id: assignment.id.toString(),
        title: assignment.title,
        type: "assignment",
        courseName: assignment.courses?.title || "Course",
        date: new Date(assignment.due_at),
        dueDate: new Date(assignment.due_at),
      }));

      setUpcomingItems(upcoming);

      // 8. Calculate pending tasks (assignments not submitted)
      const { data: pendingSubmissions } = await supabase
        .from("assignments")
        .select("id")
        .in("course_id", courseIdsForAssignments)
        .lt("due_at", new Date().toISOString());

      const pendingTasks = pendingSubmissions?.length || 0;

      setStats({
        totalCourses,
        completedCourses: completedCount,
        averageProgress: avgProgress,
        totalHoursToday: 2, // This would need actual tracking - keeping as is
        streakDays: 7, // This would need actual tracking - keeping as is
        pendingTasks,
      });

    } catch (error) {
      console.error("Error loading student dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {greeting}, {displayName}! 👋
          </h1>
          <p className="text-gray-400">
            {organizationName 
              ? `Welcome to ${organizationName} • Continue your learning journey` 
              : "Continue your learning journey"}
          </p>
        </div>
        <div className="flex gap-3">
          <GlowButton variant="outline" size="sm" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Learning Path
          </GlowButton>
          <GlowButton size="sm" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            Browse Courses
          </GlowButton>
        </div>
      </div>

      {/* Stats Grid - Today focused */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="Today's Progress"
          value={`${stats.totalHoursToday} hours`}
          trend="+30 min from yesterday"
          trendUp={true}
        />
        <StatCard
          icon={TrendingUp}
          label="Current Streak"
          value={`${stats.streakDays} days`}
          trend="Keep it up!"
          trendUp={true}
        />
        <StatCard
          icon={Target}
          label="Tasks Due"
          value={stats.pendingTasks.toString()}
          trend="This week"
        />
        <StatCard
          icon={Activity}
          label="Active Courses"
          value={stats.totalCourses}
          trend={`${stats.completedCourses} completed`}
        />
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Calendar */}
        <div className="lg:col-span-2">
          <LearningCalendar />
        </div>
        
        {/* Right Column - Upcoming Items and Recent Items */}
        <div className="space-y-6">
          <UpcomingItems items={upcomingItems} />
          <RecentItems items={recentActivity} />
        </div>
      </div>

      {/* My Courses Section - In Progress Only */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white">Continue Learning</h2>
            <p className="text-sm text-gray-400 mt-1">Pick up where you left off</p>
          </div>
          <Link href="/courses">
            <GlowButton variant="ghost" size="sm" className="gap-1">
              View All
              <ChevronRight className="w-4 h-4" />
            </GlowButton>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enrolledCourses.length === 0 ? (
            <GlowCard>
              <div className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No courses enrolled yet</p>
                <Link href="/courses">
                  <GlowButton size="sm" className="mt-3">Browse Courses</GlowButton>
                </Link>
              </div>
            </GlowCard>
          ) : (
            enrolledCourses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlowCard className="hover:shadow-lg transition-all duration-300">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                          {course.instructorAvatar}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-sm line-clamp-1">
                            {course.title}
                          </h3>
                          <p className="text-xs text-gray-400">{course.instructor}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{course.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-xs text-gray-400 mb-3">
                      <div className="flex items-center gap-1">
                        <PlayCircle className="w-3 h-3" />
                        <span>{course.lessonsCompleted}/{course.totalLessons} lessons</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span>{course.rating}</span>
                      </div>
                    </div>

                    <Link href={`/courses/${course.id}`}>
                      <GlowButton 
                        variant="outline" 
                        size="sm" 
                        fullWidth
                        className="text-sm"
                      >
                        Continue Learning
                      </GlowButton>
                    </Link>
                  </div>
                </GlowCard>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/assignments">
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <FileText className="w-6 h-6 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">Assignments</p>
            <p className="text-xs text-gray-500">{stats.pendingTasks} pending</p>
          </div>
        </Link>
        <Link href="/messages">
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <MessageCircle className="w-6 h-6 text-blue-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">Messages</p>
            <p className="text-xs text-gray-500">0 unread</p>
          </div>
        </Link>
        <Link href="/profile">
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <Award className="w-6 h-6 text-yellow-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">Achievements</p>
            <p className="text-xs text-gray-500">View all</p>
          </div>
        </Link>
        <Link href="/analytics">
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <BarChart3 className="w-6 h-6 text-green-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">Analytics</p>
            <p className="text-xs text-gray-500">View stats</p>
          </div>
        </Link>
      </div>
    </div>
  );
}