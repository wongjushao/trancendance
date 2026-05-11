// app/(main)/courses/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlowCard } from "@/components/lms/Cards";
import CourseBasicForm from "@/components/course/CourseBasicForm";
import { useRole } from "@/components/providers/RoleProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

// Helper to get auth token
const getAuthToken = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

// Interface for organization data
interface TeachingOrganization {
  id: number;
  name: string;
  role: string;
  is_setup_complete?: boolean;
}

export default function CreateCoursePage() {
  const router = useRouter();
  const { roleData, refreshRole } = useRole();
  const [isCheckingOrg, setIsCheckingOrg] = useState(true);
  const [organization, setOrganization] = useState<TeachingOrganization | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkOrganization = async () => {
      console.log('[CreateCourse] Checking organization access...');
      
      try {
        const token = await getAuthToken();
        if (!token) {
          setError("Please log in to create courses.");
          setIsCheckingOrg(false);
          return;
        }

        // Step 1: Get user's role from backend
        const roleResponse = await fetch('/api/org-service/users/me/role', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!roleResponse.ok) {
          throw new Error('Failed to fetch user role');
        }

        const roleDataFromBackend = await roleResponse.json();
        console.log('[CreateCourse] Role from backend:', roleDataFromBackend);

        // Step 2: Check if user has teacher or admin role
        const canCreateCourse = roleDataFromBackend.role === 'teacher' || 
                                roleDataFromBackend.role === 'admin';
        
        if (!canCreateCourse) {
          setError("You need to be a teacher or admin to create courses.");
          setIsCheckingOrg(false);
          return;
        }

        // Step 3: Get the organization where user is teacher/admin
        // Teachers/Admins belong to exactly ONE organization
        const orgId = roleDataFromBackend.organization_id;
        const orgName = roleDataFromBackend.organization_name;

        if (!orgId) {
          setError("No organization found. Please contact an administrator.");
          setIsCheckingOrg(false);
          return;
        }

        // Step 4: Verify the organization has completed setup
        const setupResponse = await fetch(`/api/org-service/orgs/${orgId}/setup-status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (setupResponse.ok) {
          const setupData = await setupResponse.json();
          if (!setupData.is_setup_complete) {
            setError(`Organization "${orgName}" has not completed setup. Please complete organization setup first.`);
            setIsCheckingOrg(false);
            return;
          }
        }

        // Step 5: Set the organization for course creation
        setOrganization({
          id: orgId,
          name: orgName || "Organization",
          role: roleDataFromBackend.role,
          is_setup_complete: true
        });
        
        // Sync roleData if needed
        if (roleData.organizationId !== orgId) {
          await refreshRole();
        }
        
      } catch (error) {
        console.error("Error checking organization:", error);
        setError("Failed to verify organization access. Please try again.");
      } finally {
        setIsCheckingOrg(false);
      }
    };

    checkOrganization();
  }, [roleData, refreshRole]);

  // Loading state
  if (isCheckingOrg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Verifying your permissions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black flex items-center justify-center p-4">
        <GlowCard className="max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Cannot Create Course</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2.5 rounded-lg font-medium bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors"
            >
              Go to Dashboard
            </button>
            {roleData.role !== 'teacher' && roleData.role !== 'admin' && (
              <button
                onClick={() => router.push('/organizations')}
                className="px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-purple-600 to-purple-500 text-white transition-colors hover:from-purple-500 hover:to-purple-400"
              >
                View Organizations
              </button>
            )}
          </div>
        </GlowCard>
      </div>
    );
  }

  // No organization found
  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black flex items-center justify-center p-4">
        <GlowCard className="max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">No Organization Found</h1>
          <p className="text-gray-400 mb-6">
            You're not associated with any organization. Please contact an administrator.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2.5 rounded-lg font-medium bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </GlowCard>
      </div>
    );
  }

  // Success state - show course creation form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Create New Course</h1>
          <p className="text-gray-400 mt-1">Fill in the basic details below to create your course</p>
          <div className="mt-3 flex items-center gap-2 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <Building2 className="w-4 h-4 text-purple-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-400">Teaching Organization</p>
              <p className="text-white font-medium">{organization.name}</p>
            </div>
            {organization.role && (
              <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 capitalize">
                {organization.role}
              </span>
            )}
          </div>
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