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

  // Notification preferences state (frontend only)
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailNotifications: true,
    pushNotifications: true,
    assignmentReminders: true,
    courseUpdates: true,
    achievementAlerts: true,
    messageNotifications: true,
    marketingEmails: false,
    digestEmails: true,
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
    department: "",
    yearsOfExperience: "",
  });

  // Education
  const [educationList, setEducationList] = useState<Array<{ degree: string; institution: string; year: string }>>([]);
  const [isAddingEducation, setIsAddingEducation] = useState(false);
  const [editingEducation, setEditingEducation] = useState<{ degree: string; institution: string; year: string; index: number } | null>(null);
  const [educationForm, setEducationForm] = useState({ degree: "", institution: "", year: "" });

  // Skills
  const [skills, setSkills] = useState<string[]>([]);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkill, setNewSkill] = useState("");

  // Interests
  const [isEditingInterests, setIsEditingInterests] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

// Add these with the other state variables (around line where other useState hooks are)

  // Professional Headline & Location
  const [professionalHeadline, setProfessionalHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [pronouns, setPronouns] = useState("");

  // Work Experience
  const [workExperience, setWorkExperience] = useState<Array<{
    title: string;
    company: string;
    startDate: string;
    endDate: string;
    description: string;
  }>>([]);
  const [isAddingWork, setIsAddingWork] = useState(false);
  const [editingWork, setEditingWork] = useState<any>(null);
  const [editingWorkIndex, setEditingWorkIndex] = useState<number | null>(null);
  const [workForm, setWorkForm] = useState({
    title: "",
    company: "",
    startDate: "",
    endDate: "",
    description: "",
  });

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
    loadNotificationPrefs();
  }, []);

  // Load saved profile data for the new sections
  useEffect(() => {
    const loadProfileData = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("job_title, department, years_of_experience, education, skills, interests, professional_headline, location, pronouns, work_experience, social_links")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        // Load professional info
        setProfessionalInfo({
          jobTitle: data.job_title || "",
          department: data.department || "",
          yearsOfExperience: data.years_of_experience || "",
        });
        
        // Load education
        if (data.education) setEducationList(data.education);
        
        // Load skills
        if (data.skills) setSkills(data.skills);
        
        // Load interests
        if (data.interests) setSelectedInterests(data.interests);
        
        // NEW: Load professional headline, location, pronouns
        if (data.professional_headline) setProfessionalHeadline(data.professional_headline);
        if (data.location) setLocation(data.location);
        if (data.pronouns) setPronouns(data.pronouns);
        
        // NEW: Load work experience
        if (data.work_experience) setWorkExperience(data.work_experience);
        
        // NEW: Load social links
        if (data.social_links) setSocialLinks(data.social_links);
      }
    };
    
    loadProfileData();
  }, []);

  const loadNotificationPrefs = () => {
    const savedPrefs = localStorage.getItem("notification_preferences");
    if (savedPrefs) {
      try {
        setNotificationPrefs(JSON.parse(savedPrefs));
      } catch (e) {
        console.error("Error loading notification preferences:", e);
      }
    }
  };

  const saveNotificationPrefs = (newPrefs: typeof notificationPrefs) => {
    setNotificationPrefs(newPrefs);
    localStorage.setItem("notification_preferences", JSON.stringify(newPrefs));
    toast.success("Notification preferences saved");
  };

  const handleNotificationChange = (key: keyof typeof notificationPrefs) => {
    const newPrefs = {
      ...notificationPrefs,
      [key]: !notificationPrefs[key],
    };
    saveNotificationPrefs(newPrefs);
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

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success("Avatar updated successfully");
      refreshAvatar();
      window.dispatchEvent(new CustomEvent('avatar-updated', { detail: { url: publicUrl } }));
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    }
  };

  // Work Experience handlers
  const saveWork = async () => {
    if (!workForm.title || !workForm.company) {
      toast.error("Please fill in title and company");
      return;
    }

    let newWorkList = [...workExperience];
    
    if (editingWorkIndex !== null) {
      newWorkList[editingWorkIndex] = workForm;
      toast.success("Work experience updated");
    } else {
      newWorkList.push(workForm);
      toast.success("Work experience added");
    }
    
    setWorkExperience(newWorkList);
    setIsAddingWork(false);
    setEditingWork(null);
    setEditingWorkIndex(null);
    setWorkForm({ title: "", company: "", startDate: "", endDate: "", description: "" });
    
    await saveWorkToDB(newWorkList);
  };

  const removeWork = async (index: number) => {
    const newList = workExperience.filter((_, i) => i !== index);
    setWorkExperience(newList);
    await saveWorkToDB(newList);
    toast.success("Work experience removed");
  };

  const saveWorkToDB = async (workList: any[]) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error } = await supabase
        .from("profiles")
        .update({ work_experience: workList })
        .eq("id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error saving work experience:", error);
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
          // NEW FIELDS
          //professional_headline: professionalHeadline,
          //location: location,
          //pronouns: pronouns,
          //work_experience: workExperience,
          //social_links: socialLinks,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      window.dispatchEvent(new CustomEvent('profile-updated'));
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
          department: professionalInfo.department,
          years_of_experience: professionalInfo.yearsOfExperience,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Professional info updated");
    } catch (error) {
      console.error("Error saving professional info:", error);
      toast.error("Failed to save professional info");
    }
  };

  const saveEducation = async () => {
    if (!educationForm.degree || !educationForm.institution) {
      toast.error("Please fill in degree and institution");
      return;
    }

    let newEducationList = [...educationList];
    
    if (editingEducation !== null) {
      newEducationList[editingEducation.index] = educationForm;
      toast.success("Education updated");
    } else {
      newEducationList.push(educationForm);
      toast.success("Education added");
    }
    
    setEducationList(newEducationList);
    setIsAddingEducation(false);
    setEditingEducation(null);
    setEducationForm({ degree: "", institution: "", year: "" });
    
    await saveEducationToDB(newEducationList);
  };

  const removeEducation = async (index: number) => {
    const newList = educationList.filter((_, i) => i !== index);
    setEducationList(newList);
    await saveEducationToDB(newList);
    toast.success("Education removed");
  };

  const startEditingEducation = (edu: any, index: number) => {
    setEducationForm(edu);
    setEditingEducation({ ...edu, index });
    setIsAddingEducation(true);
  };

  const saveEducationToDB = async (education: any[]) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error } = await supabase
        .from("profiles")
        .update({ education: education })
        .eq("id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error saving education:", error);
    }
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
        <GlowButton variant="outline" onClick={() => setShowContactSupport(true)} className="gap-2">
          <HelpCircle className="w-4 h-4" />
          Help & Support
        </GlowButton>
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
                  <Label className="text-gray-300">Job Title</Label>
                  <Input
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    className="mt-1"
                    placeholder="e.g., Software Engineer"
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
              <div className="flex items-center gap-2 mb-4">
                <Link className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Social Links</h3>
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

          {/* ========== NEW: Professional Headline & Location Section ========== */}
          <GlowCard>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Professional Details</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Professional Headline</Label>
                  <Input
                    value={professionalHeadline}
                    onChange={(e) => setProfessionalHeadline(e.target.value)}
                    placeholder="e.g., Senior Software Engineer | AI Enthusiast | Tech Speaker"
                    className="mt-1 bg-gray-800 border-gray-700"
                  />
                  <p className="text-xs text-gray-500 mt-1">Appears right below your name on your profile</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Location</Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., San Francisco, CA"
                      className="mt-1 bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Pronouns (Optional)</Label>
                    <Input
                      value={pronouns}
                      onChange={(e) => setPronouns(e.target.value)}
                      placeholder="e.g., He/Him, She/Her, They/Them"
                      className="mt-1 bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* ========== NEW: Work Experience Section ========== */}
          <GlowCard>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Work Experience</h3>
                </div>
                <GlowButton 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAddingWork(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Experience
                </GlowButton>
              </div>
              
              <div className="space-y-4">
                {workExperience.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No work experience added</p>
                ) : (
                  workExperience.map((work, index) => (
                    <div key={index} className="p-4 bg-gray-800/30 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-white font-semibold">{work.title}</p>
                          <p className="text-sm text-purple-400">{work.company}</p>
                          <p className="text-xs text-gray-500">{work.startDate} - {work.endDate || "Present"}</p>
                          {work.description && (
                            <p className="text-sm text-gray-400 mt-2">{work.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingWork(work);
                              setEditingWorkIndex(index);
                              setWorkForm({ ...work });
                              setIsAddingWork(true);
                            }}
                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-gray-400" />
                          </button>
                          <button
                            onClick={() => removeWork(index)}
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

              {/* Add/Edit Work Experience Modal */}
              {isAddingWork && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                  <div className="bg-gray-900 rounded-lg max-w-md w-full mx-4 border border-gray-700 p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      {editingWork ? "Edit Work Experience" : "Add Work Experience"}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-300 mb-1 block">Job Title</Label>
                        <Input
                          value={workForm.title}
                          onChange={(e) => setWorkForm({ ...workForm, title: e.target.value })}
                          placeholder="e.g., Senior Software Engineer"
                          className="bg-gray-800 border-gray-700"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300 mb-1 block">Company</Label>
                        <Input
                          value={workForm.company}
                          onChange={(e) => setWorkForm({ ...workForm, company: e.target.value })}
                          placeholder="e.g., Google, Microsoft, Startup"
                          className="bg-gray-800 border-gray-700"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-300 mb-1 block">Start Date</Label>
                          <Input
                            type="month"
                            value={workForm.startDate}
                            onChange={(e) => setWorkForm({ ...workForm, startDate: e.target.value })}
                            className="bg-gray-800 border-gray-700"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-300 mb-1 block">End Date</Label>
                          <Input
                            type="month"
                            value={workForm.endDate}
                            onChange={(e) => setWorkForm({ ...workForm, endDate: e.target.value })}
                            placeholder="Present or leave empty"
                            className="bg-gray-800 border-gray-700"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-gray-300 mb-1 block">Description (Optional)</Label>
                        <textarea
                          value={workForm.description}
                          onChange={(e) => setWorkForm({ ...workForm, description: e.target.value })}
                          rows={3}
                          placeholder="Describe your responsibilities and achievements..."
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <GlowButton 
                        variant="outline" 
                        onClick={() => {
                          setIsAddingWork(false);
                          setEditingWork(null);
                          setEditingWorkIndex(null);
                          setWorkForm({ title: "", company: "", startDate: "", endDate: "", description: "" });
                        }}
                        fullWidth
                      >
                        Cancel
                      </GlowButton>
                      <GlowButton 
                        onClick={saveWork}
                        disabled={!workForm.title || !workForm.company}
                        fullWidth
                      >
                        {editingWork ? "Update" : "Add"}
                      </GlowButton>
                    </div>
                  </div>
                </div>
              )}
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
                    <div key={index} className="p-3 bg-gray-800/30 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-white font-medium">{edu.degree}</p>
                          <p className="text-sm text-gray-400">{edu.institution}</p>
                          <p className="text-xs text-gray-500">{edu.year}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditingEducation(edu, index)}
                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-gray-400" />
                          </button>
                          <button
                            onClick={() => removeEducation(index)}
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
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                  <div className="bg-gray-900 rounded-lg max-w-md w-full mx-4 border border-gray-700 p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      {editingEducation ? "Edit Education" : "Add Education"}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-300 mb-1 block">Degree / Program</Label>
                        <Input
                          value={educationForm.degree}
                          onChange={(e) => setEducationForm({ ...educationForm, degree: e.target.value })}
                          placeholder="e.g., Bachelor of Science in Computer Science"
                          className="bg-gray-800 border-gray-700"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300 mb-1 block">Institution</Label>
                        <Input
                          value={educationForm.institution}
                          onChange={(e) => setEducationForm({ ...educationForm, institution: e.target.value })}
                          placeholder="e.g., Stanford University"
                          className="bg-gray-800 border-gray-700"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300 mb-1 block">Year</Label>
                        <Input
                          value={educationForm.year}
                          onChange={(e) => setEducationForm({ ...educationForm, year: e.target.value })}
                          placeholder="e.g., 2020 or 2016-2020"
                          className="bg-gray-800 border-gray-700"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <GlowButton 
                        variant="outline" 
                        onClick={() => {
                          setIsAddingEducation(false);
                          setEditingEducation(null);
                          setEducationForm({ degree: "", institution: "", year: "" });
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Top Skills</h3>
                </div>
                <GlowButton 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAddingSkill(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Skill
                </GlowButton>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {skills.length === 0 ? (
                  <p className="text-gray-400 text-sm py-4 w-full text-center">No skills added yet</p>
                ) : (
                  skills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 text-sm"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(index)}
                        className="ml-1 hover:text-purple-200 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add Skill Modal - ORIGINAL, UNCHANGED */}
              {isAddingSkill && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                  <div className="bg-gray-900 rounded-lg max-w-md w-full mx-4 border border-gray-700 p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Add Skill</h3>
                    <div>
                      <Label className="text-gray-300 mb-1 block">Skill Name</Label>
                      <Input
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="e.g., React, TypeScript, Python"
                        className="bg-gray-800 border-gray-700"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newSkill.trim()) {
                            addSkill();
                          }
                        }}
                      />
                    </div>
                    <div className="flex gap-3 mt-6">
                      <GlowButton 
                        variant="outline" 
                        onClick={() => {
                          setIsAddingSkill(false);
                          setNewSkill("");
                        }}
                        fullWidth
                      >
                        Cancel
                      </GlowButton>
                      <GlowButton 
                        onClick={addSkill}
                        disabled={!newSkill.trim()}
                        fullWidth
                      >
                        Add Skill
                      </GlowButton>
                    </div>
                  </div>
                </div>
              )}
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

        {/* Notifications Tab - UNCHANGED */}
        <TabsContent value="notifications" className="space-y-6">
          <GlowCard>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Notification Preferences</h2>
              </div>
              <p className="text-sm text-gray-400 mb-6">
                Choose which notifications you want to receive and how you want to receive them.
              </p>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <MailIcon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Email Notifications</h3>
                      <p className="text-sm text-gray-400">Receive notifications via email</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationPrefs.emailNotifications}
                    onCheckedChange={() => handleNotificationChange('emailNotifications')}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <BellRing className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Push Notifications</h3>
                      <p className="text-sm text-gray-400">Receive push notifications in your browser</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationPrefs.pushNotifications}
                    onCheckedChange={() => handleNotificationChange('pushNotifications')}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Assignment Reminders</h3>
                      <p className="text-sm text-gray-400">Get reminders about upcoming assignments and deadlines</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationPrefs.assignmentReminders}
                    onCheckedChange={() => handleNotificationChange('assignmentReminders')}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Course Updates</h3>
                      <p className="text-sm text-gray-400">Get notified about new course content and updates</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationPrefs.courseUpdates}
                    onCheckedChange={() => handleNotificationChange('courseUpdates')}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Achievement Alerts</h3>
                      <p className="text-sm text-gray-400">Celebrate your learning milestones and achievements</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationPrefs.achievementAlerts}
                    onCheckedChange={() => handleNotificationChange('achievementAlerts')}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-pink-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Message Notifications</h3>
                      <p className="text-sm text-gray-400">Get notified when you receive new messages</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationPrefs.messageNotifications}
                    onCheckedChange={() => handleNotificationChange('messageNotifications')}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Marketing Emails</h3>
                      <p className="text-sm text-gray-400">Receive promotional offers and newsletters</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationPrefs.marketingEmails}
                    onCheckedChange={() => handleNotificationChange('marketingEmails')}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                      <CalendarIcon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Weekly Digest</h3>
                      <p className="text-sm text-gray-400">Receive a weekly summary of your learning progress</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationPrefs.digestEmails}
                    onCheckedChange={() => handleNotificationChange('digestEmails')}
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-500 text-center">
                  Notification preferences are saved locally. You can change these settings at any time.
                </p>
              </div>
            </div>
          </GlowCard>
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