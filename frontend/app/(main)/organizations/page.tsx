// frontend/app/(main)/organizations/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Users, Plus, TrendingUp, Home, Loader2 } from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { motion } from "framer-motion";
import { useRole } from "@/components/providers/RoleProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

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
}

export default function OrganizationsPage() {
  const router = useRouter();
  const { roleData } = useRole();
  const supabase = getSupabaseBrowserClient();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  
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
      // Get all organizations the user is a member of
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
        .eq("user_id", user.id);

      if (membershipsError) throw membershipsError;

      if (!memberships || memberships.length === 0) {
        setOrganizations([]);
        setLoading(false);
        return;
      }

      // Get organization IDs
      const orgIds = memberships.map(m => m.organization_id);

      // Get member counts for each organization
      const { data: memberCounts } = await supabase
        .from("organization_members")
        .select("organization_id", { count: "exact" })
        .in("organization_id", orgIds);

      // Get course counts for each organization
      const { data: courseCounts } = await supabase
        .from("courses")
        .select("organization_id", { count: "exact" })
        .in("organization_id", orgIds);

      // Count members per organization
      const memberCountMap = new Map<number, number>();
      memberCounts?.forEach(cm => {
        memberCountMap.set(cm.organization_id, (memberCountMap.get(cm.organization_id) || 0) + 1);
      });

      // Count courses per organization
      const courseCountMap = new Map<number, number>();
      courseCounts?.forEach(course => {
        courseCountMap.set(course.organization_id, (courseCountMap.get(course.organization_id) || 0) + 1);
      });

      // Build organization list with user's role
      const orgsWithDetails: Organization[] = memberships.map(m => ({
        ...m.organizations,
        member_count: memberCountMap.get(m.organization_id) || 0,
        course_count: courseCountMap.get(m.organization_id) || 0,
        user_role: m.member_role as Organization["user_role"],
      }));

      setOrganizations(orgsWithDetails);

    } catch (error) {
      console.error("Error loading organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = () => {
    router.push('/organizations/propose');
  };

  const getRoleDisplay = (role?: string) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "sub_admin":
        return "Sub-Admin";
      case "teacher":
        return "Teacher";
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
      default:
        return "text-green-400 bg-green-500/20 border-green-500/30";
    }
  };

  const totalMembers = organizations.reduce((acc, org) => acc + (org.member_count || 0), 0);
  const totalCourses = organizations.reduce((acc, org) => acc + (org.course_count || 0), 0);

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
          <p className="text-[#A0A0B5] text-lg">Manage your learning communities and institutional roles</p>
        </motion.div>
        
        <GlowButton 
          variant="primary" 
          className="shadow-lg shadow-purple-500/20"
          onClick={handleCreateOrganization}
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Organization
        </GlowButton>
      </div>
      
      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={Building2}
          label="Your Organizations"
          value={organizations.length.toString()}
        />
        <StatCard
          icon={Users}
          label="Community Size"
          value={totalMembers.toLocaleString()}
        />
        <StatCard
          icon={TrendingUp}
          label="Total Courses"
          value={totalCourses.toString()}
        />
      </div>
      
      {/* Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {organizations.length === 0 ? (
          <div className="col-span-full">
            <GlowCard>
              <div className="p-12 text-center">
                <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Organizations Yet</h3>
                <p className="text-gray-400 mb-6">
                  You haven't joined any organizations yet. Create one or accept an invitation.
                </p>
                <GlowButton onClick={handleCreateOrganization}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Organization
                </GlowButton>
              </div>
            </GlowCard>
          </div>
        ) : (
          organizations.map((org, index) => {
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
                    
                    {/* Badge for teaching/admin organization */}
                    {isTeachingOrg && (
                      <div className="absolute top-3 right-3 z-20">
                        <span className="px-2 py-1 bg-gradient-to-r from-purple-600 to-purple-500 rounded-md text-xs text-white font-medium shadow-lg">
                          {roleData.role === "admin" ? "Your Organization" : "Your Teaching Organization"}
                        </span>
                      </div>
                    )}
                    
                    {/* Subtle Hover Gradient */}
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
          })
        )}
        
        {/* Create New Organization Card - Only show if user is admin of at least one org or always? */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: organizations.length * 0.1 }}
          onClick={handleCreateOrganization}
        >
          <div className="cursor-pointer h-full">
            <GlowCard className="h-full border-2 border-dashed border-white/10 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-[#12121A] flex items-center justify-center mb-5 group-hover:bg-purple-500/20 group-hover:rotate-90 transition-all duration-500">
                <Plus className="w-8 h-8 text-[#6B6B80] group-hover:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Create Organization</h3>
              <p className="text-[#A0A0B5] text-sm max-w-[200px] text-center">
                Start a new organization for your institution or company
              </p>
            </GlowCard>
          </div>
        </motion.div>
      </div>
    </div>
  );
}