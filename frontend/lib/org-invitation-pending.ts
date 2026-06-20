/** Persists organization invite acceptance across redirects (email confirmation, new tabs). */

export const ORG_INVITE_PENDING_KEY = 'org_invitation_pending';

export type PendingOrgInvitation = {
  token: string;
  email: string;
  role: string;
  organizationId: number;
  organizationName: string;
  invitedByName: string;
  inviteSource: 'backend' | 'local';
};

export function readPendingOrgInvitation(): PendingOrgInvitation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ORG_INVITE_PENDING_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PendingOrgInvitation;
    if (!data?.token || !data?.email) return null;
    return data;
  } catch {
    return null;
  }
}

export function writePendingOrgInvitation(data: PendingOrgInvitation): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ORG_INVITE_PENDING_KEY, JSON.stringify(data));
}

export function clearPendingOrgInvitation(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ORG_INVITE_PENDING_KEY);
}
