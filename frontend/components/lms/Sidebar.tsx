// frontend/components/lms/Sidebar.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  Menu, 
  Users,
  Crown,
  Shield
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useAvatar } from "@/lib/useAvatar";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useRole } from "@/components/providers/RoleProvider";

const navItems = [
  { path: "/dashboard",      label: "Dashboard",     icon: LayoutDashboard, roles: ['student', 'teacher', 'org_admin', 'system_admin', 'pending_org_admin', 'pending_teacher'] },
  { path: "/courses",        label: "Courses",       icon: BookOpen,        roles: ['student', 'teacher', 'org_admin', 'system_admin', 'pending_org_admin', 'pending_teacher'] },
  { path: "/assignments",    label: "Assignments",   icon: FileText,        roles: ['student', 'teacher', 'org_admin', 'system_admin', 'pending_org_admin', 'pending_teacher'] },
  { path: "/analytics",      label: "Analytics",     icon: BarChart3,       roles: ['student', 'teacher', 'org_admin', 'system_admin', 'pending_org_admin', 'pending_teacher'] },
  { path: "/student",        label: "My Learning",   icon: BookOpen,        roles: ['student'] },
  { path: "/teacher",        label: "Teacher Hub",   icon: Users,           roles: ['teacher', 'org_admin', 'system_admin'] },
  { path: "/organizations",  label: "Organizations", icon: Building2,       roles: ['student', 'teacher', 'org_admin', 'system_admin', 'pending_org_admin', 'pending_teacher'] },
  // Special links for pending roles
  { path: "/organization-setup", label: "Setup Organization", icon: Building2, roles: ['pending_org_admin'] },
  { path: "/teacher-request", label: "Teacher Request", icon: Building2, roles: ['pending_teacher'] },
];

interface SidebarProps {
  user: SupabaseUser;
}

const PROFILE_UPDATED_EVENT = 'profile-updated';
const SIDEBAR_STATE_KEY = 'sidebar_collapsed';

export function Sidebar({ user: initialUser }: SidebarProps) {
  const pathname = usePathname();
  const { avatarUrl, refreshAvatar } = useAvatar();
  const [user, setUser] = useState(initialUser);
  const [profileData, setProfileData] = useState<any>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { roleData } = useRole();

  // Load sidebar state from localStorage only after mount (client-side only)
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
    setIsCollapsed(stored === 'true');
    setIsMounted(true);
  }, []);

  // Save sidebar state
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(SIDEBAR_STATE_KEY, String(newState));
  };

  // Fetch profile data for name display
  const fetchProfileData = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      try {
        const response = await fetch('/api/auth-service/profile', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setProfileData(data);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    }
  };

  // Listen for profile updates to refresh avatar and user data
  useEffect(() => {
    const handleProfileUpdate = async () => {
      await refreshAvatar();
      const supabase = getSupabaseBrowserClient();
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser) {
        setUser(updatedUser);
      }
      await fetchProfileData();
    };

    fetchProfileData();

    if (typeof window !== 'undefined') {
      window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate as EventListener);
      return () => {
        window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate as EventListener);
      };
    }
  }, [refreshAvatar]);

  const fullName: string =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  const email: string = user.email ?? "";

  const getInitials = () => {
    if (profileData?.first_name && profileData?.last_name) {
      return `${profileData.first_name[0]}${profileData.last_name[0]}`.toUpperCase();
    }
    return fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const displayName = profileData?.first_name && profileData?.last_name
    ? `${profileData.first_name} ${profileData.last_name}`
    : fullName;

  const initials = getInitials();

  // Build dynamic nav items with admin links based on role
  const getNavItems = () => {
    let items = [...navItems];
    
    // Add organization admin link for org_admin users
    if (roleData.role === 'org_admin' && roleData.organizationId) {
      items.push({ 
        path: `/organizations/${roleData.organizationId}/admin`, 
        label: "Organization Admin", 
        icon: Crown, 
        roles: ['org_admin'] 
      });
    }
    
    // Add system admin link for system_admin users
    if (roleData.role === 'system_admin') {
      items.push({ 
        path: "/admin", 
        label: "System Admin", 
        icon: Shield, 
        roles: ['system_admin'] 
      });
    }
    
    return items;
  };

  const filteredNavItems = getNavItems().filter(item => 
    item.roles.includes(roleData.role)
  );

  // Don't render until after mount to prevent hydration mismatch
  if (!isMounted) {
    return (
      <aside 
        className={`fixed left-0 top-0 h-screen bg-[#0B0B0F] border-r border-white/5 flex flex-col z-20 transition-all duration-300 w-64`}
      >
        {/* Logo - Always expanded during SSR */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Educatorio</h1>
              <p className="text-xs text-[#6B6B80]">Learning Platform</p>
            </div>
          </div>
          <button className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-[#A0A0B5]" />
          </button>
        </div>

        {/* Navigation Placeholder */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${isActive
                    ? "bg-gradient-to-r from-purple-500/20 to-violet-600/20 text-white border border-purple-500/30 shadow-lg shadow-purple-500/20"
                    : "text-[#A0A0B5] hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User card placeholder */}
        <div className="p-4 border-t border-white/5">
          <Link
            href="/profile"
            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {initials}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate text-sm">{displayName}</p>
              <p className="text-xs text-[#6B6B80] truncate">{email}</p>
            </div>
          </Link>
        </div>
      </aside>
    );
  }

  // Client-side render with actual collapsed state
  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-[#0B0B0F] border-r border-white/5 flex flex-col z-20 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo and Toggle Button */}
      <div className={`p-4 border-b border-white/5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Educatorio</h1>
              <p className="text-xs text-[#6B6B80]">Learning Platform</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-1.5 hover:bg-white/5 rounded-lg transition-colors ${
            isCollapsed ? 'absolute -right-3 top-6 bg-[#0B0B0F] border border-white/10' : ''
          }`}
        >
          {isCollapsed ? (
            <Menu className="w-4 h-4 text-[#A0A0B5]" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-[#A0A0B5]" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${isCollapsed ? 'justify-center' : ''}
                ${
                  isActive
                    ? "bg-gradient-to-r from-purple-500/20 to-violet-600/20 text-white border border-purple-500/30 shadow-lg shadow-purple-500/20"
                    : "text-[#A0A0B5] hover:text-white hover:bg-white/5"
                }
              `}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User card - Only show when not collapsed */}
      {!isCollapsed && (
        <div className="p-4 border-t border-white/5">
          <Link
            href="/profile"
            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-sm">
                  {initials}
                </span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate text-sm">{displayName}</p>
              <p className="text-xs text-[#6B6B80] truncate">{email}</p>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
}