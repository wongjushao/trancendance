// frontend/app/(main)/courses/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import CourseBasicForm from "@/components/course/CourseBasicForm";
import { useRole } from "@/components/providers/RoleProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export default function CreateCoursePage() {
  const router = useRouter();
  const { roleData } = useRole();
  const [isCheckingOrg, setIsCheckingOrg] = useState(true);
  const [organization, setOrganization] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    const checkOrganization = async () => {
      // First check roleData from context
      if (roleData.organizationId) {
        setOrganization({
          id: roleData.organizationId,
          name: roleData.organizationName || "Organization"
        });
        setIsCheckingOrg(false);
        return;
      }

      // If no org in roleData, check directly from backend
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Check user's organizations where they have teacher/admin role
          const { data: memberships } = await supabase
            .from('organization_members')
            .select('organization_id, organizations(id, name)')
            .eq('user_id', user.id)
            .in('member_role', ['admin', 'sub_admin', 'teacher']);
          
          if (memberships && memberships.length > 0) {
            setOrganization({
              id: memberships[0].organization_id,
              name: memberships[0].organizations?.name || "Organization"
            });
            setIsCheckingOrg(false);
            return;
          }
        }
      } catch (error) {
        console.error("Error checking organization:", error);
      }
      
      setIsCheckingOrg(false);
    };

    checkOrganization();
  }, [roleData]);

  if (isCheckingOrg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Checking organization access...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black flex items-center justify-center p-4">
        <GlowCard className="max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">No Organization Access</h1>
          <p className="text-gray-400 mb-6">
            You need to be part of an organization to create courses. 
            Please contact an administrator to be added to an organization.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2.5 rounded-lg font-medium bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => router.push('/organizations/propose')}
              className="px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-purple-600 to-purple-500 text-white"
            >
              Request Organization
            </button>
          </div>
        </GlowCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Create New Course</h1>
          <p className="text-gray-400 mt-1">Fill in the basic details below to create your course</p>
        </div>
        
        <GlowCard className="p-6">
          <CourseBasicForm 
            mode="create" 
            organizationId={organization.id}
            organizationName={organization.name}
          />
        </GlowCard>
      </div>
    </div>
  );
}