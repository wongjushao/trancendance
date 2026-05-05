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

export default function OrganizationMembersPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState("");
  const [updatingRole, setUpdatingRole] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseBrowserClient();
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/login");
          return;
        }
        setCurrentUserId(user.id);
        
        // Get organization details
        const { data: orgData } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", orgId)
          .single();
        setOrganization(orgData);
        
        // Get current user's role
        const { data: currentMember } = await supabase
          .from("organization_members")
          .select("member_role")
          .eq("organization_id", orgId)
          .eq("user_id", user.id)
          .single();
        
        setCurrentUserRole(currentMember?.member_role || null);
        
        // Get all members with profiles
        const { data: membersData } = await supabase
          .from("organization_members")
          .select(`
            *,
            user:profiles!user_id (
              id,
              first_name,
              last_name,
              username,
              email,
              avatar_url
            )
          `)
          .eq("organization_id", orgId)
          .order("created_at", { ascending: true });
        
        setMembers(membersData || []);
        
      } catch (error) {
        console.error("Error loading members:", error);
        toast.error("Failed to load members");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [orgId, router]);
  
  const filteredMembers = members.filter(member => {
    const fullName = `${member.user.first_name || ""} ${member.user.last_name || ""}`.toLowerCase();
    const email = member.user.email?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });
  
  const canManageMembers = currentUserRole === "admin" || currentUserRole === "sub_admin";
  
  const handleRoleChange = async () => {
    if (!selectedMember || !newRole) return;
    
    setUpdatingRole(true);
    try {
      const supabase = getSupabaseBrowserClient();
      
      const { error } = await supabase
        .from("organization_members")
        .update({ member_role: newRole })
        .eq("organization_id", orgId)
        .eq("user_id", selectedMember.user_id);
      
      if (error) throw error;
      
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
      toast.error("Failed to update role");
    } finally {
      setUpdatingRole(false);
    }
  };
  
  const handleRemoveMember = async (member: Member) => {
    if (!confirm(`Are you sure you want to remove ${member.user.first_name || member.user.username} from this organization?`)) {
      return;
    }
    
    try {
      const supabase = getSupabaseBrowserClient();
      
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("organization_id", orgId)
        .eq("user_id", member.user_id);
      
      if (error) throw error;
      
      setMembers(members.filter(m => m.user_id !== member.user_id));
      toast.success("Member removed");
      
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };
  
  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    
    setInviting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check if user exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail)
        .single();
      
      if (existingUser) {
        // Check if already a member
        const { data: existingMember } = await supabase
          .from("organization_members")
          .select("id")
          .eq("organization_id", orgId)
          .eq("user_id", existingUser.id)
          .single();
        
        if (existingMember) {
          toast.error("User is already a member of this organization");
          setInviteModalOpen(false);
          setInviteEmail("");
          return;
        }
        
        // Add directly
        await supabase
          .from("organization_members")
          .insert({
            organization_id: orgId,
            user_id: existingUser.id,
            member_role: inviteRole,
          });
        
        toast.success("User added to organization");
      } else {
        // Create invitation (mock for now)
        toast.success(`Invitation sent to ${inviteEmail}`);
      }
      
      setInviteModalOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      
      // Refresh members list
      const { data: membersData } = await supabase
        .from("organization_members")
        .select(`
          *,
          user:profiles!user_id (
            id,
            first_name,
            last_name,
            username,
            email,
            avatar_url
          )
        `)
        .eq("organization_id", orgId);
      
      setMembers(membersData || []);
      
    } catch (error) {
      console.error("Error inviting member:", error);
      toast.error("Failed to invite member");
    } finally {
      setInviting(false);
    }
  };
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-500/20 text-purple-300">Admin</Badge>;
      case "sub_admin":
        return <Badge className="bg-blue-500/20 text-blue-300">Sub-Admin</Badge>;
      case "teacher":
        return <Badge className="bg-green-500/20 text-green-300">Teacher</Badge>;
      default:
        return <Badge variant="secondary">Member</Badge>;
    }
  };
  
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="w-4 h-4 text-purple-400" />;
      case "sub_admin":
        return <Shield className="w-4 h-4 text-blue-400" />;
      case "teacher":
        return <UserCheck className="w-4 h-4 text-green-400" />;
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
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="sub_admin">Sub-Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
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
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="sub_admin">Sub-Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <GlowButton variant="ghost" onClick={() => setInviteModalOpen(false)}>Cancel</GlowButton>
            <GlowButton onClick={handleInvite} isLoading={inviting}>Send Invitation</GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}