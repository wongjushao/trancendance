// frontend/types/organizations.ts

export type OrganizationRole = 'student' | 'teacher' | 'sub_admin' | 'admin';

export interface OrganizationMember {
  id: number;
  organization_id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
  role: OrganizationRole;
  is_primary_admin: boolean;
  joined_at: string;
  joined_via: 'request' | 'invite' | 'auto_domain';
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  domain: string | null;
  logo_url: string | null;
  primary_admin_id: string;
  created_at: string;
  member_count: number;
  course_count: number;
  verified: boolean;
}

export interface OrganizationProposal {
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

export interface JoinRequest {
  id: string;
  organization_id: number;
  organization_name: string;
  user_id: string;
  user_name: string;
  user_email: string;
  requested_role: OrganizationRole;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface Invitation {
  id: string;
  token: string;
  email: string;
  organization_id: number;
  organization_name: string;
  course_id?: number; // For course invites
  course_name?: string;
  role: OrganizationRole;
  invited_by: string;
  invited_by_name: string;
  created_at: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  max_uses: number;
  used_count: number;
}

export interface UserOrganizationContext {
  organization_id: number | null;
  organization_name: string | null;
  role: OrganizationRole | null;
}