// frontend/components/dev/RoleSwitcher.tsx
"use client";

import { useState, useEffect } from "react";
import { Shield, ChevronDown, Check, Eye } from "lucide-react";
import { useRole } from "@/components/providers/RoleProvider";
import { UserRole } from "@/lib/role";

const IS_DEV = process.env.NODE_ENV === 'development';

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  icon: string;
  dashboardPreview: string;
  organizationId?: number | null;
  organizationName?: string | null;
}

const roles: RoleOption[] = [
  { 
    value: 'student', 
    label: 'Student', 
    description: 'Focus on learning and courses',
    icon: '📚',
    dashboardPreview: 'Shows active courses, learning progress, achievements, and recommended content',
    organizationId: null,
    organizationName: null
  },
  { 
    value: 'teacher', 
    label: 'Teacher', 
    description: 'Manage courses and grade assignments',
    icon: '👨‍🏫',
    dashboardPreview: 'Shows course management, pending submissions, student analytics, and revenue metrics',
    organizationId: 1,
    organizationName: 'Tech University'
  },
  { 
    value: 'org_admin', 
    label: 'Organization Admin', 
    description: 'Manage your organization\'s members, courses, and settings',
    icon: '👑',
    dashboardPreview: 'Shows organization management, member roles, course oversight, and org analytics',
    organizationId: 1,
    organizationName: 'Tech University'
  },
  { 
    value: 'system_admin', 
    label: 'System Admin', 
    description: 'Full platform control across all organizations',
    icon: '🛡️',
    dashboardPreview: 'Shows global user management, system settings, audit logs, and platform analytics',
    organizationId: null,
    organizationName: null
  },
  { 
    value: 'pending_teacher', 
    label: 'Pending Teacher', 
    description: 'Teacher request awaiting approval',
    icon: '⏳',
    dashboardPreview: 'Shows pending request status with organization info',
    organizationId: 1,
    organizationName: 'Tech University'
  },
  { 
    value: 'pending_org_admin', 
    label: 'Pending Org Admin', 
    description: 'Organization admin request awaiting verification',
    icon: '⏳',
    dashboardPreview: 'Shows pending request with organization setup instructions',
    organizationId: null,
    organizationName: null
  },
];

export function RoleSwitcher() {
  const { roleData, setRole, clearRole } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Find current role for preview
    const current = roles.find(r => r.value === roleData.role);
    setSelectedRole(current || null);
  }, [roleData.role]);

  if (!IS_DEV || !mounted) return null;

  const switchRole = (role: RoleOption) => {
    setRole({
      role: role.value,
      organizationId: role.organizationId,
      organizationName: role.organizationName,
      pendingRole: role.value === 'pending_teacher' ? 'teacher' : role.value === 'pending_org_admin' ? 'org_admin' : null,
      pendingOrganizationId: role.organizationId,
      pendingOrganizationName: role.organizationName,
    });
    
    setSelectedRole(role);
    setIsOpen(false);
    
    // Reload to refresh the dashboard with new role
    window.location.reload();
  };

  const getCurrentRoleIcon = () => {
    const current = roles.find(r => r.value === roleData.role);
    return current?.icon || '👤';
  };

  const getCurrentRoleLabel = () => {
    const current = roles.find(r => r.value === roleData.role);
    return current?.label || roleData.role.replace('_', ' ');
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600/90 backdrop-blur-sm rounded-lg text-white text-sm font-medium shadow-lg hover:bg-purple-500 transition-colors border border-purple-400/30 group"
          onMouseEnter={() => setShowPreview(true)}
          onMouseLeave={() => setShowPreview(false)}
        >
          <Shield className="w-4 h-4" />
          <span className="hidden sm:inline">
            {getCurrentRoleIcon()} {getCurrentRoleLabel()}
          </span>
          <span className="sm:hidden">
            {getCurrentRoleIcon()}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Role Preview Tooltip */}
        {showPreview && selectedRole && (
          <div className="absolute bottom-full left-0 mb-2 w-80 bg-[#16161F] border border-white/10 rounded-xl shadow-2xl p-3 pointer-events-none">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{selectedRole.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{selectedRole.label}</p>
                <p className="text-xs text-[#A0A0B5]">{selectedRole.description}</p>
              </div>
            </div>
            <div className="text-xs text-[#6B6B80] mt-2 pt-2 border-t border-white/5">
              <Eye className="w-3 h-3 inline mr-1" />
              Dashboard: {selectedRole.dashboardPreview}
            </div>
          </div>
        )}

        {/* Role Switcher Menu */}
        {isOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-80 bg-[#16161F] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-3 border-b border-white/10 bg-purple-500/10">
              <p className="text-xs font-semibold text-purple-400">🎮 Developer Tools</p>
              <p className="text-[10px] text-[#6B6B80]">Switch roles to test different dashboards</p>
            </div>
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => switchRole(role)}
                className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center justify-between group ${
                  roleData.role === role.value ? 'bg-purple-500/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{role.icon}</span>
                  <div>
                    <p className="text-white text-sm font-medium group-hover:text-purple-400 transition-colors">
                      {role.label}
                    </p>
                    <p className="text-[10px] text-[#6B6B80]">{role.description}</p>
                  </div>
                </div>
                {roleData.role === role.value && (
                  <Check className="w-4 h-4 text-purple-400" />
                )}
              </button>
            ))}
            <div className="p-2 border-t border-white/10 bg-[#12121A]">
              <button
                onClick={() => {
                  clearRole();
                  window.location.reload();
                }}
                className="w-full text-center text-xs text-red-400 hover:text-red-300 transition-colors py-1"
              >
                Reset Role to Default
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}