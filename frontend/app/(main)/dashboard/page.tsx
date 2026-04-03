// frontend/app/(main)/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { cookies } from "next/headers";
import StudentDashboard from "@/components/dashboard/StudentDashboard";
import TeacherDashboard from "@/components/dashboard/TeacherDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import SystemAdminDashboard from "@/components/dashboard/SystemAdminDashboard";

interface RoleCookieData {
  role: string;
  organizationId: number | null;
  organizationName: string | null;
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get role from cookie
  const cookieStore = await cookies();
  const roleCookie = cookieStore.get("user_role_data");
  let roleData: RoleCookieData = {
    role: "student",
    organizationId: null,
    organizationName: null,
  };

  if (roleCookie?.value) {
    try {
      roleData = JSON.parse(roleCookie.value);
    } catch (e) {
      console.error("Failed to parse role cookie", e);
    }
  }

  // Render appropriate dashboard based on role
  switch (roleData.role) {
    case "system_admin":
      return <SystemAdminDashboard user={user} />;
    case "org_admin":
      return (
        <AdminDashboard 
          user={user} 
          organizationId={roleData.organizationId}
          organizationName={roleData.organizationName}
        />
      );
    case "teacher":
      return (
        <TeacherDashboard 
          user={user} 
          organizationId={roleData.organizationId}
          organizationName={roleData.organizationName}
        />
      );
    case "student":
    default:
      return (
        <StudentDashboard 
          user={user} 
          organizationId={roleData.organizationId}
          organizationName={roleData.organizationName}
        />
      );
  }
}