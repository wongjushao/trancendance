// frontend/app/(main)/organizations/[id]/members/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Search,
  Mail,
  Crown,
  Shield,
  UserCheck,
  UserX,
  Trash2,
  Edit2,
  Loader2,
  MoreVertical,
  Filter,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface Member {
  id: number;
  user_id: string;
  member_role: string;
  created_at: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    avatar_url: string;
  };
}

interface OrganizationData {
  id: number;
  name: string;
  description: string | null;
  slug: string | null;
  created_by: string;
  created_at: string;
}

// Helper to get auth token
const getAuthToken = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

export default function OrganizationMembersPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [memberEmails, setMemberEmails] = useState<Record<string, string>>({});
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState("");
  const [updatingRole, setUpdatingRole] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"student" | "teacher" | "sub_admin">("student");
  const [inviting, setInviting] = useState(false);
  
  useEffect(() => {
    loadData();
  }, [orgId, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      
      if (!token) {
        router.push("/login");
        return;
      }
      
      // Get current user info from auth service
      const userResponse = await fetch('/api/auth-service/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!userResponse.ok) {
        router.push("/login");
        return;
      }
      
      const userData = await userResponse.json();
      setCurrentUserId(userData.id);
      
      // Get organization details
      const orgResponse = await fetch(`/api/org-service/orgs/${orgId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!orgResponse.ok) {
        toast.error("Failed to load organization");
        return;
      }
      
      const orgData = await orgResponse.json();
      setOrganization(orgData);
      
      // Get current user's role
      const roleResponse = await fetch(`/api/org-service/orgs/${orgId}/members/${userData.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (roleResponse.ok) {
        const roleData = await roleResponse.json();
        setCurrentUserRole(roleData.member_role);
      }
      
      // Get all members
      const membersResponse = await fetch(`/api/org-service/orgs/${orgId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!membersResponse.ok) {
        toast.error("Failed to load members");
        return;
      }
      
      const membersData = await membersResponse.json();
      
      // Collect user IDs to fetch emails
      const userIds = membersData.members.map((m: any) => m.user_id);
      await fetchMemberEmails(userIds, token);
      
      // Format members with emails
      const formattedMembers = membersData.members.map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        member_role: m.member_role,
        created_at: m.created_at,
        user: {
          id: m.user_id,
          first_name: m.user?.first_name || null,
          last_name: m.user?.last_name || null,
          username: m.user?.username || null,
          email: memberEmails[m.user_id] || "",
          avatar_url: m.user?.avatar_url || null,
        }
      }));
      
      setMembers(formattedMembers);
      
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load organization data");
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberEmails = async (userIds: string[], token: string) => {
    if (userIds.length === 0) return;
    
    try {
      const response = await fetch('/api/org-service/users/batch-emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_ids: userIds }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setMemberEmails(data.users || {});
      }
    } catch (error) {
      console.error("Error fetching emails:", error);
    }
  };
  
  const filteredMembers = members.filter(member => {
    const fullName = `${member.user.first_name || ""} ${member.user.last_name || ""}`.toLowerCase();
    const email = (member.user.email || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });
  
  const canManageMembers = currentUserRole === "admin" || currentUserRole === "sub_admin";
  
  const handleRoleChange = async () => {
    if (!selectedMember || !newRole) return;
    
    setUpdatingRole(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        toast.error("Authentication required");
        return;
      }
      
      const response = await fetch(`/api/org-service/orgs/${orgId}/members/${selectedMember.user_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ member_role: newRole }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update role");
      }
      
      // Update local state
      setMembers(members.map(m => 
        m.user_id === selectedMember.user_id 
          ? { ...m, member_role: newRole }
          : m
      ));
      
      toast.success("Member role updated");
      setRoleModalOpen(false);
      setSelectedMember(null);
      
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setUpdatingRole(false);
    }
  };
  
  const handleRemoveMember = async (member: Member) => {
    if (!confirm(`Are you sure you want to remove ${member.user.first_name || member.user.username} from this organization?`)) {
      return;
    }
    
    try {
      const token = await getAuthToken();
      if (!token) {
        toast.error("Authentication required");
        return;
      }
      
      const response = await fetch(`/api/org-service/orgs/${orgId}/members/${member.user_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove member");
      }
      
      setMembers(members.filter(m => m.user_id !== member.user_id));
      toast.success("Member removed");
      
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    }
  };
  
  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    setInviting(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        toast.error("Authentication required");
        return;
      }
      
      const response = await fetch(`/api/org-service/orgs/${orgId}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send invitation");
      }
      
      const data = await response.json();
      
      if (data.email_sent) {
        toast.success(`Invitation sent to ${inviteEmail}`);
      } else {
        toast.info(`Invitation created for ${inviteEmail}. Email delivery is not configured.`);
        if (data.mock_email) {
          console.log("Mock invitation email:", data.mock_email);
        }
      }
      
      setInviteModalOpen(false);
      setInviteEmail("");
      setInviteRole("student");
      
    } catch (error) {
      console.error("Error inviting member:", error);
      toast.error(error instanceof Error ? error.message : "Failed to invite member");
    } finally {
      setInviting(false);
    }
  };
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-500/20 text-purple-300">Admin</Badge>;
      case "sub_admin":
        return <Badge className="bg-indigo-500/20 text-indigo-300">Sub-Admin</Badge>;
      case "teacher":
        return <Badge className="bg-blue-500/20 text-blue-300">Teacher</Badge>;
      default:
        return <Badge variant="secondary">Member</Badge>;
    }
  };
  
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="w-4 h-4 text-purple-400" />;
      case "sub_admin":
        return <Shield className="w-4 h-4 text-indigo-400" />;
      case "teacher":
        return <UserCheck className="w-4 h-4 text-blue-400" />;
      default:
        return <Users className="w-4 h-4 text-gray-400" />;
    }
  };
  
  const getInitials = (firstName: string, lastName: string, username: string) => {
    if (firstName) return firstName[0];
    if (lastName) return lastName[0];
    if (username) return username[0];
    return "U";
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/organizations/${orgId}`}>
              <GlowButton variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Organization
              </GlowButton>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Organization Members</h1>
              <p className="text-gray-400 mt-1">{organization?.name}</p>
            </div>
          </div>
          {canManageMembers && (
            <GlowButton variant="primary" onClick={() => setInviteModalOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </GlowButton>
          )}
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{members.length}</div>
                  <div className="text-sm text-gray-400">Total Members</div>
                </div>
              </div>
            </div>
          </GlowCard>
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8 text-yellow-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {members.filter(m => m.member_role === "admin").length}
                  </div>
                  <div className="text-sm text-gray-400">Admins</div>
                </div>
              </div>
            </div>
          </GlowCard>
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <UserCheck className="w-8 h-8 text-green-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {members.filter(m => m.member_role === "teacher").length}
                  </div>
                  <div className="text-sm text-gray-400">Teachers</div>
                </div>
              </div>
            </div>
          </GlowCard>
        </div>
        
        {/* Search */}
        <GlowCard className="mb-6">
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search members by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </GlowCard>
        
        {/* Members List */}
        {filteredMembers.length === 0 ? (
          <GlowCard>
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-white mb-2">No Members Found</h3>
              <p className="text-gray-400">
                {searchTerm ? "No members match your search" : "This organization has no members yet"}
              </p>
            </div>
          </GlowCard>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <GlowCard key={member.id}>
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.user.avatar_url || undefined} />
                      <AvatarFallback>
                        {getInitials(
                          member.user.first_name || "",
                          member.user.last_name || "",
                          member.user.username || ""
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-white">
                        {member.user.first_name} {member.user.last_name}
                      </div>
                      <div className="text-sm text-gray-400">{member.user.email}</div>
                      <div className="flex items-center gap-1 mt-1">
                        {getRoleIcon(member.member_role)}
                        {getRoleBadge(member.member_role)}
                      </div>
                    </div>
                  </div>
                  
                  {canManageMembers && member.user_id !== currentUserId && (
                    <div className="flex gap-2">
                      <GlowButton
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedMember(member);
                          setNewRole(member.member_role);
                          setRoleModalOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Change Role
                      </GlowButton>
                      <GlowButton
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMember(member)}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </GlowButton>
                    </div>
                  )}
                </div>
              </GlowCard>
            ))}
          </div>
        )}
      </div>
      
      {/* Change Role Modal */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Change Member Role</DialogTitle>
            <DialogDescription>
              Update the member's role in this organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="sub_admin">Sub-Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-2">
                Note: You cannot change the role of the primary admin.
              </p>
            </div>
          </div>
          <DialogFooter>
            <GlowButton variant="ghost" onClick={() => setRoleModalOpen(false)}>Cancel</GlowButton>
            <GlowButton onClick={handleRoleChange} isLoading={updatingRole}>Save</GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Invite Member Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Invite Member</DialogTitle>
            <DialogDescription>
              Enter the email address of the person you want to invite and select their role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="mt-2"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  {currentUserRole === "admin" && (
                    <SelectItem value="sub_admin">Sub-Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-2">
                {currentUserRole === "admin" 
                  ? "You can invite students, teachers, and sub-admins." 
                  : "You can only invite students and teachers."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <GlowButton variant="ghost" onClick={() => setInviteModalOpen(false)}>Cancel</GlowButton>
            <GlowButton onClick={handleInvite} isLoading={inviting}>
              <Mail className="w-4 h-4 mr-2" />
              Send Invitation
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}