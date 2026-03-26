// frontend/app/(main)/dashboard/DashboardClient.tsx

"use client";

import { useState, useEffect } from "react";
import { BookOpen, Clock, Trophy, Target, Calendar, TrendingUp } from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import Link from "next/link";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

const PROFILE_UPDATED_EVENT = 'profile-updated';

interface DashboardClientProps {
  user: SupabaseUser;
  upcomingAssignments: any[];
  recentActivity: any[];
  activeCourses: any[];
}

export default function DashboardClient({ user: initialUser, upcomingAssignments, recentActivity, activeCourses }: DashboardClientProps) {
  const [user, setUser] = useState(initialUser);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = async (event: CustomEvent) => {
      // Refresh user data from Supabase
      const supabase = getSupabaseBrowserClient();
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser) {
        setUser(updatedUser);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate as EventListener);
      return () => {
        window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate as EventListener);
      };
    }
  }, []);

  // Resolve a friendly first name to use in the greeting
  const fullName: string =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "there";

  const firstName = fullName.split(" ")[0];

  return (
    <div className="space-y-8">

      {/* Welcome Header ΓÇö real user name */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">
          Welcome back, {firstName}! 👋
        </h1>
        <p className="text-[#A0A0B5]">Continue your learning journey</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={BookOpen}   label="Active Courses"    value={3}          trend="+2 this month" trendUp={true} />
        <StatCard icon={Target}     label="Completed Lessons" value={48}         trend="+12 this week" trendUp={true} />
        <StatCard icon={Trophy}     label="Achievements"      value={15}         trend="+3 new"        trendUp={true} />
        <StatCard icon={TrendingUp} label="Learning Streak"   value="12 days"    trend="Keep going!"   trendUp={true} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Active Courses */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">Continue Learning</h2>
            <Link href="/courses">
              <GlowButton variant="ghost">View All</GlowButton>
            </Link>
          </div>

          <div className="space-y-4">
            {activeCourses.map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`}>
                <GlowCard className="hover:scale-[1.02] transition-transform cursor-pointer">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full sm:w-32 h-32 rounded-xl object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">{course.title}</h3>
                      <p className="text-[#A0A0B5] text-sm mb-3">by {course.instructor}</p>

                      <div className="flex items-center gap-4 text-sm text-[#6B6B80] mb-3">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {course.lessons} lessons
                        </span>
                        <span>{course.students.toLocaleString()} students</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#A0A0B5]">Progress</span>
                          <span className="text-purple-400 font-medium">{course.progress}%</span>
                        </div>
                        <div className="h-2 bg-[#12121A] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-violet-600 rounded-full transition-all duration-500"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </GlowCard>
              </Link>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Upcoming Assignments */}
          <GlowCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Upcoming</h3>
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>

            <div className="space-y-3">
              {upcomingAssignments.map((assignment) => (
                <Link key={assignment.id} href={`/assignments/${assignment.id}`}>
                  <div className="p-3 bg-[#12121A] rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                    <p className="text-white font-medium text-sm mb-1">{assignment.title}</p>
                    <p className="text-[#6B6B80] text-xs mb-2">{assignment.course}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#A0A0B5] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {assignment.dueDate}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        assignment.status === "pending"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {assignment.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <Link href="/assignments">
              <GlowButton variant="outline" fullWidth className="mt-4">
                View All Assignments
              </GlowButton>
            </Link>
          </GlowCard>

          {/* Recent Activity */}
          <GlowCard>
            <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 shrink-0" />
                  <div className="flex-1">
                    <p className="text-white text-sm">{activity.text}</p>
                    <p className="text-[#6B6B80] text-xs mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}