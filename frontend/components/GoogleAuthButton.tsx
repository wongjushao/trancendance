"use client";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export default function GoogleAuthButton() {
  const handleGoogle = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { 
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <button
      onClick={handleGoogle}
      className="flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
    >
      <span className="text-lg font-bold">G</span> Continue with Google
    </button>
  );
}