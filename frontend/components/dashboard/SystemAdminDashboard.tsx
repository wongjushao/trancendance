// frontend/components/dashboard/SystemAdminDashboard.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, Shield, Activity, Settings, Search, 
  BarChart3, DollarSign, BookOpen, Star, TrendingUp,
  Plus, Edit, Trash2, UserPlus, Crown, X,
  CheckCircle, Clock, AlertCircle, Globe, Building2,
  Server, Database, Zap, Award, Filter, Download, Eye
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/components/providers/RoleProvider";
import { motion } from "framer-motion";

interface SystemAdminDashboardProps {
  user: any;
  organizationId?: number | null;
  organizationName?: string | null;
}

// Mock data for organizations
const organizations = [
  {
    id: 1,
    name: "Tech Corp",
    domain: "techcorp.com",
    memberCount: 156,
    courseCount: 24,
    revenue: 45200,
    status: "active" as const,
    createdAt: new Date(2023, 6, 1),
    plan: "enterprise" as const,
  },
  {
    id: 2,
    name: "EduLearn",
    domain: "edulearn.com",
    memberCount: 89,
    courseCount: 12,
    revenue: 18700,
    status: "active" as const,
    createdAt: new Date(2023, 8, 15),
    plan: "business" as const,
  },
  {
    id: 3,
    name: "Startup Academy",
    domain: "startupacademy.com",
    memberCount: 34,
    courseCount: 5,
    revenue: 5200,
    status: "pending" as const,
    createdAt: new Date(2024, 0, 10),
    plan: "basic" as const,
  },
];

// Mock system-wide stats
const systemStats = {
  totalUsers: 2547,
  totalOrganizations: 45,
  totalCourses: 328,
  totalRevenue: 842500,
  monthlyActiveUsers: 1890,
  averageRating: 4.7,
  platformGrowth: 18,
  serverUptime: 99.97,
};

// Mock system logs
const systemLogs = [
  {
    id: 1,
    action: "Organization Created",
    actor: "System Admin",
    entity: "Tech Corp",
    timestamp: new Date(2024, 0, 16, 10, 30),
    status: "success" as const,
  },
  {
    id: 2,
    action: "User Role Changed",
    actor: "john@techcorp.com",
    entity: "User: jane@techcorp.com",
    timestamp: new Date(2024, 0, 16, 9, 15),
    status: "success" as const,
  },
  {
    id: 3,
    action: "Course Deleted",
    actor: "admin@edulearn.com",
    entity: "Course: Old React Course",
    timestamp: new Date(2024, 0, 15, 14, 20),
    status: "warning" as const,
  },
];

export default function SystemAdminDashboard({ 
  user
}: SystemAdminDashboardProps) {
  const [greeting, setGreeting] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const activeOrgs = organizations.filter(o => o.status === "active").length;
  const pendingOrgs = organizations.filter(o => o.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {greeting}, {user?.user_metadata?.first_name || "System Admin"}! 👋
          </h1>
          <p className="text-gray-400">
            Platform Administrator • Managing {systemStats.totalOrganizations} organizations
          </p>
        </div>
        <div className="flex gap-3">
          <GlowButton size="sm" variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </GlowButton>
          <GlowButton size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            System Settings
          </GlowButton>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Globe}
          label="Organizations"
          value={systemStats.totalOrganizations}
          trend={`${activeOrgs} active, ${pendingOrgs} pending`}
        />
        <StatCard
          icon={Users}
          label="Total Users"
          value={systemStats.totalUsers}
          trend={`${systemStats.monthlyActiveUsers} active this month`}
          trendUp={true}
        />
        <StatCard
          icon={BookOpen}
          label="Total Courses"
          value={systemStats.totalCourses}
          trend="Across all organizations"
          trendUp={true}
        />
        <StatCard
          icon={DollarSign}
          label="Platform Revenue"
          value={`$${systemStats.totalRevenue.toLocaleString()}`}
          trend={`+${systemStats.platformGrowth}% growth`}
          trendUp={true}
        />
      </div>

      {/* System Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlowCard>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Server className="w-5 h-5 text-green-400" />
              <span className="text-xs text-gray-400">Uptime</span>
            </div>
            <p className="text-2xl font-bold text-white">{systemStats.serverUptime}%</p>
            <p className="text-sm text-gray-400 mt-1">Server uptime (30 days)</p>
          </div>
        </GlowCard>
        <GlowCard>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-xs text-gray-400">Performance</span>
            </div>
            <p className="text-2xl font-bold text-white">Excellent</p>
            <p className="text-sm text-gray-400 mt-1">Avg response: 245ms</p>
          </div>
        </GlowCard>
        <GlowCard>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-5 h-5 text-purple-400" />
              <span className="text-xs text-gray-400">Platform Rating</span>
            </div>
            <p className="text-2xl font-bold text-white">{systemStats.averageRating}</p>
            <p className="text-sm text-gray-400 mt-1">From 2.5k+ reviews</p>
          </div>
        </GlowCard>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="organizations" className="space-y-4">
        <TabsList className="bg-gray-800/50 border border-gray-700">
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
          <TabsTrigger value="analytics">Platform Analytics</TabsTrigger>
        </TabsList>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-4">
          <GlowCard>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-white">All Organizations</h3>
                  <p className="text-sm text-gray-400 mt-1">Manage platform organizations</p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input 
                      placeholder="Search organizations..." 
                      className="pl-9 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <GlowButton size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Organization
                  </GlowButton>
                </div>
              </div>

              <div className="space-y-3">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="w-5 h-5 text-purple-400" />
                        <h4 className="font-semibold text-white">{org.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          org.status === "active" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {org.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">Domain</p>
                          <p className="text-white">{org.domain}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Members</p>
                          <p className="text-white">{org.memberCount}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Courses</p>
                          <p className="text-white">{org.courseCount}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Revenue</p>
                          <p className="text-white">${org.revenue.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <GlowButton size="sm" variant="ghost">
                        <Eye className="w-4 h-4" />
                      </GlowButton>
                      <GlowButton size="sm" variant="ghost">
                        <Edit className="w-4 h-4" />
                      </GlowButton>
                      <GlowButton size="sm" variant="ghost" className="text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </GlowButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <GlowCard>
            <div className="p-4">
              <h3 className="font-semibold text-white mb-3">Platform Users Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">1,847</p>
                  <p className="text-sm text-gray-400">Students</p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">456</p>
                  <p className="text-sm text-gray-400">Teachers</p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">244</p>
                  <p className="text-sm text-gray-400">Admins</p>
                </div>
              </div>
              <GlowButton variant="outline" fullWidth>
                View All Users
              </GlowButton>
            </div>
          </GlowCard>
        </TabsContent>

        {/* System Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <GlowCard>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-white">Recent System Activities</h3>
                <GlowButton size="sm" variant="ghost" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filter
                </GlowButton>
              </div>
              <div className="space-y-3">
                {systemLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30">
                    <div className={`w-2 h-2 rounded-full ${
                      log.status === "success" ? "bg-green-500" : "bg-yellow-500"
                    }`} />
                    <div className="flex-1">
                      <p className="text-white">{log.action}</p>
                      <p className="text-xs text-gray-400">By: {log.actor} • {log.entity}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {log.timestamp.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlowCard>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-3">Platform Growth</h3>
                <div className="text-center py-6">
                  <p className="text-3xl font-bold text-white">+{systemStats.platformGrowth}%</p>
                  <p className="text-sm text-gray-400 mt-1">Month-over-month growth</p>
                  <div className="mt-3 inline-flex items-center gap-1 text-green-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>Consistent growth trend</span>
                  </div>
                </div>
              </div>
            </GlowCard>

            <GlowCard>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-3">User Engagement</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">Daily Active Users</span>
                      <span className="text-white">1,245</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: "65%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">Course Completion</span>
                      <span className="text-white">72%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: "72%" }} />
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
        <Link href="/admin/users">
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <Users className="w-6 h-6 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">User Management</p>
          </div>
        </Link>
        <Link href="/admin/organizations">
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <Building2 className="w-6 h-6 text-blue-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">Organizations</p>
          </div>
        </Link>
        <Link href="/admin/system">
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <Server className="w-6 h-6 text-green-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">System Health</p>
          </div>
        </Link>
        <Link href="/admin/settings">
          <div className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 text-center transition-all cursor-pointer group">
            <Shield className="w-6 h-6 text-gray-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-sm text-gray-300">Security</p>
          </div>
        </Link>
      </div>
    </div>
  );
}