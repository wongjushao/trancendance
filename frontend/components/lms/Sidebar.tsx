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
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useAvatar } from "@/lib/useAvatar";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useRole } from "@/components/providers/RoleProvider";

const navItems = [
  { path: "/dashboard",      label: "Dashboard",     icon: LayoutDashboard, roles: ['student', 'teacher', 'admin', 'pending_admin', 'pending_teacher'] },
  { path: "/organizations",  label: "Organizations", icon: Building2, roles: ['student', 'teacher', 'admin', 'pending_admin', 'pending_teacher'] },
  { path: "/courses",        label: "Courses",       icon: BookOpen, roles: ['student', 'teacher', 'admin', 'pending_admin', 'pending_teacher'] },
  { path: "/assignments",    label: "Assignments",   icon: FileText, roles: ['student', 'teacher', 'admin', 'pending_admin', 'pending_teacher'] },
  { path: "/analytics",      label: "Analytics",     icon: BarChart3, roles: ['student', 'teacher', 'admin', 'pending_admin', 'pending_teacher'] },
  { path: "/admin",          label: "Admin",         icon: Settings, roles: ['admin'] },
  // Special links for pending roles
  { path: "/organization-setup", label: "Setup Organization", icon: Building2, roles: ['pending_admin'] },
  { path: "/teacher-request", label: "Teacher Request", icon: Building2, roles: ['pending_teacher'] },
];

interface SidebarProps {
  user: SupabaseUser;
}

const PROFILE_UPDATED_EVENT = 'profile-updated';
const SIDEBAR_STATE_KEY = 'sidebar_collapsed';

export function Sidebar({ user: initialUser }: SidebarProps) {
  const pathname = usePathname();
  const { avatarUrl } = useAvatar();
  const [user, setUser] = useState(initialUser);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
      return stored === 'true';
    }
    return false;
  });
  const { roleData } = useRole();

  // Save sidebar state
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(SIDEBAR_STATE_KEY, String(newState));
  };

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = async (event: CustomEvent) => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser) {
        setUser(updatedUser);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate as EventListener);
      return () => {
        window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate as EventListener);
      };
    }
  }, []);

  const fullName: string =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  const email: string = user.email ?? "";

  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Filter nav items based on role
  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(roleData.role)
  );

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
        
        {/* Admin Dashboard Link - Shown only for admin users with an organization */}
        {roleData.role === 'admin' && roleData.organizationId && (
          <Link
            href={`/organizations/${roleData.organizationId}/admin`}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all mt-4 border-t border-white/10 pt-4
              ${isCollapsed ? 'justify-center' : ''}
              ${pathname === `/organizations/${roleData.organizationId}/admin`
                ? "bg-gradient-to-r from-purple-500/20 to-violet-600/20 text-white border border-purple-500/30 shadow-lg shadow-purple-500/20"
                : "text-[#A0A0B5] hover:text-white hover:bg-white/5"
              }
            `}
            title={isCollapsed ? "Admin Dashboard" : undefined}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="font-medium">Admin Dashboard</span>}
          </Link>
        )}
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
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-sm">
                  {initials}
                </span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate text-sm">{fullName}</p>
              <p className="text-xs text-[#6B6B80] truncate">{email}</p>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
}