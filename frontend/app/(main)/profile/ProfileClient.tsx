// frontend/app/(main)/profile/ProfileClient.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, Mail, Calendar, Edit, Award, CheckCircle, Briefcase, User, Calendar as CalendarIcon, Globe } from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useAvatar } from "@/lib/useAvatar";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// Event name for avatar updates
const AVATAR_UPDATED_EVENT = 'avatar-updated';
// Event name for profile updates
const PROFILE_UPDATED_EVENT = 'profile-updated';

// Static mock data (replace with real DB queries when ready)
const recentActivity = [
  { id: 1, type: "completed",  text: "Completed Advanced React Development", date: "Mar 1, 2026",  icon: CheckCircle },
  { id: 2, type: "enrolled",   text: "Enrolled in Python for Data Science",  date: "Feb 28, 2026", icon: CheckCircle },
  { id: 3, type: "achievement",text: "Earned Course Master badge",            date: "Feb 25, 2026", icon: Award },
  { id: 4, type: "grade",      text: "Scored 95% on UI/UX Case Study",       date: "Feb 20, 2026", icon: Edit },
];

const certificates = [
  { id: 1, course: "Advanced React Development",  issueDate: "Mar 1, 2026",  instructor: "Sarah Johnson" },
  { id: 2, course: "UI/UX Design Fundamentals",   issueDate: "Feb 15, 2026", instructor: "Emily Rodriguez" },
  { id: 3, course: "Backend with Node.js",        issueDate: "Jan 28, 2026", instructor: "Michael Chen" },
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
  onboarded: boolean;
}

// Auto-detect timezone
function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export default function ProfileClient({ user: initialUser }: ProfileClientProps) {
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [currentUser, setCurrentUser] = useState(initialUser);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use the avatar hook for fetching and uploading
  const { avatarUrl, uploadAvatar, refreshAvatar } = useAvatar();
  
  // Form state
  const [settingsForm, setSettingsForm] = useState({
    email: "",
    bio: "",
    username: "",
    first_name: "",
    last_name: "",
    job_title: "",
    custom_job_title: "",
    birthday: "",
    language: "",
    timezone: "", // Auto-detected, not editable
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);

  // Language options
  const LANGUAGES = [
    { code: "EN", label: "English" },
    { code: "CN", label: "中文 (Chinese)" },
    { code: "BM", label: "Bahasa Melayu" },
  ];

  const JOB_TITLES = [
    "Student",
    "Software Engineer",
    "Data Scientist",
    "Product Manager",
    "UI/UX Designer",
    "DevOps Engineer",
    "Marketing Specialist",
    "Teacher/Instructor",
    "Researcher",
    "Entrepreneur",
    "Other",
  ];

  // Auto-detect timezone on mount
  useEffect(() => {
    const timezone = detectTimezone();
    setSettingsForm(prev => ({
      ...prev,
      timezone: timezone,
    }));
  }, []);

  // Refresh user data from Supabase
  const refreshUserData = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      // Dispatch event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { 
          detail: { user } 
        }));
      }
    }
  };

  // Fetch profile from backend
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
          
          // Initialize form with profile data
          setSettingsForm(prev => ({
            ...prev,
            email: currentUser.email ?? "",
            bio: data.bio || "",
            username: data.username || "",
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            job_title: data.job_title || "",
            birthday: data.birthday || "",
            language: data.language || "",
            timezone: data.timezone || prev.timezone,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfile();
  }, [currentUser]);

  // Handle avatar upload using the hook
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setSaveStatus({ type: "error", message: "Only JPEG, PNG, GIF, and WebP images are allowed." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSaveStatus({ type: "error", message: "File size must be less than 5MB." });
      return;
    }

    setIsUploadingAvatar(true);
    setSaveStatus(null);

    try {
      const uploadedUrl = await uploadAvatar(file);
      setProfileData(prev => prev ? { ...prev, avatar_url: uploadedUrl } : null);
      setSaveStatus({ type: "success", message: "Avatar updated successfully!" });
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AVATAR_UPDATED_EVENT, { 
          detail: { avatarUrl: uploadedUrl } 
        }));
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      setSaveStatus({ type: "error", message: error.message || "Failed to upload avatar" });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Generate initials for the avatar fallback
  const fullNameForInitials = settingsForm.first_name && settingsForm.last_name 
    ? `${settingsForm.first_name} ${settingsForm.last_name}`
    : "User";
  
  const initials = fullNameForInitials
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Format the join date
  const joinDate = currentUser.created_at
    ? new Date(currentUser.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "Unknown";

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      setSaveStatus({ type: "error", message: "No active session" });
      setIsSaving(false);
      return;
    }
    
    // Determine final job title (use custom if "Other" was selected)
    let finalJobTitle = settingsForm.job_title;
    if (settingsForm.job_title === "Other" && settingsForm.custom_job_title.trim()) {
      finalJobTitle = settingsForm.custom_job_title.trim();
    }
    
    try {
      // Update user metadata in Supabase Auth (this affects sidebar, topnav, etc.)
      const fullName = `${settingsForm.first_name} ${settingsForm.last_name}`.trim();
      const metadataResponse = await fetch('/api/auth-service/user-metadata', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          bio: settingsForm.bio,
        }),
      });
      
      if (!metadataResponse.ok) {
        throw new Error('Failed to update user metadata');
      }
      
      // Update profile in database
      const profileResponse = await fetch('/api/auth-service/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          username: settingsForm.username,
          bio: settingsForm.bio,
          timezone: settingsForm.timezone,
          language: settingsForm.language,
          first_name: settingsForm.first_name,
          last_name: settingsForm.last_name,
          job_title: finalJobTitle,
          birthday: settingsForm.birthday,
        }),
      });
      
      if (!profileResponse.ok) {
        throw new Error('Failed to update profile');
      }
      
      // Refresh the user data to update the UI across the app
      await refreshUserData();
      
      setSaveStatus({ type: "success", message: "Profile updated successfully." });
      
      // Refresh profile data
      const refreshedProfile = await profileResponse.json();
      setProfileData(refreshedProfile);
      
      // Update job title display
      setSettingsForm(prev => ({
        ...prev,
        job_title: finalJobTitle,
        custom_job_title: "",
      }));
      
      refreshAvatar();
      setIsEditingMode(false);
      
      // Force a router refresh to update any server components
      router.refresh();
      
    } catch (error: any) {
      setSaveStatus({ type: "error", message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Loading profile...</div>
      </div>
    );
  }

  // Determine display name
  const displayName = settingsForm.first_name && settingsForm.last_name
    ? `${settingsForm.first_name} ${settingsForm.last_name}`
    : currentUser.user_metadata?.full_name || "User";

  return (
    <div className="space-y-8 pb-12">

      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <GlowCard className="overflow-hidden border-white/5 bg-white/[0.02]">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">

            {/* Avatar with upload functionality */}
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 transition-transform duration-500 group-hover:scale-105 overflow-hidden">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-black text-4xl tracking-tighter">{initials}</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
                id="avatar-upload"
              />
              <label
                htmlFor="avatar-upload"
                className={`absolute -bottom-2 -right-2 w-11 h-11 bg-[#1A1A24] border border-white/10 text-purple-400 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 cursor-pointer ${
                  isUploadingAvatar ? 'opacity-50 cursor-wait' : 'hover:bg-purple-500 hover:text-white'
                }`}
              >
                {isUploadingAvatar ? (
                  <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </label>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">{displayName}</h1>
                  <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-[#A0A0B5]">
                    <span className="flex items-center gap-2 text-sm bg-white/5 px-3 py-1 rounded-lg">
                      <Mail className="w-4 h-4 text-purple-400" />
                      {settingsForm.email}
                    </span>
                    <span className="flex items-center gap-2 text-sm bg-white/5 px-3 py-1 rounded-lg">
                      <Globe className="w-4 h-4 text-purple-400" />
                      {settingsForm.timezone}
                    </span>
                  </div>
                </div>
                <GlowButton 
                  variant="secondary" 
                  className="px-6 h-12"
                  onClick={() => setIsEditingMode(!isEditingMode)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {isEditingMode ? "Cancel" : "Edit Profile"}
                </GlowButton>
              </div>

              {settingsForm.bio && !isEditingMode && (
                <p className="text-[#A0A0B5] mb-6 leading-relaxed max-w-2xl text-lg">
                  {settingsForm.bio}
                </p>
              )}

              <div className="flex flex-wrap justify-center md:justify-start items-center gap-4">
                {settingsForm.job_title && !isEditingMode && (
                  <div className="px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-bold uppercase tracking-widest">
                    {settingsForm.job_title}
                  </div>
                )}
                <span className="text-[#6B6B80] text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Joined {joinDate}
                </span>
              </div>
            </div>
          </div>
        </GlowCard>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard icon={CheckCircle} label="Courses Completed"  value="8" />
        <StatCard icon={CheckCircle} label="Current Enrollment" value="3" />
        <StatCard icon={Award}       label="Certificates Earned" value="5" />
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="bg-[#12121A] border border-white/5 p-1.5 rounded-2xl mb-8 inline-flex">
          <TabsTrigger value="activity"     className="rounded-xl px-8 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">Activity</TabsTrigger>
          <TabsTrigger value="certificates" className="rounded-xl px-8 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">Certificates</TabsTrigger>
          <TabsTrigger value="settings"     className="rounded-xl px-8 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">Settings</TabsTrigger>
        </TabsList>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-0 outline-none">
          <GlowCard className="border-white/5">
            <h2 className="text-2xl font-bold text-white mb-8 tracking-tight">Recent Learning Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-5 p-5 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.03] transition-all group"
                >
                  <div className="p-3 bg-[#12121A] rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                    <activity.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium group-hover:text-purple-400 transition-colors">{activity.text}</p>
                    <p className="text-[#6B6B80] text-xs font-mono uppercase mt-1">{activity.date}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlowCard>
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="mt-0 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((cert) => (
              <GlowCard key={cert.id} className="group border-white/5 hover:border-purple-500/30 transition-all">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-4 bg-purple-500/10 rounded-2xl">
                    <Award className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-[#6B6B80] text-xs uppercase font-bold tracking-tighter">Verified</p>
                    <p className="text-purple-400 text-xs font-mono">{cert.id.toString().padStart(4, "0")}</p>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-purple-400 transition-colors">{cert.course}</h3>
                <p className="text-[#6B6B80] text-sm mb-6">Instructor: {cert.instructor}</p>
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <span className="text-[#A0A0B5] text-xs">{cert.issueDate}</span>
                  <GlowButton variant="outline" className="text-xs h-9">Download PDF</GlowButton>
                </div>
              </GlowCard>
            ))}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-0 outline-none">
          <GlowCard className="border-white/5">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight">Profile Settings</h2>
              {!isEditingMode && (
                <GlowButton variant="secondary" onClick={() => setIsEditingMode(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </GlowButton>
              )}
            </div>
            
            {/* Save status message */}
            {saveStatus && (
              <div className={`mb-6 rounded-xl border p-3 text-sm font-medium ${
                saveStatus.type === "success"
                  ? "border-green-500/20 bg-green-500/10 text-green-400"
                  : "border-red-500/20 bg-red-500/10 text-red-400"
              }`}>
                {saveStatus.message}
              </div>
            )}

            {isEditingMode ? (
              // Edit Mode - All fields editable
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#A0A0B5] ml-1">First Name</Label>
                    <Input
                      value={settingsForm.first_name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, first_name: e.target.value })}
                      placeholder="First name"
                      className="h-12 bg-[#12121A] border-white/10 text-white rounded-xl focus:ring-purple-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#A0A0B5] ml-1">Last Name</Label>
                    <Input
                      value={settingsForm.last_name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, last_name: e.target.value })}
                      placeholder="Last name"
                      className="h-12 bg-[#12121A] border-white/10 text-white rounded-xl focus:ring-purple-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#A0A0B5] ml-1">Username</Label>
                    <Input
                      value={settingsForm.username}
                      onChange={(e) => setSettingsForm({ ...settingsForm, username: e.target.value })}
                      placeholder="username"
                      className="h-12 bg-[#12121A] border-white/10 text-white rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#A0A0B5] ml-1">Email Address</Label>
                    <Input
                      value={settingsForm.email}
                      disabled
                      className="h-12 bg-[#12121A] border-white/10 text-white rounded-xl opacity-60 cursor-not-allowed"
                    />
                    <p className="text-xs text-[#6B6B80] ml-1">Email cannot be changed</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#A0A0B5] ml-1">Job Title</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80] pointer-events-none z-10" />
                      <select
                        value={settingsForm.job_title}
                        onChange={(e) => setSettingsForm({ ...settingsForm, job_title: e.target.value, custom_job_title: "" })}
                        className="w-full h-12 bg-[#12121A] border border-white/10 text-white rounded-xl pl-10 pr-4 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all outline-none [color-scheme:dark]"
                      >
                        <option value="">Select your job title</option>
                        {JOB_TITLES.map((title) => (
                          <option key={title} value={title}>{title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Custom job title input - only shows when "Other" is selected */}
                  {settingsForm.job_title === "Other" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#A0A0B5] ml-1">Custom Job Title</Label>
                      <Input
                        value={settingsForm.custom_job_title}
                        onChange={(e) => setSettingsForm({ ...settingsForm, custom_job_title: e.target.value })}
                        placeholder="e.g., Full Stack Developer, DevOps Engineer"
                        className="h-12 bg-[#12121A] border-white/10 text-white rounded-xl"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#A0A0B5] ml-1">Birthday</Label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                      <Input
                        type="date"
                        value={settingsForm.birthday}
                        onChange={(e) => setSettingsForm({ ...settingsForm, birthday: e.target.value })}
                        max={new Date().toISOString().split("T")[0]}
                        className="pl-10 bg-[#12121A] border-white/10 text-white rounded-xl h-12 [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#A0A0B5] ml-1">Language</Label>
                    <select
                      value={settingsForm.language}
                      onChange={(e) => setSettingsForm({ ...settingsForm, language: e.target.value })}
                      className="w-full h-12 bg-[#12121A] border border-white/10 text-white rounded-xl px-4 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all outline-none [color-scheme:dark]"
                    >
                      <option value="">Select language</option>
                      {LANGUAGES.map(({ code, label }) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#A0A0B5] ml-1">Timezone</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80] pointer-events-none" />
                      <Input
                        value={settingsForm.timezone}
                        disabled
                        className="h-12 bg-[#12121A] border-white/10 text-white rounded-xl pl-10 opacity-60 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-xs text-[#6B6B80] ml-1">Automatically detected from your browser</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#A0A0B5] ml-1">Bio</Label>
                  <textarea
                    value={settingsForm.bio}
                    onChange={(e) => setSettingsForm({ ...settingsForm, bio: e.target.value })}
                    rows={4}
                    placeholder="Tell us a bit about yourself..."
                    className="w-full px-5 py-4 bg-[#12121A] border border-white/10 rounded-2xl text-white focus:border-purple-500/50 outline-none transition-all resize-none"
                  />
                </div>

                <div className="flex gap-4">
                  <GlowButton
                    variant="primary"
                    className="px-8 h-12"
                    onClick={handleSaveProfile}
                    isLoading={isSaving}
                  >
                    Save Changes
                  </GlowButton>
                  <GlowButton
                    variant="ghost"
                    className="px-8 h-12 text-[#6B6B80]"
                    onClick={() => {
                      // Reset to original values
                      if (profileData) {
                        setSettingsForm({
                          email: currentUser.email ?? "",
                          bio: profileData.bio || "",
                          username: profileData.username || "",
                          first_name: profileData.first_name || "",
                          last_name: profileData.last_name || "",
                          job_title: profileData.job_title || "",
                          custom_job_title: "",
                          birthday: profileData.birthday || "",
                          language: profileData.language || "",
                          timezone: profileData.timezone || detectTimezone(),
                        });
                      }
                      setSaveStatus(null);
                      setIsEditingMode(false);
                    }}
                  >
                    Cancel
                  </GlowButton>
                </div>
              </div>
            ) : (
              // View Mode - Read-only display
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[#6B6B80] text-sm mb-1">Full Name</p>
                    <p className="text-white font-medium">{displayName}</p>
                  </div>
                  <div>
                    <p className="text-[#6B6B80] text-sm mb-1">Username</p>
                    <p className="text-white font-medium">@{settingsForm.username || "Not set"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[#6B6B80] text-sm mb-1">Email</p>
                    <p className="text-white font-medium">{settingsForm.email}</p>
                  </div>
                  <div>
                    <p className="text-[#6B6B80] text-sm mb-1">Job Title</p>
                    <p className="text-white font-medium">{settingsForm.job_title || "Not set"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[#6B6B80] text-sm mb-1">Birthday</p>
                    <p className="text-white font-medium">{settingsForm.birthday ? new Date(settingsForm.birthday).toLocaleDateString() : "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-[#6B6B80] text-sm mb-1">Timezone</p>
                    <p className="text-white font-medium">{settingsForm.timezone}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[#6B6B80] text-sm mb-1">Language</p>
                    <p className="text-white font-medium">
                      {LANGUAGES.find(l => l.code === settingsForm.language)?.label || "Not set"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[#6B6B80] text-sm mb-1">Bio</p>
                  <p className="text-white leading-relaxed">{settingsForm.bio || "No bio yet."}</p>
                </div>
              </div>
            )}
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}