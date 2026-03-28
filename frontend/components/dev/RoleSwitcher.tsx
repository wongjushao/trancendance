// frontend/components/dev/RoleSwitcher.tsx
"use client";

import { useState, useEffect } from "react";
import { Shield, ChevronDown, Check } from "lucide-react";
import { useRole } from "@/components/providers/RoleProvider";
import { UserRole } from "@/lib/role";

// Only show in development
const IS_DEV = process.env.NODE_ENV === 'development';

export function RoleSwitcher() {
  const { roleData, setRole } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!IS_DEV || !mounted) return null;

  const roles: { value: UserRole; label: string; description: string }[] = [
    { value: 'student', label: 'Student', description: 'Regular student access' },
    { value: 'teacher', label: 'Teacher', description: 'Full teacher access' },
    { value: 'admin', label: 'Admin', description: 'Full admin access' },
    { value: 'pending_teacher', label: 'Pending Teacher', description: 'Teacher request pending' },
    { value: 'pending_admin', label: 'Pending Admin', description: 'Admin request pending' },
  ];

  const switchRole = (role: UserRole) => {
    setRole({
      role,
      organizationId: 1,
      organizationName: 'Tech University',
      pendingRole: role === 'pending_teacher' ? 'teacher' : role === 'pending_admin' ? 'admin' : null,
      pendingOrganizationId: role === 'pending_teacher' ? 1 : null,
      pendingOrganizationName: role === 'pending_teacher' ? 'Tech University' : null,
    });
    setIsOpen(false);
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600/90 backdrop-blur-sm rounded-lg text-white text-sm font-medium shadow-lg hover:bg-purple-500 transition-colors border border-purple-400/30"
        >
          <Shield className="w-4 h-4" />
          <span>Role: {roleData.role.replace('_', ' ')}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#16161F] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-white/10">
              <p className="text-xs text-[#A0A0B5] px-2">Switch Role (Dev Only)</p>
            </div>
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => switchRole(role.value)}
                className={`w-full px-4 py-2 text-left hover:bg-white/5 transition-colors flex items-center justify-between ${
                  roleData.role === role.value ? 'bg-purple-500/20' : ''
                }`}
              >
                <div>
                  <p className="text-white text-sm font-medium">{role.label}</p>
                  <p className="text-[10px] text-[#6B6B80]">{role.description}</p>
                </div>
                {roleData.role === role.value && (
                  <Check className="w-4 h-4 text-purple-400" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}