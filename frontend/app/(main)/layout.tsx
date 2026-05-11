"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/lms/Sidebar";
import { TopNav } from "@/components/lms/TopNav";
import { NotificationToast } from "@/components/lms/NotificationToast";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatProvider } from "@/contexts/ChatContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

// Custom hook to listen to sidebar state
function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  useEffect(() => {
    const savedState = localStorage.getItem("sidebar_collapsed");
    if (savedState !== null) {
      setIsCollapsed(savedState === "true");
    }
    
    const handleSidebarToggle = (event: CustomEvent) => {
      setIsCollapsed(event.detail.collapsed);
    };
    
    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    
    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    };
  }, []);
  
  return isCollapsed;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isCollapsed = useSidebarState();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
    //   console.log("[AppLayout] Starting auth check for path:", pathname);
      
      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
    //   console.log("[AppLayout] Session error:", sessionError);
    //   console.log("[AppLayout] Session exists:", !!session);
    //   console.log("[AppLayout] Access token exists:", !!session?.access_token);
      
      if (sessionError || !session?.access_token) {
        // console.log("[AppLayout] No valid session, redirecting to /");
        router.push("/");
        return;
      }

      const token = session.access_token;

      try {
        // Get user info from backend
        // console.log("[AppLayout] Fetching user info...");
        const userResponse = await fetch('/api/auth-service/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        // console.log("[AppLayout] User response status:", userResponse.status);

        if (!userResponse.ok) {
        //   console.log("[AppLayout] User response not OK, redirecting to /");
          router.push("/");
          return;
        }

        const userData = await userResponse.json();
        // console.log("[AppLayout] User data received:", { id: userData.id, email: userData.email });
        setUser(userData);

        // Check onboarding status
        // console.log("[AppLayout] Checking onboarding status...");
        const onboardingResponse = await fetch('/api/auth-service/onboarding-status', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          cache: 'no-store',
        });

        // console.log("[AppLayout] Onboarding response status:", onboardingResponse.status);

        if (!onboardingResponse.ok) {
        //   console.error('[AppLayout] Failed to check onboarding status:', onboardingResponse.status);
          router.push("/onboarding");
          return;
        }

        const onboardingData = await onboardingResponse.json();
        // console.log("[AppLayout] Onboarding data:", onboardingData);
        
        if (!onboardingData.onboarded) {
        //   console.log("[AppLayout] User not onboarded, redirecting to /onboarding");
          router.push("/onboarding");
          return;
        }
        
        // console.log("[AppLayout] Auth check passed!");
        setIsLoading(false);
        
      } catch (error) {
        // console.error('[AppLayout] Error checking auth:', error);
        router.push("/");
        return;
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <ChatProvider>
      <div className="min-h-screen bg-[#0B0B0F] relative">
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-40 right-40 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 flex">
          <Sidebar user={user} />
          <div 
            className="flex-1 flex flex-col min-h-screen transition-all duration-300"
            style={{ 
              marginLeft: isCollapsed ? "5rem" : "16rem",
              width: `calc(100% - ${isCollapsed ? "5rem" : "16rem"})`
            }}
          >
            <TopNav user={user} />
            <main className="flex-1 p-8">
              {children}
            </main>
          </div>
        </div>

        <ChatBubble />
        <NotificationToast />
      </div>
    </ChatProvider>
  );
}