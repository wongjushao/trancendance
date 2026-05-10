// frontend/lib/role-api.ts
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { RoleData, UserRole, setUserRoleData } from "@/lib/role";

export interface BackendRoleResponse {
  role: UserRole;
  organization_id: number | null;
  organization_name: string | null;
  has_organization: boolean;
  memberships: Array<{
    organization_id: number;
    organization_name: string;
    role: string;
  }>;
}

export async function fetchUserRoleFromBackend(): Promise<RoleData | null> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.log("[RoleAPI] No session token");
      return null;
    }
    
    const response = await fetch('/api/org-service/users/me/role', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error("[RoleAPI] Failed to fetch role:", response.status);
      return null;
    }
    
    const data: BackendRoleResponse = await response.json();
    
    const roleData: RoleData = {
      role: data.role,
      organizationId: data.organization_id,
      organizationName: data.organization_name,
      pendingRole: null,
      pendingOrganizationId: null,
      pendingOrganizationName: null,
    };
    
    // Update localStorage
    setUserRoleData(roleData);
    
    // Dispatch event for other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('role-changed', { detail: roleData }));
    }
    
    return roleData;
    
  } catch (error) {
    console.error("[RoleAPI] Error fetching role:", error);
    return null;
  }
}

export async function refreshUserRole(): Promise<RoleData | null> {
  return fetchUserRoleFromBackend();
}