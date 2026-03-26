"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Search, User, ChevronDown, Settings, CreditCard } from "lucide-react";
import { Input } from "../ui/input";
import SignOutButton from "../SignOutButton";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useAvatar } from "@/lib/useAvatar";

interface TopNavProps {
  user: SupabaseUser;
}

export function TopNav({ user }: TopNavProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { avatarUrl, isLoading } = useAvatar();

  // Derive display values from the real Supabase user
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

  return (
    <header className="h-20 border-b border-white/5 bg-[#0B0B0F]/80 backdrop-blur-xl sticky top-0 z-10">
      <div className="h-full px-8 flex items-center justify-between">

        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
            <Input
              type="text"
              placeholder="Search courses, assignments, messages..."
              className="pl-12 pr-4 py-3 w-full bg-[#12121A] border-white/10 rounded-xl text-white placeholder:text-[#6B6B80] focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 ml-8">

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setProfileOpen(false);
              }}
              className="relative p-3 rounded-xl bg-[#12121A] hover:bg-white/5 transition-colors border border-white/5"
            >
              <Bell className="w-5 h-5 text-[#A0A0B5]" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full" />
            </button>

            {notifOpen && (
              <div className="absolute top-14 right-0 w-80 rounded-2xl border border-white/10 bg-[#16161F] p-4 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <p className="font-bold text-sm text-white">Notifications</p>
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="text-[10px] text-purple-400 hover:underline"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">New Course Available</p>
                      <p className="text-[11px] text-[#6B6B80] mt-0.5">
                        A new course matching your interests was added.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl hover:bg-white/5 transition-colors"
            >
              {/* Avatar with image support */}
              <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold text-sm">{initials}</span>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[#6B6B80] transition-transform ${profileOpen ? "rotate-180" : ""}`}
              />
            </button>

            {profileOpen && (
              <div className="absolute top-12 right-0 w-64 rounded-2xl border border-white/10 bg-[#16161F] shadow-2xl overflow-hidden py-2">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-white/5 mb-1">
                  <p className="text-sm font-bold text-white truncate">{fullName}</p>
                  <p className="text-xs text-[#6B6B80] truncate">{email}</p>
                </div>

                {/* Links */}
                <Link
                  href="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#A0A0B5] hover:bg-white/5 hover:text-white transition-colors"
                >
                  <User className="w-4 h-4" /> Profile
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#A0A0B5] hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Settings className="w-4 h-4" /> Settings
                </Link>
                <Link
                  href="/purchases"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#A0A0B5] hover:bg-white/5 hover:text-white transition-colors"
                >
                  <CreditCard className="w-4 h-4" /> My Purchases
                </Link>

                {/* Sign out */}
                <div className="border-t border-white/5 mt-1 pt-1">
                  <SignOutButton />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}