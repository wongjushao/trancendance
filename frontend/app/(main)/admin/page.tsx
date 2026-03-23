"use client"; // CRITICAL: Required for Tabs and interactive Buttons

import { Users, Shield, Activity, Settings, Search } from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Data remains exactly the same as your React context
const users = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "Student", status: "Active", joinDate: "2024-01-15" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "Instructor", status: "Active", joinDate: "2024-02-01" },
  { id: 3, name: "Carol White", email: "carol@example.com", role: "Admin", status: "Active", joinDate: "2024-01-20" },
  { id: 4, name: "David Brown", email: "david@example.com", role: "Student", status: "Inactive", joinDate: "2024-03-01" },
];

const roles = [
  { id: 1, name: "Admin", users: 5, permissions: ["All Access"], color: "red" },
  { id: 2, name: "Instructor", users: 23, permissions: ["Manage Courses", "Grade Assignments"], color: "blue" },
  { id: 3, name: "Student", users: 2819, permissions: ["View Courses", "Submit Assignments"], color: "green" },
];

const auditLogs = [
  { id: 1, user: "Admin", action: "Created new course", timestamp: "2026-03-06 10:30 AM", status: "success" },
  { id: 2, user: "Alice Johnson", action: "Updated profile", timestamp: "2026-03-06 09:15 AM", status: "success" },
  { id: 3, user: "Bob Smith", action: "Deleted assignment", timestamp: "2026-03-05 04:20 PM", status: "warning" },
  { id: 4, user: "System", action: "Backup completed", timestamp: "2026-03-05 02:00 AM", status: "success" },
];

export default function AdminPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-[#A0A0B5]">Manage users, roles, and system settings</p>
        </div>
        <GlowButton variant="primary">
          <Settings className="w-5 h-5" />
          System Settings
        </GlowButton>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Total Users"
          value="2,847"
          trend="+145 this month"
          trendUp={true}
        />
        <StatCard
          icon={Shield}
          label="Active Roles"
          value="3"
        />
        <StatCard
          icon={Activity}
          label="System Health"
          value="98%"
          trend="All systems operational"
          trendUp={true}
        />
        <StatCard
          icon={Settings}
          label="API Calls"
          value="45.2K"
          trend="+12% from yesterday"
          trendUp={true}
        />
      </div>
      
      {/* Admin Tabs */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-[#12121A] border border-white/10 p-1 rounded-xl">
          <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            <Shield className="w-4 h-4 mr-2" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            <Activity className="w-4 h-4 mr-2" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        {/* Users Tab Content */}
        <TabsContent value="users" className="mt-6">
          <GlowCard>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">User Management</h2>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
                  <Input
                    type="text"
                    placeholder="Search users..."
                    className="pl-10 bg-[#12121A] border-white/10 text-white rounded-xl"
                  />
                </div>
                <GlowButton variant="primary">Add User</GlowButton>
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
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-white font-medium">{user.name}</p>
                          <p className="text-[#6B6B80] text-sm">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
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

        {/* Roles Tab Content */}
        <TabsContent value="roles" className="mt-6">
          <GlowCard>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">Roles & Permissions</h2>
              <GlowButton variant="primary">Create Role</GlowButton>
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

        {/* Audit Logs Tab Content */}
        <TabsContent value="audit" className="mt-6">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white mb-6">Audit Logs</h2>
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

        {/* Settings Tab Content */}
        <TabsContent value="settings" className="mt-6">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white mb-6">System Settings</h2>
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

              <GlowButton variant="primary">Save Settings</GlowButton>
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}