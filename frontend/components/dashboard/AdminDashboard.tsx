// frontend/components/dashboard/AdminDashboard.tsx

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Calendar,
  Activity,
  Award,
  ChevronRight,
  Clock,
  CheckCircle,
  MessageSquare,
  UserPlus,
  Star,
  Target,
  Zap,
  Sparkles,
  Settings, Trophy, Plus, BarChart3, AlertCircle
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { useRole } from "@/components/providers/RoleProvider";
import { motion } from "framer-motion";

interface AdminDashboardProps {
  user: any;
  organizationId?: number | null;
  organizationName?: string | null;
}

// Mock dashboard data
const dashboardStats = {
  totalStudents: 2847,
  activeStudents: 2210,
  totalCourses: 45,
  publishedCourses: 38,
  averageRating: 4.7,
  completionRate: 68,
  monthlyGrowth: 12,
  pendingApprovals: 3
};

const recentActivities = [
  { id: 1, user: "John Doe", action: "completed", item: "React Fundamentals", time: "2 hours ago", type: "completion" },
  { id: 2, user: "Sarah Chen", action: "enrolled in", item: "Advanced TypeScript", time: "5 hours ago", type: "enrollment" },
  { id: 3, user: "Prof. Smith", action: "published", item: "Machine Learning Basics", time: "1 day ago", type: "course" },
  { id: 4, user: "Emma Wilson", action: "submitted", item: "Final Project", time: "2 days ago", type: "submission" },
  { id: 5, user: "Michael Lee", action: "earned", item: "Completion Certificate", time: "3 days ago", type: "achievement" },
];

const topCourses = [
  { id: 1, title: "Advanced React Development", students: 1234, rating: 4.8, completion: 78 },
  { id: 2, title: "Backend with Node.js", students: 892, rating: 4.6, completion: 65 },
  { id: 3, title: "UI/UX Design Fundamentals", students: 2341, rating: 4.9, completion: 82 },
];

const pendingItems = [
  { id: 1, type: "role_request", user: "Carol White", role: "teacher", time: "3 days ago" },
  { id: 2, type: "join_request", user: "David Kim", role: "student", time: "1 day ago" },
  { id: 3, type: "course_review", course: "Advanced React", reviewer: "Prof. Smith", time: "2 days ago" },
];

export default function AdminDashboard({ user, organizationId, organizationName }: AdminDashboardProps) {
  const { roleData } = useRole();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "completion": return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "enrollment": return <UserPlus className="w-4 h-4 text-blue-400" />;
      case "course": return <BookOpen className="w-4 h-4 text-purple-400" />;
      case "submission": return <MessageSquare className="w-4 h-4 text-yellow-400" />;
      case "achievement": return <Award className="w-4 h-4 text-orange-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {greeting}, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
          </h1>
          <p className="text-[#A0A0B5]">
            Welcome back to {organizationName || "your organization"} dashboard
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/organizations/${organizationId}/admin`}>
            <GlowButton variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              Admin Panel
            </GlowButton>
          </Link>
        </div>
      </div>

      {/* Stats Grid - Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Users} 
          label="Total Students" 
          value={dashboardStats.totalStudents.toLocaleString()} 
          trend={`+${dashboardStats.monthlyGrowth}%`} 
          trendUp={true}
        />
        <StatCard 
          icon={BookOpen} 
          label="Active Courses" 
          value={dashboardStats.publishedCourses.toString()} 
          trend={`${dashboardStats.totalCourses - dashboardStats.publishedCourses} drafts`}
        />
        <StatCard 
          icon={TrendingUp} 
          label="Completion Rate" 
          value={`${dashboardStats.completionRate}%`} 
        />
        <StatCard 
          icon={Star} 
          label="Avg. Rating" 
          value={dashboardStats.averageRating.toString()} 
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlowCard>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Activity className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-sm text-[#A0A0B5]">Active Students</span>
              </div>
              <span className="text-2xl font-bold text-white">{dashboardStats.activeStudents.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${(dashboardStats.activeStudents / dashboardStats.totalStudents) * 100}%` }}
              />
            </div>
            <p className="text-xs text-[#6B6B80] mt-2">
              {Math.round((dashboardStats.activeStudents / dashboardStats.totalStudents) * 100)}% of total students active
            </p>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Target className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-sm text-[#A0A0B5]">Monthly Growth</span>
              </div>
              <span className="text-2xl font-bold text-green-400">+{dashboardStats.monthlyGrowth}%</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-[#A0A0B5]">Increase in student enrollment</span>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Clock className="w-4 h-4 text-yellow-400" />
                </div>
                <span className="text-sm text-[#A0A0B5]">Pending Approvals</span>
              </div>
              <span className="text-2xl font-bold text-yellow-400">{dashboardStats.pendingApprovals}</span>
            </div>
            <Link href={`/organizations/${organizationId}/admin?tab=role-requests`}>
              <button className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1">
                Review requests
                <ChevronRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
        </GlowCard>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Activity & Top Courses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity */}
          <GlowCard>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                </div>
                <Link href={`/organizations/${organizationId}/admin`}>
                  <button className="text-sm text-[#A0A0B5] hover:text-white transition-colors">
                    View all
                  </button>
                </Link>
              </div>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div>
                        <p className="text-white text-sm">
                          <span className="font-medium">{activity.user}</span>{' '}
                          <span className="text-[#A0A0B5]">{activity.action}</span>{' '}
                          <span className="font-medium">{activity.item}</span>
                        </p>
                        <p className="text-xs text-[#6B6B80]">{activity.time}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </GlowCard>

          {/* Top Performing Courses */}
          <GlowCard>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Top Performing Courses</h3>
                </div>
                <Link href={`/organizations/${organizationId}/admin?tab=courses`}>
                  <button className="text-sm text-[#A0A0B5] hover:text-white transition-colors">
                    Manage courses
                  </button>
                </Link>
              </div>
              <div className="space-y-4">
                {topCourses.map((course) => (
                  <div key={course.id} className="p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium">{course.title}</h4>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <span className="text-sm text-white">{course.rating}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-[#A0A0B5]">{course.students} students</span>
                      <span className="text-[#A0A0B5]">{course.completion}% completion</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${course.completion}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>
        </div>

        {/* Right Column - Quick Actions & Pending Items */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <GlowCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
              </div>
              <div className="space-y-3">
                <Link href={`/organizations/${organizationId}/admin?tab=members`}>
                  <button className="w-full flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <UserPlus className="w-4 h-4 text-purple-400" />
                      <span className="text-white">Invite New Member</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#6B6B80] group-hover:text-white transition-colors" />
                  </button>
                </Link>
                <Link href={`/organizations/${organizationId}/admin?tab=courses`}>
                  <button className="w-full flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Plus className="w-4 h-4 text-purple-400" />
                      <span className="text-white">Create New Course</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#6B6B80] group-hover:text-white transition-colors" />
                  </button>
                </Link>
                <Link href={`/organizations/${organizationId}/admin?tab=analytics`}>
                  <button className="w-full flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-4 h-4 text-purple-400" />
                      <span className="text-white">View Analytics Report</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#6B6B80] group-hover:text-white transition-colors" />
                  </button>
                </Link>
                <Link href={`/organizations/${organizationId}/admin?tab=settings`}>
                  <button className="w-full flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Settings className="w-4 h-4 text-purple-400" />
                      <span className="text-white">Organization Settings</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#6B6B80] group-hover:text-white transition-colors" />
                  </button>
                </Link>
              </div>
            </div>
          </GlowCard>

          {/* Pending Items */}
          {pendingItems.length > 0 && (
            <GlowCard>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Pending Items</h3>
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                    {pendingItems.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {pendingItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                      <div className="flex-1">
                        <p className="text-white text-sm">
                          {item.type === "role_request" && `${item.user} requested ${item.role} role`}
                          {item.type === "join_request" && `${item.user} wants to join as ${item.role}`}
                          {item.type === "course_review" && `${item.course} needs review from ${item.reviewer}`}
                        </p>
                        <p className="text-xs text-[#6B6B80]">{item.time}</p>
                      </div>
                      <Link href={`/organizations/${organizationId}/admin?tab=role-requests`}>
                        <button className="text-xs text-purple-400 hover:text-purple-300">
                          Review
                        </button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </GlowCard>
          )}

          {/* Tip of the Day */}
          <GlowCard>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Tip of the Day</h3>
              </div>
              <p className="text-[#A0A0B5] text-sm">
                Use the Admin Panel to manage members, courses, role requests, and organization settings in detail.
              </p>
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}