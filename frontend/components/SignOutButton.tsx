"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { clearUserRoleData } from "@/lib/role";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  const handleSignOut = async () => {
    // Clear role data from localStorage
    clearUserRoleData();
    // Sign out from Supabase
    await supabase.auth.signOut();
    // Refresh the page to trigger the server-side redirect in middleware
    router.refresh(); 
    router.push("/");
  };

  return (
    <button
      onClick={handleSignOut}
      className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
    >
      Sign out
    </button>
  );
}