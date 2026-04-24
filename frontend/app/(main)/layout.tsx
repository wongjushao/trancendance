// frontend/app/(main)/layout.tsx

"use client"; // ← ADDED: Required for sidebar event listening

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/lms/Sidebar";
import { TopNav } from "@/components/lms/TopNav";
import { NotificationToast } from "@/components/lms/NotificationToast";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useRole } from '@/components/providers/RoleProvider';

// Custom hook to listen to sidebar state
function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  useEffect(() => {
    // Load initial state
    const savedState = localStorage.getItem("sidebar_collapsed");
    if (savedState !== null) {
      setIsCollapsed(savedState === "true");
    }
    
    // Listen for sidebar toggle events
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
  const { roleData, setRole } = useRole();
  const [activeOrgId, setActiveOrgId] = useState<number | null>(roleData.organizationId);

  // Original auth and onboarding check logic (preserved, just converted to client-side)
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();

      if (!user) {
        router.push("/");
        return;
      }

      setUser(user);

      // Call the backend to check onboarding status (preserved original logic)
      if (session?.access_token) {
        try {
          const response = await fetch(
            '/api/auth-service/onboarding-status',
            {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
              cache: 'no-store',
            }
          );

          if (!response.ok) {
            console.error('Failed to check onboarding status');
            router.push("/onboarding");
            return;
          }

          const data = await response.json();
          
          // The backend returns onboarded based on required fields being populated
          if (!data.onboarded) {
            router.push("/onboarding");
            return;
          }
        } catch (error) {
          console.error('Error checking onboarding status:', error);
          router.push("/onboarding");
          return;
        }
      }
      
      setIsLoading(false);
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
    <div className="min-h-screen bg-[#0B0B0F] relative">
      {/* Background blobs - preserved from original */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-40 right-40 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 flex">
        <Sidebar user={user} />
        {/* ADDED: Dynamic margin based on sidebar state */}
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
  );
}