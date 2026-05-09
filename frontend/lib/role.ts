// lib/role.ts
export type UserRole = 'student' | 'teacher' | 'admin';

export interface RoleData {
  role: UserRole;
  organizationId: number | null;
  organizationName: string | null;
  pendingRole?: UserRole | null;
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
      // Sanitize role to ensure it's a valid role
      const validRoles: UserRole[] = ['student', 'teacher', 'admin'];
      let role = parsed.role;
      
      // If role is pending, pending_admin, pending_teacher, or any non-valid value, default to student
      if (!validRoles.includes(role)) {
        console.log(`[Role] Sanitizing invalid role: "${role}" -> defaulting to "student"`);
        role = 'student';
        
        // Also clear pending fields if they exist
        parsed.pendingRole = null;
        parsed.pendingOrganizationId = null;
        parsed.pendingOrganizationName = null;
      }
      
      // Ensure valid structure
      return {
        ...defaultRoleData,
        ...parsed,
        role,
      };
    } catch {
      return defaultRoleData;
    }
  }
  return defaultRoleData;
}

export function setUserRoleData(data: RoleData): void {
  if (typeof window === 'undefined') return;
  
  // Validate before saving - ensure role is valid
  const validRoles: UserRole[] = ['student', 'teacher', 'admin'];
  if (!validRoles.includes(data.role)) {
    console.warn(`[Role] Attempting to set invalid role: "${data.role}" - forcing to student`);
    data.role = 'student';
  }
  
  localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('role-changed', { detail: data }));
}

export function clearUserRoleData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ROLE_STORAGE_KEY);
}

export function clearPendingRoleData(): void {
  if (typeof window === 'undefined') return;
  const current = getUserRoleData();
  setUserRoleData({
    ...current,
    pendingRole: null,
    pendingOrganizationId: null,
    pendingOrganizationName: null,
  });
}

export function hasPermission(requiredRole: UserRole): boolean {
  const { role } = getUserRoleData();
  const roleHierarchy: Record<UserRole, number> = {
    student: 1,
    teacher: 2,
    admin: 3,
  };
  return roleHierarchy[role] >= roleHierarchy[requiredRole];
}