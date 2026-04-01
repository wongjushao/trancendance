// frontend/components/SignOutButton.tsx
"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { clearUserRoleData } from "@/lib/role";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      "Are you sure you want to sign out?\n\nYou'll need to log in again to access your account."
    );
    
    if (!confirmed) {
      return;
    }
    
    setIsSigningOut(true);
    
    try {
      // Clear role data from localStorage
      clearUserRoleData();
      // Sign out from Supabase
      await supabase.auth.signOut();
      // Refresh the page to trigger the server-side redirect in middleware
      router.refresh(); 
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full"
    >
      <LogOut className="w-4 h-4" />
      {isSigningOut ? "Signing out..." : "Sign out"}
    </button>
  );
}