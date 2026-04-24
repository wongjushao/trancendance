// frontend/components/dev/RoleSwitcher.tsx
'use client';

import { useState } from "react";
import { Shield, ChevronDown, Check } from "lucide-react";
import { useRole } from "@/components/providers/RoleProvider";
import { UserRole } from "@/lib/role";

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  icon: string;
  dashboardPreview: string;
  organizationId?: number | null;
  organizationName?: string | null;
}

const roleOptions: RoleOption[] = [
  {
    value: "student",
    label: "Student",
    description: "Access courses and learning materials",
    icon: "📚",
    dashboardPreview: "Student Dashboard with courses and progress"
  },
  {
    value: "teacher",
    label: "Teacher",
    description: "Create and manage courses",
    icon: "👨‍🏫",
    dashboardPreview: "Teacher Dashboard with course management"
  },
  {
    value: "org_admin",
    label: "Organization Admin",
    description: "Manage organization settings and members",
    icon: "🏢",
    organizationId: 1,
    organizationName: "Tech University",
    dashboardPreview: "Organization Admin Dashboard with member management"
  },
];

export function RoleSwitcher() {
  const { roleData, setRole, clearRole } = useRole();
  const [isOpen, setIsOpen] = useState(false);

  const currentRole = roleOptions.find(r => r.value === roleData.role) || roleOptions[0];

  const switchRole = (option: RoleOption) => {
    setRole({
      role: option.value,
      organizationId: option.organizationId || null,
      organizationName: option.organizationName || null,
      pendingRole: null,
      pendingOrganizationId: null,
      pendingOrganizationName: null,
    });
    setIsOpen(false);
    // Reload to refresh the dashboard with new role
    window.location.reload();
  };

  const resetToDefault = () => {
    clearRole();
    setIsOpen(false);
    window.location.reload();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm text-white shadow-lg hover:bg-gray-700 transition-all border border-gray-700"
        aria-label="Role switcher"
      >
        <Shield className="h-4 w-4" />
        <span className="font-medium">{currentRole.label}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Role Switcher Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          {/* Menu */}
          <div className="absolute bottom-full right-0 mb-2 w-80 rounded-lg bg-gray-800 shadow-xl border border-gray-700 z-50">
            <div className="p-2 border-b border-gray-700">
              <p className="text-xs text-gray-400">Switch Role (Development Only)</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {roleOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => switchRole(option)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-700 transition-colors flex items-center justify-between group ${
                    roleData.role === option.value ? 'bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{option.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-white">{option.label}</div>
                      <div className="text-xs text-gray-400">{option.description}</div>
                    </div>
                  </div>
                  {roleData.role === option.value && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </button>
              ))}
            </div>
            <div className="p-2 border-t border-gray-700">
              <button
                onClick={resetToDefault}
                className="w-full text-center text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Reset to Default (Student)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}