// frontend/app/(main)/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Camera, Mail, Briefcase, Calendar as CalendarIcon, Save, X, 
  Globe, User, Lock, Bell, Shield, CreditCard, Loader2,
  CheckCircle, AlertCircle, Eye, EyeOff, ChevronRight, Sparkles,
  Trash2, LogOut, Monitor, Smartphone, Globe2, Crown,
  HelpCircle, MessageCircle, AlertTriangle, Key, Fingerprint,
  Database, Terminal, Server, Activity, Zap, Volume2, VolumeX,
  BellRing, BellOff, Mail as MailIcon, MessageSquare, AtSign, BookOpen, Trophy,
  Plus, Edit2, GraduationCap, Building2, Code, Palette, Database as DatabaseIcon,
  Cloud, Brain, Shield as ShieldIcon, Heart, Music, Camera as CameraIcon,
  Coffee, Gamepad, Film, Mic, Dumbbell, Target, Award as AwardIcon,
  ExternalLink, ThumbsUp, MessageCircle as MessageCircleIcon, Linkedin, Github, Twitter, Instagram, Link
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useAvatar } from "@/lib/useAvatar";
import SignOutButton from "@/components/SignOutButton";
import {
  validateUsername,
  validateName,
  validateBio,
  validateBirthday,
  validateLanguage,
  validateJobTitle,
  validatePassword,
  validateConfirmPassword,
} from "@/lib/validation";
import { SkillsSelector } from "@/components/settings/SkillsSelector";
//import Link from "next/link";

// Modal Component for confirmation dialogs
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, danger = false }: any) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg max-w-md w-full mx-4 border border-gray-700">
        <div className="p-6">
          <div className={`w-12 h-12 rounded-full ${danger ? 'bg-red-500/20' : 'bg-yellow-500/20'} flex items-center justify-center mx-auto mb-4`}>
            {danger ? <AlertTriangle className="w-6 h-6 text-red-500" /> : <AlertCircle className="w-6 h-6 text-yellow-500" />}
          </div>
          <h3 className="text-lg font-semibold text-white text-center mb-2">{title}</h3>
          <p className="text-sm text-gray-400 text-center mb-6">{message}</p>
          <div className="flex gap-3">
            <GlowButton variant="outline" onClick={onClose} fullWidth>Cancel</GlowButton>
            <GlowButton onClick={onConfirm} fullWidth className={danger ? 'bg-red-600 hover:bg-red-700' : ''}>Confirm</GlowButton>
          </div>
        </div>
      </div>
    </div>
  );
};

// Contact Support Modal
const ContactSupportModal = ({ isOpen, onClose, onSubmit }: any) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!subject || !message) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setSending(true);
    await onSubmit(subject, message);
    setSending(false);
    if (!sending) {
      onClose();
      setSubject("");
      setMessage("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg max-w-md w-full mx-4 border border-gray-700">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-white">Contact Support</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What's the issue?"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-300">Message</Label>
              <textarea
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 mt-1"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail..."
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <GlowButton variant="outline" onClick={onClose} fullWidth>Cancel</GlowButton>
            <GlowButton onClick={handleSubmit} isLoading={sending} fullWidth>Send Message</GlowButton>
          </div>
        </div>
      </div>
    </div>
  );
};

function detectTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Available interests options for the interests section
const availableInterests = [
  { id: "coding", label: "Coding", icon: Code, color: "blue" },
  { id: "design", label: "Design", icon: Palette, color: "pink" },
  { id: "data", label: "Data Science", icon: DatabaseIcon, color: "green" },
  { id: "cloud", label: "Cloud Computing", icon: Cloud, color: "cyan" },
  { id: "ai", label: "AI/ML", icon: Brain, color: "purple" },
  { id: "security", label: "Security", icon: ShieldIcon, color: "red" },
  { id: "music", label: "Music", icon: Music, color: "yellow" },
  { id: "gaming", label: "Gaming", icon: Gamepad, color: "orange" },
  { id: "reading", label: "Reading", icon: BookOpen, color: "emerald" },
  { id: "fitness", label: "Fitness", icon: Dumbbell, color: "lime" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { avatarUrl, refreshAvatar } = useAvatar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [hasSetPassword, setHasSetPassword] = useState(false);
  
  // Profile form state
  const [formData, setFormData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    job_title: "",
    bio: "",
    language: "en",
    timezone: "",
    birthday: "",
  });


  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Danger zone modals
  const [showSignOutDevices, setShowSignOutDevices] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showContactSupport, setShowContactSupport] = useState(false);
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ========== NEW STATE VARIABLES FOR ADDED SECTIONS ==========
  // Professional Info
  const [isEditingProfessional, setIsEditingProfessional] = useState(false);
  const [professionalInfo, setProfessionalInfo] = useState({
    jobTitle: "",
    professionalSummary: "",
    department: "",
    yearsOfExperience: "",
  });

  // Education
  const [isReordering, setIsReordering] = useState(false);
  interface Education {
    id?: string; // For updates/deletes
    profile_id?: string;
    institution_name: string;
    degree: string;
    field_of_study: string;
    start_year: number | null;
    end_year: number | null;
    is_current: boolean;
    description: string;
    order_index: number;
  }

  const [educationList, setEducationList] = useState<Education[]>([]);
  const [isAddingEducation, setIsAddingEducation] = useState(false);
  const [editingEducation, setEditingEducation] = useState<Education & { index: number } | null>(null);
  const [educationForm, setEducationForm] = useState<Omit<Education, 'order_index' | 'id' | 'profile_id'>>({
    institution_name: "",
    degree: "",
    field_of_study: "",
    start_year: null,
    end_year: null,
    is_current: false,
    description: "",
  });

  // Skills
  const [skills, setSkills] = useState<string[]>([]);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkill, setNewSkill] = useState("");

  // Interests
  const [isEditingInterests, setIsEditingInterests] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);


  // Social Links
  const [socialLinks, setSocialLinks] = useState({
    linkedin: "",
    github: "",
    twitter: "",
    website: "",
  });

  // ========== END NEW STATE VARIABLES ==========
  useEffect(() => {
    fetchProfile();
    checkAuthProvider();
    fetchNotificationPrefs();
  }, []);

  const loadEducation = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profile_educations")
      .select("*")
      .eq("profile_id", user.id)
      .order("order_index", { ascending: true });

    if (!error && data) {
      setEducationList(data);
    }
  };

  useEffect(() => {
    loadEducation();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'skills') {
      // Set active tab to profile (where skills section is)
      const tabsElement = document.querySelector('[value="profile"]');
      if (tabsElement) {
        // Trigger tab change
      }
      // Scroll to skills section
      setTimeout(() => {
        document.getElementById('skills-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  const [notificationPrefs, setNotificationPrefs] = useState<{
    email_enabled: boolean;
    push_enabled: boolean;
    assignment_reminders: boolean;
    course_updates: boolean;
    message_notifications: boolean;
    marketing_emails: boolean;
  } | null>(null); // Start as null

  const [loadingPrefs, setLoadingPrefs] = useState(true);

  // Update fetchNotificationPrefs to handle null state
  const fetchNotificationPrefs = async () => {
    setLoadingPrefs(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.log('No session found');
        setLoadingPrefs(false);
        return;
      }

      const response = await fetch('/api/notification-service/notification', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Raw response from backend:', JSON.stringify(data, null, 2));
        
        // IMPORTANT: Your backend returns preferences inside a 'preferences' object
        // The response structure is: { user_id: "...", preferences: { ... } }
        const preferencesData = data.preferences;
        
        // FIX: Check if preferencesData exists and has the expected properties
        if (preferencesData && typeof preferencesData === 'object') {
          console.log('Setting notification prefs from database:', preferencesData);
          setNotificationPrefs({
            email_enabled: preferencesData.email_enabled ?? true,
            push_enabled: preferencesData.push_enabled ?? true,
            assignment_reminders: preferencesData.assignment_reminders ?? true,
            course_updates: preferencesData.course_updates ?? true,
            message_notifications: preferencesData.message_notifications ?? true,
            marketing_emails: preferencesData.marketing_emails ?? false,
          });
        } else {
          console.log('No preferences found in response, creating defaults');
          // No preferences found, create default
          await createDefaultNotificationPrefs({
            email_enabled: true,
            push_enabled: true,
            assignment_reminders: true,
            course_updates: true,
            message_notifications: true,
            marketing_emails: false,
          });
          // Fetch again after creation
          await fetchNotificationPrefs();
          return;
        }
      } else if (response.status === 404) {
        console.log('404 - No preferences exist, creating defaults');
        // No preferences exist, create defaults
        await createDefaultNotificationPrefs({
          email_enabled: true,
          push_enabled: true,
          assignment_reminders: true,
          course_updates: true,
          message_notifications: true,
          marketing_emails: false,
        });
        // Fetch again after creation
        await fetchNotificationPrefs();
        return;
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch notification prefs:', response.status, errorText);
        // Even on error, set default values so UI doesn't break
        setNotificationPrefs({
          email_enabled: true,
          push_enabled: true,
          assignment_reminders: true,
          course_updates: true,
          message_notifications: true,
          marketing_emails: false,
        });
      }
    } catch (error) {
      console.error('Error fetching notification prefs:', error);
      // Set default values on error
      setNotificationPrefs({
        email_enabled: true,
        push_enabled: true,
        assignment_reminders: true,
        course_updates: true,
        message_notifications: true,
        marketing_emails: false,
      });
    } finally {
      setLoadingPrefs(false);
    }
  };

  const createDefaultNotificationPrefs = async (defaultPrefs: {
    email_enabled: boolean;
    push_enabled: boolean;
    assignment_reminders: boolean;
    course_updates: boolean;
    message_notifications: boolean;
    marketing_emails: boolean;
  }) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('No session found for creating preferences');
        return;
      }

      // Send all preferences at once to create the record
      const params = new URLSearchParams();
      Object.entries(defaultPrefs).forEach(([key, value]) => {
        params.append(key, String(value));
      });

      const response = await fetch(`/api/notification-service/notification?${params.toString()}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to create default notification preferences:', errorData);
      } else {
        const data = await response.json();
        console.log('Created default preferences:', data);
      }
    } catch (error) {
      console.error('Error creating default notification prefs:', error);
    }
  };

  const saveNotificationPrefs = async (key: keyof Exclude<typeof notificationPrefs, null>, value: boolean) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        toast.error('Please sign in to update preferences');
        return false;
      }

      // Update optimistic UI first
      setNotificationPrefs(prev => {
        if (!prev) return prev;
        return { ...prev, [key]: value };
      });

      const response = await fetch(`/api/notification-service/notification?${key}=${value}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Revert on error
        setNotificationPrefs(prev => {
          if (!prev) return prev;
          return { ...prev, [key]: !value };
        });
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update notification preferences');
        return false;
      }

      const data = await response.json();
      console.log('Update response:', data);
      
      // Update with the actual values from the server response
      if (data.preferences) {
        setNotificationPrefs({
          email_enabled: data.preferences.email_enabled ?? true,
          push_enabled: data.preferences.push_enabled ?? true,
          assignment_reminders: data.preferences.assignment_reminders ?? true,
          course_updates: data.preferences.course_updates ?? true,
          message_notifications: data.preferences.message_notifications ?? true,
          marketing_emails: data.preferences.marketing_emails ?? false,
        });
      }
      
      toast.success('Notification preferences updated');
      return true;
    } catch (error) {
      console.error('Error saving notification prefs:', error);
      // Revert on error
      setNotificationPrefs(prev => {
        if (!prev) return prev;
        return { ...prev, [key]: !value };
      });
      toast.error('Failed to update notification preferences');
      return false;
    }
  };

  // Update the toggle handler
  const handleNotificationChange = (key: keyof Exclude<typeof notificationPrefs, null>) => {
    if (!notificationPrefs) return; // Don't allow toggling while loading
    
    const newValue = !notificationPrefs[key];
    saveNotificationPrefs(key, newValue);
  };

  const checkAuthProvider = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;
      
      const response = await fetch('/api/auth-service/password-status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsGoogleUser(data.is_google_user);
        setHasSetPassword(data.has_password);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const isGoogle = user.app_metadata?.provider === 'google' || 
                           user.identities?.some(identity => identity.provider === 'google');
          setIsGoogleUser(isGoogle);
          
          if (isGoogle) {
            const hasEmailIdentity = user.identities?.some(identity => identity.provider === 'email');
            setHasSetPassword(hasEmailIdentity || false);
          } else {
            setHasSetPassword(true);
          }
        }
      }
    } catch (error) {
      console.error("Error checking auth provider:", error);
    }
  };


  const fetchProfile = async () => {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user");

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    setFormData({
      username: data.username || "",
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      job_title: data.job_title || "",
      bio: data.bio || "",
      language: data.language || "en",
      timezone: data.timezone || detectTimezone(),
      birthday: data.birthday || "",
    });

    // ADD THIS: Also populate professionalInfo
    setProfessionalInfo({
      jobTitle: data.job_title || "",
      professionalSummary: data.professional_summary || "",
      department: data.department || "",
      yearsOfExperience: data.years_of_experience?.toString() || "",
    });

  } catch (error) {
    console.error("Error fetching profile:", error);
    toast.error("Failed to load profile");
  } finally {
    setLoading(false);
  }
};

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (JPEG, PNG, GIF, or WEBP)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("You must be logged in to upload an avatar");
        return;
      }

      // Use the backend API endpoint (same as onboarding)
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await fetch('/api/auth-service/upload-avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload avatar');
      }

      const data = await response.json();
      const newAvatarUrl = data.avatar_url;
      
      // Store in localStorage for quick access
      if (newAvatarUrl) {
        localStorage.setItem('avatar_url', newAvatarUrl);
      } else {
        localStorage.removeItem('avatar_url');
      }
      
      // Refresh avatar in the useAvatar hook (this will update the avatarUrl state)
      await refreshAvatar();
      
      // Dispatch events for other components to update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('avatar-updated', { 
          detail: { avatarUrl: newAvatarUrl } 
        }));
        window.dispatchEvent(new CustomEvent('profile-updated'));
      }

      toast.success("Avatar updated successfully");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error(error.message || "Failed to upload avatar");
    }
  };


  // Social Links handlers
  const saveSocialLinks = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error } = await supabase
        .from("profiles")
        .update({ social_links: socialLinks })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Social links updated");
    } catch (error) {
      console.error("Error saving social links:", error);
      toast.error("Failed to save social links");
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error } = await supabase
        .from("profiles")
        .update({
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name,
          job_title: formData.job_title,
          bio: formData.bio,
          language: formData.language,
          timezone: formData.timezone,
          birthday: formData.birthday || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!isGoogleUser && !currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    
    if (isGoogleUser && hasSetPassword && !currentPassword) {
      toast.error("Please enter your current password");
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      toast.error(passwordValidation.error);
      return;
    }

    const confirmValidation = validateConfirmPassword(newPassword, confirmPassword);
    if (!confirmValidation.isValid) {
      toast.error(confirmValidation.error);
      return;
    }

    setChangingPassword(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      if (isGoogleUser && hasSetPassword && currentPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email!,
          password: currentPassword,
        });
        
        if (signInError) {
          toast.error("Current password is incorrect");
          return;
        }
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      if (!hasSetPassword && isGoogleUser) {
        toast.success("Password has been set successfully! You can now sign in with email and password.");
        setHasSetPassword(true);
        
        await fetch('/api/auth-service/set-password-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ has_password: true }),
        });
      } else {
        toast.success("Password changed successfully!");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOutAllDevices = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      
      toast.success("Signed out from all devices");
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error("Error signing out from all devices:", error);
      toast.error("Failed to sign out from all devices");
    } finally {
      setShowSignOutDevices(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You need to be logged in");
        return;
      }

      const response = await fetch('/api/auth-service/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete account");
      }

      toast.success("Account deleted successfully");
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1500);
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(error.message || "Failed to delete account");
    } finally {
      setShowDeleteAccount(false);
    }
  };

  const handleContactSupport = async (subject: string, message: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You need to be logged in");
        return;
      }

      const response = await fetch('/api/auth-service/contact-support', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject, message }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send message");
      }

      toast.success("Support ticket created! We'll get back to you within 24 hours.");
    } catch (error: any) {
      console.error("Error sending support message:", error);
      toast.error(error.message || "Failed to send message");
      throw error;
    }
  };

  // ========== NEW HANDLER FUNCTIONS FOR ADDED SECTIONS ==========
  const saveProfessionalInfo = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error } = await supabase
        .from("profiles")
        .update({
          job_title: professionalInfo.jobTitle,
          professional_summary: professionalInfo.professionalSummary,
          department: professionalInfo.department,
          years_of_experience: professionalInfo.yearsOfExperience,
        })
        .eq("id", user.id);

      if (error) throw error;
      
      // ADD THIS: Update formData.job_title to keep them in sync
      setFormData(prev => ({
        ...prev,
        job_title: professionalInfo.jobTitle
      }));
      
      toast.success("Professional info updated");
      
    } catch (error) {
      console.error("Error saving professional info:", error);
      toast.error("Failed to save professional info");
    }
  };

  // Save new education
  const saveEducation = async () => {
    if (!educationForm.institution_name || !educationForm.degree) {
      toast.error("Please fill in institution name and degree");
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      if (editingEducation !== null && editingEducation.id) {
        // UPDATE existing education
        const { error } = await supabase
          .from("profile_educations")
          .update({
            institution_name: educationForm.institution_name,
            degree: educationForm.degree,
            field_of_study: educationForm.field_of_study,
            start_year: educationForm.start_year,
            end_year: educationForm.is_current ? null : educationForm.end_year,
            is_current: educationForm.is_current,
            description: educationForm.description,

          })
          .eq("id", editingEducation.id);

        if (error) throw error;
        toast.success("Education updated");
      } else {
        // INSERT new education
        const { error } = await supabase
          .from("profile_educations")
          .insert({
            profile_id: user.id,
            institution_name: educationForm.institution_name,
            degree: educationForm.degree,
            field_of_study: educationForm.field_of_study,
            start_year: educationForm.start_year,
            end_year: educationForm.is_current ? null : educationForm.end_year,
            is_current: educationForm.is_current,
            description: educationForm.description,
            order_index: educationList.length, // Append to end
          });

        if (error) throw error;
        toast.success("Education added");
      }

      // Refresh the list
      await loadEducation();
      setIsAddingEducation(false);
      setEditingEducation(null);
      resetEducationForm();
    } catch (error) {
      console.error("Error saving education:", error);
      toast.error("Failed to save education");
    }
  };

  // Remove education
  const removeEducation = async (id: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("profile_educations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      // Refresh list
      await loadEducation();
      toast.success("Education removed");
    } catch (error) {
      console.error("Error removing education:", error);
      toast.error("Failed to remove education");
    }
  };

  // Reorder education (drag and drop or up/down buttons)
  const reorderEducation = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === educationList.length - 1)
    ) return;

    setIsReordering(true);
    const newList = [...educationList];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    
    try {
      const supabase = getSupabaseBrowserClient();
      // Update order_index for all items (or just the two swapped)
      for (let i = 0; i < newList.length; i++) {
        await supabase
          .from("profile_educations")
          .update({ order_index: i })
          .eq("id", newList[i].id);
      }
      setEducationList(newList);
      toast.success("Order updated");
    } catch (error) {
      console.error("Error reordering:", error);
      toast.error("Failed to update order");
    } finally {
      setIsReordering(false);
    }
  };

  // Reset form
  const resetEducationForm = () => {
    setEducationForm({
      institution_name: "",
      degree: "",
      field_of_study: "",
      start_year: null,
      end_year: null,
      is_current: false,
      description: "",
    });
  };

  // Start editing
  const startEditingEducation = (edu: Education, index: number) => {
    setEducationForm({
      institution_name: edu.institution_name,
      degree: edu.degree,
      field_of_study: edu.field_of_study || "",
      start_year: edu.start_year,
      end_year: edu.end_year,
      is_current: edu.is_current,
      description: edu.description || "",
    });
    setEditingEducation({ ...edu, index });
    setIsAddingEducation(true);
  };


  const addSkill = async () => {
    if (!newSkill.trim()) return;
    const updatedSkills = [...skills, newSkill.trim()];
    setSkills(updatedSkills);
    setNewSkill("");
    setIsAddingSkill(false);
    await saveSkillsToDB(updatedSkills);
    toast.success("Skill added");
  };

  const removeSkill = async (index: number) => {
    const updatedSkills = skills.filter((_, i) => i !== index);
    setSkills(updatedSkills);
    await saveSkillsToDB(updatedSkills);
    toast.success("Skill removed");
  };

  const saveSkillsToDB = async (skillsList: string[]) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error } = await supabase
        .from("profiles")
        .update({ skills: skillsList })
        .eq("id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error saving skills:", error);
    }
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const saveInterests = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error } = await supabase
        .from("profiles")
        .update({ interests: selectedInterests })
        .eq("id", user.id);

      if (error) throw error;
      setIsEditingInterests(false);
      toast.success("Interests updated");
    } catch (error) {
      console.error("Error saving interests:", error);
      toast.error("Failed to save interests");
    }
  };
  // ========== END NEW HANDLER FUNCTIONS ==========

  const getFieldError = (field: string) => errors[field];
  const getInputClassName = (field: string) => {
    const hasError = getFieldError(field) && touched[field];
    return `w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
      hasError ? 'border-red-500' : 'border-gray-700'
    }`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const getPasswordStrength = () => {
    if (!newPassword) return { strength: 0, label: "", color: "" };
    if (newPassword.length < 6) return { strength: 1, label: "Weak", color: "text-red-400" };
    if (newPassword.length < 8) return { strength: 2, label: "Fair", color: "text-yellow-400" };
    if (/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) && /[0-9]/.test(newPassword)) {
      return { strength: 4, label: "Strong", color: "text-green-400" };
    }
    return { strength: 3, label: "Good", color: "text-blue-400" };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account preferences and security</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-gray-800/50 border border-gray-700 w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="w-4 h-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-2">
            <AlertTriangle className="w-4 h-4" /> Danger Zone
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab - WITH ADDED SECTIONS */}
        <TabsContent value="profile" className="space-y-6">
          {/* Profile Information Section - ORIGINAL, UNCHANGED */}
          <GlowCard>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Profile Information</h2>
              
              {/* Profile Picture Section */}
              <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-800">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-white">
                        {formData.first_name?.[0] || formData.username?.[0] || "U"}
                      </span>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-1.5 bg-purple-600 rounded-full cursor-pointer hover:bg-purple-700 transition-colors">
                    <Camera className="w-3 h-3 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                </div>
                <div>
                  <p className="text-white font-medium">Profile Picture</p>
                  <p className="text-sm text-gray-400 mt-1">JPG, GIF or PNG. Max size 5MB.</p>
                </div>
              </div>

              {/* Personal Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">First Name</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="mt-1"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Last Name</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="mt-1"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Username</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="mt-1"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Bio</Label>
                  <textarea
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 mt-1"
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Birthday</Label>
                    <Input
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Language</Label>
                    <select
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 mt-1"
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="zh">Chinese</option>
                      <option value="ja">Japanese</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* ========== NEW: Social Links Section ========== */}
          <GlowCard>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Link className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Social Links</h3>
                </div>
                <GlowButton 
                  variant="outline" 
                  size="sm"
                  onClick={saveSocialLinks}
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save Links
                </GlowButton>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Linkedin className="w-5 h-5 text-blue-400" />
                  <Input
                    value={socialLinks.linkedin}
                    onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                    placeholder="LinkedIn URL (e.g., https://linkedin.com/in/username)"
                    className="flex-1 bg-gray-800 border-gray-700"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Github className="w-5 h-5 text-gray-400" />
                  <Input
                    value={socialLinks.github}
                    onChange={(e) => setSocialLinks({ ...socialLinks, github: e.target.value })}
                    placeholder="GitHub URL (e.g., https://github.com/username)"
                    className="flex-1 bg-gray-800 border-gray-700"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Twitter className="w-5 h-5 text-blue-400" />
                  <Input
                    value={socialLinks.twitter}
                    onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                    placeholder="Twitter/X URL"
                    className="flex-1 bg-gray-800 border-gray-700"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-green-400" />
                  <Input
                    value={socialLinks.website}
                    onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
                    placeholder="Personal Website or Portfolio"
                    className="flex-1 bg-gray-800 border-gray-700"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">Your social links will be displayed on your public profile</p>
            </div>
          </GlowCard>

          {/* Professional Info Section - ORIGINAL, UNCHANGED */}
          <GlowCard>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Professional Info</h3>
                </div>
                <GlowButton 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditingProfessional(!isEditingProfessional)}
                >
                  {isEditingProfessional ? <X className="w-4 h-4 mr-1" /> : <Edit2 className="w-4 h-4 mr-1" />}
                  {isEditingProfessional ? "Cancel" : "Edit"}
                </GlowButton>
              </div>
              
              {isEditingProfessional ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-300 mb-1 block">Job Title</Label>
                    <Input
                      value={professionalInfo.jobTitle}
                      onChange={(e) => setProfessionalInfo({ ...professionalInfo, jobTitle: e.target.value })}
                      placeholder="e.g., Senior Software Engineer"
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-gray-300 mb-1 block">Professional Summary</Label>
                    <textarea
                      value={professionalInfo.professionalSummary}
                      onChange={(e) => setProfessionalInfo({ ...professionalInfo, professionalSummary: e.target.value })}
                      placeholder="e.g., Experienced software engineer with 8+ years of expertise in full-stack development, leading cross-functional teams, and delivering scalable solutions..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-gray-300 mb-1 block">Department</Label>
                    <Input
                      value={professionalInfo.department}
                      onChange={(e) => setProfessionalInfo({ ...professionalInfo, department: e.target.value })}
                      placeholder="e.g., Engineering, Product, Design"
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-300 mb-1 block">Years of Experience</Label>
                    <Input
                      type="number"
                      value={professionalInfo.yearsOfExperience}
                      onChange={(e) => setProfessionalInfo({ ...professionalInfo, yearsOfExperience: e.target.value })}
                      placeholder="e.g., 5"
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <GlowButton 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditingProfessional(false)}
                    >
                      Cancel
                    </GlowButton>
                    <GlowButton 
                      size="sm"
                      onClick={() => {
                        saveProfessionalInfo();
                        setIsEditingProfessional(false);
                      }}
                    >
                      Save
                    </GlowButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Job Title</span>
                    <span className="text-white">{professionalInfo.jobTitle || "Not specified"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Professional Summary</span>
                    <span className="text-white whitespace-pre-wrap">{professionalInfo.professionalSummary || "Not specified"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Department</span>
                    <span className="text-white">{professionalInfo.department || "Not specified"}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-400">Experience</span>
                    <span className="text-white">{professionalInfo.yearsOfExperience ? `${professionalInfo.yearsOfExperience} years` : "Not specified"}</span>
                  </div>
                </div>
              )}
            </div>
          </GlowCard>

          {/* Education Section - ORIGINAL, UNCHANGED */}
          <GlowCard>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Education</h3>
                </div>
                <GlowButton 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAddingEducation(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </GlowButton>
              </div>
              
              <div className="space-y-3">
                {educationList.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No education added yet</p>
                ) : (
                  educationList.map((edu, index) => (
                    <div key={edu.id || index} className="p-3 bg-gray-800/30 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-white font-medium">{edu.degree}{edu.field_of_study && ` in ${edu.field_of_study}`}</p>
                          <p className="text-sm text-gray-400">{edu.institution_name}</p>
                          <p className="text-xs text-gray-500">
                            {edu.start_year && edu.start_year}
                            {edu.end_year && !edu.is_current && ` - ${edu.end_year}`}
                            {edu.is_current && " - Present"}
                          </p>
                          {edu.description && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{edu.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {/* Add Reorder Buttons */}
                          <div className="flex flex-col gap-1 mr-2">
                            {index > 0 && (
                              <button
                                onClick={() => reorderEducation(index, 'up')}
                                disabled={isReordering}
                                className="p-1 hover:bg-gray-700 rounded transition-colors"
                                title="Move up"
                              >
                                ↑
                              </button>
                            )}
                            {index < educationList.length - 1 && (
                              <button
                                onClick={() => reorderEducation(index, 'down')}
                                className="p-1 hover:bg-gray-700 rounded transition-colors"
                                title="Move down"
                              >
                                ↓
                              </button>
                            )}
                          </div>
                          {/* Edit and Delete buttons */}
                          <button
                            onClick={() => startEditingEducation(edu, index)}
                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-gray-400" />
                          </button>
                          <button
                            onClick={() => removeEducation(edu.id!)}
                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add/Edit Education Modal - ORIGINAL, UNCHANGED */}
              {(isAddingEducation || editingEducation !== null) && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 overflow-y-auto">
                  <div className="bg-gray-900 rounded-lg max-w-2xl w-full mx-4 border border-gray-700 p-6 max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      {editingEducation ? "Edit Education" : "Add Education"}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-300 mb-1 block">Institution Name *</Label>
                        <Input
                          value={educationForm.institution_name}
                          onChange={(e) => setEducationForm({ ...educationForm, institution_name: e.target.value })}
                          placeholder="e.g., Stanford University"
                          className="bg-gray-800 border-gray-700"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-300 mb-1 block">Degree *</Label>
                          <Input
                            value={educationForm.degree}
                            onChange={(e) => setEducationForm({ ...educationForm, degree: e.target.value })}
                            placeholder="e.g., Bachelor of Science"
                            className="bg-gray-800 border-gray-700"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-300 mb-1 block">Field of Study</Label>
                          <Input
                            value={educationForm.field_of_study}
                            onChange={(e) => setEducationForm({ ...educationForm, field_of_study: e.target.value })}
                            placeholder="e.g., Computer Science"
                            className="bg-gray-800 border-gray-700"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-300 mb-1 block">Start Year</Label>
                          <Input
                            type="number"
                            value={educationForm.start_year || ""}
                            onChange={(e) => setEducationForm({ ...educationForm, start_year: e.target.value ? parseInt(e.target.value) : null })}
                            placeholder="e.g., 2020"
                            className="bg-gray-800 border-gray-700"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-300 mb-1 block">End Year</Label>
                          <Input
                            type="number"
                            value={educationForm.end_year || ""}
                            onChange={(e) => setEducationForm({ ...educationForm, end_year: e.target.value ? parseInt(e.target.value) : null })}
                            placeholder="e.g., 2024"
                            disabled={educationForm.is_current}
                            className="bg-gray-800 border-gray-700"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={educationForm.is_current}
                          onCheckedChange={(checked) => {
                            setEducationForm({ 
                              ...educationForm, 
                              is_current: checked,
                              end_year: checked ? null : educationForm.end_year
                            });
                          }}
                        />
                        <Label className="text-gray-300">I currently study here</Label>
                      </div>

                      <div>
                        <Label className="text-gray-300 mb-1 block">Description</Label>
                        <textarea
                          value={educationForm.description}
                          onChange={(e) => setEducationForm({ ...educationForm, description: e.target.value })}
                          placeholder="Describe your studies, achievements, relevant coursework..."
                          rows={3}
                          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <GlowButton 
                        variant="outline" 
                        onClick={() => {
                          setIsAddingEducation(false);
                          setEditingEducation(null);
                          resetEducationForm();
                        }}
                        fullWidth
                      >
                        Cancel
                      </GlowButton>
                      <GlowButton 
                        onClick={saveEducation}
                        fullWidth
                      >
                        {editingEducation ? "Update" : "Add"}
                      </GlowButton>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </GlowCard>

          {/* Top Skills Section - ORIGINAL, UNCHANGED */}
          <GlowCard>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Code className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Skills</h3>
              </div>
              <SkillsSelector />
            </div>
          </GlowCard>

          {/* Interests Section - ORIGINAL, UNCHANGED */}
          <GlowCard>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Interests</h3>
                </div>
                <GlowButton 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditingInterests(!isEditingInterests)}
                >
                  {isEditingInterests ? <X className="w-4 h-4 mr-1" /> : <Edit2 className="w-4 h-4 mr-1" />}
                  {isEditingInterests ? "Cancel" : "Edit"}
                </GlowButton>
              </div>
              
              {isEditingInterests ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {availableInterests.map((interest) => (
                      <button
                        key={interest.id}
                        onClick={() => toggleInterest(interest.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                          selectedInterests.includes(interest.id)
                            ? "bg-purple-500 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        {interest.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <GlowButton 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setIsEditingInterests(false);
                      }}
                    >
                      Cancel
                    </GlowButton>
                    <GlowButton 
                      size="sm"
                      onClick={saveInterests}
                    >
                      Save Interests
                    </GlowButton>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedInterests.length === 0 ? (
                    <p className="text-gray-400 text-sm py-4 w-full text-center">No interests selected</p>
                  ) : (
                    selectedInterests.map((interestId) => {
                      const interest = availableInterests.find(i => i.id === interestId);
                      if (!interest) return null;
                      return (
                        <span key={interest.id} className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 text-sm">
                          {interest.label}
                        </span>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </GlowCard>

          {/* Save All Changes Button - AT THE BOTTOM */}
          <div className="flex justify-end">
            <GlowButton onClick={handleSaveProfile} isLoading={saving}>
              <Save className="w-4 h-4 mr-2" />
              Save All Changes
            </GlowButton>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          {loadingPrefs ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : notificationPrefs ? (
            <>
              {/* Channel Settings */}
              <GlowCard>
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-white">Notification Channels</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-white">Email Notifications</Label>
                        <p className="text-sm text-gray-400">Receive notifications via email</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.email_enabled}
                        onCheckedChange={() => handleNotificationChange('email_enabled')}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-white">Push Notifications</Label>
                        <p className="text-sm text-gray-400">Receive notifications in-app</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.push_enabled}
                        onCheckedChange={() => handleNotificationChange('push_enabled')}
                      />
                    </div>
                  </div>
                </div>
              </GlowCard>

              {/* Notification Types */}
              <GlowCard>
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-white">Notification Types</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-white">Assignment Reminders</Label>
                        <p className="text-sm text-gray-400">Get reminders about upcoming assignments</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.assignment_reminders}
                        onCheckedChange={() => handleNotificationChange('assignment_reminders')}
                        disabled={!notificationPrefs.email_enabled && !notificationPrefs.push_enabled}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-white">Course Updates</Label>
                        <p className="text-sm text-gray-400">Get notified about course changes and announcements</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.course_updates}
                        onCheckedChange={() => handleNotificationChange('course_updates')}
                        disabled={!notificationPrefs.email_enabled && !notificationPrefs.push_enabled}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-white">Message Notifications</Label>
                        <p className="text-sm text-gray-400">Get notified about new messages</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.message_notifications}
                        onCheckedChange={() => handleNotificationChange('message_notifications')}
                        disabled={!notificationPrefs.email_enabled && !notificationPrefs.push_enabled}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-white">Marketing Emails</Label>
                        <p className="text-sm text-gray-400">Receive promotional emails and updates</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.marketing_emails}
                        onCheckedChange={() => handleNotificationChange('marketing_emails')}
                        disabled={!notificationPrefs.email_enabled}
                      />
                    </div>
                  </div>
                </div>
              </GlowCard>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              Failed to load notification preferences. Please try again later.
            </div>
          )}
        </TabsContent>

        {/* Security Tab - UNCHANGED */}
        <TabsContent value="security" className="space-y-6">
          <GlowCard>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-2">Password Management</h2>
              <p className="text-sm text-gray-400 mb-6">
                {isGoogleUser 
                  ? !hasSetPassword 
                    ? "You signed up with Google. Set a password to also sign in with email and password."
                    : "You have a password set. Change it here if needed."
                  : "Change your password to keep your account secure."}
              </p>

              <div className="space-y-4">
                {(!isGoogleUser || (isGoogleUser && hasSetPassword)) && (
                  <div>
                    <Label className="text-gray-300">Current Password</Label>
                    <div className="relative mt-1">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {isGoogleUser && !hasSetPassword && (
                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <p className="text-sm text-blue-400">
                      ℹ️ You're setting a password for the first time. This will allow you to sign in with email and password in addition to Google Sign-In.
                      Future password changes will require your current password.
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-gray-300">New Password</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${(passwordStrength.strength / 4) * 100}%`,
                              backgroundColor: passwordStrength.strength >= 3 ? '#10b981' : passwordStrength.strength >= 2 ? '#f59e0b' : '#ef4444'
                            }}
                          />
                        </div>
                        <span className={`text-xs ${passwordStrength.color}`}>{passwordStrength.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Use 8+ characters with letters, numbers, and symbols</p>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-gray-300">Confirm New Password</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <GlowButton 
                    onClick={handleChangePassword} 
                    isLoading={changingPassword}
                    disabled={
                      !newPassword || 
                      !confirmPassword || 
                      (!isGoogleUser && !currentPassword) ||
                      (isGoogleUser && hasSetPassword && !currentPassword)
                    }
                  >
                    <Key className="w-4 h-4 mr-2" />
                    {isGoogleUser && !hasSetPassword ? "Set Password" : "Change Password"}
                  </GlowButton>
                </div>
              </div>
            </div>
          </GlowCard>
        </TabsContent>

        {/* Danger Zone Tab - UNCHANGED */}
        <TabsContent value="danger" className="space-y-6">
          <GlowCard>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h2 className="text-xl font-semibold text-white">Danger Zone</h2>
              </div>
              <p className="text-sm text-gray-400 mb-6">Irreversible and destructive actions</p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                  <div>
                    <h3 className="font-semibold text-white">Sign out of all devices</h3>
                    <p className="text-sm text-gray-400 mt-1">This will sign you out from all active sessions</p>
                  </div>
                  <GlowButton 
                    variant="outline" 
                    onClick={() => setShowSignOutDevices(true)}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out All
                  </GlowButton>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                  <div>
                    <h3 className="font-semibold text-white">Delete Account</h3>
                    <p className="text-sm text-gray-400 mt-1">Permanently delete your account and all data</p>
                  </div>
                  <GlowButton 
                    variant="outline" 
                    onClick={() => setShowDeleteAccount(true)}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </GlowButton>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
                  <div>
                    <h3 className="font-semibold text-white">Contact Support</h3>
                    <p className="text-sm text-gray-400 mt-1">Need help? Contact our support team</p>
                  </div>
                  <GlowButton 
                    variant="outline" 
                    onClick={() => setShowContactSupport(true)}
                    className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact Support
                  </GlowButton>
                </div>
              </div>
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <ConfirmModal
        isOpen={showSignOutDevices}
        onClose={() => setShowSignOutDevices(false)}
        onConfirm={handleSignOutAllDevices}
        title="Sign out of all devices?"
        message="This will sign you out from all browsers and devices. You'll need to sign in again on each device."
        danger={false}
      />

      <ConfirmModal
        isOpen={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onConfirm={handleDeleteAccount}
        title="Delete your account?"
        message="This action cannot be undone. All your data, courses, and certificates will be permanently deleted."
        danger={true}
      />

      <ContactSupportModal
        isOpen={showContactSupport}
        onClose={() => setShowContactSupport(false)}
        onSubmit={handleContactSupport}
      />
    </div>
  );
}