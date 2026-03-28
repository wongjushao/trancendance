// frontend/lib/role-requests.ts
"use client";

export interface RoleRequest {
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

const ROLE_REQUESTS_KEY = 'role_requests';

// Get all role requests
export function getRoleRequests(): RoleRequest[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(ROLE_REQUESTS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

// Create a new role request
export function createRoleRequest(
  userId: string,
  userName: string,
  userEmail: string,
  requestedRole: 'teacher' | 'admin',
  organizationId: number,
  organizationName: string
): RoleRequest {
  const newRequest: RoleRequest = {
    id: `req-${Date.now()}`,
    userId,
    userName,
    userEmail,
    requestedRole,
    organizationId,
    organizationName,
    requestedAt: new Date(),
    status: 'pending',
  };
  
  const requests = getRoleRequests();
  requests.push(newRequest);
  localStorage.setItem(ROLE_REQUESTS_KEY, JSON.stringify(requests));
  
  return newRequest;
}

// Approve a role request
export function approveRoleRequest(requestId: string): RoleRequest | null {
  const requests = getRoleRequests();
  const requestIndex = requests.findIndex(r => r.id === requestId);
  
  if (requestIndex === -1) return null;
  
  requests[requestIndex].status = 'approved';
  localStorage.setItem(ROLE_REQUESTS_KEY, JSON.stringify(requests));
  
  return requests[requestIndex];
}

// Reject a role request
export function rejectRoleRequest(requestId: string): RoleRequest | null {
  const requests = getRoleRequests();
  const requestIndex = requests.findIndex(r => r.id === requestId);
  
  if (requestIndex === -1) return null;
  
  requests[requestIndex].status = 'rejected';
  localStorage.setItem(ROLE_REQUESTS_KEY, JSON.stringify(requests));
  
  return requests[requestIndex];
}

// Get pending requests for an organization
export function getPendingRequestsForOrganization(organizationId: number): RoleRequest[] {
  const requests = getRoleRequests();
  return requests.filter(r => r.organizationId === organizationId && r.status === 'pending');
}

// Get user's pending request
export function getUserPendingRequest(userId: string): RoleRequest | null {
  const requests = getRoleRequests();
  return requests.find(r => r.userId === userId && r.status === 'pending') || null;
}