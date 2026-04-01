// frontend/components/dashboard/AdminDashboard.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Users, Shield, Activity, Settings, Search, 
  BarChart3, DollarSign, BookOpen, Star, TrendingUp,
  Plus, Edit, Trash2, UserPlus, Crown, X,
  CheckCircle, Clock, AlertCircle
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/components/providers/RoleProvider";

interface AdminDashboardProps {
  user: any;
  organizationId?: number | null;
  organizationName?: string | null;
}

const users = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "Student", status: "Active", joinDate: "2024-01-15" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "Instructor", status: "Active", joinDate: "2024-02-01" },
  { id: 3, name: "Carol White", email: "carol@example.com", role: "Admin", status: "Active", joinDate: "2024-01-20" },
  { id: 4, name: "David Brown", email: "david@example.com", role: "Student", status: "Inactive", joinDate: "2024-03-01" },
];

const roles = [
  { id: 1, name: "Admin", users: 5, permissions: ["All Access"], color: "purple" },
  { id: 2, name: "Instructor", users: 23, permissions: ["Manage Courses", "Grade Assignments"], color: "blue" },
  { id: 3, name: "Student", users: 2819, permissions: ["View Courses", "Submit Assignments"], color: "green" },
];

const auditLogs = [
  { id: 1, user: "Admin", action: "Created new course", timestamp: "2026-03-06 10:30 AM", status: "success" },
  { id: 2, user: "Alice Johnson", action: "Updated profile", timestamp: "2026-03-06 09:15 AM", status: "success" },
  { id: 3, user: "Bob Smith", action: "Deleted assignment", timestamp: "2026-03-05 04:20 PM", status: "warning" },
  { id: 4, user: "System", action: "Backup completed", timestamp: "2026-03-05 02:00 AM", status: "success" },
];

export default function AdminDashboard({ user, organizationId, organizationName }: AdminDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { roleData } = useRole();
  
  const firstName = user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "there";
  const orgName = organizationName || roleData.organizationName || "your organization";

  const stats = {
    totalUsers: 2847,
    activeRoles: 3,
    systemHealth: 98,
    apiCalls: 45200,
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-violet-600 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white">
              Admin Dashboard
            </div>
            <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white">
              {orgName}
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {firstName}!
          </h1>
          <p className="text-purple-100 text-lg">
            Manage users, roles, and system settings for {orgName}.
          </p>
          
          <div className="flex gap-4 mt-6">
            {organizationId && (
              <Link href={`/organizations/${organizationId}/admin`}>
                <GlowButton variant="primary" className="bg-white text-purple-600 hover:bg-purple-50">
                  <Crown className="w-4 h-4 mr-2" />
                  Organization Admin
                </GlowButton>
              </Link>
            )}
            <GlowButton variant="ghost" className="text-white border-white/30 hover:bg-white/10">
              <Settings className="w-4 h-4 mr-2" />
              System Settings
            </GlowButton>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers.toLocaleString()} trend="+145 this month" trendUp={true} />
        <StatCard icon={Shield} label="Active Roles" value={stats.activeRoles.toString()} />
        <StatCard icon={Activity} label="System Health" value={`${stats.systemHealth}%`} trend="All systems operational" trendUp={true} />
        <StatCard icon={Settings} label="API Calls" value={`${(stats.apiCalls / 1000).toFixed(1)}K`} trend="+12% from yesterday" trendUp={true} />
      </div>

      {/* Admin Tabs */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-[#12121A] border border-white/5 p-1 rounded-2xl mb-8 flex-wrap h-auto">
          <TabsTrigger value="users" className="rounded-xl px-6 py-2.5">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="rounded-xl px-6 py-2.5">
            <Shield className="w-4 h-4 mr-2" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-xl px-6 py-2.5">
            <Activity className="w-4 h-4 mr-2" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl px-6 py-2.5">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl px-6 py-2.5">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <GlowCard>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-white">User Management</h2>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
                  <Input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#12121A] border-white/10 text-white rounded-xl w-48"
                  />
                </div>
                <GlowButton variant="primary">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </GlowButton>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-[#A0A0B5] font-medium py-3 px-4">User</th>
                    <th className="text-left text-[#A0A0B5] font-medium py-3 px-4">Role</th>
                    <th className="text-left text-[#A0A0B5] font-medium py-3 px-4">Status</th>
                    <th className="text-left text-[#A0A0B5] font-medium py-3 px-4">Join Date</th>
                    <th className="text-left text-[#A0A0B5] font-medium py-3 px-4">Actions</th>
                   </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-white font-medium">{user.name}</p>
                          <p className="text-[#6B6B80] text-sm">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          user.role === "Admin" ? "bg-purple-500/20 text-purple-400" :
                          user.role === "Instructor" ? "bg-blue-500/20 text-blue-400" :
                          "bg-green-500/20 text-green-400"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          user.status === "Active" 
                            ? "bg-green-500/20 text-green-400" 
                            : "bg-gray-500/20 text-gray-400"
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-[#A0A0B5]">{user.joinDate}</td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <button className="text-purple-400 hover:text-purple-300 text-sm">Edit</button>
                          <button className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlowCard>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <GlowCard>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Roles & Permissions</h2>
              <GlowButton variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Role
              </GlowButton>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {roles.map((role) => (
                <div key={role.id} className="p-6 bg-[#12121A] rounded-xl border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">{role.name}</h3>
                    <Shield className={`w-6 h-6 text-${role.color}-400`} />
                  </div>
                  <p className="text-[#6B6B80] text-sm mb-4">{role.users.toLocaleString()} users</p>
                  <div className="space-y-2 mb-4">
                    {role.permissions.map((perm, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-[#A0A0B5]">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                        {perm}
                      </div>
                    ))}
                  </div>
                  <GlowButton variant="outline" fullWidth>Manage</GlowButton>
                </div>
              ))}
            </div>
          </GlowCard>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <GlowCard>
            <h2 className="text-2xl font-bold text-white mb-6">Audit Logs</h2>
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-[#12121A] rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${
                      log.status === "success" ? "bg-green-500" : "bg-yellow-500"
                    }`}></div>
                    <div>
                      <p className="text-white font-medium">{log.action}</p>
                      <p className="text-[#6B6B80] text-sm">by {log.user}</p>
                    </div>
                  </div>
                  <span className="text-[#A0A0B5] text-sm">{log.timestamp}</span>
                </div>
              ))}
            </div>
          </GlowCard>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlowCard>
              <h2 className="text-xl font-bold text-white mb-6">Revenue Overview</h2>
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <p className="text-3xl font-bold text-white mb-2">$401,983</p>
                <p className="text-[#A0A0B5]">Total earnings</p>
                <p className="text-sm text-green-400 mt-2">↑ 12% from last month</p>
              </div>
            </GlowCard>

            <GlowCard>
              <h2 className="text-xl font-bold text-white mb-6">Platform Metrics</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-[#A0A0B5]">Course Completion Rate</span>
                    <span className="text-purple-400">68%</span>
                  </div>
                  <div className="h-2 bg-[#1A1A24] rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: "68%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-[#A0A0B5]">Active Students</span>
                    <span className="text-purple-400">78%</span>
                  </div>
                  <div className="h-2 bg-[#1A1A24] rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: "78%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-[#A0A0B5]">User Satisfaction</span>
                    <span className="text-purple-400">4.7/5</span>
                  </div>
                  <div className="h-2 bg-[#1A1A24] rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: "94%" }} />
                  </div>
                </div>
              </div>
            </GlowCard>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <GlowCard>
            <h2 className="text-2xl font-bold text-white mb-6">System Settings</h2>
            <div className="space-y-6">
              <div className="p-4 bg-[#12121A] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-medium">Enable User Registration</p>
                    <p className="text-[#6B6B80] text-sm">Allow new users to register</p>
                  </div>
                  <label className="relative inline-block w-12 h-6 cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-12 h-6 bg-[#16161F] peer-checked:bg-purple-500 rounded-full peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
              </div>
              
              <div className="p-4 bg-[#12121A] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-medium">Email Notifications</p>
                    <p className="text-[#6B6B80] text-sm">Send email notifications to users</p>
                  </div>
                  <label className="relative inline-block w-12 h-6 cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-12 h-6 bg-[#16161F] peer-checked:bg-purple-500 rounded-full peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-[#12121A] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-medium">Maintenance Mode</p>
                    <p className="text-[#6B6B80] text-sm">Put the platform in maintenance mode</p>
                  </div>
                  <label className="relative inline-block w-12 h-6 cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-12 h-6 bg-[#16161F] peer-checked:bg-purple-500 rounded-full peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
              </div>

              <GlowButton variant="primary">Save Settings</GlowButton>
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}