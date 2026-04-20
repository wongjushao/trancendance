// frontend/components/organization/OrganizationSwitcher.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Building2, ChevronDown, Home, Users, Check, Plus } from 'lucide-react';
import { getOrganizationsForUser, getUserRoleInOrganization } from '@/lib/organizations';
import { useRole } from '@/components/providers/RoleProvider';
import { GlowCard } from '@/components/lms/Cards';

interface OrganizationSwitcherProps {
  currentOrganizationId?: number | null;
  onSwitch?: (orgId: number | null, orgName: string | null, role: string | null) => void;
}

export function OrganizationSwitcher({ currentOrganizationId, onSwitch }: OrganizationSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<Record<number, string>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { roleData, setRole } = useRole();

  // Load user's organizations
  useEffect(() => {
    const loadOrganizations = async () => {
      // Mock: In real app, fetch from backend
      const mockUserId = 'user-1'; // This would come from auth
      const orgs = getOrganizationsForUser(mockUserId);
      setOrganizations(orgs);
      
      // Get roles for each organization
      const roles: Record<number, string> = {};
      for (const org of orgs) {
        const role = getUserRoleInOrganization(mockUserId, org.id);
        if (role) roles[org.id] = role;
      }
      setUserRoles(roles);
    };
    
    loadOrganizations();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
      case 'sub_admin':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'teacher':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-green-500/20 text-green-400';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'sub_admin':
        return 'Sub-Admin';
      case 'teacher':
        return 'Teacher';
      default:
        return 'Student';
    }
  };

  const handleSwitchOrganization = (orgId: number | null, orgName: string | null, role: string | null) => {
    // Update role context
    if (orgId === null) {
      // Personal space
      setRole({
        role: 'student',
        organizationId: null,
        organizationName: null,
        pendingRole: null,
      });
      if (onSwitch) onSwitch(null, null, null);
    } else {
      setRole({
        role: role as any,
        organizationId: orgId,
        organizationName: orgName,
        pendingRole: null,
      });
      if (onSwitch) onSwitch(orgId, orgName, role);
    }
    
    setIsOpen(false);
    
    // Redirect to dashboard to refresh view
    if (pathname !== '/dashboard') {
      router.push('/dashboard');
    } else {
      router.refresh();
    }
  };

  const currentOrg = organizations.find(o => o.id === currentOrganizationId);
  const currentRole = currentOrganizationId ? userRoles[currentOrganizationId] : null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group"
      >
        <div className="flex items-center gap-2 min-w-0">
          {currentOrganizationId ? (
            <>
              <Building2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span className="text-sm text-white truncate">{currentOrg?.name || 'Organization'}</span>
              {currentRole && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeColor(currentRole)} flex-shrink-0`}>
                  {getRoleDisplayName(currentRole)}
                </span>
              )}
            </>
          ) : (
            <>
              <Home className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span className="text-sm text-white">Personal Space</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-600/50 text-gray-300 flex-shrink-0">
                Student
              </span>
            </>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <GlowCard className="py-2 max-h-80 overflow-y-auto">
            {/* Personal Space Option */}
            <button
              onClick={() => handleSwitchOrganization(null, null, null)}
              className={`w-full flex items-center justify-between px-4 py-2 hover:bg-purple-500/10 transition-colors ${
                !currentOrganizationId ? 'bg-purple-500/5' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Home className="w-4 h-4 text-gray-400" />
                <div className="text-left">
                  <div className="text-sm text-white">Personal Space</div>
                  <div className="text-xs text-gray-400">Public courses only</div>
                </div>
              </div>
              {!currentOrganizationId && <Check className="w-4 h-4 text-purple-400" />}
            </button>

            {/* Divider */}
            {organizations.length > 0 && (
              <div className="border-t border-gray-700 my-2" />
            )}

            {/* Organizations List */}
            {organizations.map((org) => {
              const role = userRoles[org.id];
              const isActive = currentOrganizationId === org.id;
              
              return (
                <button
                  key={org.id}
                  onClick={() => handleSwitchOrganization(org.id, org.name, role)}
                  className={`w-full flex items-center justify-between px-4 py-2 hover:bg-purple-500/10 transition-colors ${
                    isActive ? 'bg-purple-500/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Building2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="text-sm text-white truncate">{org.name}</div>
                      <div className="text-xs text-gray-400">
                        {getRoleDisplayName(role)} • {org.member_count} members
                      </div>
                    </div>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                </button>
              );
            })}

            {/* Propose Organization Link */}
            <div className="border-t border-gray-700 mt-2 pt-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/organizations/propose');
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-purple-400 hover:bg-purple-500/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Propose New Organization
              </button>
            </div>
          </GlowCard>
        </div>
      )}
    </div>
  );
}