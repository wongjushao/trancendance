"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
import { Users, BookOpen, Settings, UserPlus, Crown, Home, Loader2 } from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/components/providers/RoleProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";

interface Member {
  id: number;
  user_id: string;
  name: string;
  avatar: string;
  role: string;
  joinDate: string;
  courses: number;
}

interface Course {
  id: number;
  title: string;
  instructor: string;
  students: number;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrganizationDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const organizationId = parseInt(id);
  const supabase = getSupabaseBrowserClient();
  const { roleData } = useRole();
  const isAdminOfThisOrg = (): boolean => {
    return (roleData.role === 'admin' || roleData.role === 'sub_admin') && 
          roleData.organizationId === organizationId;
  };
  
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState("");
  const [orgLogo, setOrgLogo] = useState("🎓");
  const [orgDescription, setOrgDescription] = useState("");
  const [orgMembersCount, setOrgMembersCount] = useState(0);
  const [orgCoursesCount, setOrgCoursesCount] = useState(0);
  const [userRole, setUserRole] = useState("");
  const [orgCreatedDate, setOrgCreatedDate] = useState("");
  
  const [members, setMembers] = useState<Member[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadOrganizationData();
  }, [organizationId]);

  const loadOrganizationData = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // 1. Get organization details
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", organizationId)
        .single();

      if (orgError) throw orgError;
      if (!org) {
        toast.error("Organization not found");
        return;
      }

      setOrgName(org.name);
      setOrgDescription(org.description || "No description provided");
      setOrgLogo(org.name.charAt(0).toUpperCase());
      setOrgCreatedDate(new Date(org.created_at).toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "short", 
        day: "numeric" 
      }));

      // 2. Check user's role in this organization
      const { data: memberRole } = await supabase
        .from("organization_members")
        .select("member_role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();

      const role = memberRole?.member_role || "Student";
      setUserRole(role.charAt(0).toUpperCase() + role.slice(1));
      setIsAdmin(role === "admin" || role === "sub_admin");

      // 3. Get organization members
      const { data: memberData } = await supabase
        .from("organization_members")
        .select(`
          id,
          user_id,
          member_role,
          created_at,
          user:profiles!organization_members_user_id_fkey (
            id,
            first_name,
            last_name,
            username,
            email,
            avatar_url
          )
        `)
        .eq("organization_id", organizationId)
        .eq("member_role", "active");

      // Get member course counts
      const formattedMembers: Member[] = await Promise.all((memberData || []).map(async (m: any) => {
        let courseCount = 0;
        
        if (m.member_role === "student") {
          const { count } = await supabase
            .from("class_members")
            .select("id", { count: "exact", head: true })
            .eq("user_id", m.user_id);
          courseCount = count || 0;
        } else if (m.member_role === "teacher") {
          const { count } = await supabase
            .from("courses")
            .select("id", { count: "exact", head: true })
            .eq("created_by", m.user_id);
          courseCount = count || 0;
        }
        
        const name = m.user?.first_name 
          ? `${m.user.first_name} ${m.user.last_name || ""}`.trim()
          : m.user?.username || m.user?.email || "Unknown";
        const avatar = m.user?.first_name?.[0] || m.user?.username?.[0] || "U";
        
        return {
          id: m.id,
          user_id: m.user_id,
          name,
          avatar: avatar.toUpperCase(),
          role: m.member_role.charAt(0).toUpperCase() + m.member_role.slice(1),
          joinDate: new Date(m.created_at).toISOString().split("T")[0],
          courses: courseCount,
        };
      }));

      setMembers(formattedMembers);
      setOrgMembersCount(formattedMembers.length);

      // 4. Get organization courses
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("status", "published");

      // Get instructor names and student counts
      const formattedCourses: Course[] = await Promise.all((courseData || []).map(async (c: any) => {
        let instructorName = "Unknown Instructor";
        if (c.created_by) {
          const { data: instructor } = await supabase
            .from("profiles")
            .select("first_name, last_name, username")
            .eq("id", c.created_by)
            .single();
          
          if (instructor) {
            instructorName = instructor.first_name 
              ? `${instructor.first_name} ${instructor.last_name || ""}`.trim()
              : instructor.username || "Instructor";
          }
        }

        // Get student count
        const { data: courseClasses } = await supabase
          .from("course_classes")
          .select("id")
          .eq("course_id", c.id);
        
        const classIds = courseClasses?.map(cc => cc.id) || [];
        let studentCount = 0;
        if (classIds.length > 0) {
          const { count } = await supabase
            .from("class_members")
            .select("id", { count: "exact", head: true })
            .in("course_class_id", classIds);
          studentCount = count || 0;
        }
        
        return {
          id: c.id,
          title: c.title,
          instructor: instructorName,
          students: studentCount,
        };
      }));

      setCourses(formattedCourses);
      setOrgCoursesCount(formattedCourses.length);

    } catch (error) {
      console.error("Error loading organization:", error);
      toast.error("Failed to load organization data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Organization Header */}
      <GlowCard className="bg-white/[0.02]">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-5xl sm:text-6xl shadow-2xl shadow-purple-500/20 shrink-0">
            {orgLogo}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 mb-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
                  {orgName}
                </h1>
                <p className="text-[#A0A0B5] max-w-xl mb-4 leading-relaxed">
                  {orgDescription}
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-sm font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  Your role: {userRole}
                </div>
              </div>
              
              <div className="flex gap-3 shrink-0">
                <GlowButton variant="primary" className="h-11">
                  <UserPlus className="w-4 h-4" />
                  Invite
                </GlowButton>
                <Link href={`/organizations/${organizationId}/admin`}>
                  <GlowButton variant="secondary" className="px-3 h-11">
                    <Settings className="w-4 h-4" />
                  </GlowButton>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </GlowCard>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard icon={Users} label="Total Members" value={orgMembersCount.toLocaleString()} />
        <StatCard icon={BookOpen} label="Active Courses" value={orgCoursesCount.toString()} />
        <StatCard icon={Crown} label="Active Since" value={orgCreatedDate} />
      </div>
      
      {/* Content Tabs */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="bg-[#12121A] border border-white/5 p-1 rounded-2xl mb-8">
          <TabsTrigger 
            value="members" 
            className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all"
          >
            <Users className="w-4 h-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger 
            value="courses" 
            className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Courses
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        {/* Members Tab */}
        <TabsContent value="members" className="outline-none focus:ring-0">
          <GlowCard className="border-white/5">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight">Community</h2>
              <span className="text-sm text-[#6B6B80] bg-white/5 px-3 py-1 rounded-lg">
                {members.length} members
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {members.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No members found</p>
                </div>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-5 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.03] hover:border-white/10 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold group-hover:scale-105 transition-transform">
                        {member.avatar}
                      </div>
                      <div>
                        <p className="text-white font-semibold group-hover:text-purple-400 transition-colors">{member.name}</p>
                        <p className="text-[#6B6B80] text-xs">Joined {member.joinDate}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="hidden sm:block text-right">
                        <p className="text-white text-sm font-medium">{member.courses} courses</p>
                        <p className="text-[#6B6B80] text-xs uppercase tracking-wider">{member.role}</p>
                      </div>
                      <GlowButton variant="ghost" className="text-xs">Profile</GlowButton>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlowCard>
        </TabsContent>
        
        {/* Courses Tab */}
        <TabsContent value="courses" className="outline-none focus:ring-0">
          <GlowCard className="border-white/5">
            <h2 className="text-2xl font-bold text-white mb-8 tracking-tight">Active Curriculum</h2>
            <div className="grid grid-cols-1 gap-4">
              {courses.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No published courses yet</p>
                </div>
              ) : (
                courses.map((course) => (
                  <div key={course.id} className="flex items-center justify-between p-5 bg-white/[0.01] border border-white/5 rounded-2xl hover:border-purple-500/30 transition-all group">
                    <div>
                      <p className="text-lg font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">{course.title}</p>
                      <p className="text-[#6B6B80] text-sm">Lead Instructor: <span className="text-[#A0A0B5]">{course.instructor}</span></p>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="hidden sm:inline-block text-[#6B6B80] text-sm">{course.students} enrolled</span>
                      <Link href={`/courses/${course.id}`}>
                        <GlowButton variant="outline" className="text-xs">Course Details</GlowButton>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlowCard>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="outline-none focus:ring-0">
          <GlowCard className="border-white/5">
            <h2 className="text-2xl font-bold text-white mb-8 tracking-tight">Organization Identity</h2>
            <div className="space-y-6 max-w-2xl">
              
              {isAdminOfThisOrg() ? (
                // Editable version for admins of this org
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#A0A0B5] ml-1">Official Name</label>
                    <input
                      type="text"
                      defaultValue={orgName}
                      className="w-full px-5 py-3.5 bg-[#12121A] border border-white/10 rounded-2xl text-white focus:border-purple-500/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#A0A0B5] ml-1">About the Institution</label>
                    <textarea
                      defaultValue={orgDescription}
                      rows={4}
                      className="w-full px-5 py-3.5 bg-[#12121A] border border-white/10 rounded-2xl text-white focus:border-purple-500/50 outline-none transition-all resize-none"
                    />
                  </div>
                  <div className="pt-4 flex gap-4">
                    <GlowButton variant="primary">Save Identity</GlowButton>
                  </div>
                </>
              ) : (
                // Read-only version for non-admins
                <>
                  <div>
                    <label className="text-sm font-medium text-[#A0A0B5] block mb-1">Organization Name</label>
                    <p className="text-white px-5 py-3.5 bg-[#12121A] border border-white/5 rounded-2xl">{orgName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#A0A0B5] block mb-1">Description</label>
                    <p className="text-gray-400 px-5 py-3.5 bg-[#12121A] border border-white/5 rounded-2xl whitespace-pre-wrap">
                      {orgDescription}
                    </p>
                  </div>
                  <div className="pt-4 text-sm text-gray-500">
                    Only organization admins can edit these settings.
                  </div>
                </>
              )}
              
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}