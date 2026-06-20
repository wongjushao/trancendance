// frontend/app/(main)/organizations/[id]/page.tsx
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
import { Label } from "@/components/ui/label";

interface Member {
  id: number;
  user_id: string;
  name: string;
  avatar: string;
  role: string;
  joinDate: string;
  courses: number;
  avatar_url?: string;
  email?: string;
}

interface Course {
  id: number;
  title: string;
  instructor: string;
  students: number;
  thumbnail?: string;
  level?: string;
  rating?: number;
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

// Helper to get auth token
const getAuthToken = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

export default function OrganizationPublicPage({ params }: PageProps) {
  const { id } = use(params);
  const organizationId = parseInt(id);
  const { roleData } = useRole();

  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [memberEmails, setMemberEmails] = useState<Record<string, string>>({});
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

    try {
      const token = await getAuthToken();

      // Get current user from backend API (optional - don't fail if not logged in)
      let currentUserId = null;
      if (token) {
        try {
          const userResponse = await fetch('/api/auth-service/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            currentUserId = userData.id;
            setCurrentUserId(currentUserId);
          }
        } catch (err) {
          console.log("User not logged in or token invalid - continuing with public view");
        }
      }

      // 1. Get organization details (always public)
      const orgResponse = await fetch(`/api/org-service/orgs/${organizationId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      const org = await orgResponse.json();

        if (org.exists === false) {
          return;
        }

      if (!orgResponse.ok) {
        toast.error("Organization not found");
        return;
      }

      setOrganization(org);

      // 2. Get user's role in this organization (only if logged in)
      if (token && currentUserId) {
        try {
          const roleResponse = await fetch(`/api/org-service/orgs/${organizationId}/members/${currentUserId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (roleResponse.ok) {
            const memberData = await roleResponse.json();
            setUserRole(memberData.member_role);
          }
        } catch (err) {
          console.log("User not a member of this organization - showing public view");
        }
      }

      // 3. Get organization members (now public - uses your fixed backend)
      const membersResponse = await fetch(`/api/org-service/orgs/${organizationId}/members?limit=12`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (membersResponse.ok) {
        const membersData = await membersResponse.json();

        // Collect user IDs to fetch emails (only if logged in and member)
        const userIds = membersData.members?.map((m: any) => m.user_id) || [];
        let emailsMap: Record<string, string> = {};
        if (userIds.length > 0 && token && userRole) {
          // Only fetch emails if user is a member of this org
          await fetchMemberEmails(userIds, token);
          emailsMap = memberEmails;
        }

        const formattedMembers: Member[] = (membersData.members || []).map((m: any) => {
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
            joinDate: m.created_at ? new Date(m.created_at).toISOString().split("T")[0] : "Unknown",
            courses: 0,
            email: (userRole && emailsMap[m.user_id]) || "", // Only show email if user is member
          };
        });

        setMembers(formattedMembers);
        setStats(prev => ({ ...prev, totalMembers: formattedMembers.length }));
      }

      // 4. Get published courses - NOW WORKS WITHOUT AUTH
      const coursesResponse = await fetch(`/api/org-service/courses?organization_id=${organizationId}&status=published&limit=6`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();

        // Get detailed info for each course (this requires auth but fails gracefully)
        const formattedCourses: Course[] = await Promise.all(
          (coursesData.courses || []).map(async (course: any) => {
            let studentCount = 0;
            let avgRating = 0;

            // Try to get detailed info, but don't fail if not authenticated
            if (token) {
              try {
                const detailResponse = await fetch(`/api/org-service/courses/${course.id}/detail`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                if (detailResponse.ok) {
                  const detail = await detailResponse.json();
                  studentCount = detail.course?.students_count || 0;
                  avgRating = detail.course?.rating || 0;
                }
              } catch (err) {
                console.log(`Could not fetch details for course ${course.id} - showing limited info`);
              }
            }

            return {
              id: course.id,
              title: course.title,
              instructor: course.instructor_name || "Instructor",
              students: studentCount,
              thumbnail: course.thumbnail,
              level: course.level,
              rating: avgRating,
            };
          })
        );

        setCourses(formattedCourses);

        // Calculate stats from courses data
        const totalStudents = formattedCourses.reduce((sum, c) => sum + c.students, 0);
        const avgRating = formattedCourses.length > 0
          ? formattedCourses.reduce((sum, c) => sum + (c.rating || 0), 0) / formattedCourses.length
          : 0;

        setStats(prev => ({
          ...prev,
          totalCourses: formattedCourses.length,
          totalStudents,
          avgRating,
        }));
      }

    } catch (error) {
      console.error("Error loading organization:", error);
      toast.error("Failed to load organization data");
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberEmails = async (userIds: string[], token: string) => {
    if (userIds.length === 0) return;

    try {
      const response = await fetch('/api/org-service/users/batch-emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_ids: userIds }),
      });

      if (response.ok) {
        const data = await response.json();
        setMemberEmails(data.users || {});
      }
    } catch (error) {
      console.error("Error fetching emails:", error);
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
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-gray-400">{course.rating?.toFixed(1) || "0.0"}</span>
                            <span className="text-gray-500">• {course.students} students</span>
                          </div>
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
