// frontend/components/providers/RoleProvider.tsx
"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { RoleData, UserRole, getUserRoleData, setUserRoleData } from "@/lib/role";

interface RoleContextType {
  roleData: RoleData;
  setRole: (data: Partial<RoleData>) => void;
  hasPermission: (role: UserRole) => boolean;
  isPending: () => boolean;
  refreshRole: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [roleData, setRoleData] = useState<RoleData>(() => getUserRoleData());

  const refreshRole = useCallback(() => {
    setRoleData(getUserRoleData());
  }, []);

  useEffect(() => {
    const handleRoleChange = (event: CustomEvent<RoleData>) => {
      setRoleData(event.detail);
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
  }, [roleData]);

  const hasPermission = useCallback((requiredRole: UserRole): boolean => {
    const roleHierarchy: Record<UserRole, number> = {
      student: 1,
      pending_teacher: 1,
      pending_admin: 1,
      teacher: 2,
      admin: 3,
    };
    return roleHierarchy[roleData.role] >= roleHierarchy[requiredRole];
  }, [roleData.role]);

  const isPending = useCallback((): boolean => {
    return roleData.role === 'pending_admin' || roleData.role === 'pending_teacher';
  }, [roleData.role]);

  return (
    <RoleContext.Provider value={{ roleData, setRole, hasPermission, isPending, refreshRole }}>
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