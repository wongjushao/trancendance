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

  if (!user) redirect("/");

  // Get role from cookie
  const cookieStore = await cookies();
  const roleCookie = cookieStore.get('user_role_data');
  
  let userRole = 'student';
  let organizationId = null;
  let organizationName = null;
  
  if (roleCookie) {
    try {
      const roleData: RoleCookieData = JSON.parse(roleCookie.value);
      userRole = roleData.role;
      organizationId = roleData.organizationId;
      organizationName = roleData.organizationName;
    } catch (error) {
      console.error('Error parsing role cookie:', error);
    }
  }

  // Render appropriate dashboard based on role
  if (userRole === 'teacher') {
    return <TeacherDashboard user={user} organizationId={organizationId} organizationName={organizationName} />;
  }
  
  if (userRole === 'org_admin') {
    return <AdminDashboard user={user} organizationId={organizationId} organizationName={organizationName} />;
  }
  
  if (userRole === 'system_admin') {
    return <SystemAdminDashboard user={user} organizationId={organizationId} organizationName={organizationName} />;
  }
  
  // Default to student dashboard
  return <StudentDashboard user={user} organizationId={organizationId} organizationName={organizationName} />;
}