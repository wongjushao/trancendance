"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Users, 
  UserPlus, 
  Settings, 
  Mail,
  Shield,
  BarChart3,
  BookOpen,
  TrendingUp,
  Award,
  Star,
  Filter,
  Search,
  Trash2,
  Edit2,
  Crown,
  AlertCircle,
  Calendar,
  Copy,
  Plus,
  Globe,
  Save,
  Loader2,
  AlertTriangle,
  Check,
  ChevronDown,
  Building2,
  MessageCircle,
  Clock
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
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrganizationSettingsPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { roleData, setRole } = useRole();
  const supabase = getSupabaseBrowserClient();
  
  const organizationId = parseInt(id);
  
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [domains, setDomains] = useState<OrganizationDomain[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const [memberEmails, setMemberEmails] = useState<Record<string, string>>({});
  
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState("members");
  
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

  const [deleteCooldown, setDeleteCooldown] = useState<{
    organizationId: number;
    requestedAt: string;
    scheduledDeletionDate: string;
    daysRemaining: number;
  } | null>(null);
  const [deletionStep, setDeletionStep] = useState<'select' | 'confirm' | 'cooldown' | 'recovery-request'>('select');
  const [recoveryReason, setRecoveryReason] = useState('');

  // ADD THIS FUNCTION - Fetch members after approval
  const fetchMembers = async () => {
    try {
      const { data: memberData, error } = await supabase
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
        .eq("organization_id", organizationId);

      if (error) throw error;

      if (memberData) {
        // Get student course counts
        const { data: classMembers } = await supabase
          .from("class_members")
          .select("user_id, role");

        const studentCourseCount = new Map<string, number>();
        classMembers?.forEach(cm => {
          if (cm.role === 'student') {
            studentCourseCount.set(cm.user_id, (studentCourseCount.get(cm.user_id) || 0) + 1);
          }
        });

        // Get instructor course counts
        const { data: orgCourses } = await supabase
          .from("courses")
          .select("id, created_by")
          .eq("organization_id", organizationId);

        const instructorCourseCount = new Map<string, number>();
        orgCourses?.forEach(course => {
          instructorCourseCount.set(course.created_by, (instructorCourseCount.get(course.created_by) || 0) + 1);
        });

        // Collect user IDs for email fetch
        const userIds = memberData.map((m: any) => m.user_id);
        
        // Fetch emails from backend API
        await fetchMemberEmails(userIds);

        const formattedMembers: Member[] = memberData.map((m: any) => {
          let courseCount = 0;
          
          if (m.member_role === "student") {
            courseCount = studentCourseCount.get(m.user_id) || 0;
          } else if (m.member_role === "teacher" || m.member_role === "admin" || m.member_role === "sub_admin") {
            courseCount = instructorCourseCount.get(m.user_id) || 0;
          }
          
          const firstName = m.user?.first_name || "";
          const lastName = m.user?.last_name || "";
          const username = m.user?.username || "";
          
          let name = "Unknown User";
          if (firstName && lastName) name = `${firstName} ${lastName}`;
          else if (firstName) name = firstName;
          else if (username) name = username;
          
          let avatar = "U";
          if (firstName) avatar = firstName[0].toUpperCase();
          else if (username) avatar = username[0].toUpperCase();
          
          return {
            id: m.user_id,
            user_id: m.user_id,
            name: name,
            email: "", // Will be populated from memberEmails state
            role: m.member_role as Member["role"],
            avatar: m.user?.avatar_url || avatar,
            joinedAt: new Date(m.created_at).toISOString().split("T")[0],
            courses: courseCount,
            status: "active",
          };
        });
        
        setMembers(formattedMembers);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const fetchMemberEmails = async (userIds: string[]) => {
    if (!userIds.length) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/org-service/users/batch-emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_ids: userIds }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setMemberEmails(data.users || {});
      } else {
        console.error("Failed to fetch emails:", response.status);
      }
    } catch (error) {
      console.error("Error fetching emails:", error);
    }
  };



  const startOrganizationDeletion = () => {
    if (!organizationId || !organization?.name) {
      toast.error("No organization found");
      return;
    }
    
    const now = new Date();
    const scheduledDate = new Date();
    scheduledDate.setDate(now.getDate() + 30);
    
    const cooldownData = {
      organizationId: organizationId,
      requestedAt: now.toISOString(),
      scheduledDeletionDate: scheduledDate.toISOString(),
      daysRemaining: 30
    };
    
    const existingDeletions = localStorage.getItem('pending_organization_deletions');
    let deletions = existingDeletions ? JSON.parse(existingDeletions) : [];
    
    deletions = deletions.filter((d: any) => d.organizationId !== organizationId);
    deletions.push(cooldownData);
    
    localStorage.setItem('pending_organization_deletions', JSON.stringify(deletions));
    
    setDeleteCooldown({
      ...cooldownData,
      daysRemaining: 30
    });
    setDeletionStep('cooldown');
    
    toast.success(`Deletion scheduled for ${organization.name}. You have 30 days to cancel.`);
  };

  const cancelOrganizationDeletion = () => {
    if (!organizationId || !deleteCooldown) return;
    
    if (confirm(`Are you sure you want to cancel the deletion of ${organization?.name}?`)) {
      const existingDeletions = localStorage.getItem('pending_organization_deletions');
      if (existingDeletions) {
        let deletions = JSON.parse(existingDeletions);
        deletions = deletions.filter((d: any) => d.organizationId !== organizationId);
        localStorage.setItem('pending_organization_deletions', JSON.stringify(deletions));
      }
      
      setDeleteCooldown(null);
      setDeletionStep('select');
      
      toast.success(`Deletion of ${organization?.name} has been cancelled.`);
    }
  };

  const requestRecoveryFromAdmin = async () => {
    if (!organizationId || !organization?.name || !recoveryReason.trim()) {
      toast.error("Please provide a reason for recovery request");
      return;
    }
    
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/auth-service/contact-support', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: `Organization Recovery Request: ${organization.name}`,
          message: `Organization ID: ${organizationId}\n\nReason for recovery:\n${recoveryReason}\n\nRequesting cancellation of scheduled deletion.`,
          type: 'org_recovery'
        }),
      });
      
      if (response.ok) {
        toast.success("Recovery request submitted. System admin will review and contact you.");
        setDeletionStep('cooldown');
        setRecoveryReason("");
      } else {
        throw new Error("Failed to submit request");
      }
    } catch (error) {
      console.error("Error submitting recovery request:", error);
      toast.error("Failed to submit recovery request. Please try again.");
    }
  };

  useEffect(() => {
    if (!organizationId) return;
    
    const savedDeletions = localStorage.getItem('pending_organization_deletions');
    if (savedDeletions) {
      const deletions = JSON.parse(savedDeletions);
      const pendingDeletion = deletions.find((d: any) => d.organizationId === organizationId);
      
      if (pendingDeletion) {
        const scheduledDate = new Date(pendingDeletion.scheduledDeletionDate);
        const now = new Date();
        const daysRemaining = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining > 0) {
          setDeleteCooldown({
            organizationId: pendingDeletion.organizationId,
            requestedAt: pendingDeletion.requestedAt,
            scheduledDeletionDate: pendingDeletion.scheduledDeletionDate,
            daysRemaining: daysRemaining
          });
          setDeletionStep('cooldown');
        } else {
          const updatedDeletions = deletions.filter((d: any) => d.organizationId !== organizationId);
          localStorage.setItem('pending_organization_deletions', JSON.stringify(updatedDeletions));
        }
      }
    }
  }, [organizationId]);

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

      // Update roleData
      if (roleData.role !== memberCheck.member_role || roleData.organizationId !== organizationId) {
        setRole({
          role: memberCheck.member_role as any,
          organizationId: organizationId,
          organizationName: organization?.name || null,
          pendingRole: null,
          pendingOrganizationId: null,
          pendingOrganizationName: null,
        });
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

      // Load members and other data
      await fetchMembers(); // Use the fetchMembers function

      // Get all courses in this organization
      const { data: orgCourses } = await supabase
        .from("courses")
        .select("id, created_by, title, description, thumbnail, status, created_at")
        .eq("organization_id", organizationId);

      if (orgCourses) {
        const formattedCourses: Course[] = await Promise.all(orgCourses.map(async (c: any) => {
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

          const { data: courseClassesData } = await supabase
            .from("course_classes")
            .select("id")
            .eq("course_id", c.id);
          
          const classIds = courseClassesData?.map(cc => cc.id) || [];
          let studentCount = 0;
          if (classIds.length > 0) {
            const { data: classMembersData } = await supabase
              .from("class_members")
              .select("user_id")
              .in("course_class_id", classIds)
              .eq("role", "student");
            
            const uniqueStudents = new Set(classMembersData?.map(cm => cm.user_id));
            studentCount = uniqueStudents.size;
          }

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

      // Calculate analytics
      if (members.length > 0 && orgCourses) {
        const totalStudents = members.filter(m => m.role === "student").length;
        const totalTeachers = members.filter(m => m.role === "teacher" || m.role === "admin" || m.role === "sub_admin").length;
        const totalCoursesCount = orgCourses?.length || 0;
        
        let totalRatingSum = 0;
        let totalRatingCount = 0;
        for (const course of orgCourses || []) {
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
        
        // Calculate completion rate
        let totalProgress = 0;
        let totalProgressCount = 0;
        const courseIds = orgCourses?.map(c => c.id) || [];
        if (courseIds.length > 0) {
          const { data: courseClassesData } = await supabase
            .from("course_classes")
            .select("id")
            .in("course_id", courseIds);
          
          const classIds = courseClassesData?.map(cc => cc.id) || [];
          
          if (classIds.length > 0) {
            const { data: classMembersData } = await supabase
              .from("class_members")
              .select("id")
              .in("course_class_id", classIds);
            
            const cmIds = classMembersData?.map(cm => cm.id) || [];
            
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
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentMembers = members.filter(m => {
          const joinedDate = new Date(m.joinedAt);
          return joinedDate > thirtyDaysAgo;
        }).length;
        
        const monthlyGrowth = totalStudents > 0 ? Math.round((recentMembers / totalStudents) * 100) : 0;
        
        setAnalytics({
          totalStudents,
          totalTeachers,
          totalCourses: totalCoursesCount,
          averageRating: Math.round(averageRating * 10) / 10,
          completionRate: Math.round(completionRate),
          monthlyGrowth: Math.max(0, monthlyGrowth),
        });
      }

      const { data: domainData } = await supabase
        .from("organization_domains")
        .select("*")
        .eq("organization_id", organizationId);
      setDomains(domainData || []);

      setLoading(false);
    };

    loadData();
  }, [organizationId, router]);

  useEffect(() => {
    const checkSetupStatus = async () => {
      console.log('[AdminPage] Checking setup status for org:', organizationId);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('[AdminPage] No session found');
        return;
      }
      
      try {
        console.log('[AdminPage] Fetching setup status...');
        const response = await fetch(`/api/org-service/orgs/${organizationId}/setup-status`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        
        console.log('[AdminPage] Setup status response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[AdminPage] Setup status data:', data);
          if (!data.is_setup_complete) {
            console.log('[AdminPage] Setup incomplete, redirecting to setup page');
            router.push(`/organizations/${organizationId}/setup`);
            return;
          }
        } else {
          console.log('[AdminPage] Setup status check failed:', response.status);
        }
      } catch (error) {
        console.error('[AdminPage] Error checking setup status:', error);
      }
    };
    
    checkSetupStatus();
  }, [organizationId]);

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
        member.id === editingMember.id ? { ...member, role: editingMember.role } : member
      )
    );
    toast.success(`${editingMember.name}'s role updated to ${editingMember.role}`);
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

    await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", organizationId);

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

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase()));
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            {organization.name} - Settings
          </h1>
          <p className="text-gray-400">
            Manage your organization's members, courses, and settings.
          </p>
        </div>
        <Link href={`/organizations/${organization.id}`}>
          <GlowButton variant="outline">
            View Public Page
          </GlowButton>
        </Link>
      </div>

      {analytics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={Users} label="Total Students" value={analytics.totalStudents.toLocaleString()} />
            <StatCard icon={Users} label="Teachers & Admins" value={analytics.totalTeachers.toLocaleString()} />
            <StatCard icon={BookOpen} label="Total Courses" value={analytics.totalCourses.toString()} />
            <StatCard icon={Star} label="Avg. Rating" value={analytics.averageRating.toString()} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard icon={TrendingUp} label="Completion Rate" value={`${analytics.completionRate}%`} />
            <StatCard icon={TrendingUp} label="Monthly Growth" value={`+${analytics.monthlyGrowth}%`} trendUp={true} />
          </div>
        </>
      )}

      <Tabs defaultValue="members" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-800/50 border border-gray-700 p-1 rounded-2xl mb-8 flex-wrap h-auto">
          <TabsTrigger value="members" className="rounded-xl px-6 py-2.5">
            <Users className="w-4 h-4 mr-2" />
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="courses" className="rounded-xl px-6 py-2.5">
            <BookOpen className="w-4 h-4 mr-2" />
            Courses ({courses.length})
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
                              <p className="text-sm text-gray-400">{memberEmails[member.user_id] || "No email"}</p>
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
                            {/* Only show edit button if member is NOT an admin */}
                            {member.role !== "admin" && (
                              <button 
                                onClick={() => setEditingMember(member)}
                                className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4 text-gray-400" />
                              </button>
                            )}
                            {member.role !== "admin" && (
                              <button 
                                onClick={() => handleRemoveMember(member.user_id, member.name, member.role)}
                                className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </GlowCard>
        </TabsContent>

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
                <p className="text-sm text-green-400 mt-2">+{analytics?.monthlyGrowth}% growth rate</p>
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
                    <span className="text-gray-400">Average Rating</span>
                    <span className="text-purple-400">{analytics?.averageRating}/5.0</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${((analytics?.averageRating || 0) / 5) * 100}%` }} />
                  </div>
                </div>
              </div>
            </GlowCard>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <GlowCard>
            <div className="min-h-[400px]">
              <h2 className="text-2xl font-bold text-white mb-6">Organization Settings</h2>
              <div className="space-y-6 max-w-2xl">
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

                  <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                    <div className="mb-4">
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-red-400" />
                        Delete Organization
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Permanently delete {organization?.name}. This action cannot be undone.
                      </p>
                    </div>

                    {deletionStep === 'select' && (
                      <>
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                          <p className="text-sm text-yellow-300 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            ⚠️ Deleting your organization will permanently remove all courses, members, and data.
                          </p>
                        </div>
                        <GlowButton 
                          onClick={() => setDeletionStep('confirm')}
                          className="w-full bg-red-600 hover:bg-red-700"
                        >
                          Request Organization Deletion
                        </GlowButton>
                      </>
                    )}

                    {deletionStep === 'confirm' && (
                      <div className="space-y-3">
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <p className="text-sm text-red-300 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Are you sure? This action cannot be undone immediately. You will have 30 days to cancel.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <GlowButton 
                            variant="outline" 
                            onClick={() => setDeletionStep('select')}
                            className="flex-1"
                          >
                            Cancel
                          </GlowButton>
                          <GlowButton 
                            onClick={startOrganizationDeletion}
                            className="flex-1 bg-red-600 hover:bg-red-700"
                          >
                            Confirm Deletion Request
                          </GlowButton>
                        </div>
                      </div>
                    )}

                    {deletionStep === 'cooldown' && deleteCooldown && (
                      <div className="space-y-3">
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-orange-400" />
                            <span className="text-sm font-medium text-orange-400">Deletion Scheduled</span>
                          </div>
                          <p className="text-sm text-gray-300">
                            Organization <strong>{organization?.name}</strong> will be permanently deleted on:
                          </p>
                          <p className="text-lg font-semibold text-orange-400 my-2">
                            {new Date(deleteCooldown.scheduledDeletionDate).toLocaleDateString()} at{' '}
                            {new Date(deleteCooldown.scheduledDeletionDate).toLocaleTimeString()}
                          </p>
                          <div className="mt-3 p-2 bg-gray-800/50 rounded-lg">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400">Days remaining:</span>
                              <span className="text-orange-400 font-semibold">{deleteCooldown.daysRemaining} days</span>
                            </div>
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-orange-500 rounded-full transition-all"
                                style={{ width: `${((30 - deleteCooldown.daysRemaining) / 30) * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              {deleteCooldown.daysRemaining} days remaining until permanent deletion
                            </p>
                          </div>
                        </div>

                        <GlowButton 
                          variant="outline" 
                          onClick={() => setDeletionStep('recovery-request')}
                          className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                        >
                          Request Recovery from Admin
                        </GlowButton>
                        
                        <GlowButton 
                          variant="outline" 
                          onClick={cancelOrganizationDeletion}
                          className="w-full border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                        >
                          Cancel Deletion
                        </GlowButton>
                      </div>
                    )}

                    {deletionStep === 'recovery-request' && (
                      <div className="space-y-3">
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                          <p className="text-sm text-blue-300 mb-2 flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            Request organization recovery from system admin
                          </p>
                          <textarea
                            value={recoveryReason}
                            onChange={(e) => setRecoveryReason(e.target.value)}
                            placeholder="Explain why you need to recover this organization..."
                            rows={3}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm mt-2"
                          />
                        </div>
                        <div className="flex gap-3">
                          <GlowButton 
                            variant="outline" 
                            onClick={() => setDeletionStep('cooldown')}
                            className="flex-1"
                          >
                            Back
                          </GlowButton>
                          <GlowButton 
                            onClick={requestRecoveryFromAdmin}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                          >
                            Submit Recovery Request
                          </GlowButton>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

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
            primary_admin_id: organization.created_by,
            created_at: organization.created_at,
            member_count: members.length,
            course_count: courses.length,
            verified: false,
          }}
          invitedByName={roleData.organizationName || "Admin"}
          currentUserRole="admin"
        />
      )}

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
                <Label className="text-sm font-medium text-gray-400 mb-2 block">Role</Label>
                <select 
                  value={editingMember.role}
                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value as any })}
                  className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-xl h-12 px-4"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="sub_admin">Sub Admin</option>
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