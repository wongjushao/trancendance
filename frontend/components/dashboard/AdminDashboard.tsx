// frontend/components/dashboard/AdminDashboard.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, Shield, Activity, Settings, Search, 
  BarChart3, DollarSign, BookOpen, Star, TrendingUp,
  Plus, Edit, Trash2, UserPlus, Crown, X,
  CheckCircle, Clock, AlertCircle, Building2, Calendar,
  Mail, Download, Filter, MoreVertical
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/components/providers/RoleProvider";
import { motion } from "framer-motion";

interface AdminDashboardProps {
  user: any;
  organizationId?: number | null;
  organizationName?: string | null;
}

// Mock data for organization members
const organizationMembers = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "admin" as const,
    avatar: "JD",
    joinedAt: new Date(2024, 0, 1),
    courses: 5,
    lastActive: new Date(2024, 0, 16),
    status: "active" as const,
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "teacher" as const,
    avatar: "JS",
    joinedAt: new Date(2024, 0, 5),
    courses: 3,
    lastActive: new Date(2024, 0, 16),
    status: "active" as const,
  },
  {
    id: "3",
    name: "Bob Wilson",
    email: "bob@example.com",
    role: "student" as const,
    avatar: "BW",
    joinedAt: new Date(2024, 0, 10),
    courses: 2,
    lastActive: new Date(2024, 0, 15),
    status: "active" as const,
  },
];

// Mock data for organization courses
const organizationCourses = [
  {
    id: 1,
    title: "React for Enterprise",
    description: "Advanced React for large-scale applications",
    instructor: "Jane Smith",
    students: 45,
    revenue: 4455,
    rating: 4.8,
    status: "published" as const,
    createdAt: new Date(2024, 0, 1),
  },
  {
    id: 2,
    title: "TypeScript Mastery",
    description: "Complete TypeScript course for professionals",
    instructor: "John Doe",
    students: 38,
    revenue: 3382,
    rating: 4.9,
    status: "published" as const,
    createdAt: new Date(2024, 0, 5),
  },
];

// Mock pending role requests
const pendingRequests = [
  {
    id: "1",
    userName: "Alice Johnson",
    userEmail: "alice@example.com",
    requestedRole: "teacher" as const,
    requestedAt: new Date(2024, 0, 15),
    message: "I have 5 years of teaching experience",
  },
  {
    id: "2",
    userName: "Carol Davis",
    userEmail: "carol@example.com",
    requestedRole: "teacher" as const,
    requestedAt: new Date(2024, 0, 14),
    message: "Former senior developer at Google",
  },
];

// Mock analytics data
const orgAnalytics = {
  totalRevenue: 7837,
  totalStudents: 83,
  totalTeachers: 8,
  totalCourses: 12,
  averageRating: 4.7,
  monthlyGrowth: 12,
  completionRate: 68,
};

export default function AdminDashboard({ 
  user, 
  organizationId, 
  organizationName 
}: AdminDashboardProps) {
  const [greeting, setGreeting] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const activeMembers = organizationMembers.filter(m => m.status === "active").length;
  const publishedCourses = organizationCourses.filter(c => c.status === "published").length;
  const pendingApprovals = pendingRequests.length;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {greeting}, {user?.user_metadata?.first_name || user?.email?.split('@')[0]}! 👋
          </h1>
          <p className="text-gray-400">
            Managing {organizationName || "Your Organization"} • {activeMembers} active members
          </p>
        </div>
        <div className="flex gap-3">
          <GlowButton size="sm" variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </GlowButton>
          <GlowButton size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Organization Settings
          </GlowButton>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Building2}
          label="Organization"
          value={organizationName || "N/A"}
          trend={`${publishedCourses} active courses`}
        />
        <StatCard
          icon={Users}
          label="Total Members"
          value={organizationMembers.length}
          trend={`${activeMembers} active, ${organizationMembers.length - activeMembers} inactive`}
        />
        <StatCard
          icon={BookOpen}
          label="Total Courses"
          value={organizationCourses.length}
          trend={`${publishedCourses} published`}
          trendUp={true}
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={`$${orgAnalytics.totalRevenue}`}
          trend={`+${orgAnalytics.monthlyGrowth}% this month`}
          trendUp={true}
        />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-gray-800/50 border border-gray-700">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="requests">Pending Requests</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Activity */}
            <GlowCard>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-3">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white">New member joined</p>
                      <p className="text-gray-400">Alice Johnson joined as Teacher</p>
                    </div>
                    <span className="text-xs text-gray-500">2 hours ago</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white">New course published</p>
                      <p className="text-gray-400">"Advanced React" is now live</p>
                    </div>
                    <span className="text-xs text-gray-500">Yesterday</span>
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* Quick Stats */}
            <GlowCard>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-3">Organization Health</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">Course Completion Rate</span>
                      <span className="text-white">{orgAnalytics.completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${orgAnalytics.completionRate}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">Student Satisfaction</span>
                      <span className="text-white">{orgAnalytics.averageRating}/5.0</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${(orgAnalytics.averageRating / 5) * 100}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="text-center p-2 bg-purple-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-white">{orgAnalytics.totalStudents}</p>
                      <p className="text-xs text-gray-400">Total Students</p>
                    </div>
                    <div className="text-center p-2 bg-purple-500/10 rounded-lg">
                      <p className="text-2xl font-bold text-white">{orgAnalytics.totalTeachers}</p>
                      <p className="text-xs text-gray-400">Active Teachers</p>
                    </div>
                  </div>
                </div>
              </div>
            </GlowCard>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <GlowCard>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-white">Team Members</h3>
                  <p className="text-sm text-gray-400 mt-1">Manage organization members and roles</p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input 
                      placeholder="Search members..." 
                      className="pl-9 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <GlowButton size="sm" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Invite Member
                  </GlowButton>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-800">
                    <tr className="text-left text-gray-400 text-sm">
                      <th className="pb-3">Member</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3">Courses</th>
                      <th className="pb-3">Joined</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizationMembers.map((member) => (
                      <tr key={member.id} className="border-b border-gray-800/50">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                              {member.avatar}
                            </div>
                            <div>
                              <p className="font-medium text-white">{member.name}</p>
                              <p className="text-xs text-gray-400">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            member.role === "admin" ? "bg-purple-500/20 text-purple-400" :
                            member.role === "teacher" ? "bg-blue-500/20 text-blue-400" :
                            "bg-green-500/20 text-green-400"
                          }`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="py-3 text-white">{member.courses}</td>
                        <td className="py-3 text-gray-400 text-sm">
                          {member.joinedAt.toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1 text-xs ${
                            member.status === "active" ? "text-green-400" : "text-gray-400"
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              member.status === "active" ? "bg-green-400" : "bg-gray-400"
                            }`} />
                            {member.status}
                          </span>
                        </td>
                        <td className="py-3">
                          <button className="p-1 hover:bg-gray-700 rounded">
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </GlowCard>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {organizationCourses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlowCard>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-white">{course.title}</h3>
                        <p className="text-sm text-gray-400 mt-1">{course.instructor}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                        {course.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">{course.description}</p>
                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div className="bg-gray-800/50 rounded p-2">
                        <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                        <p className="text-sm font-semibold text-white">{course.students}</p>
                        <p className="text-xs text-gray-400">Students</p>
                      </div>
                      <div className="bg-gray-800/50 rounded p-2">
                        <Star className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                        <p className="text-sm font-semibold text-white">{course.rating}</p>
                        <p className="text-xs text-gray-400">Rating</p>
                      </div>
                      <div className="bg-gray-800/50 rounded p-2">
                        <DollarSign className="w-4 h-4 text-green-400 mx-auto mb-1" />
                        <p className="text-sm font-semibold text-white">${course.revenue}</p>
                        <p className="text-xs text-gray-400">Revenue</p>
                      </div>
                    </div>
                    <GlowButton size="sm" variant="outline" fullWidth>
                      View Details
                    </GlowButton>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <GlowCard>
            <div className="p-4">
              <h3 className="font-semibold text-white mb-3">Pending Role Requests</h3>
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-white">{request.userName}</p>
                    <p className="text-sm text-gray-400">{request.userEmail}</p>
                    <p className="text-xs text-gray-500 mt-1">Requested: {request.requestedRole}</p>
                    {request.message && (
                      <p className="text-xs text-gray-400 mt-1">"{request.message}"</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <GlowButton size="sm" variant="outline" className="text-green-400">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </GlowButton>
                    <GlowButton size="sm" variant="outline" className="text-red-400">
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </GlowButton>
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlowCard>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-3">Revenue Overview</h3>
                <div className="text-center py-6">
                  <p className="text-3xl font-bold text-white">${orgAnalytics.totalRevenue}</p>
                  <p className="text-sm text-gray-400 mt-1">Total organization revenue</p>
                  <div className="mt-3 inline-flex items-center gap-1 text-green-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>+{orgAnalytics.monthlyGrowth}% growth</span>
                  </div>
                </div>
              </div>
            </GlowCard>

            <GlowCard>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-3">Growth Metrics</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">Student Growth</span>
                      <span className="text-white">+23%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: "23%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">Course Completion</span>
                      <span className="text-white">{orgAnalytics.completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${orgAnalytics.completionRate}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </GlowCard>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href={`/organizations/${organizationId}/admin`}>
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <Settings className="w-6 h-6 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">Org Settings</p>
          </div>
        </Link>
        <Link href="/analytics">
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <BarChart3 className="w-6 h-6 text-blue-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">Analytics</p>
          </div>
        </Link>
        <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
          <Mail className="w-6 h-6 text-green-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-sm text-gray-300">Send Invites</p>
        </div>
        <Link href="/settings">
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <Shield className="w-6 h-6 text-gray-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">Permissions</p>
          </div>
        </Link>
      </div>
    </div>
  );
}