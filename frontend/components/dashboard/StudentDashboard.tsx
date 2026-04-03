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
import { LearningCalendar } from "@/components/dashboard/LearningCalendar";
import { UpcomingItems } from "@/components/dashboard/UpcomingItems";
import { RecentItems } from "@/components/dashboard/RecentItems";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface StudentDashboardProps {
  user: any;
  organizationId?: number | null;
  organizationName?: string | null;
}

// Mock data for enrolled courses (in-progress only)
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
];

// Mock data for recent activity (last 5 actions)
const recentActivity = [
  {
    id: 1,
    type: "course" as const,
    title: "React Hooks Deep Dive",
    courseName: "Advanced React Development",
    progress: 75,
    lastAccessed: new Date(2024, 0, 16, 14, 30),
    status: "in-progress" as const,
  },
  {
    id: 2,
    type: "assignment" as const,
    title: "Build a Custom Hook",
    courseName: "Advanced React Development",
    progress: 100,
    lastAccessed: new Date(2024, 0, 15, 10, 0),
    status: "completed" as const,
  },
];

// Mock data for upcoming deadlines (next 7 days only)
const upcomingItems = [
  {
    id: 1,
    title: "API Integration Assignment",
    type: "assignment" as const,
    courseName: "Backend Development",
    date: new Date(2024, 0, 20, 23, 59),
    dueDate: new Date(2024, 0, 20, 23, 59),
  },
  {
    id: 2,
    title: "Final Exam",
    type: "exam" as const,
    courseName: "Data Structures",
    date: new Date(2024, 0, 25, 14, 0),
  },
];

export default function StudentDashboard({ 
  user, 
  organizationId, 
  organizationName 
}: StudentDashboardProps) {
  const [greeting, setGreeting] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
    
    // Fetch profile data to get the actual name
    const fetchProfileName = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, username")
          .eq("id", user.id)
          .single();
        
        if (!error && data) {
          // Priority: first_name + last_name > username > email
          if (data.first_name && data.last_name) {
            setDisplayName(`${data.first_name} ${data.last_name}`);
          } else if (data.first_name) {
            setDisplayName(data.first_name);
          } else if (data.username) {
            setDisplayName(data.username);
          } else {
            setDisplayName(user.email?.split('@')[0] || "Learner");
          }
        } else {
          // Fallback to user metadata or email
          const metaFirst = user.user_metadata?.first_name;
          const metaLast = user.user_metadata?.last_name;
          if (metaFirst && metaLast) {
            setDisplayName(`${metaFirst} ${metaLast}`);
          } else if (metaFirst) {
            setDisplayName(metaFirst);
          } else {
            setDisplayName(user.email?.split('@')[0] || "Learner");
          }
        }
      } catch (error) {
        console.error("Error fetching profile name:", error);
        setDisplayName(user.email?.split('@')[0] || "Learner");
      }
    };
    
    fetchProfileName();
  }, [user.id, user.email, user.user_metadata]);

  // Calculate stats (today/week focused)
  const totalCourses = enrolledCourses.length;
  const completedCourses = enrolledCourses.filter(c => c.progress === 100).length;
  const averageProgress = Math.round(
    enrolledCourses.reduce((acc, c) => acc + c.progress, 0) / totalCourses
  );
  const totalHoursToday = 2; // Mock: hours studied today
  const streakDays = 7;

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
          value={`${totalHoursToday} hours`}
          trend="+30 min from yesterday"
          trendUp={true}
        />
        <StatCard
          icon={TrendingUp}
          label="Current Streak"
          value={`${streakDays} days`}
          trend="Keep it up!"
          trendUp={true}
        />
        <StatCard
          icon={Target}
          label="Tasks Due"
          value="3"
          trend="This week"
        />
        <StatCard
          icon={Activity}
          label="Active Courses"
          value={totalCourses}
          trend={`${completedCourses} completed`}
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
          {enrolledCourses.map((course, index) => (
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
          ))}
        </div>
      </div>

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