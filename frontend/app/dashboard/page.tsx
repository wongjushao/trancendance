import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import SignOutButton from "../components/SignOutButton";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  
  // Check the profiles table for this specific user ID
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  /*
  // If no profile found or username is empty, they must onboard
  if (error || !profile?.username) {
    redirect("/onboarding");
  }
  */

  return (
    <div className="min-h-screen bg-[#02050b] text-white p-8">
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-12">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-slate-400">Logged in as {profile?.username || "Guest User"}</span>
          <SignOutButton />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
          <h2 className="text-lg font-semibold mb-2">Welcome Back!</h2>
          <p className="text-sm text-slate-400">You have successfully completed your profile setup.</p>
        </div>
      </div>
    </div>
  );
}