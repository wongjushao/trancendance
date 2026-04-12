// frontend/app/(main)/profile/ProfileClient.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Mail, Calendar, Edit, Award, CheckCircle, Briefcase, 
  User, Globe, MapPin, Link as LinkIcon, X, Save, Loader2,
  BookOpen, Star, TrendingUp, CalendarDays, Trophy, Users, Camera,
  ChevronRight, Sparkles, Download, Share2, Clock, Code, 
  Palette, Database, Cloud, Shield, Zap, Brain, Crown,
  Building2, UserPlus, Settings, CreditCard, Trash2, AlertCircle,
  LogOut, Plus, Heart, Music, Camera as CameraIcon, Coffee, 
  Gamepad, Book, Film, Mic, Dumbbell, Globe2, Target, Award as AwardIcon,
  CheckCircle2, ExternalLink, ThumbsUp, MessageCircle, Activity,
  Linkedin, Github, Twitter, Instagram, FileText, GraduationCap, 
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useAvatar } from "@/lib/useAvatar";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";
import SignOutButton from "@/components/SignOutButton";
import Link from "next/link";
import { motion } from "framer-motion";

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
  department: string | null;
  years_of_experience: number | null;
  professional_summary: string | null;
}

// Mock friends data
const friendsData = [
  { id: "1", name: "Alice Johnson", avatar: "AJ", mutualCourses: 3, status: "online" as const, courseProgress: 75 },
  { id: "2", name: "Bob Smith", avatar: "BS", mutualCourses: 2, status: "offline" as const, courseProgress: 60 },
  { id: "3", name: "Carol Davis", avatar: "CD", mutualCourses: 4, status: "online" as const, courseProgress: 90 },
  { id: "4", name: "David Wilson", avatar: "DW", mutualCourses: 1, status: "away" as const, courseProgress: 45 },
];

// Mock interests data
const availableInterests = [
  { id: "coding", label: "Coding", icon: Code, color: "blue" },
  { id: "design", label: "Design", icon: Palette, color: "pink" },
  { id: "data", label: "Data Science", icon: Database, color: "green" },
  { id: "cloud", label: "Cloud Computing", icon: Cloud, color: "cyan" },
  { id: "ai", label: "AI/ML", icon: Brain, color: "purple" },
  { id: "security", label: "Security", icon: Shield, color: "red" },
];

// Mock certificates data
const certificatesData = [
  { id: "1", title: "Advanced React Development", issuer: "LMS Platform", issueDate: "2024-01-15", grade: "92%", skills: ["React", "TypeScript", "Next.js"] },
  { id: "2", title: "Full-Stack TypeScript", issuer: "LMS Platform", issueDate: "2024-01-10", grade: "88%", skills: ["TypeScript", "Node.js", "Express"] },
];

// Achievements data
const achievementsData = [
  { id: "1", title: "Quick Learner", description: "Completed 5 lessons in a week", icon: Zap, earned: true, dateEarned: "2024-01-15", points: 100 },
  { id: "2", title: "Perfect Attendance", description: "Logged in for 7 days", icon: Calendar, earned: true, dateEarned: "2024-01-20", points: 150 },
  { id: "3", title: "Assignment Master", description: "Submitted 10 assignments", icon: CheckCircle, earned: false, progress: 70, points: 200 },
  { id: "4", title: "Course Warrior", description: "Complete 3 full courses", icon: Target, earned: false, progress: 33, points: 500 },
];

// Activity timeline
const activityTimeline = [
  { id: "1", type: "course", action: "Completed", title: "Advanced React Development", date: new Date(2024, 0, 15), points: 100 },
  { id: "2", type: "certificate", action: "Earned", title: "TypeScript Mastery", date: new Date(2024, 0, 10), points: 50 },
  { id: "3", type: "achievement", action: "Unlocked", title: "Quick Learner", date: new Date(2024, 0, 5), points: 25 },
  { id: "4", type: "assignment", action: "Submitted", title: "API Integration Project", date: new Date(2024, 0, 3), points: 75 },
];

const badgesData = [
  { id: "1", title: "Early Bird", description: "Joined the platform", icon: Zap, earned: true, dateEarned: "2024-01-01" },
  { id: "2", title: "First Course", description: "Completed first course", icon: BookOpen, earned: true, dateEarned: "2024-01-15" },
  { id: "3", title: "Perfect Week", description: "7-day learning streak", icon: Calendar, earned: false, progress: 3 },
  { id: "4", title: "Community Helper", description: "Answered 10 questions", icon: MessageCircle, earned: false, progress: 2 },
];

export default function ProfileClient({ user }: ProfileClientProps) {
  const router = useRouter();
  const { avatarUrl, refreshAvatar } = useAvatar();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userInterests] = useState<string[]>(["coding", "design", "ai"]);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [educations, setEducations] = useState<any[]>([]);

  // SINGLE fetch function that gets everything
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      
      // Fetch profile data (includes professional fields)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
        
      if (profileError) throw profileError;
      setProfile(profileData);
      
      // Fetch education data
      const { data: educationData, error: educationError } = await supabase
        .from('profile_educations')
        .select('*')
        .eq('profile_id', user.id)
        .order('order_index', { ascending: true });
      
      if (educationError) throw educationError;
      setEducations(educationData || []);
      
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user.id]);

  useEffect(() => {
    if (profile) {
      const requiredFields = [
        profile.username,
        profile.first_name,
        profile.last_name,
        profile.bio,
        profile.birthday,
        profile.job_title,
      ];
      const filledCount = requiredFields.filter(field => field && field.trim() !== "").length;
      const percentage = Math.round((filledCount / requiredFields.length) * 100);
      setProfileCompletion(percentage);
    }
  }, [profile]);

// Set up Supabase Realtime subscriptions for automatic updates
useEffect(() => {
  const supabase = getSupabaseBrowserClient();
  
  // Subscribe to changes on profiles table
  const profilesSubscription = supabase
    .channel('profile-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      },
      (payload) => {
        console.log('Profile updated via realtime:', payload);
        fetchProfile(); // Refresh profile data
      }
    )
    .subscribe();
  
  // Subscribe to changes on profile_educations table
  const educationSubscription = supabase
    .channel('education-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'profile_educations',
        filter: `profile_id=eq.${user.id}`
      },
      (payload) => {
        console.log('Education updated via realtime:', payload);
        fetchProfile(); // Refresh profile data (which includes education)
      }
    )
    .subscribe();
  
  // Cleanup subscriptions when component unmounts
  return () => {
    profilesSubscription.unsubscribe();
    educationSubscription.unsubscribe();
  };
}, [user.id]); // Re-run if user.id changes

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const supabase = getSupabaseBrowserClient();
      
      // ✅ Get fresh session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to upload an avatar");
        return;
      }
      
      const userId = session.user.id;
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      // ✅ Update profile with the correct user ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);  // Make sure this matches auth.uid()
        
      if (updateError) throw updateError;
      
      toast.success("Avatar updated successfully");
      refreshAvatar();
      
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    }
  };

  const getInitials = () => {
    const firstName = profile?.first_name || user.user_metadata?.first_name || "";
    const lastName = profile?.last_name || user.user_metadata?.last_name || "";
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    if (firstName) return firstName[0].toUpperCase();
    return user.email?.[0].toUpperCase() || "U";
  };

  const getFullName = () => {
    const firstName = profile?.first_name || user.user_metadata?.first_name || "";
    const lastName = profile?.last_name || user.user_metadata?.last_name || "";
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    return user.email?.split('@')[0] || "User";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const displayedAchievements = showAllAchievements ? achievementsData : achievementsData.slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Hero Banner - Full width */}
      <div className="relative">
        <div className="relative h-48 md:h-56 rounded-xl overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600">
          <div className="absolute inset-0 bg-black/30"></div>
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
              
              {/* Avatar - Simple circle, no cropping */}
              <div className="relative">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 shadow-2xl">
                  <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="Avatar" 
                        className="w-full h-full rounded-full object-cover" 
                      />
                    ) : (
                      <span className="text-3xl md:text-4xl font-bold text-white">{getInitials()}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-2 md:mt-0 flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{getFullName()}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-200">
                  {profile?.job_title && (
                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{profile.job_title}</span>
                  )}
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{user.email}</span>
                </div>
              </div>
              
              <Link href="/settings">
                <GlowButton size="sm" variant="outline" className="mt-2 md:mt-0">
                  <Edit className="w-4 h-4 mr-2" />Edit Profile
                </GlowButton>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* About Me Section - Full width */}
      {profile?.bio && (
      <GlowCard>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-3">About Me</h2>
          <p className="text-gray-300 leading-relaxed break-words whitespace-normal break-all max-w-full">
            {profile.bio}
          </p>
        </div>
      </GlowCard>
      )}

      {/* Two Column Layout - Left (smaller) and Right (larger) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN - 4 columns wide */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">
          
          {/* Profile Completion Card - Only show if not 100% */}
          {profileCompletion < 100 && (
            <GlowCard>
              <div className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-300">Profile Strength</span>
                  <span className="text-sm font-semibold text-purple-400">{profileCompletion}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${profileCompletion}%` }} 
                  />
                </div>
                <p className="text-xs text-gray-400">Complete your profile for better recommendations</p>
              </div>
            </GlowCard>
          )}

          {/* Connections Card */}
          <GlowCard>
            <div className="p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-white">Connections</h3>
                <GlowButton size="sm" variant="ghost" className="h-8 px-2 text-xs">
                  View All
                </GlowButton>
              </div>
              <div className="space-y-3">
                {friendsData.slice(0, 3).map((friend) => (
                  <div key={friend.id} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold">
                      {friend.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{friend.name}</p>
                      <p className="text-xs text-gray-500">{friend.mutualCourses} mutual courses</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${friend.status === "online" ? "bg-green-400" : "bg-gray-500"}`} />
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>

          {/* Professional Info */}
          <GlowCard>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-white">Professional Info</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Work experience and professional background</p>
                </div>
                {/* Only show button if NO professional data exists */}
                {(!profile?.job_title && !profile?.department && !profile?.professional_summary) && (
                  <button
                    onClick={() => router.push('/settings?tab=professional')}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition-colors"
                  >
                    Add Info
                  </button>
                )}
              </div>
              
              {/* Has professional data - display it */}
              {(profile?.job_title || profile?.department || profile?.professional_summary || profile?.years_of_experience) ? (
                <div className="space-y-3">
                  {(profile?.job_title || profile?.department) && (
                    <div>
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <Briefcase className="w-4 h-4" />
                        <span>Position</span>
                      </div>
                      <p className="text-white">
                        {profile?.job_title || 'Not specified'}
                        {profile?.department && ` at ${profile.department}`}
                      </p>
                    </div>
                  )}
                  
                  {profile?.years_of_experience && (
                    <div>
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>Experience</span>
                      </div>
                      <p className="text-white">{profile.years_of_experience} years</p>
                    </div>
                  )}
                  
                  {profile?.professional_summary && (
                    <div>
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <FileText className="w-4 h-4" />
                        <span>Summary</span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {profile.professional_summary}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty State - No professional data */
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                    <Briefcase className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-gray-400 text-sm mb-2">No professional information added</p>
                  <p className="text-gray-500 text-xs">Click "Add Info" to share your work experience</p>
                </div>
              )}
            </div>
          </GlowCard>

          {/* Education */}
          <GlowCard>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-white">Education</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Academic background and qualifications</p>
                </div>
                {/* Only show button if NO education entries exist */}
                {(!educations || educations.length === 0) && (
                  <button
                    onClick={() => router.push('/settings?tab=education')}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition-colors"
                  >
                    Add Education
                  </button>
                )}
              </div>
              
              {/* Has education data - display it */}
              {educations && educations.length > 0 ? (
                <div className="space-y-4">
                  {educations.map((edu, index) => (
                    <div key={edu.id || index} className="border-b border-gray-700 last:border-0 pb-3 last:pb-0">
                      <h4 className="font-medium text-white mb-1">{edu.institution_name}</h4>
                      <p className="text-sm text-gray-400">
                        {edu.degree}
                        {edu.field_of_study && ` in ${edu.field_of_study}`}
                      </p>
                      {(edu.start_year || edu.end_year) && (
                        <p className="text-xs text-gray-500 mt-1">
                          {edu.start_year} - {edu.is_current ? 'Present' : (edu.end_year || 'Present')}
                        </p>
                      )}
                      {edu.description && (
                        <p className="text-xs text-gray-400 mt-2">{edu.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* Empty State - No education data */
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                    <GraduationCap className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-gray-400 text-sm mb-2">No education added yet</p>
                  <p className="text-gray-500 text-xs">Click "Add Education" to share your academic background</p>
                </div>
              )}
            </div>
          </GlowCard>

          {/* Top Skills */}
          <GlowCard>
            <div className="p-5">
              <h3 className="font-semibold text-white mb-3">Top Skills</h3>
              <div className="flex flex-wrap gap-2">
                {["React", "TypeScript", "Node.js", "Python", "GraphQL", "Docker"].map((skill) => (
                  <span key={skill} className="px-2 py-1 text-xs rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </GlowCard>

          {/* Interests */}
          <GlowCard>
            <div className="p-5 h-full flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-white">Interests</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {userInterests.map(interestId => {
                  const interest = availableInterests.find(i => i.id === interestId);
                  if (!interest) return null;
                  const Icon = interest.icon;
                  return (
                    <div key={interest.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-${interest.color}-500/20 text-${interest.color}-400 border border-${interest.color}-500/30`}>
                      <Icon className="w-3 h-3" />
                      <span>{interest.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlowCard>
        </div>

        {/* RIGHT COLUMN - 8 columns wide */}
        <div className="lg:col-span-8 space-y-6">

          {/* Stats Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlowCard className="p-4">
              <div className="text-center">
                <BookOpen className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">18</p>
                <p className="text-xs text-gray-400">Courses</p>
              </div>
            </GlowCard>
            <GlowCard className="p-4">
              <div className="text-center">
                <Award className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">8</p>
                <p className="text-xs text-gray-400">Certificates</p>
              </div>
            </GlowCard>
            <GlowCard className="p-4">
              <div className="text-center">
                <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">12</p>
                <p className="text-xs text-gray-400">Achievements</p>
              </div>
            </GlowCard>
            <GlowCard className="p-4">
              <div className="text-center">
                <Users className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">24</p>
                <p className="text-xs text-gray-400">Connections</p>
              </div>
            </GlowCard>
          </div>

          {/* Activity Timeline */}
          <GlowCard>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-white">Recent Activity</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Your latest learning milestones</p>
                </div>
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <div className="space-y-3">
                {activityTimeline.slice(0, 4).map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      {activity.type === "course" && <BookOpen className="w-4 h-4 text-purple-400" />}
                      {activity.type === "certificate" && <AwardIcon className="w-4 h-4 text-green-400" />}
                      {activity.type === "achievement" && <Trophy className="w-4 h-4 text-yellow-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">
                        <span className="font-semibold">{activity.action}</span> {activity.title}
                      </p>
                      <p className="text-xs text-gray-500">{activity.date.toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-purple-400 font-semibold">+{activity.points}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </GlowCard>

          {/* Badges Section */}
          {/* <GlowCard>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-white">Badges</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Special recognition badges</p>
                </div>
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {badgesData.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <div key={badge.id} className={`p-3 rounded-lg text-center ${badge.earned ? "bg-purple-500/10 border border-purple-500/30" : "bg-gray-800/30 border border-gray-700"}`}>
                      <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${badge.earned ? "bg-purple-500/20" : "bg-gray-700/50"}`}>
                        <Icon className={`w-6 h-6 ${badge.earned ? "text-purple-400" : "text-gray-500"}`} />
                      </div>
                      <h4 className="text-xs font-semibold text-white">{badge.title}</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">{badge.description}</p>
                      {!badge.earned && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-700 rounded-full h-1">
                            <div className="bg-purple-500 h-1 rounded-full" style={{ width: `${(badge.progress || 0) * 25}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </GlowCard> */}

          {/* Achievements Grid
          <GlowCard>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-white">Achievements</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Badges you've earned</p>
                </div>
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayedAchievements.map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <div key={achievement.id} className={`p-3 rounded-lg border ${achievement.earned ? "bg-green-500/10 border-green-500/30" : "bg-gray-800/30 border-gray-700"}`}>
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 rounded-lg ${achievement.earned ? "bg-green-500/20" : "bg-gray-700/50"}`}>
                          <Icon className={`w-4 h-4 ${achievement.earned ? "text-green-400" : "text-gray-400"}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-white">{achievement.title}</h4>
                          <p className="text-xs text-gray-400">{achievement.description}</p>
                          {!achievement.earned && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-700 rounded-full h-1">
                                <div className="bg-purple-500 h-1 rounded-full" style={{ width: `${achievement.progress}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-purple-400">{achievement.points}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {achievementsData.length > 2 && (
                <button
                  onClick={() => setShowAllAchievements(!showAllAchievements)}
                  className="mt-4 text-center w-full text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {showAllAchievements ? "Show Less" : `Show ${achievementsData.length - 2} More Achievements`}
                </button>
              )}
            </div>
          </GlowCard> */}

          {/* Certificates */}
          <GlowCard>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-white">Recent Certificates</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Your earned credentials</p>
                </div>
                <Award className="w-5 h-5 text-green-400" />
              </div>
              <div className="space-y-3">
                {certificatesData.map((cert) => (
                  <div key={cert.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-white">{cert.title}</h4>
                      <p className="text-xs text-gray-400">{cert.issuer}</p>
                      <div className="flex gap-1 mt-1">
                        {cert.skills.slice(0, 2).map((skill) => (
                          <span key={skill} className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">{skill}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-green-400 font-semibold">{cert.grade}</p>
                      <GlowButton size="sm" variant="ghost" className="h-8 px-2 mt-1">
                        <Download className="w-3 h-3" />
                      </GlowButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}