// frontend/components/dashboard/StudentDashboard.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen, Clock, Trophy, Target, TrendingUp,
  Calendar, Activity, Award, Users, ChevronRight,
  PlayCircle, FileText, MessageCircle, Bell, Star,
  Sparkles, BarChart3, FolderOpen, CheckCircle2,
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { motion } from "framer-motion";
import { AchievementsList } from "@/components/dashboard/AchievementsList";
import { FriendsList } from "@/components/dashboard/FriendsList";
import { LearningCalendar } from "@/components/dashboard/LearningCalendar";
import { UpcomingItems } from "@/components/dashboard/UpcomingItems";
import { RecentItems } from "@/components/dashboard/RecentItems";

interface StudentDashboardProps {
  user: any;
  organizationId?: number | null;
  organizationName?: string | null;
}

// Mock data for enrolled courses
const enrolledCourses = [
  {
    id: 1,
    title: "Advanced React Development",
    description: "Master React hooks, context API, and advanced patterns",
    thumbnail: "",
    instructor: "Sarah Johnson",
    instructorAvatar: "SJ",
    progress: 65,
    lessonsCompleted: 13,
    totalLessons: 20,
    lastAccessed: new Date(2024, 0, 15),
    rating: 4.8,
    certificateEarned: false,
  },
  {
    id: 2,
    title: "Full-Stack TypeScript",
    description: "Build scalable applications with TypeScript, Node.js, and React",
    thumbnail: "",
    instructor: "Michael Chen",
    instructorAvatar: "MC",
    progress: 30,
    lessonsCompleted: 6,
    totalLessons: 20,
    lastAccessed: new Date(2024, 0, 14),
    rating: 4.9,
    certificateEarned: false,
  },
  {
    id: 3,
    title: "UI/UX Design Fundamentals",
    description: "Learn design principles, wireframing, and prototyping",
    thumbnail: "",
    instructor: "Emily Rodriguez",
    instructorAvatar: "ER",
    progress: 85,
    lessonsCompleted: 17,
    totalLessons: 20,
    lastAccessed: new Date(2024, 0, 16),
    rating: 4.7,
    certificateEarned: true,
    certificateUrl: "#",
  },
];

// Mock data for recent activity
const recentActivity = [
  {
    id: 1,
    type: "course",
    title: "React Hooks Deep Dive",
    courseName: "Advanced React Development",
    progress: 75,
    lastAccessed: new Date(2024, 0, 16, 14, 30),
    status: "in-progress",
  },
  {
    id: 2,
    type: "assignment",
    title: "Build a Custom Hook",
    courseName: "Advanced React Development",
    progress: 100,
    lastAccessed: new Date(2024, 0, 15, 10, 0),
    status: "completed",
  },
  {
    id: 3,
    type: "course",
    title: "TypeScript Generics",
    courseName: "Full-Stack TypeScript",
    progress: 40,
    lastAccessed: new Date(2024, 0, 14, 16, 45),
    status: "in-progress",
  },
];

// Mock data for upcoming items
const upcomingItems = [
  {
    id: 1,
    title: "API Integration Assignment",
    type: "assignment",
    courseName: "Backend Development",
    date: new Date(2024, 0, 20, 23, 59),
    dueDate: new Date(2024, 0, 20, 23, 59),
  },
  {
    id: 2,
    title: "Final Exam",
    type: "exam",
    courseName: "Data Structures",
    date: new Date(2024, 0, 25, 14, 0),
  },
  {
    id: 3,
    title: "Team Project Meeting",
    type: "live_session",
    courseName: "Project Management",
    date: new Date(2024, 0, 18, 15, 0),
  },
];

// Mock achievements data
const achievements = [
  {
    id: "1",
    title: "Quick Learner",
    description: "Completed 5 lessons in a week",
    icon: Trophy,
    isEarned: true,
    dateEarned: "2024-01-15",
  },
  {
    id: "2",
    title: "Perfect Attendance",
    description: "Logged in for 7 consecutive days",
    icon: Star,
    isEarned: true,
    dateEarned: "2024-01-20",
  },
  {
    id: "3",
    title: "Assignment Master",
    description: "Submitted 10 assignments on time",
    icon: Award,
    isEarned: false,
    progress: 70,
  },
  {
    id: "4",
    title: "Course Warrior",
    description: "Complete 3 full courses",
    icon: Target,
    isEarned: false,
    progress: 33,
  },
];

// Mock friends data
const friends = [
  {
    id: "1",
    name: "Alice Johnson",
    avatar: "AJ",
    status: "online" as const,
    lastActive: "Just now",
    courseCount: 3,
  },
  {
    id: "2",
    name: "Bob Smith",
    avatar: "BS",
    status: "offline" as const,
    lastActive: "2 hours ago",
    courseCount: 2,
  },
  {
    id: "3",
    name: "Carol Davis",
    avatar: "CD",
    status: "online" as const,
    lastActive: "Just now",
    courseCount: 4,
  },
  {
    id: "4",
    name: "David Wilson",
    avatar: "DW",
    status: "away" as const,
    lastActive: "1 hour ago",
    courseCount: 1,
  },
];

export default function StudentDashboard({ 
  user, 
  organizationId, 
  organizationName 
}: StudentDashboardProps) {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Calculate stats
  const totalCourses = enrolledCourses.length;
  const completedCourses = enrolledCourses.filter(c => c.progress === 100).length;
  const averageProgress = Math.round(
    enrolledCourses.reduce((acc, c) => acc + c.progress, 0) / totalCourses
  );
  const totalHours = enrolledCourses.reduce(
    (acc, c) => acc + (c.lessonsCompleted * 45), // 45 minutes per lesson
    0
  );
  const totalHoursRounded = Math.round(totalHours / 60);

  // Calculate streak (mock - in real app would come from backend)
  const streakDays = 7;
  const nextMilestone = 10 - streakDays;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {greeting}, {user?.user_metadata?.first_name || user?.email?.split('@')[0]}! 👋
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Enrolled Courses"
          value={totalCourses}
          trend={`${completedCourses} completed`}
        />
        <StatCard
          icon={TrendingUp}
          label="Avg. Progress"
          value={`${averageProgress}%`}
          trend={`${completedCourses} courses finished`}
          trendUp={averageProgress > 50}
        />
        <StatCard
          icon={Clock}
          label="Learning Hours"
          value={totalHoursRounded}
          trend="This month"
          trendUp={true}
        />
        <StatCard
          icon={Trophy}
          label="Day Streak"
          value={`${streakDays} days`}
          trend={`${nextMilestone} days to 10`}
          trendUp={true}
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

      {/* My Courses Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white">My Learning</h2>
            <p className="text-sm text-gray-400 mt-1">Continue where you left off</p>
          </div>
          <Link href="/courses">
            <GlowButton variant="ghost" size="sm" className="gap-1">
              View All
              <ChevronRight className="w-4 h-4" />
            </GlowButton>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrolledCourses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlowCard className="hover:shadow-lg transition-all duration-300">
                <div className="p-4">
                  {/* Course Header */}
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
                    {course.certificateEarned && (
                      <div className="flex items-center gap-1 text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs">Certified</span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
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

                  {/* Course Stats */}
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

                  {/* Continue Button */}
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
          ))}
        </div>
      </div>

      {/* Achievements & Friends Section */}
      {(achievements.length > 0 || friends.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {achievements.length > 0 && (
            <AchievementsList achievements={achievements} />
          )}
          {friends.length > 0 && (
            <FriendsList friends={friends} />
          )}
        </div>
      )}

      {/* Quick Actions Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/assignments">
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <FileText className="w-6 h-6 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">Assignments</p>
            <p className="text-xs text-gray-500">3 pending</p>
          </div>
        </Link>
        <Link href="/messages">
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <MessageCircle className="w-6 h-6 text-blue-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">Messages</p>
            <p className="text-xs text-gray-500">2 unread</p>
          </div>
        </Link>
        <Link href="/notifications">
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <Bell className="w-6 h-6 text-yellow-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">Notifications</p>
            <p className="text-xs text-gray-500">5 new</p>
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