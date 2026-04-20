// frontend/app/(main)/organizations/[id]/admin/page.tsx

"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Users, 
  UserPlus, 
  Clock, 
  Settings, 
  CheckCircle, 
  XCircle,
  Mail,
  Shield,
  MoreVertical,
  BarChart3,
  DollarSign,
  BookOpen,
  TrendingUp,
  Award,
  Star,
  Filter,
  Search,
  Download,
  Send,
  Trash2,
  Edit2,
  Crown,
  AlertCircle,
  Calendar,
  MessageSquare,
  Copy,
  Link as LinkIcon,
  Plus
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRole } from "@/components/providers/RoleProvider";
import { Organization, mockOrganizations } from "@/lib/role";
import { InviteMemberModal } from "@/components/organization/InviteMemberModal";
import { 
  RoleRequest, 
  getPendingRequestsForOrganization, 
  approveRoleRequest, 
  rejectRoleRequest,
  cancelRoleRequest
} from "@/lib/role-requests";
import { toast } from "sonner";
import { PendingRequestsTab } from '@/components/organization/PendingRequestsTab';
import { getPendingJoinRequests, getOrganizationMembers, updateMemberRole, removeMember } from '@/lib/organizations';
import { JoinRequest } from "@/types/organizations";

// Mock data for organization members
interface Member {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "student";
  avatar: string;
  joinedAt: string;
  courses: number;
  lastActive: string;
  status: "active" | "inactive";
}

interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  instructor: string;
  students: number;
  revenue: number;
  rating: number;
  status: "published" | "draft";
  createdAt: string;
}

interface AnalyticsData {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalRevenue: number;
  averageRating: number;
  completionRate: number;
  monthlyGrowth: number;
}

const mockMembers: Member[] = [
  {
    id: "1",
    name: "Alice Johnson",
    email: "alice@tech.edu",
    role: "admin",
    avatar: "AJ",
    joinedAt: "2024-01-15",
    courses: 12,
    lastActive: "2024-03-22",
    status: "active",
  },
  {
    id: "2",
    name: "Bob Smith",
    email: "bob@tech.edu",
    role: "teacher",
    avatar: "BS",
    joinedAt: "2024-02-20",
    courses: 8,
    lastActive: "2024-03-21",
    status: "active",
  },
  {
    id: "3",
    name: "Carol White",
    email: "carol@gmail.com",
    role: "student",
    avatar: "CW",
    joinedAt: "2024-03-10",
    courses: 5,
    lastActive: "2024-03-20",
    status: "active",
  },
  {
    id: "4",
    name: "David Brown",
    email: "david@devcorp.com",
    role: "student",
    avatar: "DB",
    joinedAt: "2024-03-15",
    courses: 3,
    lastActive: "2024-03-19",
    status: "inactive",
  },
];

const mockCourses: Course[] = [
  {
    id: 1,
    title: "Advanced React Development",
    description: "Master React hooks, context, and advanced patterns",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400",
    instructor: "Sarah Johnson",
    students: 1234,
    revenue: 122166,
    rating: 4.8,
    status: "published",
    createdAt: "2024-01-15",
  },
  {
    id: 2,
    title: "Backend with Node.js",
    description: "Build scalable backend services with Node.js and Express",
    thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400",
    instructor: "Michael Chen",
    students: 892,
    revenue: 70468,
    rating: 4.6,
    status: "published",
    createdAt: "2024-02-01",
  },
  {
    id: 3,
    title: "UI/UX Design Fundamentals",
    description: "Learn design principles and create stunning user interfaces",
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400",
    instructor: "Emily Rodriguez",
    students: 2341,
    revenue: 208349,
    rating: 4.9,
    status: "draft",
    createdAt: "2024-03-01",
  },
];

const mockRoleRequests: RoleRequest[] = [
  {
    id: "req-1",
    userId: "user-3",
    userName: "Carol White",
    userEmail: "carol@gmail.com",
    requestedRole: "teacher",
    organizationId: 1,
    organizationName: "Tech University",
    requestedAt: new Date("2024-03-20"),
    status: "pending",
  },
];

const analytics: AnalyticsData = {
  totalStudents: 2847,
  totalTeachers: 23,
  totalCourses: 45,
  totalRevenue: 401983,
  averageRating: 4.7,
  completionRate: 68,
  monthlyGrowth: 12,
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrganizationAdminPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { roleData, setRole } = useRole();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState(mockMembers);
  const [courses, setCourses] = useState(mockCourses);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<JoinRequest[]>([]);
  const [activeTab, setActiveTab] = useState("members");

  const organizationId = parseInt(id);

  // Load organization data and pending requests
  useEffect(() => {
    const org = mockOrganizations.find(o => o.id === organizationId);
    if (org) {
      setOrganization(org);
      setRoleRequests(getPendingRequestsForOrganization(organizationId));
      // Load pending join requests
      const requests = getPendingJoinRequests(organizationId);
      setPendingJoinRequests(requests);
    } else {
      router.push("/organizations");
    }
  }, [organizationId, router]);

  // Check if user has admin permission for this organization
  if (roleData.role !== "org_admin" && roleData.role !== "system_admin") {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-[#6B6B80] mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-[#A0A0B5]">You don't have permission to view this page.</p>
      </div>
    );
  }

  if (!organization) {
    return <div className="text-white">Loading...</div>;
  }

  const handleApproveRoleRequest = (requestId: string) => {
    const approved = approveRoleRequest(requestId);
    if (approved) {
      setRoleRequests(prev => prev.filter(req => req.id !== requestId));
      const newMember: Member = {
        id: approved.userId,
        name: approved.userName,
        email: approved.userEmail,
        role: approved.requestedRole === "teacher" ? "teacher" : "admin",
        avatar: approved.userName.split(" ").map(n => n[0]).join(""),
        joinedAt: new Date().toISOString().split("T")[0],
        courses: 0,
        lastActive: new Date().toISOString().split("T")[0],
        status: "active",
      };
      setMembers(prev => [...prev, newMember]);
      toast.success(`${approved.userName} is now a ${approved.requestedRole}`);
    }
  };

  const handleRejectRoleRequest = (requestId: string) => {
    const rejected = rejectRoleRequest(requestId);
    if (rejected) {
      setRoleRequests(prev => prev.filter(req => req.id !== requestId));
      toast.info(`Request from ${rejected.userName} has been rejected`);
    }
  };

  const handleChangeMemberRole = (memberId: string, newRole: string) => {
    setMembers(prev =>
      prev.map(member =>
        member.id === memberId ? { ...member, role: newRole as any } : member
      )
    );
    toast.success(`Member role updated to ${newRole}`);
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (confirm(`Are you sure you want to remove ${memberName} from the organization?`)) {
      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success(`${memberName} has been removed from the organization`);
    }
  };

  const handlePublishCourse = (courseId: number) => {
    setCourses(prev =>
      prev.map(course =>
        course.id === courseId ? { ...course, status: "published" } : course
      )
    );
    toast.success("Course published successfully!");
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">
          {organization.name} - Organization Admin
        </h1>
        <p className="text-[#A0A0B5]">
          Manage your organization's members, courses, and settings.
        </p>
        
        {/* Navigation to System Admin */}
        <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium mb-1">System Administration</p>
              <p className="text-sm text-[#A0A0B5]">
                Need to manage global platform settings or all organizations? 
                <Link href="/admin" className="text-purple-400 hover:text-purple-300 ml-1 underline">
                  Go to System Admin Panel →
                </Link>
              </p>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-[#6B6B80] mt-2">
          This panel manages only <span className="text-purple-400">{organization.name}</span>. For platform-wide settings, use the System Admin panel.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Total Students" value={analytics.totalStudents.toLocaleString()} />
        <StatCard icon={Users} label="Teachers" value={analytics.totalTeachers.toString()} />
        <StatCard icon={BookOpen} label="Courses" value={analytics.totalCourses.toString()} />
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${analytics.totalRevenue.toLocaleString()}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Star} label="Avg. Rating" value={analytics.averageRating.toString()} />
        <StatCard icon={TrendingUp} label="Completion Rate" value={`${analytics.completionRate}%`} />
        <StatCard icon={TrendingUp} label="Monthly Growth" value={`+${analytics.monthlyGrowth}%`} trendUp={true} />
      </div>

      {/* Admin Tabs */}
      <Tabs defaultValue="members" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#12121A] border border-white/5 p-1 rounded-2xl mb-8 flex-wrap h-auto">
          <TabsTrigger value="members" className="rounded-xl px-6 py-2.5">
            <Users className="w-4 h-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="courses" className="rounded-xl px-6 py-2.5">
            <BookOpen className="w-4 h-4 mr-2" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="role-requests" className="rounded-xl px-6 py-2.5">
            <Clock className="w-4 h-4 mr-2" />
            Role Requests
            {roleRequests.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                {roleRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="join-requests" className="rounded-xl px-6 py-2.5">
            <UserPlus className="w-4 h-4 mr-2" />
            Join Requests
            {pendingJoinRequests.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                {pendingJoinRequests.length}
              </span>
            )}
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

        {/* Members Tab */}
        <TabsContent value="members">
          <GlowCard>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-white">Organization Members</h2>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                  <Input
                    type="text"
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#12121A] border-white/10 rounded-xl w-48"
                  />
                </div>
                <GlowButton variant="primary" onClick={() => setShowInviteModal(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Member
                </GlowButton>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#12121A] border border-white/10 text-white rounded-lg text-sm"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#12121A] border border-white/10 text-white rounded-lg text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-[#A0A0B5] font-medium py-3 px-4">Member</th>
                    <th className="text-left text-[#A0A0B5] font-medium py-3 px-4">Role</th>
                    <th className="text-left text-[#A0A0B5] font-medium py-3 px-4">Status</th>
                    <th className="text-left text-[#A0A0B5] font-medium py-3 px-4">Joined</th>
                    <th className="text-left text-[#A0A0B5] font-medium py-3 px-4">Courses</th>
                    <th className="text-left text-[#A0A0B5] font-medium py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">{member.avatar}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{member.name}</p>
                            <p className="text-sm text-[#A0A0B5]">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeMemberRole(member.id, e.target.value)}
                          className="bg-[#12121A] border border-white/10 text-white rounded-lg px-2 py-1 text-sm"
                          disabled={member.role === "admin" && member.name === "Alice Johnson"}
                        >
                          <option value="admin">Admin</option>
                          <option value="teacher">Teacher</option>
                          <option value="student">Student</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          member.status === "active" 
                            ? "bg-green-500/20 text-green-400" 
                            : "bg-gray-500/20 text-gray-400"
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#A0A0B5] text-sm">{member.joinedAt}</td>
                      <td className="py-3 px-4 text-white">{member.courses}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setEditingMember(member)}
                            className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4 text-[#A0A0B5]" />
                          </button>
                          <button 
                            onClick={() => handleRemoveMember(member.id, member.name)}
                            className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                          <button className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                            <MoreVertical className="w-4 h-4 text-[#A0A0B5]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlowCard>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses">
          <GlowCard>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Organization Courses</h2>
              <GlowButton variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </GlowButton>
            </div>
            <div className="space-y-4">
              {courses.map((course) => (
                <div key={course.id} className="p-4 bg-[#12121A] rounded-xl">
                  <div className="flex gap-4">
                    <img src={course.thumbnail} alt={course.title} className="w-32 h-24 rounded-lg object-cover" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-white">{course.title}</h3>
                          <p className="text-sm text-[#A0A0B5]">{course.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1 text-[#A0A0B5]">
                              <Users className="w-4 h-4" />
                              {course.students} students
                            </span>
                            <span className="flex items-center gap-1 text-[#A0A0B5]">
                              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                              {course.rating}
                            </span>
                            <span className="flex items-center gap-1 text-[#A0A0B5]">
                              <DollarSign className="w-4 h-4" />
                              ${course.revenue.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {course.status === "draft" && (
                            <GlowButton variant="primary" size="sm" onClick={() => handlePublishCourse(course.id)}>
                              Publish
                            </GlowButton>
                          )}
                          <GlowButton variant="outline" size="sm">
                            Edit
                          </GlowButton>
                          <GlowButton variant="outline" size="sm">
                            Analytics
                          </GlowButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>
        </TabsContent>

        {/* Role Requests Tab */}
        <TabsContent value="role-requests">
          <GlowCard>
            <h2 className="text-2xl font-bold text-white mb-6">Role Upgrade Requests</h2>
            {roleRequests.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-[#6B6B80] mx-auto mb-3" />
                <p className="text-[#A0A0B5]">No pending role requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {roleRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-[#12121A] rounded-xl border border-white/5"
                  >
                    <div>
                      <p className="text-white font-medium">{request.userName}</p>
                      <p className="text-[#A0A0B5] text-sm">{request.userEmail}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                          Requests {request.requestedRole} role
                        </span>
                        <span className="text-xs text-[#6B6B80]">
                          {new Date(request.requestedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <GlowButton
                        variant="primary"
                        size="sm"
                        onClick={() => handleApproveRoleRequest(request.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </GlowButton>
                      <GlowButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRejectRoleRequest(request.id)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </GlowButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlowCard>
        </TabsContent>

        {/* Join Requests Tab */}
        <TabsContent value="join-requests">
          <PendingRequestsTab
            organizationId={organizationId}
            requests={pendingJoinRequests}
            onRequestProcessed={() => {
              const updated = getPendingJoinRequests(organizationId);
              setPendingJoinRequests(updated);
            }}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlowCard>
              <h2 className="text-xl font-bold text-white mb-6">Revenue Overview</h2>
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <p className="text-3xl font-bold text-white mb-2">${analytics.totalRevenue.toLocaleString()}</p>
                <p className="text-[#A0A0B5]">Total earnings</p>
                <p className="text-sm text-green-400 mt-2">↑ {analytics.monthlyGrowth}% from last month</p>
              </div>
            </GlowCard>

            <GlowCard>
              <h2 className="text-xl font-bold text-white mb-6">Course Performance</h2>
              <div className="space-y-4">
                {courses.map((course) => (
                  <div key={course.id} className="p-3 bg-[#12121A] rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{course.title}</span>
                      <span className="text-purple-400">{course.students} students</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#A0A0B5]">
                      <span>Rating: {course.rating} ★</span>
                      <span>Revenue: ${course.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlowCard>

            <GlowCard>
              <h2 className="text-xl font-bold text-white mb-6">Member Growth</h2>
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <p className="text-3xl font-bold text-white mb-2">{analytics.totalStudents}</p>
                <p className="text-[#A0A0B5]">Total students</p>
                <p className="text-sm text-green-400 mt-2">↑ {analytics.monthlyGrowth}% this month</p>
              </div>
            </GlowCard>

            <GlowCard>
              <h2 className="text-xl font-bold text-white mb-6">Engagement Metrics</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-[#A0A0B5]">Course Completion Rate</span>
                    <span className="text-purple-400">{analytics.completionRate}%</span>
                  </div>
                  <div className="h-2 bg-[#1A1A24] rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${analytics.completionRate}%` }} />
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
              </div>
            </GlowCard>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <GlowCard>
            <h2 className="text-2xl font-bold text-white mb-6">Organization Settings</h2>
            <div className="space-y-4 max-w-2xl">
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                  Organization Name
                </Label>
                <Input
                  defaultValue={organization.name}
                  className="bg-[#12121A] border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                  Domain
                </Label>
                <Input
                  defaultValue={organization.domain || ""}
                  className="bg-[#12121A] border-white/10 text-white"
                />
                <p className="text-xs text-[#6B6B80] mt-1">
                  Users with this email domain will automatically join the organization
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                  Description
                </Label>
                <Textarea
                  defaultValue={organization.description || ""}
                  rows={3}
                  className="bg-[#12121A] border-white/10 text-white resize-none"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                  Verification Status
                </Label>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    organization.verified 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {organization.verified ? "Verified" : "Pending Verification"}
                  </span>
                  {!organization.verified && (
                    <GlowButton variant="outline" size="sm">
                      Request Verification
                    </GlowButton>
                  )}
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <GlowButton variant="primary">Save Changes</GlowButton>
                <GlowButton variant="ghost" className="text-red-400 hover:text-red-300">
                  Delete Organization
                </GlowButton>
              </div>
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>

      {/* Invite Modal */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        organization={organization}
        invitedByName="Current Admin"
        currentUserRole="admin"
      />

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setEditingMember(null)}>
          <div className="bg-[#16161F] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white">Edit Member</h2>
              <p className="text-[#A0A0B5] mt-1">Update member information</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Name</Label>
                <Input defaultValue={editingMember.name} className="bg-[#12121A] border-white/10" />
              </div>
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Email</Label>
                <Input defaultValue={editingMember.email} className="bg-[#12121A] border-white/10" />
              </div>
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Role</Label>
                <select defaultValue={editingMember.role} className="w-full bg-[#12121A] border border-white/10 text-white rounded-xl h-12 px-4">
                  <option value="admin">Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-white/10">
              <GlowButton variant="ghost" onClick={() => setEditingMember(null)} className="flex-1">
                Cancel
              </GlowButton>
              <GlowButton variant="primary" className="flex-1">
                Save Changes
              </GlowButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}