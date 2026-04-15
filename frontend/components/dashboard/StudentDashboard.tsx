// frontend/components/dashboard/StudentDashboard.tsx

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen, Clock, Trophy, Target, TrendingUp,
  Calendar, Activity, Award, Users, ChevronRight,
  PlayCircle, FileText, MessageCircle, Bell, Star,
  Sparkles, BarChart3, FolderOpen, CheckCircle2,
  Building2,
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { motion } from "framer-motion";
import { LearningCalendar } from "@/components/dashboard/LearningCalendar";
import { UpcomingItems } from "@/components/dashboard/UpcomingItems";
import { RecentItems } from "@/components/dashboard/RecentItems";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useRole } from "@/components/providers/RoleProvider";

interface StudentDashboardProps {
  user: any;
  organizationId?: number | null;
  organizationName?: string | null;
}

// Mock data for enrolled courses (in-progress only)
const mockEnrolledCourses = [
  {
    id: 1,
    title: "Advanced React Development",
    description: "Master React with hooks, context, and advanced patterns",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=240&fit=crop",
    instructor: "Sarah Johnson",
    instructorAvatar: "SJ",
    progress: 65,
    lessonsCompleted: 26,
    totalLessons: 40,
    lastAccessed: new Date(2024, 0, 15),
    rating: 4.8,
    certificateEarned: false,
  },
  {
    id: 2,
    title: "UI/UX Design Fundamentals",
    description: "Learn the principles of user-centered design",
    thumbnail: "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&h=240&fit=crop",
    instructor: "Michael Chen",
    instructorAvatar: "MC",
    progress: 30,
    lessonsCompleted: 12,
    totalLessons: 40,
    lastAccessed: new Date(2024, 0, 14),
    rating: 4.9,
    certificateEarned: false,
  },
];

// Mock data for recent activity (last 5 actions)
const mockRecentActivity = [
  {
    id: 1,
    title: "Completed React Hooks module",
    type: "course" as const,
    courseName: "Advanced React Development",
    progress: 100,
    lastAccessed: new Date(2024, 0, 15, 14, 30),
    status: "completed" as const,
  },
  {
    id: 2,
    title: "Submitted Week 3 Assignment",
    type: "assignment" as const,
    courseName: "Advanced React Development",
    lastAccessed: new Date(2024, 0, 14, 10, 15),
    status: "completed" as const,
  },
  {
    id: 3,
    title: "Started Design Systems module",
    type: "course" as const,
    courseName: "UI/UX Design Fundamentals",
    progress: 15,
    lastAccessed: new Date(2024, 0, 13, 16, 45),
    status: "in-progress" as const,
  },
];

// Mock data for upcoming deadlines (next 7 days only)
const mockUpcomingItems = [
  {
    id: 1,
    title: "Week 4 Assignment: Build a Dashboard",
    type: "assignment" as const,
    courseName: "Advanced React Development",
    date: new Date(2024, 0, 20, 23, 59),
  },
  {
    id: 2,
    title: "Design Critique Session",
    type: "live_session" as const,
    courseName: "UI/UX Design Fundamentals",
    date: new Date(2024, 0, 18, 15, 0),
  },
];

export default function StudentDashboard({ 
  user, 
  organizationId, 
  organizationName 
}: StudentDashboardProps) {
  const { roleData, refreshRole } = useRole();
  const [displayName, setDisplayName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Listen for role changes
  useEffect(() => {
    const handleRoleChange = () => {
      refreshRole(); // Refresh role data when changes occur
    };

    window.addEventListener('roleChanged', handleRoleChange);
    
    return () => {
      window.removeEventListener('roleChanged', handleRoleChange);
    };
  }, [refreshRole]);

  // Fetch profile data to get the actual name
  const fetchProfileName = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, username')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      // Priority: first_name + last_name > username > email
      if (data?.first_name && data?.last_name) {
        setDisplayName(`${data.first_name} ${data.last_name}`);
      } else if (data?.first_name) {
        setDisplayName(data.first_name);
      } else if (data?.username) {
        setDisplayName(data.username);
      } else {
        // Fallback to user metadata or email
        setDisplayName(user.user_metadata?.full_name || user.email?.split('@')[0] || "Student");
      }
    } catch (error) {
      console.error("Error fetching profile name:", error);
      setDisplayName(user.email?.split('@')[0] || "Student");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileName();
  }, [user.id]);

  // Calculate stats (today/week focused)
  const totalHoursToday = 2; // Mock: hours studied today
  const coursesInProgress = mockEnrolledCourses.length;
  const assignmentsDue = mockUpcomingItems.filter(item => item.type === 'assignment').length;
  const currentStreak = 5; // Mock: 5 day streak

  // Check if user has a pending teacher request
  const isPendingTeacher = roleData?.role === 'pending_teacher';
  const isPendingOrgAdmin = roleData?.role === 'pending_org_admin';

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {displayName || "Student"}! 👋
          </h1>
          <p className="text-gray-400 mt-1">
            Keep up the great work! You're making excellent progress.
          </p>
        </div>
        <div className="flex gap-3">
          <GlowButton variant="outline" size="sm">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </GlowButton>
          <GlowButton variant="primary" size="sm">
            <MessageCircle className="w-4 h-4 mr-2" />
            Messages
          </GlowButton>
        </div>
      </div>

      {/* [FIXED] Pending Teacher Banner - Now with key to force re-render on role change */}
      {isPendingTeacher && (
        <motion.div
          key="pending-teacher-banner" // Add key for proper re-rendering
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-400">Teacher Request Pending</h3>
              <p className="text-sm text-gray-300 mt-1">
                Your request to become a teacher is being reviewed by an administrator.
                You'll be notified once it's approved.
              </p>
            </div>
            <Link href="/teacher-request">
              <GlowButton variant="outline" size="sm">
                View Status
                <ChevronRight className="w-4 h-4 ml-1" />
              </GlowButton>
            </Link>
          </div>
        </motion.div>
      )}

      {/* [FIXED] Pending Organization Admin Banner - Now with key to force re-render on role change */}
      {isPendingOrgAdmin && (
        <motion.div
          key="pending-org-admin-banner" // Add key for proper re-rendering
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-400">Organization Admin Request Pending</h3>
              <p className="text-sm text-gray-300 mt-1">
                Your request to become an organization administrator is being reviewed.
                You'll be notified once it's approved.
              </p>
            </div>
            <Link href="/organization-setup">
              <GlowButton variant="outline" size="sm">
                View Status
                <ChevronRight className="w-4 h-4 ml-1" />
              </GlowButton>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Stats Grid - Today focused */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="Hours Today"
          value={totalHoursToday}
          trend="+2 from yesterday"
          trendUp={true}
        />
        <StatCard
          icon={BookOpen}
          label="Courses In Progress"
          value={coursesInProgress}
          trend="On track"
          trendUp={true}
        />
        <StatCard
          icon={Calendar}
          label="Due This Week"
          value={assignmentsDue}
          trend="2 assignments"
          trendUp={false}
        />
        <StatCard
          icon={Target}
          label="Current Streak"
          value={`${currentStreak} days`}
          trend="Keep it up!"
          trendUp={true}
        />
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Calendar */}
        <div className="lg:col-span-2">
          <LearningCalendar userId={user.id} />
        </div>

        {/* Right Column - Upcoming Items and Recent Items */}
        <div className="space-y-6">
          <UpcomingItems items={mockUpcomingItems} />
          <RecentItems items={mockRecentActivity} />
        </div>
      </div>

      {/* My Courses Section - In Progress Only */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">My Courses</h2>
          <Link href="/courses">
            <GlowButton variant="ghost" size="sm">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </GlowButton>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockEnrolledCourses.map((course) => (
            <GlowCard key={course.id} glowColor="purple">
              <div className="flex gap-4">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-32 h-32 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">{course.title}</h3>
                  <p className="text-sm text-gray-400 mb-2">{course.description}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-300 ml-1">{course.rating}</span>
                    </div>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-sm text-gray-400">
                      {course.lessonsCompleted}/{course.totalLessons} lessons
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full h-2"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400">{course.progress}%</span>
                  </div>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      </div>

      {/* Quick Actions Section */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlowButton variant="outline" className="w-full">
            <PlayCircle className="w-4 h-4 mr-2" />
            Continue Learning
          </GlowButton>
          <GlowButton variant="outline" className="w-full">
            <FileText className="w-4 h-4 mr-2" />
            View Assignments
          </GlowButton>
          <GlowButton variant="outline" className="w-full">
            <Trophy className="w-4 h-4 mr-2" />
            Achievements
          </GlowButton>
          <GlowButton variant="outline" className="w-full">
            <Users className="w-4 h-4 mr-2" />
            Study Groups
          </GlowButton>
        </div>
      </div>
    </div>
  );
}