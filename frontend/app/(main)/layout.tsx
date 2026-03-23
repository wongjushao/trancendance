import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { Sidebar } from "@/components/lms/Sidebar";
import { TopNav } from "@/components/lms/TopNav";
import { NotificationToast } from "@/components/lms/NotificationToast";

/**
 * Server component layout for all (main) pages.
 *
 * Fetches the authenticated Supabase user once here and passes it down
 * as a prop to Sidebar and TopNav — this means neither component needs
 * its own Supabase call. The middleware already blocks unauthenticated
 * access, but we redirect here too as a safety net.
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

  // Belt-and-suspenders: middleware should catch this first,
  // but if somehow an unauthenticated request reaches here, redirect.
  if (!user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] relative">
      {/* Background Gradient Blobs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-40 right-40 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 flex">
        {/* Pass real user to Sidebar so it can show their name/email */}
        <Sidebar user={user} />

        <div className="flex-1 flex flex-col min-h-screen ml-64">
          {/* Pass real user to TopNav so it can show avatar/email */}
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
