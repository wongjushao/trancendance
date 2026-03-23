import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { isProfileComplete, type ProfileRow } from "@/lib/profile";
import { Sidebar } from "@/components/lms/Sidebar";
import { TopNav } from "@/components/lms/TopNav";
import { NotificationToast } from "@/components/lms/NotificationToast";

/**
 * Server component layout for all (main) pages.
 *
 * Checks both auth AND profile completeness. Proxy handles most cases
 * but this is a belt-and-suspenders guard for direct server renders.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // Check profile completeness (fast path via metadata flag)
  const alreadyOnboarded = user.user_metadata?.onboarded === true;

  if (!alreadyOnboarded) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, bio, timezone, language, birthday")
      .eq("id", user.id)
      .single();

    if (!isProfileComplete(profile as ProfileRow | null)) {
      redirect("/onboarding");
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] relative">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-40 right-40 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 flex">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col min-h-screen ml-64">
          <TopNav user={user} />
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </div>

      <NotificationToast />
    </div>
  );
}
