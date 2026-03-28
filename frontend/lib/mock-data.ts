// frontend/lib/mock-data.ts
import { Organization } from './role';

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'admin' | 'pending_admin' | 'pending_teacher';
  organizationId: number | null;
  createdAt: Date;
  avatarUrl?: string;
}

export interface PendingRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  requestedRole: 'teacher' | 'admin';
  organizationId: number;
  organizationName: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Invitation {
  id: string;
  token: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  organizationId: number;
  organizationName: string;
  invitedBy: string;
  invitedByName: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired';
}

// Mock Organizations with domains
export const mockOrganizations: Organization[] = [
  {
    id: 1,
    name: "Tech University",
    domain: "tech.edu",
    description: "Leading technology education institution focused on practical learning",
    memberCount: 2847,
    verified: true,
  },
  {
    id: 2,
    name: "DevCorp Training",
    domain: "devcorp.com",
    description: "Corporate development training platform for professionals",
    memberCount: 1523,
    verified: true,
  },
  {
    id: 3,
    name: "Design Academy",
    domain: "design.academy",
    description: "Creative design and UX courses for aspiring designers",
    memberCount: 892,
    verified: true,
  },
  {
    id: 4,
    name: "Data Science Institute",
    domain: "datasci.org",
    description: "Advanced data science and machine learning education",
    memberCount: 456,
    verified: true,
  },
  {
    id: 5,
    name: "Cloud Masters",
    domain: "cloudmasters.com",
    description: "Cloud computing certification programs",
    memberCount: 1234,
    verified: true,
  },
];

// Mock users (for development)
export const mockUsers: MockUser[] = [
  {
    id: 'user-1',
    email: 'alice@tech.edu',
    name: 'Alice Johnson',
    role: 'admin',
    organizationId: 1,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'user-2',
    email: 'bob@tech.edu',
    name: 'Bob Smith',
    role: 'teacher',
    organizationId: 1,
    createdAt: new Date('2024-02-20'),
  },
  {
    id: 'user-3',
    email: 'carol@gmail.com',
    name: 'Carol White',
    role: 'student',
    organizationId: null,
    createdAt: new Date('2024-03-10'),
  },
  {
    id: 'user-4',
    email: 'david@devcorp.com',
    name: 'David Brown',
    role: 'student',
    organizationId: 2,
    createdAt: new Date('2024-03-15'),
  },
];

// Mock pending role requests
export const mockPendingRequests: PendingRequest[] = [
  {
    id: 'req-1',
    userId: 'user-3',
    userName: 'Carol White',
    userEmail: 'carol@gmail.com',
    requestedRole: 'teacher',
    organizationId: 1,
    organizationName: 'Tech University',
    requestedAt: new Date('2024-03-20'),
    status: 'pending',
  },
];

// Mock invitations
export const mockInvitations: Invitation[] = [
  {
    id: 'inv-1',
    token: 'mock-token-123',
    email: 'newuser@tech.edu',
    role: 'teacher',
    organizationId: 1,
    organizationName: 'Tech University',
    invitedBy: 'user-1',
    invitedByName: 'Alice Johnson',
    createdAt: new Date('2024-03-25'),
    expiresAt: new Date('2024-04-01'),
    status: 'pending',
  },
];

// Helper functions for mock data
export function getOrganizationByDomain(domain: string): Organization | undefined {
  return mockOrganizations.find(org => org.domain === domain);
}

export function extractDomainFromEmail(email: string): string | null {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

export function getUserById(userId: string): MockUser | undefined {
  return mockUsers.find(user => user.id === userId);
}

export function getPendingRequestsByOrganization(organizationId: number): PendingRequest[] {
  return mockPendingRequests.filter(req => req.organizationId === organizationId && req.status === 'pending');
}

export function getInvitationsByOrganization(organizationId: number): Invitation[] {
  return mockInvitations.filter(inv => inv.organizationId === organizationId && inv.status === 'pending');
}

export function getInvitationByToken(token: string): Invitation | undefined {
  return mockInvitations.find(inv => inv.token === token);
}