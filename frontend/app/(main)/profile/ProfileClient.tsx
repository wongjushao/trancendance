// frontend/app/(main)/profile/ProfileClient.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Mail, Calendar, Edit, Award, CheckCircle, Briefcase, 
  User, Globe, MapPin, Link as LinkIcon, X, Save, Loader2,
  BookOpen, Star, TrendingUp, CalendarDays, Trophy, Users, Camera
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useAvatar } from "@/lib/useAvatar";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";

// Event name for avatar updates
const AVATAR_UPDATED_EVENT = 'avatar-updated';
const PROFILE_UPDATED_EVENT = 'profile-updated';

// Enhanced mock data with more professional structure
const recentActivity = [
  { id: 1, type: "completed", text: "Completed Advanced React Development", date: "Mar 1, 2026", icon: CheckCircle, points: 100 },
  { id: 2, type: "certificate", text: "Earned Professional Certificate", date: "Feb 28, 2026", icon: Award, credential: "Google Data Analytics" },
  { id: 3, type: "enrolled", text: "Enrolled in Python for Data Science", date: "Feb 25, 2026", icon: BookOpen, progress: "25%" },
  { id: 4, type: "achievement", text: "Top 5% in React course", date: "Feb 20, 2026", icon: Trophy, badge: "Top Performer" },
];

const certificates = [
  { id: 1, course: "Advanced React Development", issueDate: "Mar 1, 2026", instructor: "Sarah Johnson", credentialId: "CR-2026-001", skills: ["React Hooks", "Context API", "Performance"] },
  { id: 2, course: "UI/UX Design Fundamentals", issueDate: "Feb 15, 2026", instructor: "Emily Rodriguez", credentialId: "CR-2026-002", skills: ["User Research", "Prototyping", "Figma"] },
  { id: 3, course: "Backend with Node.js", issueDate: "Jan 28, 2026", instructor: "Michael Chen", credentialId: "CR-2026-003", skills: ["REST APIs", "MongoDB", "Authentication"] },
];

const skills = [
  { name: "React", level: 85, endorsements: 24 },
  { name: "TypeScript", level: 70, endorsements: 18 },
  { name: "Node.js", level: 65, endorsements: 15 },
  { name: "Python", level: 60, endorsements: 12 },
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
];

export default function ProfileClient({ user: initialUser }: ProfileClientProps) {
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(initialUser);
  
  const { avatarUrl, refreshAvatar } = useAvatar();
  
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
      {/* Hero Section - Professional Profile Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative">
          {/* Cover Image */}
          <div className="absolute inset-0 h-48 bg-gradient-to-r from-purple-600/20 to-violet-600/20 rounded-2xl blur-xl" />
          <div className="relative bg-gradient-to-r from-purple-600/5 to-violet-600/5 rounded-2xl border border-white/10 p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Avatar - Read only on profile page */}
              <div className="relative group">
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 transition-transform duration-500 overflow-hidden">
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
                
                {/* Edit hint - appears on hover to guide users to Settings */}
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#1A1A24] border border-white/10 text-purple-400 rounded-xl flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <Camera className="w-4 h-4" />
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">{displayName}</h1>
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
                  <GlowButton 
                    variant="secondary" 
                    className="px-6 h-11"
                    onClick={() => router.push('/settings')}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </GlowButton>
                </div>

                {displayData.bio && (
                  <p className="text-[#A0A0B5] mb-6 leading-relaxed max-w-2xl">
                    {displayData.bio}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm">
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
                  <span className="flex items-center gap-2 text-[#6B6B80]">
                    <MapPin className="w-4 h-4" />
                    {displayData.timezone}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid - Coursera Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#12121A] rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <BookOpen className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-[#6B6B80] text-sm">Courses Completed</p>
          </div>
          <p className="text-3xl font-bold text-white">8</p>
          <p className="text-xs text-green-400 mt-1">+2 this month</p>
        </div>
        
        <div className="bg-[#12121A] rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Trophy className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-[#6B6B80] text-sm">Certificates</p>
          </div>
          <p className="text-3xl font-bold text-white">5</p>
          <p className="text-xs text-green-400 mt-1">3 new this year</p>
        </div>
        
        <div className="bg-[#12121A] rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Star className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-[#6B6B80] text-sm">Skills Acquired</p>
          </div>
          <p className="text-3xl font-bold text-white">12</p>
          <p className="text-xs text-green-400 mt-1">+4 this month</p>
        </div>
        
        <div className="bg-[#12121A] rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-[#6B6B80] text-sm">Learning Hours</p>
          </div>
          <p className="text-3xl font-bold text-white">158</p>
          <p className="text-xs text-green-400 mt-1">+12% from last month</p>
        </div>
      </div>

      {/* Skills Section */}
      <GlowCard>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">Top Skills</h2>
          <GlowButton variant="ghost" className="text-sm">+ Add Skill</GlowButton>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skills.map((skill) => (
            <div key={skill.name} className="p-4 bg-[#12121A] rounded-xl border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">{skill.name}</span>
                <span className="text-sm text-purple-400">{skill.level}%</span>
              </div>
              <div className="h-2 bg-[#1A1A24] rounded-full overflow-hidden mb-3">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full"
                  style={{ width: `${skill.level}%` }}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6B6B80]">
                <Users className="w-3 h-3" />
                <span>{skill.endorsements} endorsements</span>
              </div>
            </div>
          ))}
        </div>
      </GlowCard>

      {/* Content Tabs - Coursera Style */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="bg-[#12121A] border border-white/5 p-1.5 rounded-2xl mb-8 inline-flex">
          <TabsTrigger value="activity" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">
            Activity
          </TabsTrigger>
          <TabsTrigger value="certificates" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">
            Certificates
          </TabsTrigger>
          <TabsTrigger value="about" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">
            About
          </TabsTrigger>
        </TabsList>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-0 outline-none">
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-4 bg-[#12121A] rounded-xl border border-white/5 hover:border-white/10 transition-all group"
              >
                <div className={`p-3 rounded-xl ${
                  activity.type === 'completed' ? 'bg-green-500/10' :
                  activity.type === 'certificate' ? 'bg-purple-500/10' :
                  'bg-blue-500/10'
                }`}>
                  <activity.icon className={`w-5 h-5 ${
                    activity.type === 'completed' ? 'text-green-400' :
                    activity.type === 'certificate' ? 'text-purple-400' :
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
                </GlowButton>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Certificates Tab - Coursera Style */}
        <TabsContent value="certificates" className="mt-0 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((cert) => (
              <div key={cert.id} className="group relative bg-gradient-to-br from-purple-500/5 to-violet-600/5 rounded-2xl border border-white/10 p-6 hover:border-purple-500/30 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl">
                    <Award className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-400 font-medium">Verified</p>
                    <p className="text-[#6B6B80] text-xs font-mono">{cert.credentialId}</p>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-purple-400 transition-colors">
                  {cert.course}
                </h3>
                <p className="text-[#6B6B80] text-sm mb-4">Instructor: {cert.instructor}</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {cert.skills.map((skill) => (
                    <span key={skill} className="px-2 py-1 bg-[#12121A] rounded-full text-xs text-[#A0A0B5]">
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-[#A0A0B5] text-sm">{cert.issueDate}</span>
                  <GlowButton variant="outline" className="text-xs h-9">
                    Download PDF
                  </GlowButton>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* About Tab - Detailed Profile Info */}
        <TabsContent value="about" className="mt-0 outline-none">
          <GlowCard>
            <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">Profile Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-[#6B6B80] text-sm mb-1">Full Name</p>
                  <p className="text-white font-medium text-lg">{displayName}</p>
                </div>
                <div>
                  <p className="text-[#6B6B80] text-sm mb-1">Username</p>
                  <p className="text-white font-medium text-lg">@{displayData.username || "Not set"}</p>
                </div>
                <div>
                  <p className="text-[#6B6B80] text-sm mb-1">Email Address</p>
                  <p className="text-white font-medium text-lg">{displayData.email}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[#6B6B80] text-sm mb-1">Job Title</p>
                  <p className="text-white font-medium text-lg">{displayData.job_title || "Not set"}</p>
                </div>
                <div>
                  <p className="text-[#6B6B80] text-sm mb-1">Birthday</p>
                  <p className="text-white font-medium text-lg">{displayData.birthday ? new Date(displayData.birthday).toLocaleDateString() : "Not set"}</p>
                </div>
                <div>
                  <p className="text-[#6B6B80] text-sm mb-1">Language</p>
                  <p className="text-white font-medium text-lg flex items-center gap-2">
                    <span>{getLanguageFlag(displayData.language)}</span>
                    {getLanguageLabel(displayData.language)}
                  </p>
                </div>
              </div>
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}