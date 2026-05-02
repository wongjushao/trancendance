// frontend/app/(main)/organizations/[id]/admin/page.tsx (updated with real data)
"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Users, 
  UserPlus, 
  Clock, 
  Settings, 
  CheckCircle, 
  XCircle,
  Mail,
  Shield,
  MoreVertical,
  BarChart3,
  BookOpen,
  TrendingUp,
  Award,
  Star,
  Filter,
  Search,
  Download,
  Send,
  Trash2,
  Edit2,
  Crown,
  AlertCircle,
  Calendar,
  MessageSquare,
  Copy,
  Link as LinkIcon,
  Plus,
  Globe,
  Save,
  Loader2,
  AlertTriangle,
  Check,
  ChevronDown,
  Building2
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRole } from "@/components/providers/RoleProvider";
import { InviteMemberModal } from "@/components/organization/InviteMemberModal";
import { toast } from "sonner";
import { PendingRequestsTab } from '@/components/organization/PendingRequestsTab';
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

// Types for organization data from database
interface OrganizationData {
  id: number;
  name: string;
  description: string | null;
  slug: string | null;
  created_by: string;
  created_at: string;
}

interface OrganizationDomain {
  id: number;
  organization_id: number;
  domain: string;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: "admin" | "sub_admin" | "teacher" | "student";
  avatar: string;
  joinedAt: string;
  courses: number;
  lastActive: string;
  status: "active" | "inactive";
}

interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  instructor: string;
  students: number;
  rating: number;
  status: "published" | "draft";
  createdAt: string;
}

interface AnalyticsData {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  averageRating: number;
  completionRate: number;
  monthlyGrowth: number;
}

interface RoleRequestData {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  requested_role: string;
  organization_id: number;
  created_at: string;
}

interface JoinRequestData {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  requested_role: string;
  message: string | null;
  created_at: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrganizationAdminPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { roleData, setRole } = useRole();
  const supabase = getSupabaseBrowserClient();
  
  const organizationId = parseInt(id);
  
  // State for organization data
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [roleRequests, setRoleRequests] = useState<RoleRequestData[]>([]);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<JoinRequestData[]>([]);
  const [domains, setDomains] = useState<OrganizationDomain[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState("members");
  const [tabScrollPositions, setTabScrollPositions] = useState<Record<string, number>>({});
  
  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    description: "",
    slug: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [copied, setCopied] = useState(false);
  
  // User's organizations (for the admin switcher)
  const [userOrgs, setUserOrgs] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);

  // Load user's organizations (where they are admin)
  useEffect(() => {
    const loadUserOrganizations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all organizations where user is admin
      const { data: memberData } = await supabase
        .from("organization_members")
        .select(`
          organization_id,
          member_role,
          organizations:organizations!inner (
            id,
            name,
            slug
          )
        `)
        .eq("user_id", user.id)
        .in("member_role", ["admin", "sub_admin"]);

      if (memberData) {
        const orgs = memberData.map((m: any) => ({
          id: m.organization_id,
          name: m.organizations.name,
          role: m.member_role
        }));
        setUserOrgs(orgs);
      }
    };

    loadUserOrganizations();
  }, []);

  // Load organization data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Check if user is admin of this organization
      const { data: memberCheck } = await supabase
        .from("organization_members")
        .select("member_role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();

      if (!memberCheck || (memberCheck.member_role !== "admin" && memberCheck.member_role !== "sub_admin")) {
        toast.error("You don't have permission to access this page");
        router.push(`/organizations/${organizationId}`);
        return;
      }

      // Get organization details
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", organizationId)
        .single();

      if (orgData) {
        setOrganization(orgData);
        setSettingsForm({
          name: orgData.name,
          description: orgData.description || "",
          slug: orgData.slug || "",
        });
      }

      // Get organization members with profiles
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
        .eq("organization_id", organizationId);

      if (memberData) {
        // Get course counts for each member
        const membersWithCourses: Member[] = await Promise.all(memberData.map(async (m: any) => {
          // Get number of courses this user is enrolled in or teaching
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
          
          return {
            id: m.user_id,
            user_id: m.user_id,
            name: m.user.first_name 
              ? `${m.user.first_name} ${m.user.last_name || ""}`.trim()
              : m.user.username || m.user.email,
            email: m.user.email,
            role: m.member_role as Member["role"],
            avatar: m.user.avatar_url || (m.user.first_name?.[0] || m.user.email?.[0] || "U").toUpperCase(),
            joinedAt: new Date(m.created_at).toISOString().split("T")[0],
            courses: courseCount,
            lastActive: new Date(m.created_at).toISOString().split("T")[0],
            status: "active",
          };
        }));
        setMembers(membersWithCourses);
      }

      // Get organization domains
      const { data: domainData } = await supabase
        .from("organization_domains")
        .select("*")
        .eq("organization_id", organizationId);
      setDomains(domainData || []);

      // Load role requests from organization_members where member_role is 'pending'
      const { data: pendingRoleRequests } = await supabase
        .from("organization_members")
        .select(`
          id,
          user_id,
          member_role,
          created_at,
          user:profiles!organization_members_user_id_fkey (
            first_name,
            last_name,
            username,
            email
          )
        `)
        .eq("organization_id", organizationId)
        .eq("member_role", "pending");

      if (pendingRoleRequests) {
        const formattedRequests: RoleRequestData[] = pendingRoleRequests.map((req: any) => ({
          id: req.id,
          user_id: req.user_id,
          user_name: req.user?.first_name 
            ? `${req.user.first_name} ${req.user.last_name || ""}`.trim()
            : req.user?.username || req.user?.email || "Unknown",
          user_email: req.user?.email || "",
          requested_role: "member", // They're requesting to join the organization
          organization_id: organizationId,
          created_at: req.created_at,
        }));
        setRoleRequests(formattedRequests);
      }

      // Load join requests (these are users requesting to join with a specific role)
      // Note: Since there's no separate join_requests table, we're using the same organization_members table
      // with member_role = 'pending' as the representation of join requests.
      const { data: joinRequests } = await supabase
        .from("organization_members")
        .select(`
          id,
          user_id,
          member_role,
          created_at,
          user:profiles!organization_members_user_id_fkey (
            first_name,
            last_name,
            username,
            email
          )
        `)
        .eq("organization_id", organizationId)
        .eq("member_role", "pending");

      if (joinRequests) {
        const formattedJoinRequests: JoinRequestData[] = joinRequests.map((req: any) => ({
          id: req.id,
          user_id: req.user_id,
          user_name: req.user?.first_name 
            ? `${req.user.first_name} ${req.user.last_name || ""}`.trim()
            : req.user?.username || req.user?.email || "Unknown",
          user_email: req.user?.email || "",
          requested_role: req.member_role,
          message: null,
          created_at: req.created_at,
        }));
        setPendingJoinRequests(formattedJoinRequests);
      }

      // Load courses for this organization with real stats
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("organization_id", organizationId);
      
      if (courseData) {
        // Get instructor names and course stats
        const formattedCourses: Course[] = await Promise.all(courseData.map(async (c: any) => {
          // Get instructor name
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

          // Get student count (through course_classes and class_members)
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
            description: c.description || "",
            thumbnail: c.thumbnail || "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400",
            instructor: instructorName,
            students: studentCount,
            rating: avgRating,
            status: c.status as "published" | "draft",
            createdAt: c.created_at.split("T")[0],
          };
        }));
        setCourses(formattedCourses);
      }

      // Calculate analytics from real data
      const totalStudents = members.filter(m => m.role === "student").length;
      const totalTeachers = members.filter(m => m.role === "teacher" || m.role === "admin").length;
      const totalCoursesCount = courseData?.length || 0;
      
      // Calculate average rating across all courses
      let totalRatingSum = 0;
      let totalRatingCount = 0;
      for (const course of courseData || []) {
        const { data: reviews } = await supabase
          .from("course_reviews")
          .select("rating")
          .eq("course_id", course.id);
        
        if (reviews && reviews.length > 0) {
          totalRatingSum += reviews.reduce((sum, r) => sum + r.rating, 0);
          totalRatingCount += reviews.length;
        }
      }
      const averageRating = totalRatingCount > 0 ? totalRatingSum / totalRatingCount : 0;

      // Calculate completion rate from lesson_progress
      let totalProgress = 0;
      let totalProgressCount = 0;
      
      // Get all class_members for this organization's courses
      for (const course of courseData || []) {
        const { data: courseClasses } = await supabase
          .from("course_classes")
          .select("id")
          .eq("course_id", course.id);
        
        const classIds = courseClasses?.map(cc => cc.id) || [];
        
        if (classIds.length > 0) {
          const { data: classMembers } = await supabase
            .from("class_members")
            .select("id")
            .in("course_class_id", classIds);
          
          const cmIds = classMembers?.map(cm => cm.id) || [];
          
          if (cmIds.length > 0) {
            const { data: lessonProgress } = await supabase
              .from("lesson_progress")
              .select("status")
              .in("class_member_id", cmIds);
            
            const completed = lessonProgress?.filter(lp => lp.status === "completed").length || 0;
            totalProgress += completed;
            totalProgressCount += lessonProgress?.length || 0;
          }
        }
      }
      const completionRate = totalProgressCount > 0 ? (totalProgress / totalProgressCount) * 100 : 0;

      // Calculate monthly growth (new members in last 30 days vs previous 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const recentMembers = members.filter(m => new Date(m.joinedAt) > thirtyDaysAgo).length;
      const previousMembers = members.filter(m => {
        const joinedDate = new Date(m.joinedAt);
        return joinedDate <= thirtyDaysAgo && joinedDate > sixtyDaysAgo;
      }).length;
      
      const monthlyGrowth = previousMembers > 0 
        ? Math.round((recentMembers - previousMembers) / previousMembers * 100) 
        : recentMembers > 0 ? 100 : 0;

      setAnalytics({
        totalStudents,
        totalTeachers,
        totalCourses: totalCoursesCount,
        averageRating: Math.round(averageRating * 10) / 10,
        completionRate: Math.round(completionRate),
        monthlyGrowth: Math.max(0, monthlyGrowth),
      });

      setLoading(false);
    };

    loadData();
  }, [organizationId, router]);

  // Handle tab changes with scroll preservation
  const handleTabChange = (value: string) => {
    setTabScrollPositions(prev => ({
      ...prev,
      [activeTab]: window.scrollY
    }));
    setActiveTab(value);
  };

  // Restore scroll position after tab changes
  useEffect(() => {
    const savedPosition = tabScrollPositions[activeTab];
    if (savedPosition !== undefined) {
      const timer = setTimeout(() => {
        window.scrollTo({ top: savedPosition, behavior: 'instant' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab, tabScrollPositions]);

  // Role request handlers (approve/reject join requests)
  const handleApproveRoleRequest = async (requestId: string, userId: string, requestedRole: string) => {
    // Update the user's role in organization_members from 'pending' to actual role
    const { error } = await supabase
      .from("organization_members")
      .update({ member_role: requestedRole === "teacher" ? "teacher" : "student" })
      .eq("id", requestId);

    if (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request");
      return;
    }

    // Remove from pending list
    setRoleRequests(prev => prev.filter(req => req.id !== requestId));
    
    // Get user details to add to members list
    const approvedRequest = roleRequests.find(req => req.id === requestId);
    if (approvedRequest) {
      const newMember: Member = {
        id: approvedRequest.user_id,
        user_id: approvedRequest.user_id,
        name: approvedRequest.user_name,
        email: approvedRequest.user_email,
        role: requestedRole === "teacher" ? "teacher" : "student",
        avatar: approvedRequest.user_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
        joinedAt: new Date().toISOString().split("T")[0],
        courses: 0,
        lastActive: new Date().toISOString().split("T")[0],
        status: "active",
      };
      setMembers(prev => [...prev, newMember]);
    }
    
    toast.success(`Request approved - user added as ${requestedRole}`);
  };

  const handleRejectRoleRequest = async (requestId: string) => {
    // Remove the pending membership
    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("id", requestId);

    if (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
      return;
    }

    setRoleRequests(prev => prev.filter(req => req.id !== requestId));
    toast.info("Request has been rejected");
  };

  // Member management
  const handleRemoveMember = async (memberId: string, memberName: string, memberRole: string) => {
    if (memberRole === "admin") {
      toast.error("Cannot remove admin members");
      return;
    }
    
    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", memberId);

    if (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
      return;
    }

    setMembers(prev => prev.filter(m => m.id !== memberId));
    toast.success(`${memberName} has been removed from the organization`);
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;
    
    const { error } = await supabase
      .from("organization_members")
      .update({ member_role: editingMember.role })
      .eq("organization_id", organizationId)
      .eq("user_id", editingMember.user_id);

    if (error) {
      console.error("Error updating member:", error);
      toast.error("Failed to update member");
      return;
    }
    
    setMembers(prev =>
      prev.map(member =>
        member.id === editingMember.id ? editingMember : member
      )
    );
    toast.success(`${editingMember.name}'s role updated`);
    setEditingMember(null);
  };

  const handlePublishCourse = async (courseId: number) => {
    const { error } = await supabase
      .from("courses")
      .update({ status: "published" })
      .eq("id", courseId);

    if (error) {
      console.error("Error publishing course:", error);
      toast.error("Failed to publish course");
      return;
    }

    setCourses(prev =>
      prev.map(course =>
        course.id === courseId ? { ...course, status: "published" } : course
      )
    );
    toast.success("Course published successfully!");
  };

  // Settings management
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    
    const { error } = await supabase
      .from("organizations")
      .update({
        name: settingsForm.name,
        description: settingsForm.description || null,
        slug: settingsForm.slug || null,
      })
      .eq("id", organizationId);

    if (error) {
      console.error("Error updating organization:", error);
      toast.error("Failed to update organization settings");
    } else {
      setOrganization({ ...organization!, ...settingsForm });
      toast.success("Organization settings updated successfully");
    }
    setSavingSettings(false);
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      toast.error("Please enter a domain");
      return;
    }

    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(newDomain)) {
      toast.error("Please enter a valid domain (e.g., example.com)");
      return;
    }

    if (domains.some(d => d.domain === newDomain.toLowerCase())) {
      toast.error("Domain already added");
      return;
    }

    const { data, error } = await supabase
      .from("organization_domains")
      .insert({
        organization_id: organizationId,
        domain: newDomain.toLowerCase(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding domain:", error);
      toast.error("Failed to add domain");
    } else {
      setDomains([...domains, data]);
      setNewDomain("");
      toast.success("Domain added successfully");
    }
  };

  const handleRemoveDomain = async (domainId: number, domain: string) => {
    const { error } = await supabase
      .from("organization_domains")
      .delete()
      .eq("id", domainId);

    if (error) {
      console.error("Error removing domain:", error);
      toast.error("Failed to remove domain");
    } else {
      setDomains(domains.filter(d => d.id !== domainId));
      toast.success(`Domain ${domain} removed`);
    }
  };

  const handleDeleteOrganization = async () => {
    if (deleteConfirmText !== organization?.name) {
      toast.error("Please type the organization name to confirm");
      return;
    }

    // First, delete all organization members
    await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", organizationId);

    // Then delete the organization
    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("id", organizationId);

    if (error) {
      console.error("Error deleting organization:", error);
      toast.error("Failed to delete organization");
    } else {
      toast.success("Organization deleted successfully");
      router.push("/organizations");
    }

    setShowDeleteDialog(false);
    setDeleteConfirmText("");
  };

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/organizations/join?org=${organizationId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Invite link copied to clipboard");
  };

  // Switch to another organization's admin page
  const switchOrganization = (orgId: number) => {
    router.push(`/organizations/${orgId}/admin`);
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Organization Not Found</h1>
        <p className="text-gray-400">The organization you're looking for doesn't exist.</p>
        <Link href="/organizations" className="mt-6 inline-block">
          <GlowButton>Back to Organizations</GlowButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header with Organization Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            {organization.name} - Admin Panel
          </h1>
          <p className="text-gray-400">
            Manage your organization's members, courses, and settings.
          </p>
        </div>
        
        {/* Organization Switcher Dropdown */}
        {userOrgs.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Building2 className="w-4 h-4 text-purple-400" />
              <span className="text-white">Switch Organization</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            
            {showOrgSwitcher && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowOrgSwitcher(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
                  {userOrgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        switchOrganization(org.id);
                        setShowOrgSwitcher(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        org.id === organizationId ? "bg-gray-800/50 text-purple-400" : "text-white"
                      }`}
                    >
                      <div className="font-medium">{org.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 capitalize">{org.role}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      {analytics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={Users} label="Total Students" value={analytics.totalStudents.toLocaleString()} />
            <StatCard icon={BookOpen} label="Courses" value={analytics.totalCourses.toString()} />
            <StatCard icon={Star} label="Avg. Rating" value={analytics.averageRating.toString()} />
            <StatCard icon={TrendingUp} label="Monthly Growth" value={`+${analytics.monthlyGrowth}%`} trendUp={true} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard icon={TrendingUp} label="Completion Rate" value={`${analytics.completionRate}%`} />
            <StatCard icon={Users} label="Teachers" value={analytics.totalTeachers.toString()} />
          </div>
        </>
      )}

      {/* Admin Tabs */}
      <div className="tabs-content-wrapper">
        <Tabs defaultValue="members" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="bg-gray-800/50 border border-gray-700 p-1 rounded-2xl mb-8 flex-wrap h-auto">
            <TabsTrigger value="members" className="rounded-xl px-6 py-2.5">
              <Users className="w-4 h-4 mr-2" />
              Members
            </TabsTrigger>
            <TabsTrigger value="courses" className="rounded-xl px-6 py-2.5">
              <BookOpen className="w-4 h-4 mr-2" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="role-requests" className="rounded-xl px-6 py-2.5">
              <Clock className="w-4 h-4 mr-2" />
              Join Requests
              {roleRequests.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                  {roleRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-xl px-6 py-2.5">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl px-6 py-2.5">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Members Tab - UI preserved, data from Supabase */}
          <TabsContent value="members">
            <GlowCard>
              <div className="min-h-[400px]">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-bold text-white">Organization Members</h2>
                  <div className="flex gap-3">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-gray-800/50 border-gray-700 rounded-xl h-10 w-full sm:w-64"
                      />
                    </div>
                    <GlowButton onClick={() => setShowInviteModal(true)} className="h-10">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite Member
                    </GlowButton>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-6">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-800/50 border border-gray-700 text-white rounded-lg text-sm h-10"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="sub_admin">Sub Admin</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-800/50 border border-gray-700 text-white rounded-lg text-sm h-10"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-400 font-medium py-3 px-4">Member</th>
                        <th className="text-left text-gray-400 font-medium py-3 px-4">Role</th>
                        <th className="text-left text-gray-400 font-medium py-3 px-4">Status</th>
                        <th className="text-left text-gray-400 font-medium py-3 px-4">Joined</th>
                        <th className="text-left text-gray-400 font-medium py-3 px-4">Courses</th>
                        <th className="text-left text-gray-400 font-medium py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((member) => (
                        <tr key={member.id} className="border-b border-gray-700 hover:bg-gray-800/30">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">{member.avatar}</span>
                              </div>
                              <div>
                                <p className="text-white font-medium">{member.name}</p>
                                <p className="text-sm text-gray-400">{member.email}</p>
                              </div>
                            </div>
                           </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              member.role === "admin" 
                                ? "bg-purple-500/20 text-purple-400" 
                                : member.role === "sub_admin"
                                ? "bg-indigo-500/20 text-indigo-400"
                                : member.role === "teacher"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-green-500/20 text-green-400"
                            }`}>
                              {member.role === "sub_admin" ? "Sub Admin" : member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </span>
                            </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              member.status === "active" 
                                ? "bg-green-500/20 text-green-400" 
                                : "bg-gray-500/20 text-gray-400"
                            }`}>
                              {member.status}
                            </span>
                            </td>
                          <td className="py-3 px-4 text-gray-400 text-sm">{member.joinedAt}</td>
                          <td className="py-3 px-4 text-white">{member.courses}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setEditingMember(member)}
                                className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4 text-gray-400" />
                              </button>
                              {member.role !== "admin" && (
                                <button 
                                  onClick={() => handleRemoveMember(member.id, member.name, member.role)}
                                  className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                              )}
                            </div>
                            </td>
                         </>
                      ))}
                    </tbody>
                   </>
                </div>
              </div>
            </GlowCard>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <GlowCard>
              <div className="min-h-[400px]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Organization Courses</h2>
                  <Link href="/courses/create">
                    <GlowButton>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Course
                    </GlowButton>
                  </Link>
                </div>
                <div className="space-y-4">
                  {courses.map((course) => (
                    <div key={course.id} className="p-4 bg-gray-800/30 rounded-xl border border-gray-700">
                      <div className="flex gap-4">
                        <img src={course.thumbnail} alt={course.title} className="w-32 h-24 rounded-lg object-cover" />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-white">{course.title}</h3>
                              <p className="text-sm text-gray-400">{course.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {course.students} students
                                </span>
                                <span className="flex items-center gap-1">
                                  <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                  {course.rating.toFixed(1)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-4 h-4" />
                                  {course.instructor}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {course.status === "draft" && (
                                <GlowButton size="sm" onClick={() => handlePublishCourse(course.id)}>
                                  Publish
                                </GlowButton>
                              )}
                              <Link href={`/courses/${course.id}/edit`}>
                                <GlowButton variant="outline" size="sm">
                                  Edit
                                </GlowButton>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlowCard>
          </TabsContent>

          {/* Join Requests Tab */}
          <TabsContent value="role-requests">
            <GlowCard>
              <div className="min-h-[400px]">
                <h2 className="text-2xl font-bold text-white mb-6">Join Requests</h2>
                {roleRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No pending join requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {roleRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700"
                      >
                        <div>
                          <p className="text-white font-medium">{request.user_name}</p>
                          <p className="text-gray-400 text-sm">{request.user_email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                              Requests to join as member
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(request.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <GlowButton size="sm" onClick={() => handleApproveRoleRequest(request.id, request.user_id, "student")}>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </GlowButton>
                          <GlowButton size="sm" variant="ghost" onClick={() => handleRejectRoleRequest(request.id)}>
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </GlowButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GlowCard>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlowCard>
                <h2 className="text-xl font-bold text-white mb-6">Top Courses</h2>
                <div className="space-y-4">
                  {courses.slice(0, 5).map((course) => (
                    <div key={course.id} className="p-3 bg-gray-800/30 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{course.title}</span>
                        <span className="text-purple-400">{course.students} students</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (course.students / 100) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </GlowCard>

              <GlowCard>
                <h2 className="text-xl font-bold text-white mb-6">Member Growth</h2>
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <p className="text-3xl font-bold text-white mb-2">{analytics?.totalStudents}</p>
                  <p className="text-gray-400">Total students</p>
                  <p className="text-sm text-green-400 mt-2">↑ {analytics?.monthlyGrowth}% this month</p>
                </div>
              </GlowCard>

              <GlowCard>
                <h2 className="text-xl font-bold text-white mb-6">Engagement Metrics</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-400">Course Completion Rate</span>
                      <span className="text-purple-400">{analytics?.completionRate}%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${analytics?.completionRate}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-400">Student Satisfaction</span>
                      <span className="text-purple-400">{analytics?.averageRating}/5.0</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(analytics?.averageRating || 0) / 5 * 100}%` }} />
                    </div>
                  </div>
                </div>
              </GlowCard>
            </div>
          </TabsContent>

          {/* Settings Tab - UI preserved, data from Supabase */}
          <TabsContent value="settings">
            <GlowCard>
              <div className="min-h-[400px]">
                <h2 className="text-2xl font-bold text-white mb-6">Organization Settings</h2>
                <div className="space-y-6 max-w-2xl">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Basic Information</h3>
                    <div>
                      <Label className="text-sm font-medium text-gray-400 mb-2 block">
                        Organization Name
                      </Label>
                      <Input
                        value={settingsForm.name}
                        onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                        className="bg-gray-800/50 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-400 mb-2 block">
                        Slug (URL identifier)
                      </Label>
                      <Input
                        value={settingsForm.slug || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                        placeholder="organization-slug"
                        className="bg-gray-800/50 border-gray-700 text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Used in URLs: /organizations/{settingsForm.slug || "slug"}/...
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-400 mb-2 block">
                        Description
                      </Label>
                      <Textarea
                        value={settingsForm.description}
                        onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                        rows={4}
                        className="bg-gray-800/50 border-gray-700 text-white resize-none"
                      />
                    </div>
                  </div>

                  {/* Domain Management */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Domain Management</h3>
                    <p className="text-sm text-gray-400">
                      Add email domains to automatically assign users to the correct role during onboarding.
                    </p>

                    <div className="flex gap-3">
                      <Input
                        placeholder="e.g., university.edu"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        className="flex-1 bg-gray-800/50 border-gray-700 text-white"
                      />
                      <GlowButton onClick={handleAddDomain}>
                        Add Domain
                      </GlowButton>
                    </div>

                    {domains.length === 0 ? (
                      <div className="text-center py-8 bg-gray-800/30 rounded-lg">
                        <Globe className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">No domains added yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {domains.map((domain) => (
                          <div key={domain.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                            <div className="flex items-center gap-3">
                              <Globe className="w-4 h-4 text-gray-400" />
                              <span className="text-white">{domain.domain}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveDomain(domain.id, domain.domain)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Danger Zone */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-red-400 border-b border-gray-700 pb-2">Danger Zone</h3>
                    
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Copy className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-yellow-400 font-medium">Organization Invite Link</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Share this link to let users join your organization
                            </p>
                          </div>
                        </div>
                        <GlowButton variant="secondary" size="sm" onClick={copyInviteLink}>
                          {copied ? (
                            <Check className="w-4 h-4 mr-2" />
                          ) : (
                            <Copy className="w-4 h-4 mr-2" />
                          )}
                          {copied ? "Copied!" : "Copy Link"}
                        </GlowButton>
                      </div>
                    </div>

                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="flex items-start gap-3 mb-4">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-red-400 font-medium">Delete Organization</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Once deleted, all courses, members, and data will be permanently removed.
                          </p>
                        </div>
                      </div>
                      <GlowButton
                        variant="outline"
                        onClick={() => setShowDeleteDialog(true)}
                        className="border-red-500 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Organization
                      </GlowButton>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4">
                    <GlowButton onClick={handleSaveSettings} isLoading={savingSettings}>
                      <Save className="w-4 h-4 mr-2" />
                      Save All Settings
                    </GlowButton>
                  </div>
                </div>
              </div>
            </GlowCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Modal */}
      {showInviteModal && organization && (
        <InviteMemberModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          organization={{
            id: organization.id,
            name: organization.name,
            slug: organization.slug || "",
            description: organization.description,
            domain: null,
            logo_url: null,
            primary_admin_id: "",
            created_at: "",
            member_count: 0,
            course_count: 0,
            verified: false,
          }}
          invitedByName={roleData.organizationName || "Admin"}
          currentUserRole="admin"
        />
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setEditingMember(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">Edit Member</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-400 mb-2 block">Name</Label>
                <Input 
                  defaultValue={editingMember.name} 
                  className="bg-gray-800/50 border-gray-700" 
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-400 mb-2 block">Email</Label>
                <Input 
                  defaultValue={editingMember.email} 
                  className="bg-gray-800/50 border-gray-700" 
                  onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-400 mb-2 block">Role</Label>
                <select 
                  value={editingMember.role}
                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value as any })}
                  className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-xl h-12 px-4"
                >
                  <option value="sub_admin">Sub Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-700">
              <GlowButton variant="ghost" onClick={() => setEditingMember(null)} className="flex-1">
                Cancel
              </GlowButton>
              <GlowButton onClick={handleUpdateMember} className="flex-1">
                Save Changes
              </GlowButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-gray-900 border border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Organization</DialogTitle>
            <DialogDescription className="text-gray-400">
              This action cannot be undone. This will permanently delete the organization and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400">
                <strong>Warning:</strong> All courses, members, and student data will be permanently deleted.
              </p>
            </div>
            <div>
              <Label>Type <span className="text-red-400">{organization?.name}</span> to confirm</Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={organization?.name}
                className="mt-2 bg-gray-800/50 border-gray-700"
              />
            </div>
          </div>
          <DialogFooter>
            <GlowButton variant="secondary" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </GlowButton>
            <GlowButton
              onClick={handleDeleteOrganization}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Permanently Delete
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}