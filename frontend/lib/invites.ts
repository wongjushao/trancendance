// frontend/lib/invites.ts

import { Invitation, OrganizationRole } from '@/types/organizations';
import { getOrganizationById } from './organizations';
import { sendMockInvitation } from './mock-email';

const INVITATIONS_STORAGE_KEY = 'mock_invitations';

// Helper to load invitations from localStorage
function loadInvitations(): Invitation[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(INVITATIONS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

// Helper to save invitations to localStorage
function saveInvitations(invitations: Invitation[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(INVITATIONS_STORAGE_KEY, JSON.stringify(invitations));
}

// Get all invitations
export function getAllInvitations(): Invitation[] {
  return loadInvitations();
}

export function getInvitationByToken(token: string): Invitation | undefined {
  const invitations = loadInvitations();
  return invitations.find(inv => inv.token === token);
}

export function createOrganizationInvite(
  email: string,
  organizationId: number,
  role: OrganizationRole,
  invitedBy: string,
  invitedByName: string
): Invitation {
  const organization = getOrganizationById(organizationId);
  const token = `invite-${Math.random().toString(36).substring(2, 15)}`;
  
  const newInvite: Invitation = {
    id: `inv-${Date.now()}`,
    token: token,
    email,
    organization_id: organizationId,
    organization_name: organization?.name || 'Unknown Organization',
    role,
    invited_by: invitedBy,
    invited_by_name: invitedByName,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    max_uses: 1,
    used_count: 0,
  };
  
  const invitations = loadInvitations();
  invitations.push(newInvite);
  saveInvitations(invitations);
  
  console.log('[Invites] Created invitation:', { token, email, organizationId, role });
  
  sendMockInvitation(
    email,
    organization?.name || 'Unknown Organization',
    role,
    token,
    invitedByName
  );
  
  return newInvite;
}

export function createCourseInvite(
  email: string,
  organizationId: number,
  courseId: number,
  courseName: string,
  invitedBy: string,
  invitedByName: string
): Invitation {
  const organization = getOrganizationById(organizationId);
  const token = `course-${Math.random().toString(36).substring(2, 15)}`;
  
  const newInvite: Invitation = {
    id: `course-inv-${Date.now()}`,
    token: token,
    email,
    organization_id: organizationId,
    organization_name: organization?.name || 'Unknown Organization',
    course_id: courseId,
    course_name: courseName,
    role: 'student',
    invited_by: invitedBy,
    invited_by_name: invitedByName,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    max_uses: 1,
    used_count: 0,
  };
  
  const invitations = loadInvitations();
  invitations.push(newInvite);
  saveInvitations(invitations);
  
  console.log('[Invites] Created course invitation:', { token, email, courseId, courseName });
  
  sendMockInvitation(
    email,
    organization?.name || 'Unknown Organization',
    'student',
    token,
    invitedByName
  );
  
  return newInvite;
}

export function acceptInvitation(token: string, userId: string, userEmail: string): { success: boolean; message: string; data?: any } {
  const invitations = loadInvitations();
  const invitationIndex = invitations.findIndex(inv => inv.token === token);
  
  if (invitationIndex === -1) {
    return { success: false, message: 'Invitation not found' };
  }
  
  const invitation = invitations[invitationIndex];
  
  if (invitation.status !== 'pending') {
    return { success: false, message: `Invitation is already ${invitation.status}` };
  }
  
  if (new Date(invitation.expires_at) < new Date()) {
    invitation.status = 'expired';
    saveInvitations(invitations);
    return { success: false, message: 'Invitation has expired' };
  }
  
  // Check if email matches
  if (invitation.email !== userEmail) {
    return { success: false, message: 'This invitation was sent to a different email address' };
  }
  
  // Mark as accepted
  invitation.status = 'accepted';
  invitation.used_count += 1;
  saveInvitations(invitations);
  
  return {
    success: true,
    message: 'Successfully joined!',
    data: {
      organizationId: invitation.organization_id,
      organizationName: invitation.organization_name,
      role: invitation.role,
      courseId: invitation.course_id,
      courseName: invitation.course_name,
    },
  };
}

export function revokeInvitation(invitationId: string, userId: string): boolean {
  const invitations = loadInvitations();
  const invitationIndex = invitations.findIndex(inv => inv.id === invitationId);
  
  if (invitationIndex !== -1 && invitations[invitationIndex].status === 'pending') {
    invitations[invitationIndex].status = 'revoked';
    saveInvitations(invitations);
    return true;
  }
  return false;
}

export function getUserInvitesForOrganization(organizationId: number, userId: string): Invitation[] {
  const invitations = loadInvitations();
  return invitations.filter(inv => inv.organization_id === organizationId && inv.status === 'pending');
}


export type BackendMemberInvitationDetails = {
  email: string;
  member_role: string;
  organization_id: number;
  organization_name: string | null;
  invited_by_name: string;
  personal_message?: string | null;
  expires_at: string;
  status: string;
};


export async function fetchOrganizationMemberInvitationFromBackend(
  token: string
): Promise<{ ok: true; data: BackendMemberInvitationDetails } | { ok: false; status: number; message: string }> {
  const res = await fetch(
    `/api/org-service/member-invitations?token=${encodeURIComponent(token)}`
  );
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof payload?.error === 'string' ? payload.error : `Request failed (${res.status})`;
    return { ok: false, status: res.status, message };
  }
  return { ok: true, data: payload as BackendMemberInvitationDetails };
}


export async function acceptOrganizationMemberInvitationOnBackend(
  accessToken: string,
  invitationToken: string
): Promise<
  | { ok: true; organization_id: number; organization_name: string; member_role: string }
  | { ok: false; status: number; message: string }
> {
  const res = await fetch('/api/org-service/member-invitations/accept', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ token: invitationToken }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof payload?.error === 'string' ? payload.error : `Request failed (${res.status})`;
    return { ok: false, status: res.status, message };
  }
  return {
    ok: true,
    organization_id: payload.organization_id as number,
    organization_name: payload.organization_name as string,
    member_role: payload.member_role as string,
  };
}