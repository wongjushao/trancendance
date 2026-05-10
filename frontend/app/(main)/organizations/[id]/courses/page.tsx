// frontend/app/(main)/organizations/[id]/courses/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Search,
  Eye,
  Edit,
  Users,
  Star,
  Clock,
  Filter,
  Loader2,
  Globe,
  Lock,
  Building2,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface Course {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  status: "draft" | "published" | "archived";
  visibility: "public" | "org" | "private";
  level: string;
  category: string;
  created_at: string;
  instructor_name?: string;
  enrolled_count?: number;
  lesson_count?: number;
}

export default function OrganizationCoursesPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [userRole, setUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseBrowserClient();
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/login");
          return;
        }
        
        // Get organization details
        const { data: orgData } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", orgId)
          .single();
        setOrganization(orgData);
        
        // Check user role in organization
        const { data: memberData } = await supabase
          .from("organization_members")
          .select("member_role")
          .eq("organization_id", orgId)
          .eq("user_id", user.id)
          .single();
        
        setUserRole(memberData?.member_role || null);
        
        // Get all courses for this organization
        const { data: coursesData } = await supabase
          .from("courses")
          .select(`
            *,
            profiles!created_by (
              first_name,
              last_name,
              username
            )
          `)
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false });
        
        if (coursesData) {
          // Get enrolled counts for each course
          const coursesWithStats = await Promise.all(
            coursesData.map(async (course) => {
              // Get class members count
              const { data: classMembers } = await supabase
                .from("class_members")
                .select("id")
                .eq("course_class_id", course.id)
                .eq("role", "student");
              
              // Get lesson count
              const { data: modules } = await supabase
                .from("modules")
                .select(`
                  classes (
                    lessons (id)
                  )
                `)
                .eq("course_id", course.id);
              
              let lessonCount = 0;
              if (modules) {
                lessonCount = modules.reduce((total, module) => {
                  const moduleLessons = module.classes?.reduce((sum: number, classItem: any) => {
                    return sum + (classItem.lessons?.length || 0);
                  }, 0) || 0;
                  return total + moduleLessons;
                }, 0);
              }
              
              return {
                ...course,
                instructor_name: course.profiles?.first_name 
                  ? `${course.profiles.first_name} ${course.profiles.last_name || ""}`
                  : course.profiles?.username || "Unknown",
                enrolled_count: classMembers?.length || 0,
                lesson_count: lessonCount,
              };
            })
          );
          
          setCourses(coursesWithStats);
        }
        
      } catch (error) {
        console.error("Error loading organization courses:", error);
        toast.error("Failed to load courses");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [orgId, router]);
  
  const filteredCourses = courses.filter(course => {
    if (statusFilter !== "all" && course.status !== statusFilter) return false;
    if (searchTerm && !course.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });
  
  const canCreateCourse = userRole === "admin" || userRole === "sub_admin" || userRole === "teacher";
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-500/20 text-green-300">Published</Badge>;
      case "draft":
        return <Badge className="bg-yellow-500/20 text-yellow-300">Draft</Badge>;
      case "archived":
        return <Badge className="bg-gray-500/20 text-gray-300">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Globe className="w-3 h-3" />;
      case "org":
        return <Building2 className="w-3 h-3" />;
      default:
        return <Lock className="w-3 h-3" />;
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/organizations/${orgId}`}>
              <GlowButton variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Organization
              </GlowButton>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Organization Courses</h1>
              <p className="text-gray-400 mt-1">{organization?.name}</p>
            </div>
          </div>
          {canCreateCourse && (
            <Link href="/courses/create">
              <GlowButton variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </GlowButton>
            </Link>
          )}
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-purple-400" />
                <div>
                  <div className="text-2xl font-bold text-white">{courses.length}</div>
                  <div className="text-sm text-gray-400">Total Courses</div>
                </div>
              </div>
            </div>
          </GlowCard>
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-green-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {courses.reduce((sum, c) => sum + (c.enrolled_count || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-400">Total Enrollments</div>
                </div>
              </div>
            </div>
          </GlowCard>
          <GlowCard>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Star className="w-8 h-8 text-yellow-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {courses.filter(c => c.status === "published").length}
                  </div>
                  <div className="text-sm text-gray-400">Published Courses</div>
                </div>
              </div>
            </div>
          </GlowCard>
        </div>
        
        {/* Filters */}
        <GlowCard className="mb-6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </GlowCard>
        
        {/* Courses List */}
        {filteredCourses.length === 0 ? (
          <GlowCard>
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-white mb-2">No Courses Found</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm || statusFilter !== "all" 
                  ? "No courses match your filters" 
                  : "This organization has no courses yet"}
              </p>
              {canCreateCourse && !searchTerm && statusFilter === "all" && (
                <Link href="/courses/create">
                  <GlowButton variant="primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Course
                  </GlowButton>
                </Link>
              )}
            </div>
          </GlowCard>
        ) : (
          <div className="space-y-4">
            {filteredCourses.map((course) => (
              <GlowCard key={course.id} className="hover:scale-[1.01] transition-transform duration-200">
                <div className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {getStatusBadge(course.status)}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          {getVisibilityIcon(course.visibility)}
                          <span className="capitalize">{course.visibility}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {course.level?.toUpperCase()}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">{course.title}</h3>
                      <p className="text-sm text-gray-400 line-clamp-2 mb-2">{course.description}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>Instructor: {course.instructor_name}</span>
                        <span>📚 {course.lesson_count || 0} lessons</span>
                        <span>👥 {course.enrolled_count || 0} students</span>
                        <span>📅 {new Date(course.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <GlowButton
                        size="sm"
                        variant="primary"
                        onClick={() => router.push(`/courses/${course.id}/edit`)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </GlowButton>
                    </div>
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}