// frontend/app/(main)/admin/page.tsx
"use client";

import { useRole } from "@/components/providers/RoleProvider";
import SystemAdminDashboard from "@/components/dashboard/SystemAdminDashboard";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useEffect, useState } from "react";
import { Loader2, Shield } from "lucide-react";

export default function AdminPage() {
  const { roleData } = useRole();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (roleData.role !== 'system_admin') {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-[#6B6B80] mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-[#A0A0B5]">This page is for System Administrators only.</p>
      </div>
    );
  }

  return <SystemAdminDashboard user={user} />;
}