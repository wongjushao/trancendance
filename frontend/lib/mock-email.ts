// frontend/lib/mock-email.ts
"use client";

export interface MockEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  link?: string;
  createdAt: Date;
  read: boolean;
}

const MOCK_EMAILS_KEY = 'mock_emails';

// Store emails in localStorage for testing
export function storeMockEmail(email: MockEmail): void {
  if (typeof window === 'undefined') return;
  
  const existing = getMockEmails();
  existing.unshift(email);
  localStorage.setItem(MOCK_EMAILS_KEY, JSON.stringify(existing));
}

export function getMockEmails(): MockEmail[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(MOCK_EMAILS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

export function markEmailAsRead(id: string): void {
  if (typeof window === 'undefined') return;
  
  const emails = getMockEmails();
  const updated = emails.map(email => 
    email.id === id ? { ...email, read: true } : email
  );
  localStorage.setItem(MOCK_EMAILS_KEY, JSON.stringify(updated));
}

export function clearMockEmails(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MOCK_EMAILS_KEY);
}

// Generate invitation link
export function generateInvitationLink(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return `${origin}/accept-invite?token=${token}`;
}

// Send mock invitation email
export function sendMockInvitation(
  toEmail: string,
  organizationName: string,
  role: string,
  token: string,
  invitedByName: string
): void {
  const subject = `Invitation to join ${organizationName} on Educatorio`;
  const invitationLink = generateInvitationLink(token);
  
  const body = `
You've been invited by ${invitedByName} to join ${organizationName} as a ${role}.

Click the link below to accept your invitation:
${invitationLink}

This invitation expires in 7 days.

If you don't have an account yet, you'll be guided to create one.
If you already have an account, you'll be able to accept the invitation directly.

Best regards,
The Educatorio Team
  `.trim();

  storeMockEmail({
    id: Date.now().toString(),
    to: toEmail,
    subject,
    body,
    link: invitationLink,
    createdAt: new Date(),
    read: false,
  });
  
  console.log('[Mock Email] Sent invitation to:', toEmail);
  console.log('[Mock Email] Invitation link:', invitationLink);
}