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

interface Education {
  id: string;
  institution_name: string;
  degree: string | null;
  field_of_study: string | null;
  start_year: number | null;
  end_year: number | null;
  is_current: boolean;
  order_index: number;
}

interface UserSkill {
  skill_id: number;
  name: string;
  level: number;
  years: number;
}

interface Connection {
  id: string;
  name: string;
  avatar: string;
  mutualCourses: number;
  status: "online" | "offline" | "away";
  courseProgress: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  dateEarned?: string;
  progress?: number;
  points: number;
}

interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  dateEarned?: string;
  progress?: number;
}

interface Activity {
  id: string;
  type: string;
  action: string;
  title: string;
  date: string;
  points: number;
}

interface ProfileStats {
  enrolled_courses: number;
  completed_courses: number;
  connections: number;
  skills_count: number;
}

// Helper to get auth token
const getAuthToken = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

export default function ProfileClient({ user }: ProfileClientProps) {
  const router = useRouter();
  const { avatarUrl, refreshAvatar } = useAvatar();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [educations, setEducations] = useState<Education[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  
  // New state from backend
  const [profileStats, setProfileStats] = useState<ProfileStats>({
    enrolled_courses: 0,
    completed_courses: 0,
    connections: 0,
    skills_count: 0,
  });
  const [connections, setConnections] = useState<Connection[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Fetch all profile-related data
  const fetchProfileData = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error('No auth token');
        return null;
      }

      // Fetch profile data
      const profileResponse = await fetch('/api/auth-service/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch profile');
      }

      const profileData = await profileResponse.json();
      setProfile(profileData);
      setEducations(profileData.educations || []);
      setUserSkills(profileData.skills || []);
      
      // Fetch profile stats
      const statsResponse = await fetch('/api/org-service/profile/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setProfileStats(statsData);
      }
      
      // Fetch connections
      const connectionsResponse = await fetch('/api/org-service/profile/connections', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json();
        setConnections(connectionsData.connections || []);
      }
      
      // Fetch achievements and badges
      const achievementsResponse = await fetch('/api/org-service/profile/achievements', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (achievementsResponse.ok) {
        const achievementsData = await achievementsResponse.json();
        setAchievements(achievementsData.achievements || []);
        setBadges(achievementsData.badges || []);
      }
      
      // Fetch recent activity
      const activityResponse = await fetch('/api/org-service/profile/activity', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setActivities(activityData.activities || []);
      }
      
      return profileData;
      
    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast.error('Failed to load profile data');
      return null;
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchProfileData();
      setLoading(false);
    };
    loadData();
  }, []);

  // Calculate profile completion
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      const token = await getAuthToken();
      if (!token) {
        toast.error("You must be logged in to upload an avatar");
        return;
      }
      
      const response = await fetch('/api/auth-service/upload-avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }
      
      const data = await response.json();
      toast.success("Avatar updated successfully");
      refreshAvatar();
      await fetchProfileData();
      
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

  const hasNoSocialLinks = () => {
    const socialLinks = profile?.social_links;
    if (!socialLinks) return true;
    if (typeof socialLinks !== 'object') return true;
    return Object.values(socialLinks).every(value => 
      value === '' || value === null || value === undefined
    );
  };

  // Helper to render achievement icons
  const getAchievementIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      Zap: Zap,
      CheckCircle: CheckCircle,
      Target: Target,
      Calendar: Calendar,
      Award: Award,
    };
    const IconComponent = icons[iconName] || Award;
    return <IconComponent className="w-5 h-5" />;
  };

  // Helper to render badge icons
  const getBadgeIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      Zap: Zap,
      BookOpen: BookOpen,
      Calendar: Calendar,
      MessageCircle: MessageCircle,
      Crown: Crown,
    };
    const IconComponent = icons[iconName] || Award;
    return <IconComponent className="w-4 h-4" />;
  };

  const displayedAchievements = showAllAchievements ? achievements : achievements.slice(0, 2);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative">
        <div className="relative h-48 md:h-56 rounded-xl overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600">
          <div className="absolute inset-0 bg-black/30"></div>
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
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
      
      {/* About Me Section */}
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

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">
          
          {/* Profile Completion Card */}
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
                <h3 className="font-semibold text-white">Connections ({profileStats.connections})</h3>
                <GlowButton size="sm" variant="ghost" className="h-8 px-2 text-xs">
                  View All
                </GlowButton>
              </div>
              <div className="space-y-3">
                {connections.slice(0, 3).map((connection) => (
                  <div key={connection.id} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold">
                      {connection.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{connection.name}</p>
                      <p className="text-xs text-gray-500">{connection.mutualCourses} mutual courses</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${connection.status === "online" ? "bg-green-400" : "bg-gray-500"}`} />
                  </div>
                ))}
                {connections.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-2">No connections yet</p>
                )}
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
                {(!profile?.job_title && !profile?.department && !profile?.professional_summary) && (
                  <button
                    onClick={() => router.push('/settings?tab=professional')}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition-colors"
                  >
                    Add Info
                  </button>
                )}
              </div>
              
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
                {(!educations || educations.length === 0) && (
                  <button
                    onClick={() => router.push('/settings?tab=education')}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition-colors"
                  >
                    Add Education
                  </button>
                )}
              </div>
              
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
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-white">Skills ({profileStats.skills_count})</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Your professional skills and expertise</p>
                </div>
                {(!userSkills || userSkills.length === 0) && (
                  <button
                    onClick={() => router.push('/settings?tab=skills')}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition-colors"
                  >
                    Add Skills
                  </button>
                )}
              </div>
              
              {userSkills && userSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {userSkills.map((skill, index) => (
                    <span
                      key={skill.skill_id || index}
                      className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 text-sm flex items-center gap-2"
                    >
                      {skill.name}
                      {skill.level && (
                        <span className="text-xs text-purple-300">Lv.{skill.level}</span>
                      )}
                      {skill.years !== undefined && skill.years !== null && skill.years > 0 && (
                        <span className="text-xs text-purple-300/70">
                          {skill.years} yr{skill.years !== 1 ? 's' : ''}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                    <Code className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-gray-400 text-sm mb-2">No skills added yet</p>
                  <p className="text-gray-500 text-xs">Click "Add Skills" to showcase your expertise</p>
                </div>
              )}
            </div>
          </GlowCard>

          {/* Interests */}
          {profile?.interests && profile.interests.length > 0 && (
            <GlowCard>
              <div className="p-5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-semibold text-white">Interests</h3>
                    <p className="text-xs text-gray-400 mt-0.5">What you're passionate about</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, idx) => (
                    <span key={idx} className="px-3 py-1 text-sm bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </GlowCard>
          )}

          {/* Social Links Section */}
          <GlowCard>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-white">Social Links</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Connect with me</p>
                </div>
                {hasNoSocialLinks() && (
                  <button
                    onClick={() => router.push('/settings?tab=social-links')}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition-colors"
                  >
                    Add Links
                  </button>
                )}
              </div>
              
              {profile?.social_links && 
              typeof profile.social_links === 'object' && 
              Object.keys(profile.social_links).length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {profile.social_links.github && (
                    <a
                      href={profile.social_links.github.startsWith('http') ? profile.social_links.github : `https://github.com/${profile.social_links.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors group"
                    >
                      <Github className="w-4 h-4 text-gray-400 group-hover:text-white" />
                      <span className="text-sm text-gray-400 group-hover:text-white">GitHub</span>
                    </a>
                  )}
                  {profile.social_links.twitter && (
                    <a
                      href={profile.social_links.twitter.startsWith('http') ? profile.social_links.twitter : `https://twitter.com/${profile.social_links.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors group"
                    >
                      <Twitter className="w-4 h-4 text-gray-400 group-hover:text-white" />
                      <span className="text-sm text-gray-400 group-hover:text-white">Twitter</span>
                    </a>
                  )}
                  {profile.social_links.instagram && (
                    <a
                      href={profile.social_links.instagram.startsWith('http') ? profile.social_links.instagram : `https://instagram.com/${profile.social_links.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors group"
                    >
                      <Instagram className="w-4 h-4 text-gray-400 group-hover:text-white" />
                      <span className="text-sm text-gray-400 group-hover:text-white">Instagram</span>
                    </a>
                  )}
                  {profile.social_links.linkedin && (
                    <a
                      href={profile.social_links.linkedin.startsWith('http') ? profile.social_links.linkedin : `https://linkedin.com/in/${profile.social_links.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors group"
                    >
                      <Linkedin className="w-4 h-4 text-gray-400 group-hover:text-white" />
                      <span className="text-sm text-gray-400 group-hover:text-white">LinkedIn</span>
                    </a>
                  )}
                  {profile.social_links.website && (
                    <a
                      href={profile.social_links.website.startsWith('http') ? profile.social_links.website : `https://${profile.social_links.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors group"
                    >
                      <Globe className="w-4 h-4 text-gray-400 group-hover:text-white" />
                      <span className="text-sm text-gray-400 group-hover:text-white">Website</span>
                    </a>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                    <LinkIcon className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-gray-400 text-sm mb-2">No social links added yet</p>
                  <p className="text-gray-500 text-xs">Click "Add Links" to share your social profiles</p>
                </div>
              )}
            </div>
          </GlowCard>
        </div>
        
        {/* RIGHT COLUMN */}
        <div className="lg:col-span-8 space-y-6">

          {/* Stats Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlowCard className="p-4">
              <div className="text-center">
                <BookOpen className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{profileStats.enrolled_courses}</p>
                <p className="text-xs text-gray-400">Courses</p>
              </div>
            </GlowCard>
            <GlowCard className="p-4">
              <div className="text-center">
                <Award className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{profileStats.completed_courses}</p>
                <p className="text-xs text-gray-400">Completed</p>
              </div>
            </GlowCard>
            <GlowCard className="p-4">
              <div className="text-center">
                <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{profileStats.connections}</p>
                <p className="text-xs text-gray-400">Connections</p>
              </div>
            </GlowCard>
            <GlowCard className="p-4">
              <div className="text-center">
                <Code className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{profileStats.skills_count}</p>
                <p className="text-xs text-gray-400">Skills</p>
              </div>
            </GlowCard>
          </div>

          {/* Achievements Section */}
          <GlowCard>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-white">Achievements</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Your learning milestones</p>
                </div>
                {achievements.length > 2 && (
                  <button
                    onClick={() => setShowAllAchievements(!showAllAchievements)}
                    className="text-sm text-purple-400 hover:text-purple-300"
                  >
                    {showAllAchievements ? "Show Less" : "View All"}
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {displayedAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      achievement.earned
                        ? "bg-green-500/10 border border-green-500/30"
                        : "bg-gray-800/30 border border-gray-700"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      achievement.earned
                        ? "bg-gradient-to-br from-green-500 to-emerald-600"
                        : "bg-gray-700"
                    }`}>
                      {getAchievementIcon(achievement.icon)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{achievement.title}</p>
                      <p className="text-xs text-gray-400">{achievement.description}</p>
                      {achievement.progress !== undefined && achievement.progress < 100 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{achievement.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div
                              className="bg-purple-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${achievement.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-purple-400">+{achievement.points}</span>
                      {achievement.earned && achievement.dateEarned && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(achievement.dateEarned).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>

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
                {activities.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No recent activity</p>
                    <p className="text-sm text-gray-500 mt-1">Start learning to see your progress!</p>
                  </div>
                ) : (
                  activities.slice(0, 4).map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/30 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                        {activity.type === "course" && <BookOpen className="w-4 h-4 text-purple-400" />}
                        {activity.type === "achievement" && <Trophy className="w-4 h-4 text-yellow-400" />}
                        {activity.type === "assignment" && <FileText className="w-4 h-4 text-blue-400" />}
                        {activity.type === "lesson" && <PlayCircle className="w-4 h-4 text-green-400" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white">
                          <span className="font-semibold">{activity.action}</span> {activity.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.date ? new Date(activity.date).toLocaleDateString() : "Recently"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-purple-400 font-semibold">+{activity.points}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </GlowCard>

        </div>
      </div>
    </div>
  );
}