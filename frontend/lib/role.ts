// frontend/lib/role.ts
"use client";

export type UserRole = 'student' | 'teacher' | 'org_admin' | 'system_admin' | 'pending_teacher' | 'pending_org_admin';

export interface RoleData {
  role: UserRole;
  organizationId: number | null;
  organizationName: string | null;
  pendingRole: 'teacher' | 'org_admin' | null;
  pendingOrganizationId?: number | null;
  pendingOrganizationName?: string | null;
}

export interface Organization {
  id: number;
  name: string;
  domain: string;
  description: string;
  memberCount: number;
  verified: boolean;
  createdAt?: string;
  createdBy?: string;
}

// Mock organizations with domains for auto-detection
export const mockOrganizations: Organization[] = [
  {
    id: 1,
    name: "Tech University",
    domain: "tech.edu",
    description: "Leading technology education institution focused on practical learning",
    memberCount: 2847,
    verified: true,
    createdAt: "2024-01-15",
    createdBy: "admin-1"
  },
  {
    id: 2,
    name: "DevCorp Training",
    domain: "devcorp.com",
    description: "Corporate development training platform for professionals",
    memberCount: 1523,
    verified: true,
    createdAt: "2024-02-20",
    createdBy: "admin-2"
  },
  {
    id: 3,
    name: "Design Academy",
    domain: "design.academy",
    description: "Creative design and UX courses for aspiring designers",
    memberCount: 892,
    verified: true,
    createdAt: "2024-03-10",
    createdBy: "admin-3"
  },
  {
    id: 4,
    name: "Data Science Institute",
    domain: "datasci.org",
    description: "Advanced data science and machine learning education",
    memberCount: 456,
    verified: true,
    createdAt: "2024-04-01",
    createdBy: "admin-4"
  },
  {
    id: 5,
    name: "Cloud Masters",
    domain: "cloudmasters.com",
    description: "Cloud computing certification programs",
    memberCount: 1234,
    verified: true,
    createdAt: "2024-05-15",
    createdBy: "admin-5"
  },
];

const ROLE_STORAGE_KEY = 'user_role_data';

// Default role data for new users
const defaultRoleData: RoleData = {
  role: 'student',
  organizationId: null,
  organizationName: null,
  pendingRole: null,
  pendingOrganizationId: null,
  pendingOrganizationName: null,
};

export function getUserRoleData(): RoleData {
  if (typeof window === 'undefined') {
    return defaultRoleData;
  }
  
  const stored = localStorage.getItem(ROLE_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        ...defaultRoleData,
        ...parsed,
      };
    } catch {
      return defaultRoleData;
    }
  }
  return defaultRoleData;
}

export function setUserRoleData(data: RoleData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('role-changed', { detail: data }));
}

export function clearUserRoleData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ROLE_STORAGE_KEY);
}

export function hasPermission(requiredRole: UserRole): boolean {
  const { role } = getUserRoleData();
  const roleHierarchy: Record<UserRole, number> = {
    student: 1,
    pending_teacher: 1,
    pending_org_admin: 1,
    teacher: 2,
    org_admin: 3,
    system_admin: 4,
  };
  return roleHierarchy[role] >= roleHierarchy[requiredRole];
}

export function requestRoleUpgrade(desiredRole: 'teacher' | 'org_admin', organizationId?: number): void {
  const current = getUserRoleData();
  if (current.role === desiredRole) return;
  
  setUserRoleData({
    ...current,
    pendingRole: desiredRole,
    ...(desiredRole === 'teacher' && organizationId ? {
      pendingOrganizationId: organizationId,
      pendingOrganizationName: mockOrganizations.find(o => o.id === organizationId)?.name,
    } : {}),
  });
}