// frontend/app/(main)/dashboard/DashboardClient.tsx

"use client";

import { useState, useEffect } from "react";
import { BookOpen, Clock, Trophy, Target, Calendar, TrendingUp, Building2, AlertCircle } from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import Link from "next/link";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useRole } from "@/components/providers/RoleProvider";

import { AchievementsList } from "@/components/dashboard/AchievementsList";
import { FriendsList } from "@/components/dashboard/FriendsList";
import { LearningCalendar } from "@/components/dashboard/LearningCalendar";
import { UpcomingItems } from "@/components/dashboard/UpcomingItems";
import { RecentItems } from "@/components/dashboard/RecentItems";

const PROFILE_UPDATED_EVENT = 'profile-updated';

interface DashboardClientProps {
  user: SupabaseUser;
  upcomingAssignments: any[];
  recentActivity: any[];
  activeCourses: any[];
}

export default function DashboardClient({ user: initialUser }: DashboardClientProps) {
  const [user, setUser] = useState(initialUser);
  const { roleData, isPending } = useRole();

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = async (event: CustomEvent) => {
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

  const fullName: string =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "there";

  const firstName = fullName.split(" ")[0];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">
          Welcome back, {firstName}! 👋
        </h1>
        <p className="text-[#A0A0B5]">Continue your learning journey</p>
      </div>

      {/* Pending Admin Banner */}
      {roleData.role === "pending_admin" && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">Admin Account Pending Verification</h3>
              <p className="text-sm text-[#A0A0B5] mb-3">
                You've requested to become an admin. Please complete your organization setup to start the verification process.
                You currently have student access until your organization is verified.
              </p>
              <Link href="/organization-setup">
                <GlowButton variant="primary" size="sm">
                  <Building2 className="w-4 h-4 mr-2" />
                  Complete Organization Setup
                </GlowButton>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Pending Teacher Banner */}
      {roleData.role === "pending_teacher" && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">Teacher Request Pending</h3>
              <p className="text-sm text-[#A0A0B5] mb-3">
                Your request to become a teacher at <span className="text-purple-400 font-medium">{roleData.pendingOrganizationName || "your selected organization"}</span> is awaiting approval.
                You currently have student access until your request is approved.
              </p>
              <Link href="/teacher-request">
                <GlowButton variant="primary" size="sm">
                  <Clock className="w-4 h-4 mr-2" />
                  View Request Status
                </GlowButton>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={BookOpen}   label="Active Courses"    value="3"          trend="+2 this month" trendUp={true} />
        <StatCard icon={Target}     label="Completed Lessons" value="48"         trend="+12 this week" trendUp={true} />
        <StatCard icon={Trophy}     label="Achievements"      value="15"         trend="+3 new"        trendUp={true} />
        <StatCard icon={TrendingUp} label="Learning Streak"   value="12 days"    trend="Keep going!"   trendUp={true} />
      </div>

      {/* Main Content Grid - New Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Achievements & Friends */}
        <div className="lg:col-span-1 space-y-6">
          <GlowCard>
            <AchievementsList />
          </GlowCard>
          <GlowCard>
            <FriendsList />
          </GlowCard>
        </div>

        {/* Center - Calendar & Recent Items */}
        <div className="lg:col-span-2 space-y-6">
          <GlowCard>
            <LearningCalendar />
          </GlowCard>
          <GlowCard>
            <RecentItems />
          </GlowCard>
        </div>

        {/* Right Sidebar - Upcoming Items */}
        <div className="lg:col-span-1">
          <GlowCard>
            <UpcomingItems />
          </GlowCard>
        </div>
      </div>
    </div>
  );
}