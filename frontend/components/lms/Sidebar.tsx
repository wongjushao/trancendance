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
  MessageSquare,
  BarChart3,
  Bell,
  User,
  Settings,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useAvatar } from "@/lib/useAvatar";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

const navItems = [
  { path: "/dashboard",      label: "Dashboard",     icon: LayoutDashboard },
  { path: "/organizations",  label: "Organizations", icon: Building2 },
  { path: "/courses",        label: "Courses",       icon: BookOpen },
  { path: "/assignments",    label: "Assignments",   icon: FileText },
  { path: "/messages",       label: "Messages",      icon: MessageSquare },
  { path: "/analytics",      label: "Analytics",     icon: BarChart3 },
  { path: "/notifications",  label: "Notifications", icon: Bell },
  { path: "/profile",        label: "Profile",       icon: User },
  { path: "/admin",          label: "Admin",         icon: Settings },
];

interface SidebarProps {
  user: SupabaseUser;
}

const PROFILE_UPDATED_EVENT = 'profile-updated';

export function Sidebar({ user: initialUser }: SidebarProps) {
  const pathname = usePathname();
  const { avatarUrl, isLoading } = useAvatar();
  const [user, setUser] = useState(initialUser);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = async (event: CustomEvent) => {
      // Refresh user data from Supabase
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

  // Derive display values from the real Supabase user
  const fullName: string =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  const email: string = user.email ?? "";

  // Generate initials for fallback avatar
  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0B0B0F] border-r border-white/5 flex flex-col z-20">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Educatorio</h1>
            <p className="text-xs text-[#6B6B80]">Learning Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${
                  isActive
                    ? "bg-gradient-to-r from-purple-500/20 to-violet-600/20 text-white border border-purple-500/30 shadow-lg shadow-purple-500/20"
                    : "text-[#A0A0B5] hover:text-white hover:bg-white/5"
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User card with avatar */}
      <div className="p-4 border-t border-white/5">
        <Link
          href="/profile"
          className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          {/* Avatar - shows image if exists, otherwise initials */}
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
    </aside>
  );
}