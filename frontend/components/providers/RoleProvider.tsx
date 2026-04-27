// frontend/components/providers/RoleProvider.tsx
"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { RoleData, UserRole, getUserRoleData, setUserRoleData, clearUserRoleData } from "@/lib/role";

interface RoleContextType {
  roleData: RoleData;
  setRole: (data: Partial<RoleData>) => void;
  hasPermission: (role: UserRole) => boolean;
  isPending: () => boolean;
  refreshRole: () => void;
  clearRole: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// Helper to set cookie
const setRoleCookie = (role: string, organizationId?: number | null, organizationName?: string | null) => {
  if (typeof document === 'undefined') return;
  
  const cookieData = {
    role,
    organizationId: organizationId || null,
    organizationName: organizationName || null
  };
  
  document.cookie = `user_role_data=${JSON.stringify(cookieData)}; path=/; max-age=604800; SameSite=Lax`; // 7 days
};

// Helper to clear cookie
const clearRoleCookie = () => {
  if (typeof document === 'undefined') return;
  document.cookie = 'user_role_data=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
};

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [roleData, setRoleData] = useState<RoleData>(() => getUserRoleData());
  const [isInitialized, setIsInitialized] = useState(false);

  const refreshRole = useCallback(() => {
    const data = getUserRoleData();
    setRoleData(data);
    setRoleCookie(data.role, data.organizationId, data.organizationName);
  }, []);

  // Initialize cookie on first load
  useEffect(() => {
    if (!isInitialized) {
      setRoleCookie(roleData.role, roleData.organizationId, roleData.organizationName);
      setIsInitialized(true);
    }
  }, [roleData, isInitialized]);

  useEffect(() => {
    const handleRoleChange = (event: CustomEvent<RoleData>) => {
      setRoleData(event.detail);
      setRoleCookie(event.detail.role, event.detail.organizationId, event.detail.organizationName);
    };

    window.addEventListener('role-changed', handleRoleChange as EventListener);
    return () => {
      window.removeEventListener('role-changed', handleRoleChange as EventListener);
    };
  }, []);

  const setRole = useCallback((data: Partial<RoleData>) => {
    const newData = { ...roleData, ...data };
    setRoleData(newData);
    setUserRoleData(newData);
    setRoleCookie(newData.role, newData.organizationId, newData.organizationName);
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('role-changed', { detail: newData }));
  }, [roleData]);

  const clearRole = useCallback(() => {
    clearUserRoleData();
    clearRoleCookie();
    const defaultData = { role: 'student' as UserRole, organizationId: null, organizationName: null, pendingRole: null };
    setRoleData(defaultData as RoleData);
    window.dispatchEvent(new CustomEvent('role-changed', { detail: defaultData }));
  }, []);

  const hasPermission = useCallback((requiredRole: UserRole): boolean => {
    const roleHierarchy: Record<UserRole, number> = {
      student: 1,
      pending_teacher: 1,
      pending_org_admin: 1,
      teacher: 2,
      org_admin: 3,
    };
    return roleHierarchy[roleData.role] >= roleHierarchy[requiredRole];
  }, [roleData.role]);

  const isPending = useCallback((): boolean => {
    return roleData.role === 'pending_org_admin' || roleData.role === 'pending_teacher';
  }, [roleData.role]);

  return (
    <RoleContext.Provider value={{ roleData, setRole, hasPermission, isPending, refreshRole, clearRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}