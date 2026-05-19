// frontend/lib/organizations.ts

import { Organization, OrganizationMember, JoinRequest, OrganizationProposal, OrganizationRole } from '@/types/organizations';
// Extended mock organizations with more details
export const mockOrganizations: Organization[] = [
  {
    id: 1,
    name: '42 Kuala Lumpur',
    slug: '42kl',
    description: 'Innovative programming school with peer-to-peer learning',
    domain: '42kl.edu.my',
    logo_url: null,
    primary_admin_id: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    member_count: 150,
    course_count: 12,
    verified: true,
  },
  {
    id: 2,
    name: 'Tech Academy',
    slug: 'tech-academy',
    description: 'Online tech courses for everyone',
    domain: 'techacademy.com',
    logo_url: null,
    primary_admin_id: 'user-2',
    created_at: '2024-02-01T00:00:00Z',
    member_count: 45,
    course_count: 8,
    verified: true,
  },
  {
    id: 3,
    name: 'Data Science Institute',
    slug: 'dsi',
    description: 'Advanced data science training',
    domain: 'dsi.edu',
    logo_url: null,
    primary_admin_id: 'user-3',
    created_at: '2024-03-01T00:00:00Z',
    member_count: 89,
    course_count: 15,
    verified: false,
  },
];

// Mock organization members
export const mockOrganizationMembers: OrganizationMember[] = [
  {
    id: 1,
    organization_id: 1,
    user_id: 'user-1',
    user_name: 'John Doe',
    user_email: 'john@42kl.edu.my',
    user_avatar: null,
    role: 'admin',
    is_primary_admin: true,
    joined_at: '2024-01-01T00:00:00Z',
    joined_via: 'auto_domain',
  },
  {
    id: 2,
    organization_id: 1,
    user_id: 'user-4',
    user_name: 'Jane Smith',
    user_email: 'jane@gmail.com',
    user_avatar: null,
    role: 'sub_admin',
    is_primary_admin: false,
    joined_at: '2024-01-15T00:00:00Z',
    joined_via: 'invite',
  },
  {
    id: 3,
    organization_id: 1,
    user_id: 'user-5',
    user_name: 'Mike Johnson',
    user_email: 'mike@gmail.com',
    user_avatar: null,
    role: 'teacher',
    is_primary_admin: false,
    joined_at: '2024-02-01T00:00:00Z',
    joined_via: 'request',
  },
  {
    id: 4,
    organization_id: 1,
    user_id: 'user-6',
    user_name: 'Sarah Lee',
    user_email: 'sarah@42kl.edu.my',
    user_avatar: null,
    role: 'student',
    is_primary_admin: false,
    joined_at: '2024-02-10T00:00:00Z',
    joined_via: 'auto_domain',
  },
  {
    id: 5,
    organization_id: 2,
    user_id: 'user-2',
    user_name: 'Admin User',
    user_email: 'admin@techacademy.com',
    user_avatar: null,
    role: 'admin',
    is_primary_admin: true,
    joined_at: '2024-02-01T00:00:00Z',
    joined_via: 'auto_domain',
  },
  {
    id: 6,
    organization_id: 2,
    user_id: 'user-1',
    user_name: 'John Doe',
    user_email: 'john@42kl.edu.my',
    user_avatar: null,
    role: 'student',
    is_primary_admin: false,
    joined_at: '2024-02-15T00:00:00Z',
    joined_via: 'invite',
  },
];

// Mock join requests
export const mockJoinRequests: JoinRequest[] = [
  {
    id: 'req-1',
    organization_id: 1,
    organization_name: '42 Kuala Lumpur',
    user_id: 'user-7',
    user_name: 'New Student',
    user_email: 'newstudent@gmail.com',
    requested_role: 'student',
    message: 'I am interested in learning programming',
    status: 'pending',
    requested_at: '2024-04-15T10:00:00Z',
    reviewed_at: null,
    reviewed_by: null,
  },
  {
    id: 'req-2',
    organization_id: 1,
    organization_name: '42 Kuala Lumpur',
    user_id: 'user-8',
    user_name: 'Aspiring Teacher',
    user_email: 'teacher@gmail.com',
    requested_role: 'teacher',
    message: 'I have 5 years of industry experience',
    status: 'pending',
    requested_at: '2024-04-14T15:30:00Z',
    reviewed_at: null,
    reviewed_by: null,
  },
];

// Mock organization proposals
export const mockProposals: OrganizationProposal[] = [
  {
    id: 'prop-1',
    proposed_name: 'AI Research Institute',
    proposed_domain: 'airi.edu',
    admin_email: 'admin@airi.edu',
    description: 'Focus on artificial intelligence research and education',
    proposer_id: 'user-1',
    proposer_name: 'John Doe',
    status: 'pending_verification',
    created_at: '2024-04-10T00:00:00Z',
    expires_at: '2024-04-24T00:00:00Z',
  },
];

// Helper functions
export function getOrganizationById(id: number): Organization | undefined {
  return mockOrganizations.find(org => org.id === id);
}

export function getOrganizationByDomain(domain: string): Organization | undefined {
  return mockOrganizations.find(org => org.domain === domain.toLowerCase());
}

export function getOrganizationsForUser(userId: string): Organization[] {
  const memberships = mockOrganizationMembers.filter(m => m.user_id === userId);
  return memberships.map(m => getOrganizationById(m.organization_id)).filter(Boolean) as Organization[];
}

export function getUserRoleInOrganization(userId: string, organizationId: number): OrganizationRole | null {
  const membership = mockOrganizationMembers.find(
    m => m.user_id === userId && m.organization_id === organizationId
  );
  return membership?.role || null;
}

export function isUserAdminOfOrganization(userId: string, organizationId: number): boolean {
  const membership = mockOrganizationMembers.find(
    m => m.user_id === userId && m.organization_id === organizationId
  );
  return membership?.role === 'admin' || membership?.role === 'sub_admin';
}

export function isUserPrimaryAdmin(userId: string, organizationId: number): boolean {
  const membership = mockOrganizationMembers.find(
    m => m.user_id === userId && m.organization_id === organizationId
  );
  return membership?.is_primary_admin === true;
}

export function getOrganizationMembers(organizationId: number): OrganizationMember[] {
  return mockOrganizationMembers.filter(m => m.organization_id === organizationId);
}

export function getPendingJoinRequests(organizationId: number): JoinRequest[] {
  return mockJoinRequests.filter(r => r.organization_id === organizationId && r.status === 'pending');
}

export function approveJoinRequest(requestId: string, reviewerId: string): JoinRequest | null {
  const request = mockJoinRequests.find(r => r.id === requestId);
  if (request) {
    request.status = 'approved';
    request.reviewed_at = new Date().toISOString();
    request.reviewed_by = reviewerId;
    
    // Add to organization members
    const newMember: OrganizationMember = {
      id: Math.max(...mockOrganizationMembers.map(m => m.id)) + 1,
      organization_id: request.organization_id,
      user_id: request.user_id,
      user_name: request.user_name,
      user_email: request.user_email,
      user_avatar: null,
      role: request.requested_role,
      is_primary_admin: false,
      joined_at: new Date().toISOString(),
      joined_via: 'request',
    };
    mockOrganizationMembers.push(newMember);
  }
  return request ?? null;
}

export function rejectJoinRequest(requestId: string, reviewerId: string): JoinRequest | null {
  const request = mockJoinRequests.find(r => r.id === requestId);
  if (request) {
    request.status = 'rejected';
    request.reviewed_at = new Date().toISOString();
    request.reviewed_by = reviewerId;
  }
  return request ?? null;
}

export function createOrganizationProposal(
  proposerId: string,
  proposerName: string,
  data: { name: string; adminEmail: string; domain?: string; description?: string }
): OrganizationProposal {
  const newProposal: OrganizationProposal = {
    id: `prop-${Date.now()}`,
    proposed_name: data.name,
    proposed_domain: data.domain || null,
    admin_email: data.adminEmail,
    description: data.description || null,
    proposer_id: proposerId,
    proposer_name: proposerName,
    status: 'pending_verification',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  };
  mockProposals.push(newProposal);
  return newProposal;
}

export function updateMemberRole(
  organizationId: number,
  userId: string,
  newRole: OrganizationRole,
  currentUserId: string
): boolean {
  // Check if current user is admin
  if (!isUserAdminOfOrganization(currentUserId, organizationId)) {
    return false;
  }
  
  const membership = mockOrganizationMembers.find(
    m => m.organization_id === organizationId && m.user_id === userId
  );
  
  if (!membership) return false;
  
  // Cannot demote primary admin
  if (membership.is_primary_admin) {
    return false;
  }
  
  membership.role = newRole;
  return true;
}

export function removeMember(
  organizationId: number,
  userId: string,
  currentUserId: string
): boolean {
  // Check if current user is admin
  if (!isUserAdminOfOrganization(currentUserId, organizationId)) {
    return false;
  }
  
  const index = mockOrganizationMembers.findIndex(
    m => m.organization_id === organizationId && m.user_id === userId
  );
  
  if (index === -1) return false;
  
  // Cannot remove primary admin
  if (mockOrganizationMembers[index].is_primary_admin) {
    return false;
  }
  
  mockOrganizationMembers.splice(index, 1);
  return true;
}