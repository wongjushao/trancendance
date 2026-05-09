// frontend/lib/mock-email.ts
// Dev-only mock inbox backed by localStorage (pairs with lib/invites.ts).

import type { OrganizationRole } from '@/types/organizations';

const MOCK_EMAILS_STORAGE_KEY = 'mock_emails';

export interface MockEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  link: string;
  createdAt: string;
  read: boolean;
}

function loadEmails(): MockEmail[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(MOCK_EMAILS_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MockEmail[];
  } catch {
    return [];
  }
}

function saveEmails(emails: MockEmail[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MOCK_EMAILS_STORAGE_KEY, JSON.stringify(emails));
}

export function getMockEmails(): MockEmail[] {
  const emails = loadEmails();
  return [...emails].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function markEmailAsRead(id: string): void {
  const emails = loadEmails();
  const idx = emails.findIndex((e) => e.id === id);
  if (idx === -1) return;
  emails[idx] = { ...emails[idx], read: true };
  saveEmails(emails);
}

export function clearMockEmails(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MOCK_EMAILS_STORAGE_KEY);
}

function acceptInvitePath(token: string): string {
  const q = new URLSearchParams({ token }).toString();
  return `/accept-invite?${q}`;
}

export interface BackendMockInvitationEmail {
  to: string;
  subject: string;
  body: string;
  /** Path + query relative to site root, e.g. /accept-invite?token=... */
  link: string;
  invite_url_absolute?: string;
}

/**
 * Persist a backend-generated envelope (SMTP disabled/failed or dev capture) into the mock inbox.
 */
export function enqueueMockInvitationFromBackend(mock: BackendMockInvitationEmail): void {
  if (typeof window === 'undefined') return;

  const email: MockEmail = {
    id: `mock-email-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    to: mock.to,
    subject: mock.subject,
    body: mock.body,
    link: mock.link.startsWith('/') ? mock.link : `/${mock.link}`,
    createdAt: new Date().toISOString(),
    read: false,
  };

  const emails = loadEmails();
  emails.push(email);
  saveEmails(emails);
  console.log('[MockEmail] Queued invitation from backend', { to: mock.to, subject: mock.subject });
}

export function sendMockInvitation(
  to: string,
  organizationName: string,
  role: OrganizationRole,
  token: string,
  invitedByName: string
): void {
  if (typeof window === 'undefined') return;

  const link = acceptInvitePath(token);
  const absolute = `${window.location.origin}${link}`;

  const subject = `Invitation to join ${organizationName}`;
  const body = `${invitedByName} invited you to join ${organizationName} as a ${role}.\n\nOpen this link to accept:\n${absolute}`;

  const email: MockEmail = {
    id: `mock-email-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    to,
    subject,
    body,
    link,
    createdAt: new Date().toISOString(),
    read: false,
  };

  const emails = loadEmails();
  emails.push(email);
  saveEmails(emails);

  console.log('[MockEmail] Queued invitation email', { to, subject, link });
}
