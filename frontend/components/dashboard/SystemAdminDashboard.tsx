// frontend/components/dashboard/SystemAdminDashboard.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, Shield, Activity, Settings, Search, 
  BarChart3, DollarSign, BookOpen, Star, TrendingUp,
  Plus, Edit, Trash2, UserPlus, Crown, X,
  CheckCircle, Clock, AlertCircle, Globe, Building2,
  Server, Database, Zap, Award, Filter, Download, Eye,
  Mail, Send, RefreshCw, Key, Smartphone, AlertTriangle
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/components/providers/RoleProvider";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface SystemAdminDashboardProps {
  user: any;
  organizationId?: number | null;
  organizationName?: string | null;
}

// Types for organization proposals
interface OrganizationProposal {
  id: string;
  proposed_name: string;
  proposed_domain: string | null;
  admin_email: string;
  description: string | null;
  proposer_id: string;
  proposer_name: string;
  status: 'pending_verification' | 'verified' | 'approved' | 'rejected' | 'expired';
  created_at: string;
  expires_at: string;
}

// Types for MFA recovery requests
interface MFARequest {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  reason: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
}

// Mock organization proposals
const mockProposals: OrganizationProposal[] = [
  {
    id: 'prop-1',
    proposed_name: 'AI Research Institute',
    proposed_domain: 'airi.edu',
    admin_email: 'admin@airi.edu',
    description: 'Focus on artificial intelligence research and education',
    proposer_id: 'user-1',
    proposer_name: 'John Doe',
    status: 'pending_verification',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'prop-2',
    proposed_name: 'Blockchain Academy',
    proposed_domain: 'blockchain.academy',
    admin_email: 'admin@blockchain.academy',
    description: 'Web3 and blockchain technology training',
    proposer_id: 'user-2',
    proposer_name: 'Jane Smith',
    status: 'pending_verification',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock MFA recovery requests
const mockMFARequests: MFARequest[] = [
  {
    id: 'mfa-1',
    user_id: 'user-3',
    user_name: 'Alice Johnson',
    user_email: 'alice@example.com',
    reason: 'Lost phone with authenticator app, no backup codes saved',
    requested_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
  },
  {
    id: 'mfa-2',
    user_id: 'user-4',
    user_name: 'Bob Smith',
    user_email: 'bob@example.com',
    reason: 'Factory reset phone, forgot to backup codes',
    requested_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
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
  pendingProposals: 2,
  pendingMFARequests: 2,
};

// Mock users for management
const systemUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'student', status: 'active', mfa_enabled: true, created_at: '2024-01-15' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'teacher', status: 'active', mfa_enabled: false, created_at: '2024-02-01' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'org_admin', status: 'active', mfa_enabled: true, created_at: '2024-01-20' },
  { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'student', status: 'suspended', mfa_enabled: false, created_at: '2024-03-10' },
];

export default function SystemAdminDashboard({ user }: SystemAdminDashboardProps) {
  const [greeting, setGreeting] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [proposals, setProposals] = useState<OrganizationProposal[]>(mockProposals);
  const [mfaRequests, setMfaRequests] = useState<MFARequest[]>(mockMFARequests);
  const [selectedProposal, setSelectedProposal] = useState<OrganizationProposal | null>(null);
  const [selectedMFARequest, setSelectedMFARequest] = useState<MFARequest | null>(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [invitationEmail, setInvitationEmail] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const handleApproveProposal = async (proposal: OrganizationProposal) => {
    setSelectedProposal(proposal);
    setInvitationEmail(proposal.admin_email);
    setShowProposalModal(true);
  };

  const handleSendInvitation = async () => {
    if (!selectedProposal) return;
    
    setIsSendingInvite(true);
    
    // Simulate API call to send invitation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update proposal status
    setProposals(prev => prev.map(p => 
      p.id === selectedProposal.id 
        ? { ...p, status: 'approved' }
        : p
    ));
    
    toast.success(`Invitation sent to ${invitationEmail}`);
    toast.info(`Organization "${selectedProposal.proposed_name}" has been approved`);
    
    setShowProposalModal(false);
    setSelectedProposal(null);
    setInvitationEmail("");
    setIsSendingInvite(false);
  };

  const handleRejectProposal = (proposal: OrganizationProposal) => {
    if (confirm(`Are you sure you want to reject ${proposal.proposed_name}?`)) {
      setProposals(prev => prev.map(p => 
        p.id === proposal.id 
          ? { ...p, status: 'rejected' }
          : p
      ));
      toast.warning(`Proposal for ${proposal.proposed_name} has been rejected`);
    }
  };

  const handleApproveMFARequest = async (request: MFARequest) => {
    if (confirm(`Reset MFA for ${request.user_name}? They will need to set up MFA again.`)) {
      setSelectedMFARequest(request);
      setShowMFAModal(true);
    }
  };

  const handleConfirmMFAReset = async () => {
    if (!selectedMFARequest) return;
    
    // Simulate API call to reset MFA
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setMfaRequests(prev => prev.map(r => 
      r.id === selectedMFARequest.id 
        ? { ...r, status: 'approved', admin_notes: adminNotes }
        : r
    ));
    
    toast.success(`MFA has been disabled for ${selectedMFARequest.user_name}`);
    toast.info(`An email has been sent to ${selectedMFARequest.user_email} with instructions to set up MFA again`);
    
    setShowMFAModal(false);
    setSelectedMFARequest(null);
    setAdminNotes("");
  };

  const handleRejectMFARequest = (request: MFARequest) => {
    if (confirm(`Reject MFA reset request for ${request.user_name}?`)) {
      setMfaRequests(prev => prev.map(r => 
        r.id === request.id 
          ? { ...r, status: 'rejected', admin_notes: adminNotes }
          : r
      ));
      toast.warning(`MFA reset request for ${request.user_name} has been rejected`);
    }
  };

  const handleToggleUserStatus = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    toast.info(`User status changed to ${newStatus}`);
  };

  const handleResetUserPassword = (userName: string, userEmail: string) => {
    toast.info(`Password reset email sent to ${userEmail}`);
  };

  const activeOrgs = proposals.filter(o => o.status === 'approved').length;
  const pendingProposals = proposals.filter(o => o.status === 'pending_verification').length;
  const pendingMFA = mfaRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {greeting}, {user?.user_metadata?.first_name || "System Admin"}! 👋
          </h1>
          <p className="text-gray-400">
            Platform Administrator • Managing {systemStats.totalOrganizations} organizations and {systemStats.totalUsers} users
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
          trend={`${activeOrgs} active, ${pendingProposals} pending`}
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

      {/* Pending Actions Alert */}
      {(pendingProposals > 0 || pendingMFA > 0) && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-white font-medium">Pending Actions Requiring Your Attention</p>
              <p className="text-sm text-gray-400">
                {pendingProposals > 0 && `${pendingProposals} organization proposal(s) awaiting review`}
                {pendingProposals > 0 && pendingMFA > 0 && " • "}
                {pendingMFA > 0 && `${pendingMFA} MFA recovery request(s) pending`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="proposals" className="space-y-4">
        <TabsList className="bg-gray-800/50 border border-gray-700 flex-wrap h-auto">
          <TabsTrigger value="proposals">Organization Proposals</TabsTrigger>
          <TabsTrigger value="mfa">MFA Recovery Requests</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="analytics">Platform Analytics</TabsTrigger>
          <TabsTrigger value="settings">System Settings</TabsTrigger>
        </TabsList>

        {/* Organization Proposals Tab */}
        <TabsContent value="proposals" className="space-y-4">
          <GlowCard>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-white">Pending Organization Proposals</h3>
                  <p className="text-sm text-gray-400 mt-1">Review and approve new organization requests</p>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input placeholder="Search proposals..." className="pl-9 w-64" />
                </div>
              </div>

              <div className="space-y-3">
                {proposals.filter(p => p.status === 'pending_verification').map((proposal) => (
                  <div
                    key={proposal.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="w-5 h-5 text-purple-400" />
                        <h4 className="font-semibold text-white">{proposal.proposed_name}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                          Pending Review
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">Admin Email</p>
                          <p className="text-white">{proposal.admin_email}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Domain</p>
                          <p className="text-white">{proposal.proposed_domain || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Proposed By</p>
                          <p className="text-white">{proposal.proposer_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Submitted</p>
                          <p className="text-white">{new Date(proposal.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {proposal.description && (
                        <div className="mt-2 p-2 bg-gray-900/50 rounded text-sm text-gray-300">
                          <p className="text-gray-400 mb-1">Description:</p>
                          {proposal.description}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <GlowButton 
                        size="sm" 
                        variant="outline" 
                        className="text-green-400 border-green-500/50 hover:bg-green-500/10"
                        onClick={() => handleApproveProposal(proposal)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </GlowButton>
                      <GlowButton 
                        size="sm" 
                        variant="outline" 
                        className="text-red-400 border-red-500/50 hover:bg-red-500/10"
                        onClick={() => handleRejectProposal(proposal)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </GlowButton>
                    </div>
                  </div>
                ))}
                {proposals.filter(p => p.status === 'pending_verification').length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-400">No pending proposals</p>
                    <p className="text-sm text-gray-500">All organization requests have been processed</p>
                  </div>
                )}
              </div>
            </div>
          </GlowCard>
        </TabsContent>

        {/* MFA Recovery Requests Tab */}
        <TabsContent value="mfa" className="space-y-4">
          <GlowCard>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-white">MFA Recovery Requests</h3>
                  <p className="text-sm text-gray-400 mt-1">Users who lost access to their authenticator app</p>
                </div>
              </div>

              <div className="space-y-3">
                {mfaRequests.filter(r => r.status === 'pending').map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Smartphone className="w-5 h-5 text-red-400" />
                        <h4 className="font-semibold text-white">{request.user_name}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                          MFA Recovery Needed
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">Email</p>
                          <p className="text-white">{request.user_email}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Requested</p>
                          <p className="text-white">{new Date(request.requested_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="mt-2 p-2 bg-yellow-500/10 rounded text-sm text-yellow-300">
                        <p className="text-yellow-400 mb-1">Reason:</p>
                        {request.reason}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <GlowButton 
                        size="sm" 
                        variant="outline" 
                        className="text-green-400 border-green-500/50 hover:bg-green-500/10"
                        onClick={() => handleApproveMFARequest(request)}
                      >
                        <Key className="w-4 h-4 mr-1" />
                        Reset MFA
                      </GlowButton>
                      <GlowButton 
                        size="sm" 
                        variant="outline" 
                        className="text-red-400 border-red-500/50 hover:bg-red-500/10"
                        onClick={() => handleRejectMFARequest(request)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </GlowButton>
                    </div>
                  </div>
                ))}
                {mfaRequests.filter(r => r.status === 'pending').length === 0 && (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-400">No pending MFA recovery requests</p>
                    <p className="text-sm text-gray-500">All users have access to their accounts</p>
                  </div>
                )}
              </div>
            </div>
          </GlowCard>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <GlowCard>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-white">User Management</h3>
                  <p className="text-sm text-gray-400 mt-1">Manage platform users</p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input 
                      placeholder="Search users..." 
                      className="pl-9 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <GlowButton size="sm" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Add User
                  </GlowButton>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-800">
                    <tr className="text-left text-gray-400 text-sm">
                      <th className="pb-3">User</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3">MFA</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Joined</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-800/50">
                        <td className="py-3">
                          <div>
                            <p className="font-medium text-white">{user.name}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            user.role === 'org_admin' ? 'bg-purple-500/20 text-purple-400' :
                            user.role === 'teacher' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`text-xs ${user.mfa_enabled ? 'text-green-400' : 'text-gray-500'}`}>
                            {user.mfa_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1 text-xs ${
                            user.status === 'active' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'active' ? 'bg-green-400' : 'bg-red-400'
                            }`} />
                            {user.status}
                          </span>
                        </td>
                        <td className="py-3 text-gray-400 text-sm">{user.created_at}</td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleResetUserPassword(user.name, user.email)}
                              className="p-1 hover:bg-gray-700 rounded transition-colors"
                              title="Reset Password"
                            >
                              <Key className="w-4 h-4 text-blue-400" />
                            </button>
                            <button 
                              onClick={() => handleToggleUserStatus(user.id, user.status)}
                              className="p-1 hover:bg-gray-700 rounded transition-colors"
                              title={user.status === 'active' ? 'Suspend User' : 'Activate User'}
                            >
                              {user.status === 'active' ? 
                                <X className="w-4 h-4 text-red-400" /> : 
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              }
                            </button>
                            <button className="p-1 hover:bg-gray-700 rounded transition-colors">
                              <Edit className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </GlowCard>
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-4">
          <GlowCard>
            <div className="p-4">
              <h3 className="font-semibold text-white mb-3">Platform Organizations Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Summary stats */}
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">Total Organizations</p>
                  <p className="text-3xl font-bold text-white">{systemStats.totalOrganizations}</p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">Pending Approval</p>
                  <p className="text-3xl font-bold text-yellow-400">{pendingProposals}</p>
                </div>
              </div>
              <div className="mt-4">
                <GlowButton variant="outline" fullWidth>
                  View All Organizations
                </GlowButton>
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

        {/* System Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <GlowCard>
            <div className="p-4">
              <h3 className="font-semibold text-white mb-4">System Configuration</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Allow New Registrations</p>
                    <p className="text-sm text-gray-400">Enable/disable new user signups</p>
                  </div>
                  <label className="relative inline-block w-12 h-6 cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-12 h-6 bg-gray-700 peer-checked:bg-purple-500 rounded-full peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Require Email Verification</p>
                    <p className="text-sm text-gray-400">Users must verify email before accessing platform</p>
                  </div>
                  <label className="relative inline-block w-12 h-6 cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-12 h-6 bg-gray-700 peer-checked:bg-purple-500 rounded-full peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Maintenance Mode</p>
                    <p className="text-sm text-gray-400">Put platform in maintenance mode</p>
                  </div>
                  <label className="relative inline-block w-12 h-6 cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-12 h-6 bg-gray-700 peer-checked:bg-red-500 rounded-full peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
                <GlowButton variant="primary" fullWidth className="mt-4">
                  Save Settings
                </GlowButton>
              </div>
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>

      {/* Approve Proposal Modal */}
      {showProposalModal && selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-gray-900 rounded-lg max-w-md w-full border border-purple-500/30 shadow-2xl">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-semibold text-white">Approve Organization</h3>
              <p className="text-gray-400 mt-1">Send invitation to organization admin</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-gray-300 mb-1 block">Organization Name</Label>
                <p className="text-white font-medium">{selectedProposal.proposed_name}</p>
              </div>
              <div>
                <Label className="text-gray-300 mb-1 block">Admin Email</Label>
                <Input 
                  value={invitationEmail} 
                  onChange={(e) => setInvitationEmail(e.target.value)}
                  placeholder="admin@organization.com"
                />
              </div>
              <div>
                <Label className="text-gray-300 mb-1 block">Additional Notes (Optional)</Label>
                <Textarea 
                  rows={3} 
                  placeholder="Add any instructions for the organization admin..."
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-300">
                  The admin will receive an email invitation to complete the organization setup.
                  They will need to verify their email and provide additional details.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-800">
              <GlowButton variant="outline" onClick={() => setShowProposalModal(false)} fullWidth>
                Cancel
              </GlowButton>
              <GlowButton onClick={handleSendInvitation} isLoading={isSendingInvite} fullWidth>
                <Send className="w-4 h-4 mr-2" />
                Send Invitation
              </GlowButton>
            </div>
          </div>
        </div>
      )}

      {/* MFA Reset Modal */}
      {showMFAModal && selectedMFARequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-gray-900 rounded-lg max-w-md w-full border border-purple-500/30 shadow-2xl">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-semibold text-white">Reset MFA for User</h3>
              <p className="text-gray-400 mt-1">Disable MFA and allow user to set up again</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-gray-300 mb-1 block">User</Label>
                <p className="text-white font-medium">{selectedMFARequest.user_name}</p>
                <p className="text-sm text-gray-400">{selectedMFARequest.user_email}</p>
              </div>
              <div>
                <Label className="text-gray-300 mb-1 block">Admin Notes (Optional)</Label>
                <Textarea 
                  rows={3} 
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this request..."
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-xs text-red-300">
                  ⚠️ Warning: This will disable MFA for the user. They will need to set up MFA again on their next login.
                  Make sure you've verified their identity before proceeding.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-800">
              <GlowButton variant="outline" onClick={() => setShowMFAModal(false)} fullWidth>
                Cancel
              </GlowButton>
              <GlowButton onClick={handleConfirmMFAReset} fullWidth className="bg-red-600 hover:bg-red-700">
                <Key className="w-4 h-4 mr-2" />
                Reset MFA
              </GlowButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}