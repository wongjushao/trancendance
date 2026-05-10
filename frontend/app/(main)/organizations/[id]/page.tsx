"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
import { Users, BookOpen, Crown, Loader2, Calendar, Award, TrendingUp, MapPin, Mail, Globe, UserPlus, Star, X } from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/components/providers/RoleProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label"; // ADD THIS

// Remove the Star function at the end - we're importing it now

interface Member {
  id: number;
  user_id: string;
  name: string;
  avatar: string;
  role: string;
  joinDate: string;
  courses: number;
  avatar_url?: string;
}

interface Course {
  id: number;
  title: string;
  instructor: string;
  students: number;
  thumbnail?: string;
  level?: string;
}

interface OrganizationData {
  id: number;
  name: string;
  description: string | null;
  slug: string | null;
  created_by: string;
  created_at: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrganizationPublicPage({ params }: PageProps) {
  const { id } = use(params);
  const organizationId = parseInt(id);
  const supabase = getSupabaseBrowserClient();
  const { roleData } = useRole();
  
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalCourses: 0,
    totalStudents: 0,
    avgRating: 0,
  });

  useEffect(() => {
    loadOrganizationData();
  }, [organizationId]);

  const loadOrganizationData = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }

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

      setOrganization(org);

      // 2. Get user's role in this organization (if logged in)
      if (user) {
        const { data: memberRole } = await supabase
          .from("organization_members")
          .select("member_role")
          .eq("organization_id", organizationId)
          .eq("user_id", user.id)
          .single();

        setUserRole(memberRole?.member_role || null);
      }

      // 3. Get organization members (limit to recent for public view)
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
            avatar_url
          )
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(12);

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
          : m.user?.username || "Member";
        const avatarInitial = m.user?.first_name?.[0] || m.user?.username?.[0] || "U";
        
        return {
          id: m.id,
          user_id: m.user_id,
          name,
          avatar: avatarInitial.toUpperCase(),
          avatar_url: m.user?.avatar_url,
          role: m.member_role,
          joinDate: new Date(m.created_at).toISOString().split("T")[0],
          courses: courseCount,
        };
      }));

      setMembers(formattedMembers);

      // 4. Get published courses
      const { data: courseData } = await supabase
        .from("courses")
        .select(`
          *,
          profiles:created_by (
            first_name,
            last_name,
            username
          )
        `)
        .eq("organization_id", organizationId)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(6);

      // Get instructor names and student counts
      const formattedCourses: Course[] = await Promise.all((courseData || []).map(async (c: any) => {
        const instructorName = c.profiles?.first_name 
          ? `${c.profiles.first_name} ${c.profiles.last_name || ""}`.trim()
          : c.profiles?.username || "Instructor";

        // Get student count through course_classes
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

        // Get average rating
        const { data: reviews } = await supabase
          .from("course_reviews")
          .select("rating")
          .eq("course_id", c.id);
        
        const avgRating = reviews?.length 
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
          : 0;

        return {
          id: c.id,
          title: c.title,
          instructor: instructorName,
          students: studentCount,
          thumbnail: c.thumbnail,
          level: c.level,
        };
      }));

      setCourses(formattedCourses);

      // 5. Calculate stats
      const totalMembers = formattedMembers.length;
      const totalCoursesCount = formattedCourses.length;
      
      // Get total students across all courses
      const totalStudents = formattedCourses.reduce((sum, c) => sum + c.students, 0);
      
      // Get average rating across courses
      let totalRating = 0;
      let ratingCount = 0;
      for (const course of courseData || []) {
        const { data: reviews } = await supabase
          .from("course_reviews")
          .select("rating")
          .eq("course_id", course.id);
        if (reviews && reviews.length > 0) {
          totalRating += reviews.reduce((sum, r) => sum + r.rating, 0);
          ratingCount += reviews.length;
        }
      }
      const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

      setStats({
        totalMembers,
        totalCourses: totalCoursesCount,
        totalStudents,
        avgRating,
      });

    } catch (error) {
      console.error("Error loading organization:", error);
      toast.error("Failed to load organization data");
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-500/20 text-purple-400">Admin</Badge>;
      case "sub_admin":
        return <Badge className="bg-indigo-500/20 text-indigo-400">Sub-Admin</Badge>;
      case "teacher":
        return <Badge className="bg-blue-500/20 text-blue-400">Teacher</Badge>;
      default:
        return <Badge variant="secondary">Member</Badge>;
    }
  };

  const isAdmin = userRole === "admin" || userRole === "sub_admin";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-white mb-2">Organization Not Found</h1>
        <Link href="/organizations" className="text-purple-400 hover:text-purple-300">
          Back to Organizations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Organization Header */}
      <GlowCard className="bg-white/[0.02]">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-5xl sm:text-6xl shadow-2xl shadow-purple-500/20 shrink-0">
            {organization.name.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 mb-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
                  {organization.name}
                </h1>
                <p className="text-[#A0A0B5] max-w-xl mb-4 leading-relaxed">
                  {organization.description || "No description provided"}
                </p>
                {userRole && (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-sm font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    Your role: {userRole}
                  </div>
                )}
              </div>
              
              {isAdmin && (
                <Link href={`/organizations/${organization.id}/admin`}>
                  <GlowButton variant="secondary" className="px-4 h-11">
                    <Crown className="w-4 h-4 mr-2" />
                    Admin Settings
                  </GlowButton>
                </Link>
              )}

            </div>
          </div>
        </div>
      </GlowCard>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Total Members" value={stats.totalMembers.toLocaleString()} />
        <StatCard icon={BookOpen} label="Active Courses" value={stats.totalCourses.toString()} />
        <StatCard icon={Award} label="Total Students" value={stats.totalStudents.toLocaleString()} />
        <StatCard icon={Star} label="Avg. Rating" value={stats.avgRating.toFixed(1)} />
      </div>
      
      {/* Content Tabs */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="bg-[#12121A] border border-white/5 p-1 rounded-2xl mb-8">
          <TabsTrigger 
            value="members" 
            className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all"
          >
            <Users className="w-4 h-4 mr-2" />
            Members ({stats.totalMembers})
          </TabsTrigger>
          <TabsTrigger 
            value="courses" 
            className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Courses ({stats.totalCourses})
          </TabsTrigger>
        </TabsList>
        
        {/* Members Tab - Read-only view */}
        <TabsContent value="members" className="outline-none focus:ring-0">
          <GlowCard className="border-white/5">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight">Community Members</h2>
              <span className="text-sm text-[#6B6B80] bg-white/5 px-3 py-1 rounded-lg">
                {members.length} members
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No members yet</p>
                </div>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="flex items-center gap-4 p-4 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.03] transition-all group">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={member.avatar_url || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-600 text-white font-bold">
                        {member.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold group-hover:text-purple-400 transition-colors truncate">
                        {member.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {getRoleBadge(member.role)}
                        <span className="text-xs text-[#6B6B80]">{member.courses} courses</span>
                      </div>
                      <p className="text-xs text-[#6B6B80] mt-1">Joined {member.joinDate}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlowCard>
        </TabsContent>
        
        {/* Courses Tab - Read-only view */}
        <TabsContent value="courses" className="outline-none focus:ring-0">
          <GlowCard className="border-white/5">
            <h2 className="text-2xl font-bold text-white mb-8 tracking-tight">Available Courses</h2>
            {courses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No published courses yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <Link key={course.id} href={`/courses/${course.id}`} className="group">
                    <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all hover:scale-[1.02]">
                      <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-violet-600/20 flex items-center justify-center">
                        {course.thumbnail ? (
                          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                          <BookOpen className="w-12 h-12 text-gray-500" />
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors line-clamp-1">
                          {course.title}
                        </h3>
                        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{course.instructor}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">{course.students} students</span>
                          {course.level && (
                            <Badge variant="secondary" className="text-xs">
                              {course.level}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {courses.length === 6 && (
              <div className="mt-6 text-center">
                <Link href={`/organizations/${organization.id}/courses`}>
                  <GlowButton variant="outline">View All Courses →</GlowButton>
                </Link>
              </div>
            )}
          </GlowCard>
        </TabsContent>
      </Tabs>

 
    </div>
  );
}