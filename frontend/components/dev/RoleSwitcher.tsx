// frontend/components/dev/RoleSwitcher.tsx
'use client';

import { useState, useEffect } from "react";
import { Shield, ChevronDown, Check, Eye } from "lucide-react";
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
    dashboardPreview: "Organization Admin Dashboard"
  },
  {
    value: "system_admin",
    label: "System Admin",
    description: "Full system access",
    icon: "👑",
    dashboardPreview: "System Admin Dashboard"
  },
  {
    value: "pending_teacher",
    label: "Pending Teacher",
    description: "Teacher request pending approval",
    icon: "⏳",
    dashboardPreview: "Pending approval page"
  },
  {
    value: "pending_org_admin",
    label: "Pending Org Admin",
    description: "Organization admin request pending",
    icon: "⏳",
    dashboardPreview: "Pending approval page"
  }
];

export function RoleSwitcher() {
  const { roleData, setRole, clearRole } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState<string | null>(null);

  const currentRole = roleOptions.find(r => r.value === roleData.role) || roleOptions[0];

  const switchRole = (role: RoleOption) => {
    setRole({
      role: role.value,
      organizationId: role.organizationId || null,
      organizationName: role.organizationName || null,
      pendingRole: null,
    });
    setIsOpen(false);
    // Reload to refresh the dashboard with new role
    window.location.reload();
  };

  const getCurrentRoleIcon = () => {
    return currentRole.icon;
  };

  const getCurrentRoleLabel = () => {
    return currentRole.label;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm text-white shadow-lg hover:bg-gray-700 transition-all border border-gray-700"
        aria-label="Role switcher"
      >
        <Shield className="h-4 w-4" />
        <span className="font-medium">{getCurrentRoleLabel()}</span>
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
                <div
                  key={option.value}
                  className="relative"
                  onMouseEnter={() => setShowPreview(option.value)}
                  onMouseLeave={() => setShowPreview(null)}
                >
                  <button
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
                  
                  {/* Preview Tooltip */}
                  {showPreview === option.value && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-64 rounded-lg bg-gray-900 shadow-xl border border-gray-700 p-2 z-50 pointer-events-none">
                      <div className="text-xs text-gray-400 mb-1">Preview</div>
                      <div className="text-sm text-white">{option.dashboardPreview}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-gray-700">
              <button
                onClick={() => {
                  clearRole();
                  setIsOpen(false);
                  window.location.reload();
                }}
                className="w-full text-center text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Reset to Default
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}