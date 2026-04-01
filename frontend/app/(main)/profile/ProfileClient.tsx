// frontend/app/(main)/profile/ProfileClient.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Mail, Calendar, Edit, Award, CheckCircle, Briefcase, 
  User, Globe, MapPin, Link as LinkIcon, X, Save, Loader2,
  BookOpen, Star, TrendingUp, CalendarDays, Trophy, Users, Camera,
  ChevronRight, Sparkles, Download, Share2, Clock, Code, 
  Palette, Database, Cloud, Shield, Zap, Brain, Crown,
  Building2, UserPlus, Settings, CreditCard, Trash2, AlertCircle,
  LogOut, Plus
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useAvatar } from "@/lib/useAvatar";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useRole } from "@/components/providers/RoleProvider";
import { mockOrganizations } from "@/lib/role";
import { getRoleRequests, createRoleRequest } from "@/lib/role-requests";

// Event name for avatar updates
const AVATAR_UPDATED_EVENT = 'avatar-updated';
const PROFILE_UPDATED_EVENT = 'profile-updated';

// Enhanced mock data with more professional structure
const recentActivity = [
  { id: 1, type: "completed", text: "Completed Advanced React Development", date: "Mar 1, 2026", icon: CheckCircle, points: 100, course: "Advanced React" },
  { id: 2, type: "certificate", text: "Earned Professional Certificate", date: "Feb 28, 2026", icon: Award, credential: "Google Data Analytics" },
  { id: 3, type: "enrolled", text: "Enrolled in Python for Data Science", date: "Feb 25, 2026", icon: BookOpen, progress: "25%" },
  { id: 4, type: "achievement", text: "Top 5% in React course", date: "Feb 20, 2026", icon: Trophy, badge: "Top Performer" },
  { id: 5, type: "submitted", text: "Submitted Database Design Project", date: "Feb 18, 2026", icon: CheckCircle, points: 85 },
];

const certificates = [
  { 
    id: 1, 
    course: "Advanced React Development", 
    issueDate: "Mar 1, 2026", 
    instructor: "Sarah Johnson", 
    credentialId: "CR-2026-001", 
    skills: ["React Hooks", "Context API", "Performance"],
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400"
  },
  { 
    id: 2, 
    course: "UI/UX Design Fundamentals", 
    issueDate: "Feb 15, 2026", 
    instructor: "Emily Rodriguez", 
    credentialId: "CR-2026-002", 
    skills: ["User Research", "Prototyping", "Figma"],
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400"
  },
  { 
    id: 3, 
    course: "Backend with Node.js", 
    issueDate: "Jan 28, 2026", 
    instructor: "Michael Chen", 
    credentialId: "CR-2026-003", 
    skills: ["REST APIs", "MongoDB", "Authentication"],
    image: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400"
  },
];

const skills = [
  { name: "React", level: 85, endorsements: 24, color: "#61DAFB" },
  { name: "TypeScript", level: 70, endorsements: 18, color: "#3178C6" },
  { name: "Node.js", level: 65, endorsements: 15, color: "#339933" },
  { name: "Python", level: 60, endorsements: 12, color: "#3776AB" },
  { name: "GraphQL", level: 45, endorsements: 8, color: "#E10098" },
  { name: "Tailwind CSS", level: 80, endorsements: 20, color: "#06B6D4" },
];

const achievements = [
  { id: 1, name: "7 Day Streak", icon: Zap, earned: true, date: "Feb 25, 2026" },
  { id: 2, name: "First Certificate", icon: Award, earned: true, date: "Mar 1, 2026" },
  { id: 3, name: "Course Master", icon: Trophy, earned: false, progress: 60 },
  { id: 4, name: "Community Helper", icon: Users, earned: false, progress: 30 },
];

interface ProfileClientProps {
  user: SupabaseUser;
}

interface ProfileData {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  birthday: string | null;
  avatar_url: string | null;
  bio: string | null;
  timezone: string | null;
  language: string | null;
  interests: string[] | null;
  social_links: any;
  created_at: string | null;
}

interface DisplayData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  job_title: string;
  birthday: string;
  language: string;
  bio: string;
  timezone: string;
}

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const LANGUAGES = [
  { code: "EN", label: "English", flag: "🇺🇸" },
  { code: "CN", label: "中文 (Chinese)", flag: "🇨🇳" },
  { code: "BM", label: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "ES", label: "Español", flag: "🇪🇸" },
  { code: "FR", label: "Français", flag: "🇫🇷" },
  { code: "DE", label: "Deutsch", flag: "🇩🇪" },
  { code: "JP", label: "日本語", flag: "🇯🇵" },
  { code: "KR", label: "한국어", flag: "🇰🇷" },
];

export default function ProfileClient({ user: initialUser }: ProfileClientProps) {
  const router = useRouter();
  const { roleData, setRole } = useRole();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState("activity");
  const [showRequestTeacherModal, setShowRequestTeacherModal] = useState(false);
  const [showRequestAdminModal, setShowRequestAdminModal] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  
  const { avatarUrl, refreshAvatar } = useAvatar();
  const tabsRef = useRef<HTMLDivElement>(null);
  
  const [displayData, setDisplayData] = useState<DisplayData>({
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    job_title: "",
    birthday: "",
    language: "",
    bio: "",
    timezone: detectTimezone(),
  });

  const refreshUserData = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
    }
  };

  // Handle tab change without scrolling
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Don't scroll - let the user control scrolling
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await fetch('/api/auth-service/profile', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setProfileData(data);
          
          setDisplayData({
            email: currentUser.email ?? "",
            username: data.username || "",
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            job_title: data.job_title || "",
            birthday: data.birthday || "",
            language: data.language || "",
            bio: data.bio || "",
            timezone: data.timezone || detectTimezone(),
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfile();
  }, [currentUser]);

  // Listen for profile updates to refresh avatar
  useEffect(() => {
    const handleProfileUpdate = async () => {
      await refreshAvatar();
      await refreshUserData();
    };

    const handleAvatarUpdate = async () => {
      await refreshAvatar();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
      window.addEventListener(AVATAR_UPDATED_EVENT, handleAvatarUpdate);
      return () => {
        window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
        window.removeEventListener(AVATAR_UPDATED_EVENT, handleAvatarUpdate);
      };
    }
  }, [refreshAvatar]);

  const getInitials = () => {
    const first = displayData.first_name?.[0] || "";
    const last = displayData.last_name?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  const joinDate = currentUser.created_at
    ? new Date(currentUser.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "Unknown";

  const displayName = displayData.first_name && displayData.last_name
    ? `${displayData.first_name} ${displayData.last_name}`
    : currentUser.user_metadata?.full_name || "User";

  const getLanguageLabel = (code: string) => {
    const lang = LANGUAGES.find(l => l.code === code);
    return lang?.label || code || "Not set";
  };

  const getLanguageFlag = (code: string) => {
    const lang = LANGUAGES.find(l => l.code === code);
    return lang?.flag || "🌐";
  };

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    let completed = 0;
    const total = 7;
    if (displayData.first_name) completed++;
    if (displayData.last_name) completed++;
    if (displayData.username) completed++;
    if (displayData.bio) completed++;
    if (displayData.job_title) completed++;
    if (displayData.birthday) completed++;
    if (avatarUrl) completed++;
    return Math.round((completed / total) * 100);
  };

  const completionPercentage = calculateCompletion();

  // Get user's current organization
  const currentOrganization = roleData.organizationId 
    ? mockOrganizations.find(o => o.id === roleData.organizationId)
    : null;

  // Handle role upgrade requests
  const handleRequestTeacher = async () => {
    if (!selectedOrgId) {
      toast.error("Please select an organization");
      return;
    }
    
    setIsRequesting(true);
    
    const org = mockOrganizations.find(o => o.id === selectedOrgId);
    if (org && currentUser) {
      createRoleRequest(
        currentUser.id,
        displayName,
        displayData.email,
        'teacher',
        selectedOrgId,
        org.name
      );
      
      setRole({
        ...roleData,
        pendingRole: 'teacher',
        pendingOrganizationId: selectedOrgId,
        pendingOrganizationName: org.name,
      });
      
      toast.success(`Teacher request sent to ${org.name}`);
      setShowRequestTeacherModal(false);
      setSelectedOrgId(null);
    }
    
    setIsRequesting(false);
  };

  const handleRequestAdmin = async () => {
    setIsRequesting(true);
    
    setRole({
      ...roleData,
      pendingRole: 'admin',
    });
    
    toast.success("Admin request submitted. You'll be contacted for verification.");
    setShowRequestAdminModal(false);
    
    setIsRequesting(false);
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (confirm("Are you absolutely sure? This action cannot be undone and will delete all your data, including courses, certificates, and personal information.")) {
      toast.error("Account deletion is not available in demo mode");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-400" />
          <p className="text-[#A0A0B5]">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Hero Section with Cover Image - Coursera Style */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative">
          {/* Cover Image */}
          <div className="h-48 rounded-t-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-violet-600 overflow-hidden relative">
            <div className="absolute inset-0 bg-black/20" />
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundRepeat: "repeat"
              }}
            />
          </div>
          
          {/* Profile Info Overlay */}
          <div className="relative px-6 md:px-8 -mt-16">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 transition-transform duration-500 overflow-hidden ring-4 ring-[#0B0B0F]">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-black text-5xl tracking-tighter">{getInitials()}</span>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#1A1A24] border border-white/10 text-purple-400 rounded-xl flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                     onClick={() => router.push('/settings')}>
                  <Camera className="w-4 h-4" />
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">{displayName}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-[#A0A0B5]">
                      {displayData.job_title && (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-sm">
                          <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                          {displayData.job_title}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-purple-400" />
                        {displayData.email}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-purple-400" />
                        {getLanguageFlag(displayData.language)} {getLanguageLabel(displayData.language)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <GlowButton 
                      variant="secondary" 
                      className="px-6 h-11"
                      onClick={() => router.push('/settings')}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </GlowButton>
                    <GlowButton 
                      variant="ghost" 
                      className="px-6 h-11"
                      onClick={() => window.open('/profile/share', '_blank')}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </GlowButton>
                  </div>
                </div>

                {displayData.bio && (
                  <p className="text-[#A0A0B5] mt-4 leading-relaxed max-w-2xl">
                    {displayData.bio}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                  <span className="flex items-center gap-2 text-[#6B6B80]">
                    <CalendarDays className="w-4 h-4" />
                    Joined {joinDate}
                  </span>
                  {displayData.birthday && (
                    <span className="flex items-center gap-2 text-[#6B6B80]">
                      <Calendar className="w-4 h-4" />
                      Birthday: {new Date(displayData.birthday).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Profile Completion Bar */}
                <div className="mt-4 max-w-md">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#6B6B80]">Profile Completion</span>
                    <span className="text-purple-400 font-medium">{completionPercentage}%</span>
                  </div>
                  <div className="h-1.5 bg-[#1A1A24] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full transition-all duration-500"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid - Enhanced Coursera Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <div className="bg-gradient-to-br from-[#16161F] to-[#12121A] rounded-xl p-5 border border-white/5 hover:border-purple-500/30 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                <BookOpen className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">+2 this month</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">8</p>
            <p className="text-sm text-[#6B6B80]">Courses Completed</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-gradient-to-br from-[#16161F] to-[#12121A] rounded-xl p-5 border border-white/5 hover:border-purple-500/30 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                <Trophy className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">+3 new</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">5</p>
            <p className="text-sm text-[#6B6B80]">Certificates Earned</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="bg-gradient-to-br from-[#16161F] to-[#12121A] rounded-xl p-5 border border-white/5 hover:border-purple-500/30 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors">
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">+4 this month</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">12</p>
            <p className="text-sm text-[#6B6B80]">Skills Acquired</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="bg-gradient-to-br from-[#16161F] to-[#12121A] rounded-xl p-5 border border-white/5 hover:border-purple-500/30 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                <TrendingUp className="w-5 h-5 text-orange-400" />
              </div>
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">+12%</span>
            </div>
            <p className="text-3xl font-bold text-white mb-1">158</p>
            <p className="text-sm text-[#6B6B80]">Learning Hours</p>
          </div>
        </motion.div>
      </div>

      {/* Skills Section - Enhanced */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Top Skills</h2>
            <p className="text-sm text-[#6B6B80] mt-1">Skills endorsed by peers and verified by certificates</p>
          </div>
          <GlowButton variant="ghost" className="text-sm">
            + Add Skill
          </GlowButton>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skills.map((skill) => (
            <div key={skill.name} className="group p-4 bg-[#12121A] rounded-xl border border-white/5 hover:border-purple-500/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${skill.color}20` }}
                  >
                    <Code className="w-4 h-4" style={{ color: skill.color }} />
                  </div>
                  <span className="text-white font-medium">{skill.name}</span>
                </div>
                <span className="text-sm text-purple-400">{skill.level}%</span>
              </div>
              <div className="h-2 bg-[#1A1A24] rounded-full overflow-hidden mb-3">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${skill.level}%`, backgroundColor: skill.color }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#6B6B80]">
                  <Users className="w-3 h-3" />
                  <span>{skill.endorsements} endorsements</span>
                </div>
                <button className="text-xs text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Endorse
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Organization Section */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Organization</h2>
            <p className="text-sm text-[#6B6B80] mt-1">Your learning community and institutional affiliations</p>
          </div>
        </div>
        
        {currentOrganization ? (
          // User is in an organization
          <GlowCard>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-3xl shadow-lg shadow-purple-500/20">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{currentOrganization.name}</h3>
                  <p className="text-[#A0A0B5] text-sm mb-2">{currentOrganization.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-[#6B6B80]">
                      <Globe className="w-4 h-4" />
                      {currentOrganization.domain}
                    </span>
                    <span className="flex items-center gap-1 text-[#6B6B80]">
                      <Users className="w-4 h-4" />
                      {currentOrganization.memberCount.toLocaleString()} members
                    </span>
                    {currentOrganization.verified && (
                      <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full text-xs">
                        Verified
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full text-xs capitalize">
                      {roleData.role === 'admin' ? 'Admin' : roleData.role === 'teacher' ? 'Teacher' : 'Student'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <GlowButton variant="outline" size="sm" onClick={() => router.push(`/organizations/${currentOrganization.id}`)}>
                  View Organization
                </GlowButton>
                {roleData.role === 'admin' && (
                  <GlowButton variant="primary" size="sm" onClick={() => router.push(`/organizations/${currentOrganization.id}/admin`)}>
                    <Settings className="w-4 h-4 mr-1" />
                    Admin Panel
                  </GlowButton>
                )}
              </div>
            </div>
          </GlowCard>
        ) : (
          // User is not in any organization
          <GlowCard>
            <div className="text-center py-8">
              <Building2 className="w-16 h-16 text-[#6B6B80] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Join an Organization</h3>
              <p className="text-[#A0A0B5] mb-6 max-w-md mx-auto">
                Connect with your institution or company to access exclusive courses, collaborate with peers, and earn recognized credentials.
              </p>
              <div className="flex gap-4 justify-center">
                <GlowButton variant="primary" onClick={() => router.push('/organizations')}>
                  <Building2 className="w-4 h-4 mr-2" />
                  Browse Organizations
                </GlowButton>
                <GlowButton variant="outline" onClick={() => router.push('/organization-setup')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Organization
                </GlowButton>
              </div>
              <p className="text-xs text-[#6B6B80] mt-4">
                Organizations use email domain verification. Use your work or school email to auto-join.
              </p>
            </div>
          </GlowCard>
        )}
      </div>

      {/* Role Upgrade Section - Only show for students */}
      {roleData.role === 'student' && (
        <div className="px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Role Upgrades</h2>
              <p className="text-sm text-[#6B6B80] mt-1">Request additional permissions and responsibilities</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Teacher Request Card */}
            <GlowCard className="hover:border-blue-500/30 transition-all">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">Become a Teacher</h3>
                  <p className="text-sm text-[#A0A0B5] mb-4">
                    Share your knowledge by creating courses, mentoring students, and contributing to the learning community.
                  </p>
                  <GlowButton 
                    variant="outline" 
                    onClick={() => setShowRequestTeacherModal(true)}
                    className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                  >
                    Request Teacher Role
                  </GlowButton>
                </div>
              </div>
            </GlowCard>

            {/* Admin Request Card */}
            <GlowCard className="hover:border-purple-500/30 transition-all">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <Crown className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">Become an Admin</h3>
                  <p className="text-sm text-[#A0A0B5] mb-4">
                    Manage organizations, users, and platform settings. Admin privileges require verification.
                  </p>
                  <GlowButton 
                    variant="outline" 
                    onClick={() => setShowRequestAdminModal(true)}
                    className="text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
                  >
                    Request Admin Role
                  </GlowButton>
                </div>
              </div>
            </GlowCard>
          </div>
        </div>
      )}

      {/* Pending Role Status - Show if user has pending requests */}
      {(roleData.pendingRole === 'teacher' || roleData.pendingRole === 'admin') && (
        <div className="px-6">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium mb-1">
                  {roleData.pendingRole === 'teacher' ? 'Teacher Request Pending' : 'Admin Request Pending'}
                </p>
                <p className="text-sm text-yellow-400">
                  {roleData.pendingRole === 'teacher' 
                    ? `Your request to become a teacher at ${roleData.pendingOrganizationName || 'an organization'} is awaiting approval.`
                    : 'Your admin request is being reviewed. You will be contacted for verification.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Tabs - Fixed scrolling issue by removing auto-scroll */}
      <div className="px-6" ref={tabsRef}>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="bg-[#12121A] border border-white/5 p-1.5 rounded-2xl mb-8 inline-flex w-auto">
            <TabsTrigger value="activity" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">
              <Clock className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="certificates" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">
              <Award className="w-4 h-4 mr-2" />
              Certificates
            </TabsTrigger>
            <TabsTrigger value="achievements" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">
              <Trophy className="w-4 h-4 mr-2" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="about" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">
              <User className="w-4 h-4 mr-2" />
              About
            </TabsTrigger>
            <TabsTrigger value="billing" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">
              <CreditCard className="w-4 h-4 mr-2" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="danger" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white transition-all text-red-400">
              <Shield className="w-4 h-4 mr-2" />
              Danger
            </TabsTrigger>
          </TabsList>

          {/* Activity Tab - Enhanced Timeline */}
          <TabsContent value="activity" className="mt-0 outline-none">
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-4 p-4 bg-[#12121A] rounded-xl border border-white/5 hover:border-purple-500/30 transition-all group"
                >
                  <div className={`p-3 rounded-xl ${
                    activity.type === 'completed' ? 'bg-green-500/10' :
                    activity.type === 'certificate' ? 'bg-purple-500/10' :
                    activity.type === 'achievement' ? 'bg-yellow-500/10' :
                    'bg-blue-500/10'
                  }`}>
                    <activity.icon className={`w-5 h-5 ${
                      activity.type === 'completed' ? 'text-green-400' :
                      activity.type === 'certificate' ? 'text-purple-400' :
                      activity.type === 'achievement' ? 'text-yellow-400' :
                      'text-blue-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium group-hover:text-purple-400 transition-colors">{activity.text}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[#6B6B80] text-xs">{activity.date}</p>
                      {'points' in activity && (
                        <span className="text-xs text-green-400">+{activity.points} points</span>
                      )}
                      {'progress' in activity && (
                        <span className="text-xs text-blue-400">Progress: {activity.progress}</span>
                      )}
                      {'badge' in activity && (
                        <span className="text-xs text-yellow-400">🏆 {activity.badge}</span>
                      )}
                    </div>
                  </div>
                  <GlowButton variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                    View Details
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </GlowButton>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Certificates Tab - Professional Card Design */}
          <TabsContent value="certificates" className="mt-0 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((cert) => (
                <div key={cert.id} className="group relative bg-gradient-to-br from-purple-500/5 to-violet-600/5 rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all hover:scale-[1.02] duration-300">
                  {/* Certificate Image */}
                  <div className="h-32 bg-gradient-to-r from-purple-500/20 to-violet-600/20 relative overflow-hidden">
                    <img 
                      src={cert.image} 
                      alt={cert.course}
                      className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#16161F] to-transparent" />
                    <div className="absolute top-3 right-3">
                      <div className="px-2 py-1 bg-green-500/20 rounded-full text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Award className="w-5 h-5 text-purple-400" />
                      </div>
                      <p className="text-xs text-[#6B6B80] font-mono">{cert.credentialId}</p>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 leading-tight group-hover:text-purple-400 transition-colors">
                      {cert.course}
                    </h3>
                    <p className="text-[#6B6B80] text-sm mb-3">Instructor: {cert.instructor}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {cert.skills.map((skill) => (
                        <span key={skill} className="px-2 py-1 bg-[#12121A] rounded-full text-xs text-[#A0A0B5]">
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <span className="text-[#A0A0B5] text-sm">{cert.issueDate}</span>
                      <GlowButton variant="outline" size="sm" className="text-xs h-8">
                        <Download className="w-3 h-3 mr-1" />
                        Download PDF
                      </GlowButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="mt-0 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <div key={achievement.id} className={`p-5 rounded-xl border transition-all ${
                  achievement.earned
                    ? "bg-gradient-to-r from-purple-500/10 to-violet-600/10 border-purple-500/30"
                    : "bg-[#12121A] border-white/5"
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      achievement.earned
                        ? "bg-purple-500/20"
                        : "bg-[#1A1A24]"
                    }`}>
                      <achievement.icon className={`w-5 h-5 ${
                        achievement.earned ? "text-purple-400" : "text-[#6B6B80]"
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${
                        achievement.earned ? "text-white" : "text-[#A0A0B5]"
                      }`}>
                        {achievement.name}
                      </p>
                      {achievement.earned ? (
                        <p className="text-xs text-[#6B6B80] mt-1">Earned on {achievement.date}</p>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 bg-[#1A1A24] rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full"
                                style={{ width: `${achievement.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-purple-400">{achievement.progress}%</span>
                          </div>
                          <p className="text-xs text-[#6B6B80] mt-1">Keep going!</p>
                        </>
                      )}
                    </div>
                    {achievement.earned && (
                      <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* About Tab - Detailed Profile Info */}
          <TabsContent value="about" className="mt-0 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlowCard>
                <h2 className="text-xl font-bold text-white mb-6 tracking-tight">Personal Information</h2>
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-white/5">
                    <span className="text-[#6B6B80]">Full Name</span>
                    <span className="text-white font-medium">{displayName}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-white/5">
                    <span className="text-[#6B6B80]">Username</span>
                    <span className="text-white font-medium">@{displayData.username || "Not set"}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-white/5">
                    <span className="text-[#6B6B80]">Email Address</span>
                    <span className="text-white font-medium">{displayData.email}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-white/5">
                    <span className="text-[#6B6B80]">Job Title</span>
                    <span className="text-white font-medium">{displayData.job_title || "Not set"}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-white/5">
                    <span className="text-[#6B6B80]">Birthday</span>
                    <span className="text-white font-medium">{displayData.birthday ? new Date(displayData.birthday).toLocaleDateString() : "Not set"}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-[#6B6B80]">Language</span>
                    <span className="text-white font-medium flex items-center gap-2">
                      <span>{getLanguageFlag(displayData.language)}</span>
                      {getLanguageLabel(displayData.language)}
                    </span>
                  </div>
                </div>
              </GlowCard>

              <GlowCard>
                <h2 className="text-xl font-bold text-white mb-6 tracking-tight">Professional Details</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-[#6B6B80] text-sm mb-2">Bio</p>
                    <p className="text-white leading-relaxed">{displayData.bio || "No bio added yet"}</p>
                  </div>
                  <div>
                    <p className="text-[#6B6B80] text-sm mb-2">Member Since</p>
                    <p className="text-white">{joinDate}</p>
                  </div>
                </div>
              </GlowCard>
            </div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="mt-0 outline-none">
            <GlowCard>
              <h2 className="text-xl font-semibold text-white mb-6">Subscription Plan</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Plan */}
                <div className="p-6 bg-[#12121A] rounded-xl border border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Current Plan</p>
                      <p className="text-sm text-[#6B6B80]">Free</p>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">$0<span className="text-sm text-[#6B6B80]">/month</span></p>
                  <ul className="space-y-2 mb-6 text-sm text-[#A0A0B5]">
                    <li className="flex items-center gap-2">✓ Access to 5,000+ courses</li>
                    <li className="flex items-center gap-2">✓ Basic certificates</li>
                    <li className="flex items-center gap-2">✓ Community forums</li>
                    <li className="flex items-center gap-2 text-[#6B6B80]">○ Advanced analytics</li>
                    <li className="flex items-center gap-2 text-[#6B6B80]">○ Priority support</li>
                  </ul>
                  <GlowButton variant="primary" fullWidth>
                    Upgrade to Plus
                  </GlowButton>
                </div>

                {/* Plus Plan */}
                <div className="p-6 bg-gradient-to-br from-purple-500/10 to-violet-600/10 rounded-xl border border-purple-500/30 relative overflow-hidden">
                  <div className="absolute top-4 right-4 px-2 py-1 bg-purple-500/20 rounded-full text-xs text-purple-400">
                    Popular
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Crown className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Educatorio Plus</p>
                      <p className="text-sm text-[#6B6B80]">Unlock everything</p>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">$49<span className="text-sm text-[#6B6B80]">/month</span></p>
                  <ul className="space-y-2 mb-6 text-sm text-[#A0A0B5]">
                    <li className="flex items-center gap-2">✓ Unlimited course access</li>
                    <li className="flex items-center gap-2">✓ Professional certificates</li>
                    <li className="flex items-center gap-2">✓ Advanced analytics dashboard</li>
                    <li className="flex items-center gap-2">✓ Priority support</li>
                    <li className="flex items-center gap-2">✓ Exclusive community events</li>
                  </ul>
                  <GlowButton variant="primary" fullWidth>
                    Start Free Trial
                  </GlowButton>
                  <p className="text-center text-xs text-[#6B6B80] mt-3">7-day free trial, cancel anytime</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5">
                <h3 className="text-white font-medium mb-4">Payment Methods</h3>
                <div className="p-4 bg-[#12121A] rounded-xl border border-white/5 text-center">
                  <CreditCard className="w-8 h-8 text-[#6B6B80] mx-auto mb-2" />
                  <p className="text-[#A0A0B5] text-sm">No payment methods added</p>
                  <p className="text-xs text-[#6B6B80]">Add a payment method to upgrade your plan</p>
                  <GlowButton variant="outline" size="sm" className="mt-3">
                    Add Payment Method
                  </GlowButton>
                </div>
              </div>
            </GlowCard>
          </TabsContent>

          {/* Danger Tab */}
          <TabsContent value="danger" className="mt-0 outline-none">
            <GlowCard>
              <h2 className="text-xl font-semibold text-red-400 mb-6">Danger Zone</h2>
              <p className="text-sm text-[#A0A0B5] mb-6">These actions are irreversible. Please proceed with caution.</p>
              
              <div className="space-y-4">
                {/* Sign Out */}
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Sign out of all devices</p>
                      <p className="text-sm text-[#6B6B80]">Sign out from all active sessions on other devices</p>
                    </div>
                    <GlowButton variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out All
                    </GlowButton>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Delete Account</p>
                      <p className="text-sm text-[#6B6B80]">Permanently delete your account and all associated data</p>
                    </div>
                    <GlowButton 
                      variant="outline" 
                      className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                      onClick={handleDeleteAccount}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </GlowButton>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-400">
                    <p className="font-medium mb-1">Need help?</p>
                    <p>If you're having trouble with your account, please contact our support team before deleting your account.</p>
                  </div>
                </div>
              </div>
            </GlowCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Teacher Request Modal */}
      {showRequestTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowRequestTeacherModal(false)}>
          <div className="bg-[#16161F] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-bold text-white">Request Teacher Role</h2>
              </div>
              <button onClick={() => setShowRequestTeacherModal(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5 text-[#A0A0B5]" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[#A0A0B5] text-sm">
                Select the organization where you'd like to become a teacher. Your request will be sent to the organization admin for approval.
              </p>
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Organization</Label>
                <select
                  value={selectedOrgId || ""}
                  onChange={(e) => setSelectedOrgId(Number(e.target.value))}
                  className="w-full bg-[#12121A] border border-white/10 text-white rounded-xl h-12 px-4"
                >
                  <option value="">Select an organization</option>
                  {mockOrganizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <GlowButton variant="ghost" onClick={() => setShowRequestTeacherModal(false)} className="flex-1">
                  Cancel
                </GlowButton>
                <GlowButton 
                  variant="primary" 
                  onClick={handleRequestTeacher} 
                  isLoading={isRequesting}
                  disabled={!selectedOrgId}
                  className="flex-1"
                >
                  Submit Request
                </GlowButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Request Modal */}
      {showRequestAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowRequestAdminModal(false)}>
          <div className="bg-[#16161F] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl font-bold text-white">Request Admin Role</h2>
              </div>
              <button onClick={() => setShowRequestAdminModal(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5 text-[#A0A0B5]" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[#A0A0B5] text-sm">
                Admin privileges allow you to manage organizations, users, and platform settings. Your request will be reviewed by our team.
              </p>
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-xs text-blue-400">
                  You'll be contacted via email for verification. Admin approval may take 1-2 business days.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <GlowButton variant="ghost" onClick={() => setShowRequestAdminModal(false)} className="flex-1">
                  Cancel
                </GlowButton>
                <GlowButton 
                  variant="primary" 
                  onClick={handleRequestAdmin} 
                  isLoading={isRequesting}
                  className="flex-1"
                >
                  Submit Request
                </GlowButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}