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

const learningMetrics = {
  totalHours: 158,
  weeklyHours: 24,
  streakDays: 12,
  completionRate: 78,
  skillProgress: [
    { name: "React", progress: 85, color: "#6A5CFF" },
    { name: "TypeScript", progress: 70, color: "#9B6CFF" },
    { name: "Node.js", progress: 65, color: "#5CFF9B" },
    { name: "Python", progress: 60, color: "#FFD75C" },
  ]
};

const recommendedCourses = [
  {
    id: 101,
    title: "Advanced System Design",
    instructor: "Dr. Sarah Chen",
    rating: 4.9,
    students: "12.4k",
    duration: "8 weeks",
    level: "Advanced",
  },
  {
    id: 102,
    title: "Machine Learning Fundamentals",
    instructor: "Prof. Andrew Ng",
    rating: 4.8,
    students: "45.2k",
    duration: "12 weeks",
    level: "Intermediate",
  },
  {
    id: 103,
    title: "Cloud Architecture",
    instructor: "James Wilson",
    rating: 4.7,
    students: "8.9k",
    duration: "6 weeks",
    level: "Advanced",
  }
];

const recentActivities = [
  { id: 1, type: "completed", title: "React Hooks Deep Dive", date: "2 hours ago", points: 50 },
  { id: 2, type: "submitted", title: "Database Design Project", date: "5 hours ago", points: 100 },
  { id: 3, type: "enrolled", title: "Advanced TypeScript", date: "1 day ago", points: 0 },
  { id: 4, type: "achievement", title: "7-Day Learning Streak", date: "2 days ago", points: 25 },
];

export default function StudentDashboard({ user, organizationId, organizationName }: StudentDashboardProps) {
  const firstName = user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "there";

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-violet-600 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white">
              Student Dashboard
            </div>
            <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white">
              {learningMetrics.streakDays} Day Streak
            </div>
            {organizationName && (
              <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white">
                {organizationName}
              </div>
            )}
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {firstName}!
          </h1>
          <p className="text-purple-100 text-lg">
            Continue your learning journey. You've learned <span className="font-semibold">{learningMetrics.totalHours}</span> hours this month.
          </p>
          
          <div className="flex gap-4 mt-6">
            <Link href="/courses">
              <GlowButton variant="primary" className="bg-white text-purple-600 hover:bg-purple-50">
                <PlayCircle className="w-4 h-4 mr-2" />
                Continue Learning
              </GlowButton>
            </Link>
            <Link href="/analytics">
              <GlowButton variant="ghost" className="text-white border-white/30 hover:bg-white/10">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analytics
              </GlowButton>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid - Same as before */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <div className="bg-gradient-to-br from-[#16161F] to-[#12121A] rounded-xl p-5 border border-white/5 hover:border-purple-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <BookOpen className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">+2 this month</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">3</p>
            <p className="text-sm text-[#6B6B80]">Active Courses</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-gradient-to-br from-[#16161F] to-[#12121A] rounded-xl p-5 border border-white/5 hover:border-purple-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Target className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">+12 this week</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">48</p>
            <p className="text-sm text-[#6B6B80]">Lessons Completed</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="bg-gradient-to-br from-[#16161F] to-[#12121A] rounded-xl p-5 border border-white/5 hover:border-purple-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">+3 new</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">15</p>
            <p className="text-sm text-[#6B6B80]">Achievements Earned</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="bg-gradient-to-br from-[#16161F] to-[#12121A] rounded-xl p-5 border border-white/5 hover:border-purple-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <TrendingUp className="w-5 h-5 text-orange-400" />
              </div>
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">Keep going!</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{learningMetrics.streakDays}</p>
            <p className="text-sm text-[#6B6B80]">Day Streak</p>
          </div>
        </motion.div>
      </div>

      {/* Main Grid Layout - Same as before */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlowCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Learning Progress</h2>
                <p className="text-sm text-[#6B6B80]">Weekly activity and skill development</p>
              </div>
              <Link href="/analytics" className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1">
                View Details <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#12121A] rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <p className="text-sm font-medium text-white">Weekly Activity</p>
                  </div>
                  <span className="text-xs text-[#6B6B80]">This week</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">{learningMetrics.weeklyHours}h</p>
                <p className="text-xs text-green-400 mb-3">+8h from last week</p>
                <div className="flex items-end gap-1 h-24">
                  {[12, 18, 24, 32, 28, 35, 30].map((hours, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className="w-full bg-gradient-to-t from-purple-500 to-violet-500 rounded-t"
                        style={{ height: `${(hours / 40) * 80}px` }}
                      />
                      <span className="text-[10px] text-[#6B6B80]">{['M','T','W','T','F','S','S'][i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#12121A] rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-purple-400" />
                  <p className="text-sm font-medium text-white">Skills in Progress</p>
                </div>
                <div className="space-y-3">
                  {learningMetrics.skillProgress.map((skill, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#A0A0B5]">{skill.name}</span>
                        <span className="text-purple-400">{skill.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-[#1A1A24] rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ width: `${skill.progress}%`, backgroundColor: skill.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlowCard>

          <GlowCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Academic Calendar</h2>
                <p className="text-sm text-[#6B6B80]">Track your learning milestones</p>
              </div>
            </div>
            <LearningCalendar />
          </GlowCard>
        </div>

        <div className="space-y-6">
          <GlowCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Upcoming</h2>
                <p className="text-sm text-[#6B6B80]">Deadlines and events</p>
              </div>
              <Link href="/assignments" className="text-sm text-purple-400 hover:text-purple-300">
                View All
              </Link>
            </div>
            <UpcomingItems />
          </GlowCard>

          <GlowCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                <p className="text-sm text-[#6B6B80]">Your latest achievements</p>
              </div>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity, i) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-all">
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'completed' ? 'bg-green-500/10' :
                    activity.type === 'submitted' ? 'bg-blue-500/10' :
                    activity.type === 'enrolled' ? 'bg-purple-500/10' :
                    'bg-yellow-500/10'
                  }`}>
                    {activity.type === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                    {activity.type === 'submitted' && <FileText className="w-4 h-4 text-blue-400" />}
                    {activity.type === 'enrolled' && <BookOpen className="w-4 h-4 text-purple-400" />}
                    {activity.type === 'achievement' && <Award className="w-4 h-4 text-yellow-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-[#6B6B80]">{activity.date}</p>
                  </div>
                  {activity.points > 0 && (
                    <div className="px-2 py-1 bg-green-500/10 rounded-lg">
                      <span className="text-xs text-green-400">+{activity.points} XP</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Recommended for You</h2>
            </div>
            <div className="space-y-3">
              {recommendedCourses.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <div className="group p-3 rounded-xl bg-[#12121A] border border-white/5 hover:border-purple-500/30 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-6 h-6 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm group-hover:text-purple-400 transition-colors truncate">
                          {course.title}
                        </p>
                        <p className="text-xs text-[#6B6B80]">{course.instructor}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                            <span className="text-xs text-white">{course.rating}</span>
                          </div>
                          <span className="text-xs text-[#6B6B80]">{course.students} students</span>
                        </div>
                      </div>
                      <PlayCircle className="w-5 h-5 text-[#6B6B80] group-hover:text-purple-400 transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </GlowCard>
        </div>
      </div>

      {/* Achievements & Friends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlowCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Achievements</h2>
              <p className="text-sm text-[#6B6B80]">Badges and milestones you've earned</p>
            </div>
            <Award className="w-5 h-5 text-purple-400" />
          </div>
          <AchievementsList />
        </GlowCard>

        <GlowCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Learning Community</h2>
              <p className="text-sm text-[#6B6B80]">Connect with peers and friends</p>
            </div>
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <FriendsList />
        </GlowCard>
      </div>

      <GlowCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Continue Learning</h2>
            <p className="text-sm text-[#6B6B80]">Pick up where you left off</p>
          </div>
          <Link href="/courses" className="text-sm text-purple-400 hover:text-purple-300">
            View All Courses
          </Link>
        </div>
        <RecentItems />
      </GlowCard>
    </div>
  );
}