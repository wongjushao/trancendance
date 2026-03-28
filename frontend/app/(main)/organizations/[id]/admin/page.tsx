// frontend/app/(main)/organizations/[id]/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  UserPlus, 
  Clock, 
  Settings, 
  CheckCircle, 
  XCircle,
  Mail,
  Shield,
  MoreVertical
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRole } from "@/components/providers/RoleProvider";
import { Organization, mockOrganizations } from "@/lib/role";
import { InviteMemberModal } from "@/components/organization/InviteMemberModal";

// Mock data for members (in a real app, this would come from backend)
const mockMembers = [
  { id: "1", name: "Alice Johnson", email: "alice@tech.edu", role: "admin", joinedAt: "2024-01-15", courses: 12 },
  { id: "2", name: "Bob Smith", email: "bob@tech.edu", role: "teacher", joinedAt: "2024-02-20", courses: 8 },
  { id: "3", name: "Carol White", email: "carol@gmail.com", role: "student", joinedAt: "2024-03-10", courses: 5 },
  { id: "4", name: "David Brown", email: "david@devcorp.com", role: "student", joinedAt: "2024-03-15", courses: 3 },
];

const mockPendingRequests = [
  {
    id: "req-1",
    userName: "Carol White",
    userEmail: "carol@gmail.com",
    requestedRole: "teacher",
    requestedAt: "2024-03-20",
    status: "pending",
  },
  {
    id: "req-2",
    userName: "Eve Adams",
    userEmail: "eve@gmail.com",
    requestedRole: "admin",
    requestedAt: "2024-03-21",
    status: "pending",
  },
];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrganizationAdminPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { roleData } = useRole();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState(mockMembers);
  const [pendingRequests, setPendingRequests] = useState(mockPendingRequests);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  useEffect(() => {
    const org = mockOrganizations.find(o => o.id === parseInt(id));
    if (org) {
      setOrganization(org);
    } else {
      router.push("/organizations");
    }
  }, [id, router]);

  // Check if user has admin permission for this organization
  if (roleData.role !== "admin" || roleData.organizationId !== parseInt(id)) {
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

  const handleApproveRequest = (requestId: string) => {
    setPendingRequests(prev => prev.filter(req => req.id !== requestId));
    // In a real app, this would update the user's role in the database
  };

  const handleRejectRequest = (requestId: string) => {
    setPendingRequests(prev => prev.filter(req => req.id !== requestId));
    // In a real app, this would reject the request
  };

  const handleChangeMemberRole = (memberId: string, newRole: string) => {
    setMembers(prev =>
      prev.map(member =>
        member.id === memberId ? { ...member, role: newRole } : member
      )
    );
    // In a real app, this would update the member's role in the database
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">
          {organization.name} - Admin Dashboard
        </h1>
        <p className="text-[#A0A0B5]">
          Manage members, roles, and organization settings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Users} label="Total Members" value={members.length.toString()} />
        <StatCard icon={Clock} label="Pending Requests" value={pendingRequests.length.toString()} />
        <StatCard icon={Settings} label="Organization ID" value={`#${organization.id}`} />
      </div>

      {/* Admin Tabs */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="bg-[#12121A] border border-white/5 p-1 rounded-2xl mb-8">
          <TabsTrigger value="members" className="rounded-xl px-6 py-2.5">
            <Users className="w-4 h-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="requests" className="rounded-xl px-6 py-2.5">
            <Clock className="w-4 h-4 mr-2" />
            Pending Requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="invitations" className="rounded-xl px-6 py-2.5">
            <Mail className="w-4 h-4 mr-2" />
            Invitations
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl px-6 py-2.5">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members">
          <GlowCard>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Organization Members</h2>
              <GlowButton variant="primary" onClick={() => setIsInviteModalOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </GlowButton>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-[#A0A0B5] font-medium py-3 px-4">Name</th>
                    <th className="text-left text-[#A0A0B5] font-medium py-3 px-4">Email</th>
                    <th className="text-left text-[#A0A0B5] font-medium py-3 px-4">Role</th>
                    <th className="text-left text-[#A0A0B5] font-medium py-3 px-4">Joined</th>
                    <th className="text-left text-[#A0A0B5] font-medium py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 text-white">{member.name}</td>
                      <td className="py-3 px-4 text-[#A0A0B5]">{member.email}</td>
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
                      <td className="py-3 px-4 text-[#A0A0B5] text-sm">{member.joinedAt}</td>
                      <td className="py-3 px-4">
                        <button className="text-[#6B6B80] hover:text-purple-400 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlowCard>
        </TabsContent>

        {/* Pending Requests Tab */}
        <TabsContent value="requests">
          <GlowCard>
            <h2 className="text-2xl font-bold text-white mb-6">Role Upgrade Requests</h2>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-[#6B6B80] mx-auto mb-3" />
                <p className="text-[#A0A0B5]">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
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
                        onClick={() => handleApproveRequest(request.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </GlowButton>
                      <GlowButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRejectRequest(request.id)}
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

        {/* Invitations Tab */}
        <TabsContent value="invitations">
          <GlowCard>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Sent Invitations</h2>
              <GlowButton variant="secondary" onClick={() => setIsInviteModalOpen(true)}>
                <Mail className="w-4 h-4 mr-2" />
                Send New Invite
              </GlowButton>
            </div>
            <div className="text-center py-8 text-[#A0A0B5]">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Invitations you send will appear here</p>
              <p className="text-sm mt-2">Use the "Invite Member" button to send invitations</p>
            </div>
          </GlowCard>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <GlowCard>
            <h2 className="text-2xl font-bold text-white mb-6">Organization Settings</h2>
            <div className="space-y-4 max-w-lg">
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
                  defaultValue={organization.domain}
                  className="bg-[#12121A] border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                  Description
                </Label>
                <textarea
                  defaultValue={organization.description}
                  rows={3}
                  className="w-full bg-[#12121A] border border-white/10 text-white rounded-xl px-4 py-3 resize-none"
                />
              </div>
              <GlowButton variant="primary">Save Changes</GlowButton>
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>

      {/* Invite Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        organization={organization}
      />
    </div>
  );
}