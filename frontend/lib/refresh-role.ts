// lib/refresh-role.ts
import { getSupabaseBrowserClient } from './supabase/browser-client';
import { setUserRoleData, RoleData, UserRole } from './role';

export async function refreshUserRoleFromBackend(): Promise<RoleData | null> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      // console.log('[RefreshRole] No session, skipping');
      return null;
    }
    
    // Get user's organization memberships
    const response = await fetch('/api/org-service/members/me', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });
    
    if (!response.ok) {
      console.error('[RefreshRole] Failed to fetch memberships:', response.status);
      return null;
    }
    
    const memberships = await response.json();
    
    // Determine the highest role (admin > teacher > student)
    let highestRole: UserRole = 'student';
    let activeOrgId: number | null = null;
    let activeOrgName: string | null = null;
    
    for (const membership of memberships || []) {
      const role = membership.member_role;
      const orgId = membership.organization_id;
      const orgName = membership.organization?.name;
      
      if (role === 'admin' || role === 'sub_admin') {
        highestRole = 'admin';
        activeOrgId = orgId;
        activeOrgName = orgName;
        break;
      } else if (role === 'teacher' && highestRole !== 'admin') {
        highestRole = 'teacher';
        activeOrgId = orgId;
        activeOrgName = orgName;
      } else if (role === 'student' && highestRole === 'student') {
        activeOrgId = orgId;
        activeOrgName = orgName;
      }
    }
    
    const roleData: RoleData = {
      role: highestRole,
      organizationId: activeOrgId,
      organizationName: activeOrgName,
      pendingRole: null,
      pendingOrganizationId: null,
      pendingOrganizationName: null,
    };
    
    setUserRoleData(roleData);
    
    // Dispatch event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('role-changed', { detail: roleData }));
    }
    
    return roleData;
    
  } catch (error) {
    console.error('[RefreshRole] Error:', error);
    return null;
  }
}