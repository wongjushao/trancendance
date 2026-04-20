// frontend/components/lms/TopNav.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, Search, User, ChevronDown, Settings, CreditCard, LogOut, Award, BookOpen, UserCircle, AlertTriangle, X } from "lucide-react";
import { Input } from "../ui/input";
import SignOutButton from "../SignOutButton";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useAvatar } from "@/lib/useAvatar";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useRouter } from "next/navigation";
import { GlowButton } from "./GlowButton";
import { OrganizationSwitcher } from '@/components/organization/OrganizationSwitcher';
import { useRole } from '@/components/providers/RoleProvider';

interface TopNavProps {
  user: SupabaseUser;
}

// Confirmation Modal Component
const ConfirmSignOutModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean; onClose: () => void; onConfirm: () => void }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg max-w-md w-full mx-4 border border-gray-700">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
          </div>
          <h3 className="text-lg font-semibold text-white text-center mb-2">Sign Out?</h3>
          <p className="text-sm text-gray-400 text-center mb-6">
            Are you sure you want to sign out? You'll need to sign in again to access your courses and dashboard.
          </p>
          <div className="flex gap-3">
            <GlowButton variant="outline" onClick={onClose} fullWidth>
              Cancel
            </GlowButton>
            <GlowButton onClick={onConfirm} fullWidth>
              Sign Out
            </GlowButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export function TopNav({ user }: TopNavProps) {
  const router = useRouter();
  const { roleData, setRole } = useRole();
  const [activeOrgId, setActiveOrgId] = useState<number | null>(roleData.organizationId);
  const { avatarUrl, refreshAvatar } = useAvatar();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileData, setProfileData] = useState<{
    first_name: string | null;
    last_name: string | null;
    username: string | null;
  }>({
    first_name: null,
    last_name: null,
    username: null,
  });
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch profile data for name display
  const fetchProfileData = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, username")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setProfileData(data);
        
        // Set display name with priority: first_name + last_name > first_name > username > email
        if (data.first_name && data.last_name) {
          setProfileName(`${data.first_name} ${data.last_name}`);
        } else if (data.first_name) {
          setProfileName(data.first_name);
        } else if (data.username) {
          setProfileName(data.username);
        } else {
          setProfileName(user.email?.split('@')[0] || "User");
        }
      } else {
        // Fallback to user metadata
        const metaFirst = user.user_metadata?.first_name;
        const metaLast = user.user_metadata?.last_name;
        if (metaFirst && metaLast) {
          setProfileName(`${metaFirst} ${metaLast}`);
        } else if (metaFirst) {
          setProfileName(metaFirst);
        } else {
          setProfileName(user.email?.split('@')[0] || "User");
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfileName(user.email?.split('@')[0] || "User");
    }
  };

  // Handle sign out with confirmation
  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      
      // Clear any stored data
      localStorage.removeItem("sidebar_collapsed");
      localStorage.removeItem("user_role_data");
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      // Redirect to login page
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsSigningOut(false);
      setShowSignOutModal(false);
    }
  };

  // Listen for profile updates to refresh avatar and user data
  useEffect(() => {
    const handleProfileUpdate = async () => {
      await fetchProfileData();
      refreshAvatar();
    };

    const handleAvatarUpdate = async () => {
      refreshAvatar();
    };

    fetchProfileData();

    window.addEventListener("profile-updated", handleProfileUpdate);
    window.addEventListener("avatar-updated", handleAvatarUpdate);
    
    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
      window.removeEventListener("avatar-updated", handleAvatarUpdate);
    };
  }, [user.id, user.email, user.user_metadata]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
        setNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = () => {
    if (profileData.first_name && profileData.last_name) {
      return `${profileData.first_name[0]}${profileData.last_name[0]}`.toUpperCase();
    }
    if (profileData.first_name) {
      return profileData.first_name[0].toUpperCase();
    }
    if (profileData.username) {
      return profileData.username[0].toUpperCase();
    }
    return user.email?.[0].toUpperCase() || "U";
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="h-16 px-6 flex items-center justify-between">
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search courses, lessons, or assignments..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border-gray-700 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Organization Switcher - Add this after search */}
          <div className="hidden md:block w-64">
            <OrganizationSwitcher 
              currentOrganizationId={activeOrgId}
              onSwitch={(orgId, orgName, role) => {
                setActiveOrgId(orgId);
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setProfileOpen(false);
                }}
                className="relative p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-400" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Notifications Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden z-50">
                  <div className="p-3 border-b border-gray-700">
                    <h3 className="font-semibold text-white">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="p-3 hover:bg-gray-700/50 transition-colors cursor-pointer">
                      <p className="text-sm text-white">New assignment available</p>
                      <p className="text-xs text-gray-400 mt-1">Advanced React Development</p>
                      <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                    </div>
                    <div className="p-3 hover:bg-gray-700/50 transition-colors cursor-pointer">
                      <p className="text-sm text-white">Course completed!</p>
                      <p className="text-xs text-gray-400 mt-1">TypeScript Fundamentals</p>
                      <p className="text-xs text-gray-500 mt-1">Yesterday</p>
                    </div>
                    <div className="p-3 hover:bg-gray-700/50 transition-colors cursor-pointer">
                      <p className="text-sm text-white">New message from instructor</p>
                      <p className="text-xs text-gray-400 mt-1">Sarah Johnson</p>
                      <p className="text-xs text-gray-500 mt-1">2 days ago</p>
                    </div>
                  </div>
                  <div className="p-3 border-t border-gray-700 text-center">
                    <Link href="/notifications" className="text-sm text-purple-400 hover:text-purple-300">
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                {/* Avatar with image support */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-sm font-semibold">{getInitials()}</span>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden z-50">
                  {/* User Info Header */}
                  <div className="p-4 border-b border-gray-700 bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-semibold">{getInitials()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{profileName}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items - Removed "My Learning" option */}
                  <div className="py-2">
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      <UserCircle className="w-4 h-4" />
                      View Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <div className="border-t border-gray-700 my-1"></div>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        setShowSignOutModal(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-gray-700/50 transition-colors"
                      disabled={isSigningOut}
                    >
                      <LogOut className="w-4 h-4" />
                      {isSigningOut ? "Signing out..." : "Sign Out"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sign Out Confirmation Modal */}
      <ConfirmSignOutModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleSignOut}
      />
    </>
  );
}