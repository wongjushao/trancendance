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
import { useRole } from '@/components/providers/RoleProvider';

interface TopNavProps {
  user: SupabaseUser;
}

interface UserSearchResult {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  avatar_url: string | null;
  job_title: string | null;
  department: string | null;
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
            Are you sure you want to sign out? You&apos;ll need to sign in again to access your courses and dashboard.
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
  const [searchQuery, setSearchQuery] = useState("");
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
  const searchRef = useRef<HTMLDivElement>(null);

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
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setUserResults([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setUserResults([]);
          return;
        }

        const response = await fetch(`/api/auth-service/profile/search?q=${encodeURIComponent(query)}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to search users");
        }

        const data = await response.json();
        setUserResults(data.profiles || []);
        setSearchOpen(true);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("[TopNav] Error searching users:", error);
          setUserResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchQuery]);

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

  const getResultInitials = (result: UserSearchResult) => {
    if (result.first_name && result.last_name) {
      return `${result.first_name[0]}${result.last_name[0]}`.toUpperCase();
    }
    if (result.first_name) return result.first_name[0].toUpperCase();
    if (result.username) return result.username[0].toUpperCase();
    return "U";
  };

  const goToUserProfile = (result: UserSearchResult) => {
    const identifier = result.username || result.display_name || result.id;
    setSearchOpen(false);
    setSearchQuery("");
    router.push(`/profile/${encodeURIComponent(identifier)}`);
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="h-16 px-6 flex items-center justify-between">
          {/* Search Bar */}
          <div className="flex-1 max-w-md" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search courses, lessons, assignments, or users..."
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && userResults[0]) {
                    event.preventDefault();
                    goToUserProfile(userResults[0]);
                  }
                }}
                className="w-full pl-10 pr-10 py-2 bg-gray-800/50 border-gray-700 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setUserResults([]);
                    setSearchOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-gray-400 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {searchOpen && searchQuery.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-xl">
                  <div className="border-b border-gray-700 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                    Users
                  </div>
                  {searchLoading ? (
                    <div className="px-3 py-4 text-center text-sm text-gray-400">Searching users...</div>
                  ) : userResults.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto py-1">
                      {userResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => goToUserProfile(result)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-gray-700/60"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                            {result.avatar_url ? (
                              <img src={result.avatar_url} alt={`${result.display_name} avatar`} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-semibold text-white">{getResultInitials(result)}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{result.display_name}</p>
                            <p className="truncate text-xs text-gray-400">
                              {result.username ? `@${result.username}` : [result.job_title, result.department].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-4 text-center text-sm text-gray-400">No users found</div>
                  )}
                </div>
              )}
            </div>
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