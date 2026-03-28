// frontend/app/(main)/layout.tsx

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { Sidebar } from "@/components/lms/Sidebar";
import { TopNav } from "@/components/lms/TopNav";
import { NotificationToast } from "@/components/lms/NotificationToast";
import { ChatBubble } from "@/components/chat/ChatBubble";

// RoleProvider is now in root layout, no need to import here

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

  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect("/");
  }

  // Call the backend to check onboarding status
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://auth-service:5001';
    const response = await fetch(
      `${backendUrl}/api/auth-service/onboarding-status`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      console.error('Failed to check onboarding status');
      redirect("/onboarding");
    }

    const data = await response.json();
    
    if (!data.onboarded) {
      redirect("/onboarding");
    }
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    redirect("/onboarding");
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

      <ChatBubble />
      <NotificationToast />
    </div>
  );
}