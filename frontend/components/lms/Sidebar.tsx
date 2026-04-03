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

interface SidebarProps {
  user: SupabaseUser;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { roleData } = useRole();
  const { avatarUrl } = useAvatar();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profileData, setProfileData] = useState<{
    first_name: string | null;
    last_name: string | null;
  }>({
    first_name: null,
    last_name: null,
  });

  // Load sidebar state from localStorage only after mount
  useEffect(() => {
    setMounted(true);
    const savedState = localStorage.getItem("sidebar_collapsed");
    if (savedState !== null) {
      setIsCollapsed(savedState === "true");
    }
  }, []);

  // Save sidebar state
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar_collapsed", String(newState));
  };

  // Fetch profile data for name display
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();

        if (!error && data) {
          setProfileData(data);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchProfileData();
  }, [user.id]);

  // Listen for profile updates to refresh avatar and user data
  useEffect(() => {
    const handleProfileUpdate = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();

        if (!error && data) {
          setProfileData(data);
        }
      } catch (error) {
        console.error("Error refreshing profile:", error);
      }
    };

    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("profile-updated", handleProfileUpdate);
  }, [user.id]);

  const getInitials = () => {
    const firstName = profileData.first_name || user.user_metadata?.first_name || "";
    const lastName = profileData.last_name || user.user_metadata?.last_name || "";
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    if (firstName) return firstName[0].toUpperCase();
    return user.email?.[0].toUpperCase() || "U";
  };

  const getDisplayName = () => {
    const firstName = profileData.first_name || user.user_metadata?.first_name || "";
    const lastName = profileData.last_name || user.user_metadata?.last_name || "";
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    return user.email?.split('@')[0] || "User";
  };

  // Build dynamic nav items with admin links based on role
  const getNavItems = () => {
    const baseItems = [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/courses", label: "Courses", icon: BookOpen },
      { href: "/assignments", label: "Assignments", icon: FileText },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ];

    // Add organization admin link for org_admin users
    if (roleData.role === "org_admin" && roleData.organizationId) {
      baseItems.splice(2, 0, {
        href: `/organizations/${roleData.organizationId}/admin`,
        label: "Organization Admin",
        icon: Building2,
      });
    }

    // Add system admin link for system_admin users
    if (roleData.role === "system_admin") {
      baseItems.splice(2, 0, {
        href: "/admin",
        label: "System Admin",
        icon: Shield,
      });
    }

    // Add organizations link for system admin
    if (roleData.role === "system_admin") {
      baseItems.splice(3, 0, {
        href: "/organizations",
        label: "Organizations",
        icon: Building2,
      });
    }

    return baseItems;
  };

  const navItems = getNavItems();

  // Don't render during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20" />
            <span className="font-bold text-white">Educatorio</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-gray-800/50 rounded-lg animate-pulse" />
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Logo and Toggle Button */}
      <div className={`p-4 border-b border-gray-800 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">LMS</span>
            </div>
            <span className="font-bold text-white">Educatorio</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {isCollapsed ? <Menu className="w-5 h-5 text-gray-400" /> : <ChevronLeft className="w-5 h-5 text-gray-400" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive 
                  ? "bg-purple-600/20 text-purple-400 border border-purple-500/30" 
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                }
                ${isCollapsed ? "justify-center" : ""}
              `}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-purple-400" : ""}`} />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className={`p-4 border-t border-gray-800 ${isCollapsed ? "text-center" : ""}`}>
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-semibold">{getInitials()}</span>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{getDisplayName()}</p>
              <p className="text-xs text-gray-400 truncate capitalize">{roleData.role.replace("_", " ")}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}