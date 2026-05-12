// frontend/app/(main)/organizations/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Users, Plus, TrendingUp, Loader2, LogIn, Eye } from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { motion } from "framer-motion";
import { useRole } from "@/components/providers/RoleProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";

interface Organization {
  id: number;
  name: string;
  description: string | null;
  slug: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
  course_count?: number;
  user_role?: "admin" | "sub_admin" | "teacher" | "student";
  is_member?: boolean;
}

/** Lower sorts earlier: admin orgs surface before teacher/student memberships. */
function membershipSortPriority(role?: Organization["user_role"]): number {
  switch (role) {
    case "admin":
    case "sub_admin":
      return 0;
    case "teacher":
      return 1;
    case "student":
      return 2;
    default:
      return 3;
  }
}

function compareOrganizationsForMemberList(a: Organization, b: Organization): number {
  const pa = membershipSortPriority(a.user_role);
  const pb = membershipSortPriority(b.user_role);
  if (pa !== pb) return pa - pb;
  return a.name.localeCompare(b.name);
}

export default function OrganizationsPage() {
  const router = useRouter();
  const { roleData } = useRole();
  const supabase = getSupabaseBrowserClient();
  
  const [myOrganizations, setMyOrganizations] = useState<Organization[]>([]);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinRequestLoading, setJoinRequestLoading] = useState<number | null>(null);
  
  const isTeacherOrAdmin = roleData.role === "teacher" || roleData.role === "admin";
  const teachingOrgId = isTeacherOrAdmin ? roleData.organizationId : null;

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // 1. Get all organizations the user is a member of
      const { data: memberships, error: membershipsError } = await supabase
        .from("organization_members")
        .select(`
          organization_id,
          member_role,
          organizations:organization_id (
            id,
            name,
            description,
            slug,
            created_by,
            created_at
          )
        `)
        .eq("user_id", user.id)
        .not("member_role", "eq", "pending");

      if (membershipsError) throw membershipsError;

      const myOrgIds: number[] = [];
      const myOrgsWithDetails: Organization[] = [];

      if (memberships && memberships.length > 0) {
        const myOrgIdsList = memberships.map(m => m.organization_id);
        myOrgIds.push(...myOrgIdsList);

        // Get member counts for my organizations
        const { data: memberCounts } = await supabase
          .from("organization_members")
          .select("organization_id", { count: "exact" })
          .in("organization_id", myOrgIdsList);

        // Get course counts for my organizations
        const { data: courseCounts } = await supabase
          .from("courses")
          .select("organization_id", { count: "exact" })
          .in("organization_id", myOrgIdsList);

        const memberCountMap = new Map<number, number>();
        memberCounts?.forEach(cm => {
          memberCountMap.set(cm.organization_id, (memberCountMap.get(cm.organization_id) || 0) + 1);
        });

        const courseCountMap = new Map<number, number>();
        courseCounts?.forEach(course => {
          courseCountMap.set(course.organization_id, (courseCountMap.get(course.organization_id) || 0) + 1);
        });

        myOrgsWithDetails.push(...memberships.map(m => ({
          ...m.organizations,
          member_count: memberCountMap.get(m.organization_id) || 0,
          course_count: courseCountMap.get(m.organization_id) || 0,
          user_role: m.member_role as Organization["user_role"],
          is_member: true,
        })));

        myOrgsWithDetails.sort(compareOrganizationsForMemberList);
      }

      setMyOrganizations(myOrgsWithDetails);

      // 2. Get ALL organizations (for discovery)
      const { data: allOrgs, error: allOrgsError } = await supabase
        .from("organizations")
        .select("*")
        .order("name", { ascending: true });

      if (allOrgsError) throw allOrgsError;

      // 3. Get member counts and course counts for all organizations
      if (allOrgs && allOrgs.length > 0) {
        const allOrgIds = allOrgs.map(org => org.id);
        
        const { data: memberCounts } = await supabase
          .from("organization_members")
          .select("organization_id", { count: "exact" })
          .in("organization_id", allOrgIds);

        const { data: courseCounts } = await supabase
          .from("courses")
          .select("organization_id", { count: "exact" })
          .in("organization_id", allOrgIds);

        const memberCountMap = new Map<number, number>();
        memberCounts?.forEach(cm => {
          memberCountMap.set(cm.organization_id, (memberCountMap.get(cm.organization_id) || 0) + 1);
        });

        const courseCountMap = new Map<number, number>();
        courseCounts?.forEach(course => {
          courseCountMap.set(course.organization_id, (courseCountMap.get(course.organization_id) || 0) + 1);
        });

        const orgsWithDetails: Organization[] = allOrgs.map(org => ({
          ...org,
          member_count: memberCountMap.get(org.id) || 0,
          course_count: courseCountMap.get(org.id) || 0,
          is_member: myOrgIds.includes(org.id),
          user_role: myOrgIds.includes(org.id) 
            ? memberships?.find(m => m.organization_id === org.id)?.member_role as Organization["user_role"]
            : undefined,
        }));

        setAllOrganizations(orgsWithDetails);
      } else {
        setAllOrganizations([]);
      }

    } catch (error) {
      console.error("Error loading organizations:", error);
      toast.error("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestToJoin = async (orgId: number, orgName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please login to request to join");
      router.push("/login");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      toast.error("Please login again to continue");
      router.push("/login");
      return;
    }

    setJoinRequestLoading(orgId);

    try {
      const response = await fetch(`/api/org-service/organizations/${orgId}/join-request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        toast.error("Please login to request to join");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const message = typeof payload?.error === "string" ? payload.error : "Failed to send join request";
        throw new Error(message);
      }

      const status = payload?.status as string | undefined;
      if (status === "already_pending") {
        toast.info(`You already have a pending request to join ${orgName}`);
      } else if (status === "already_member") {
        toast.info(`You are already a member of ${orgName}`);
      } else {
        toast.success(
          `Join request sent to ${orgName}! The organization admin will review your request.`,
        );
      }
      await loadOrganizations();
    } catch (error) {
      console.error("Error requesting to join:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send join request. Please try again.",
      );
    } finally {
      setJoinRequestLoading(null);
    }
  };

  const handleViewOrganization = (orgId: number) => {
    router.push(`/organizations/${orgId}`);
  };

  const getRoleDisplay = (role?: string) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "sub_admin":
        return "Sub-Admin";
      case "teacher":
        return "Teacher";
      case "pending":
        return "Request Pending";
      default:
        return "Member";
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case "admin":
        return "text-purple-400 bg-purple-500/20 border-purple-500/30";
      case "sub_admin":
        return "text-indigo-400 bg-indigo-500/20 border-indigo-500/30";
      case "teacher":
        return "text-blue-400 bg-blue-500/20 border-blue-500/30";
      case "pending":
        return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
      default:
        return "text-green-400 bg-green-500/20 border-green-500/30";
    }
  };

  const totalMembers = myOrganizations.reduce((acc, org) => acc + (org.member_count || 0), 0);
  const totalCourses = myOrganizations.reduce((acc, org) => acc + (org.course_count || 0), 0);
  const discoverableOrgs = allOrganizations.filter(org => !org.is_member);

  const hasAdminOrTeacherRoleInAnyOrg = myOrganizations.some(
    org => org.user_role === "admin" || org.user_role === "teacher"
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Organizations</h1>
          <p className="text-[#A0A0B5] text-lg">Manage your learning communities and discover new ones</p>
        </motion.div>
        {/* Create Organization Button - Show only if NOT admin/teacher in any org */}
          {!hasAdminOrTeacherRoleInAnyOrg && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <GlowButton onClick={() => router.push('/organizations/propose')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Organization
              </GlowButton>
            </motion.div>
          )}
      </div>

      {/* MY ORGANIZATIONS SECTION */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">My Organizations</h2>
            <p className="text-[#A0A0B5] text-sm mt-1">Organizations you are a member of</p>
          </div>
        </div>

        {myOrganizations.length === 0 ? (
          <GlowCard>
            <div className="p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Organizations Yet</h3>
              <p className="text-gray-400 mb-4 max-w-md mx-auto">
                You haven't joined any organizations yet. Discover organizations below or create your own!
              </p>
            </div>
          </GlowCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myOrganizations.map((org, index) => {
              const isTeachingOrg = isTeacherOrAdmin && teachingOrgId === org.id;
              
              return (
                <motion.div
                  key={org.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/organizations/${org.id}`} className="block h-full">
                    <GlowCard className={`h-full transition-all duration-300 group relative overflow-hidden ${
                      isTeachingOrg 
                        ? 'ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent' 
                        : 'hover:border-purple-500/50'
                    }`}>
                      
                      {isTeachingOrg && (
                        <div className="absolute top-3 right-3 z-20">
                          <span className="px-2 py-1 bg-gradient-to-r from-purple-600 to-purple-500 rounded-md text-xs text-white font-medium shadow-lg">
                            {roleData.role === "admin" ? "Your Organization" : "Your Teaching Organization"}
                          </span>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="relative z-10">
                        <div className="text-center mb-6">
                          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-purple-500/20 text-4xl group-hover:scale-110 transition-transform duration-500">
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                          <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                            {org.name}
                          </h3>
                          <p className="text-[#A0A0B5] text-sm leading-relaxed mb-5 min-h-[40px]">
                            {org.description || "No description provided"}
                          </p>
                          
                          <div className={`inline-flex items-center px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${getRoleColor(org.user_role)}`}>
                            {getRoleDisplay(org.user_role)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5 mt-auto">
                          <div className="text-center">
                            <p className="text-xl font-bold text-white">{org.member_count?.toLocaleString() || 0}</p>
                            <p className="text-[#6B6B80] text-xs uppercase font-medium">Members</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold text-white">{org.course_count || 0}</p>
                            <p className="text-[#6B6B80] text-xs uppercase font-medium">Courses</p>
                          </div>
                        </div>
                      </div>
                    </GlowCard>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* DISCOVER ORGANIZATIONS SECTION */}
      {discoverableOrgs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Discover Organizations</h2>
              <p className="text-[#A0A0B5] text-sm mt-1">Join other organizations to access more courses</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {discoverableOrgs.map((org, index) => (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlowCard className="h-full transition-all duration-300 group hover:border-purple-500/50">
                  <div className="relative z-10">
                    <div className="text-center mb-6">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center mx-auto mb-5 shadow-xl text-4xl group-hover:scale-110 transition-transform duration-500 group-hover:from-purple-500 group-hover:to-violet-600">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                        {org.name}
                      </h3>
                      <p className="text-[#A0A0B5] text-sm leading-relaxed mb-5 min-h-[40px]">
                        {org.description || "No description provided"}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5 mb-6">
                      <div className="text-center">
                        <p className="text-xl font-bold text-white">{org.member_count?.toLocaleString() || 0}</p>
                        <p className="text-[#6B6B80] text-xs uppercase font-medium">Members</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-white">{org.course_count || 0}</p>
                        <p className="text-[#6B6B80] text-xs uppercase font-medium">Courses</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <GlowButton 
                        variant="outline" 
                        size="sm"
                        fullWidth
                        onClick={() => handleViewOrganization(org.id)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </GlowButton>
                      <GlowButton 
                        variant="primary" 
                        size="sm"
                        fullWidth
                        onClick={() => handleRequestToJoin(org.id, org.name)}
                        isLoading={joinRequestLoading === org.id}
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        Request to Join
                      </GlowButton>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}