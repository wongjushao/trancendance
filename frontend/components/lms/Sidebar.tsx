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
  Menu,
  Shield,
  MessageSquare
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

  // Helper function to determine if a link is active
  const getIsActive = (href: string) => {
    // For the main Organizations page - only highlight on exact match
    if (href === "/organizations") {
      return pathname === "/organizations";
    }
    
    // For admin panel links - highlight when on admin pages
    if (href.includes("/admin")) {
      return pathname === href || pathname.startsWith(`${href}/`);
    }
    
    // For all other links - exact match or subpaths
    return pathname === href || pathname.startsWith(`${href}/`);
  };

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
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: newState } }));
    }
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
      { href: "/organizations", label: "Organizations", icon: Building2 },  // Moved up
      { href: "/courses", label: "Courses", icon: BookOpen },               // Moved down
      { href: "/assignments", label: "Assignments", icon: FileText },
      { href: "/chat/rooms", label: "Chat", icon: MessageSquare },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ];

    // Add organization admin link for admin users
    if (roleData.role === "admin" && roleData.organizationId) {
      baseItems.splice(2, 0, {  // Changed from 3 to 2 - inserts after Dashboard and Organizations
        href: `/organizations/${roleData.organizationId}/admin`,
        label: "Admin Panel",
        icon: Building2,
      });
    }
    return baseItems;
  };

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
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-4 border-b border-gray-800`}>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="text-white font-semibold">Educatorio</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-lg hover:bg-gray-800 transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
        >
          <Menu className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto">
        <div className="space-y-1 px-3">
          {getNavItems().map((item) => {
            const isActive = getIsActive(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  isActive
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile Section */}
      <div className={`p-4 border-t border-gray-800 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <Link href="/profile" className={`flex items-center gap-3 group ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-medium text-sm">{getInitials()}</span>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{getDisplayName()}</p>
              {/* Display role - sanitize to ensure proper display */}
              <p className="text-gray-400 text-xs truncate">
                {(() => {
                  const roleMap: Record<string, string> = {
                    'student': 'Student',
                    'teacher': 'Teacher', 
                    'admin': 'Admin',
                  };
                  const currentRole = roleData.role;
                  return roleMap[currentRole] || currentRole;
                })()}
                {roleData.pendingRole && (
                  <span className="text-yellow-400 ml-1">
                    (Pending {roleData.pendingRole})
                  </span>
                )}
              </p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}