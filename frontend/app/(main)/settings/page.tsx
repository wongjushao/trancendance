// frontend/app/(main)/settings/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Camera, Mail, Briefcase, Calendar as CalendarIcon, Save, X, 
  Globe, User, Lock, Bell, Shield, CreditCard, Loader2,
  CheckCircle, AlertCircle, Eye, EyeOff, ChevronRight, Sparkles,
  Trash2, LogOut, Monitor, Smartphone, Globe2, Crown
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

const PROFILE_UPDATED_EVENT = 'profile-updated';

const LANGUAGES = [
  { code: "EN", label: "English", flag: "🇺🇸", description: "US English" },
  { code: "CN", label: "中文 (Chinese)", flag: "🇨🇳", description: "Simplified Chinese" },
  { code: "BM", label: "Bahasa Melayu", flag: "🇲🇾", description: "Malay" },
  { code: "ES", label: "Español", flag: "🇪🇸", description: "Spanish" },
  { code: "FR", label: "Français", flag: "🇫🇷", description: "French" },
  { code: "DE", label: "Deutsch", flag: "🇩🇪", description: "German" },
  { code: "JP", label: "日本語", flag: "🇯🇵", description: "Japanese" },
];

const JOB_TITLES = [
  "Student",
  "Software Engineer",
  "Senior Software Engineer",
  "Data Scientist",
  "Product Manager",
  "UI/UX Designer",
  "DevOps Engineer",
  "Marketing Specialist",
  "Teacher/Instructor",
  "Professor",
  "Researcher",
  "Entrepreneur",
  "Business Analyst",
  "Project Manager",
  "Other",
];

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const { avatarUrl, uploadAvatar, refreshAvatar } = useAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  
  // Validation states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    job_title: "",
    custom_job_title: "",
    birthday: "",
    language: "",
    timezone: "",
    bio: "",
  });

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [notifications, setNotifications] = useState({
    email_notifications: true,
    course_updates: true,
    assignment_reminders: true,
    marketing_emails: false,
    weekly_digest: true,
    achievement_alerts: true,
  });

  // Validation functions
  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case "first_name":
        return validateName(value, "First name").error;
      case "last_name":
        return validateName(value, "Last name").error;
      case "username":
        return validateUsername(value).error;
      case "birthday":
        return validateBirthday(value).error;
      case "language":
        return validateLanguage(value).error;
      case "bio":
        return validateBio(value).error;
      case "job_title":
        return validateJobTitle(
          value,
          formData.job_title === "Other",
          formData.custom_job_title
        ).error;
      case "custom_job_title":
        return validateJobTitle(
          formData.job_title,
          true,
          value
        ).error;
      default:
        return undefined;
    }
  };

  const handleFieldBlur = (field: string) => {
    setFieldTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field as keyof typeof formData]);
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldTouched[field]) {
      const error = validateField(field, value);
      setFieldErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const validateProfile = (): boolean => {
    const errors: Record<string, string> = {};
    
    const firstNameError = validateName(formData.first_name, "First name").error;
    if (firstNameError) errors.first_name = firstNameError;
    
    const lastNameError = validateName(formData.last_name, "Last name").error;
    if (lastNameError) errors.last_name = lastNameError;
    
    const usernameError = validateUsername(formData.username).error;
    if (usernameError) errors.username = usernameError;
    
    const birthdayError = validateBirthday(formData.birthday).error;
    if (birthdayError) errors.birthday = birthdayError;
    
    const languageError = validateLanguage(formData.language).error;
    if (languageError) errors.language = languageError;
    
    const bioError = validateBio(formData.bio).error;
    if (bioError) errors.bio = bioError;
    
    const jobTitleError = validateJobTitle(
      formData.job_title,
      formData.job_title === "Other",
      formData.custom_job_title
    ).error;
    if (jobTitleError) errors.job_title = jobTitleError;
    
    setFieldErrors(errors);
    setFieldTouched({
      first_name: true,
      last_name: true,
      username: true,
      birthday: true,
      language: true,
      bio: true,
      job_title: true,
    });
    
    return Object.keys(errors).length === 0;
  };

  const validatePasswordFields = (): boolean => {
    const errors: Record<string, string> = {};
    
    const newPasswordError = validatePassword(passwordData.new_password).error;
    if (newPasswordError) errors.new_password = newPasswordError;
    
    const confirmError = validateConfirmPassword(
      passwordData.new_password,
      passwordData.confirm_password
    ).error;
    if (confirmError) errors.confirm_password = confirmError;
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordBlur = (field: string) => {
    setFieldTouched(prev => ({ ...prev, [field]: true }));
    let error: string | undefined;
    if (field === "new_password") {
      error = validatePassword(passwordData.new_password).error;
    } else if (field === "confirm_password") {
      error = validateConfirmPassword(passwordData.new_password, passwordData.confirm_password).error;
    }
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    if (fieldTouched[field]) {
      let error: string | undefined;
      if (field === "new_password") {
        error = validatePassword(value).error;
      } else if (field === "confirm_password") {
        error = validateConfirmPassword(passwordData.new_password, value).error;
      }
      setFieldErrors(prev => ({ ...prev, [field]: error }));
    }
    // Also re-validate confirm password when new password changes
    if (field === "new_password" && fieldTouched.confirm_password) {
      const confirmError = validateConfirmPassword(value, passwordData.confirm_password).error;
      setFieldErrors(prev => ({ ...prev, confirm_password: confirmError }));
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!session?.access_token || !user) {
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
          setFormData({
            email: user.email ?? "",
            username: data.username || "",
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            job_title: data.job_title || "",
            custom_job_title: "",
            birthday: data.birthday || "",
            language: data.language || "",
            timezone: data.timezone || detectTimezone(),
            bio: data.bio || "",
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        toast.error("Failed to load profile settings");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfile();
  }, []);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, GIF, and WebP images are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB.");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      await uploadAvatar(file);
      toast.success("Profile picture updated!");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) {
      toast.error("Please fix the errors before saving");
      return;
    }
    
    setIsSaving(true);
    
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      toast.error("No active session");
      setIsSaving(false);
      return;
    }
    
    let finalJobTitle = formData.job_title;
    if (formData.job_title === "Other" && formData.custom_job_title.trim()) {
      finalJobTitle = formData.custom_job_title.trim();
    }
    
    try {
      const fullName = `${formData.first_name} ${formData.last_name}`.trim();
      
      // Update user metadata
      await fetch('/api/auth-service/user-metadata', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          bio: formData.bio,
        }),
      });
      
      // Update profile
      const profileResponse = await fetch('/api/auth-service/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          username: formData.username,
          bio: formData.bio,
          timezone: formData.timezone,
          language: formData.language,
          first_name: formData.first_name,
          last_name: formData.last_name,
          job_title: finalJobTitle,
          birthday: formData.birthday,
        }),
      });
      
      if (!profileResponse.ok) {
        throw new Error('Failed to update profile');
      }
      
      // Refresh the user object from Supabase
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser) {
        window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
      }
      
      toast.success("Profile updated successfully!");
      refreshAvatar();
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
      }
      
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const getPasswordStrength = () => {
    if (!passwordData.new_password) return 0;
    let strength = 0;
    if (passwordData.new_password.length >= 8) strength++;
    if (/[A-Z]/.test(passwordData.new_password)) strength++;
    if (/[0-9]/.test(passwordData.new_password)) strength++;
    if (/[^A-Za-z0-9]/.test(passwordData.new_password)) strength++;
    return strength;
  };

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][getPasswordStrength()];
  const strengthColor = ["", "bg-red-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"][getPasswordStrength()];

  const handleChangePassword = async () => {
    if (!validatePasswordFields()) {
      toast.error("Please fix the password errors");
      return;
    }
    
    setIsSaving(true);
    
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      toast.error("No active session");
      setIsSaving(false);
      return;
    }
    
    try {
      const response = await fetch('/api/auth-service/update-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ password: passwordData.new_password }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update password');
      }
      
      toast.success("Password updated successfully!");
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setFieldTouched({});
      setFieldErrors({});
      
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    const first = formData.first_name?.[0] || "";
    const last = formData.last_name?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  const getLanguageFlag = (code: string) => {
    const lang = LANGUAGES.find(l => l.code === code);
    return lang?.flag || "🌐";
  };

  const getLanguageLabel = (code: string) => {
    const lang = LANGUAGES.find(l => l.code === code);
    return lang?.label || code || "Select language";
  };

  const getFieldError = (field: string) => {
    return fieldTouched[field] && fieldErrors[field];
  };

  const getInputClassName = (field: string) => {
    const hasError = getFieldError(field);
    return `bg-[#12121A] border rounded-xl h-11 ${hasError ? 'border-red-500' : 'border-white/10'} text-white`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-400" />
          <p className="text-[#A0A0B5]">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
        <p className="text-[#A0A0B5]">Manage your account settings and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#12121A] border border-white/5 p-1 rounded-2xl mb-8 flex-wrap h-auto">
          <TabsTrigger value="profile" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            <Lock className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            <Globe className="w-4 h-4 mr-2" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            <CreditCard className="w-4 h-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="danger" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 text-red-400">
            <Shield className="w-4 h-4 mr-2" />
            Danger Zone
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <GlowCard>
            {/* Profile Picture Section */}
            <div className="pb-6 border-b border-white/5">
              <h2 className="text-xl font-semibold text-white mb-4">Profile Picture</h2>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-black text-3xl tracking-tighter">{getInitials()}</span>
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
                    className={`absolute -bottom-1 -right-1 w-8 h-8 bg-[#1A1A24] border border-white/10 text-purple-400 rounded-full flex items-center justify-center shadow-xl cursor-pointer hover:bg-purple-500 hover:text-white transition-colors ${
                      isUploadingAvatar ? 'opacity-50 cursor-wait' : ''
                    }`}
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </label>
                </div>
                <div>
                  <p className="text-white text-sm mb-1">Upload a new profile picture</p>
                  <p className="text-[#6B6B80] text-xs">JPG, PNG, GIF or WebP. Max 5MB.</p>
                  <p className="text-[#6B6B80] text-xs mt-1">Recommended: Square image, at least 200x200px</p>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="mt-6 space-y-5">
              <h2 className="text-xl font-semibold text-white">Personal Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                    First Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => handleFieldChange("first_name", e.target.value)}
                    onBlur={() => handleFieldBlur("first_name")}
                    placeholder="First name"
                    className={getInputClassName("first_name")}
                  />
                  {getFieldError("first_name") && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.first_name}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                    Last Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => handleFieldChange("last_name", e.target.value)}
                    onBlur={() => handleFieldBlur("last_name")}
                    placeholder="Last name"
                    className={getInputClassName("last_name")}
                  />
                  {getFieldError("last_name") && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.last_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                    Username <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B80] text-sm">@</span>
                    <Input
                      value={formData.username}
                      onChange={(e) => handleFieldChange("username", e.target.value)}
                      onBlur={() => handleFieldBlur("username")}
                      placeholder="username"
                      className={`pl-8 ${getInputClassName("username")}`}
                    />
                  </div>
                  {getFieldError("username") && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.username}
                    </p>
                  )}
                  <p className="text-xs text-[#6B6B80] mt-1">No spaces. 3+ characters. Letters, numbers, dots, underscores, hyphens only.</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Email Address</Label>
                  <Input
                    value={formData.email}
                    disabled
                    className="bg-[#12121A] border-white/10 text-white rounded-xl h-11 opacity-60 cursor-not-allowed"
                  />
                  <p className="text-xs text-[#6B6B80] mt-1">Email cannot be changed. Contact support for assistance.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                    Job Title <span className="text-red-400">*</span>
                  </Label>
                  <select
                    value={formData.job_title}
                    onChange={(e) => handleFieldChange("job_title", e.target.value)}
                    onBlur={() => handleFieldBlur("job_title")}
                    className={getInputClassName("job_title")}
                  >
                    <option value="">Select your job title</option>
                    {JOB_TITLES.map((title) => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                  {getFieldError("job_title") && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.job_title}
                    </p>
                  )}
                </div>
                
                {formData.job_title === "Other" && (
                  <div>
                    <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                      Custom Job Title <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      value={formData.custom_job_title}
                      onChange={(e) => handleFieldChange("custom_job_title", e.target.value)}
                      onBlur={() => handleFieldBlur("custom_job_title")}
                      placeholder="e.g., Full Stack Developer, DevOps Engineer"
                      className={getInputClassName("custom_job_title")}
                    />
                    {getFieldError("custom_job_title") && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {fieldErrors.custom_job_title}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                    Birthday <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                    <Input
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => handleFieldChange("birthday", e.target.value)}
                      onBlur={() => handleFieldBlur("birthday")}
                      max={new Date().toISOString().split("T")[0]}
                      className={`pl-10 ${getInputClassName("birthday")} [color-scheme:dark]`}
                    />
                  </div>
                  {getFieldError("birthday") && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.birthday}
                    </p>
                  )}
                  <p className="text-xs text-[#6B6B80] mt-1">You must be at least 13 years old</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                    Language <span className="text-red-400">*</span>
                  </Label>
                  <select
                    value={formData.language}
                    onChange={(e) => handleFieldChange("language", e.target.value)}
                    onBlur={() => handleFieldBlur("language")}
                    className={getInputClassName("language")}
                  >
                    <option value="">Select language</option>
                    {LANGUAGES.map(({ code, label, flag }) => (
                      <option key={code} value={code}>{flag} {label}</option>
                    ))}
                  </select>
                  {getFieldError("language") && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.language}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Bio <span className="text-red-400">*</span></Label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleFieldChange("bio", e.target.value)}
                  onBlur={() => handleFieldBlur("bio")}
                  rows={4}
                  placeholder="Tell us a bit about yourself..."
                  className={`w-full px-4 py-3 ${getInputClassName("bio")} resize-none`}
                />
                {getFieldError("bio") && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.bio}
                  </p>
                )}
                <p className="text-xs text-[#6B6B80] mt-1 text-right">{formData.bio.length}/500 (minimum 10 characters)</p>
              </div>

              <div className="flex gap-4 pt-4">
                <GlowButton variant="primary" onClick={handleSaveProfile} isLoading={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </GlowButton>
                <GlowButton variant="ghost" onClick={() => router.push('/profile')}>
                  Cancel
                </GlowButton>
              </div>
            </div>
          </GlowCard>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <GlowCard>
            <h2 className="text-xl font-semibold text-white mb-6">Change Password</h2>
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                  New Password <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={passwordData.new_password}
                    onChange={(e) => handlePasswordChange("new_password", e.target.value)}
                    onBlur={() => handlePasswordBlur("new_password")}
                    placeholder="Enter new password"
                    className={`pl-10 pr-12 ${getInputClassName("new_password")}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B80] hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordData.new_password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i <= getPasswordStrength() ? strengthColor : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-[#6B6B80]">
                      Strength:{" "}
                      <span className={`font-semibold ${
                        getPasswordStrength() <= 1 ? "text-red-400" :
                        getPasswordStrength() === 2 ? "text-yellow-400" :
                        getPasswordStrength() === 3 ? "text-blue-400" : "text-green-400"
                      }`}>
                        {strengthLabel}
                      </span>
                    </p>
                  </div>
                )}
                {getFieldError("new_password") && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.new_password}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                  Confirm New Password <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirm_password}
                    onChange={(e) => handlePasswordChange("confirm_password", e.target.value)}
                    onBlur={() => handlePasswordBlur("confirm_password")}
                    placeholder="Confirm new password"
                    className={`pl-10 pr-12 ${getInputClassName("confirm_password")}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B80] hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {getFieldError("confirm_password") && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.confirm_password}
                  </p>
                )}
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-400">
                    <p className="font-medium mb-1">Password Requirements:</p>
                    <ul className="text-xs space-y-1">
                      <li className={passwordData.new_password.length >= 8 ? "text-green-400" : ""}>
                        • At least 8 characters long {passwordData.new_password.length >= 8 ? "✓" : ""}
                      </li>
                      <li className={/[A-Z]/.test(passwordData.new_password) ? "text-green-400" : ""}>
                        • At least one uppercase letter {/[A-Z]/.test(passwordData.new_password) ? "✓" : ""}
                      </li>
                      <li className={/[0-9]/.test(passwordData.new_password) ? "text-green-400" : ""}>
                        • At least one number {/[0-9]/.test(passwordData.new_password) ? "✓" : ""}
                      </li>
                      <li className={/[^A-Za-z0-9]/.test(passwordData.new_password) ? "text-green-400" : ""}>
                        • At least one special character {/[^A-Za-z0-9]/.test(passwordData.new_password) ? "✓" : ""}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <GlowButton variant="primary" onClick={handleChangePassword} isLoading={isSaving}>
                <Lock className="w-4 h-4 mr-2" />
                Update Password
              </GlowButton>
            </div>
          </GlowCard>
        </TabsContent>

        {/* Notifications Tab - Rest remains the same */}
        <TabsContent value="notifications">
          <GlowCard>
            <h2 className="text-xl font-semibold text-white mb-6">Notification Preferences</h2>
            <p className="text-sm text-[#6B6B80] mb-6">Choose how you want to be notified about activity on your account</p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div>
                  <p className="text-white font-medium">Email Notifications</p>
                  <p className="text-[#6B6B80] text-sm">Receive important updates via email</p>
                </div>
                <Switch
                  checked={notifications.email_notifications}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, email_notifications: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div>
                  <p className="text-white font-medium">Course Updates</p>
                  <p className="text-[#6B6B80] text-sm">Get notified about new lessons and course announcements</p>
                </div>
                <Switch
                  checked={notifications.course_updates}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, course_updates: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div>
                  <p className="text-white font-medium">Assignment Reminders</p>
                  <p className="text-[#6B6B80] text-sm">Receive reminders before assignment deadlines</p>
                </div>
                <Switch
                  checked={notifications.assignment_reminders}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, assignment_reminders: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div>
                  <p className="text-white font-medium">Weekly Digest</p>
                  <p className="text-[#6B6B80] text-sm">Get a weekly summary of your learning progress</p>
                </div>
                <Switch
                  checked={notifications.weekly_digest}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, weekly_digest: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div>
                  <p className="text-white font-medium">Achievement Alerts</p>
                  <p className="text-[#6B6B80] text-sm">Get notified when you earn new achievements</p>
                </div>
                <Switch
                  checked={notifications.achievement_alerts}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, achievement_alerts: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-white font-medium">Marketing Emails</p>
                  <p className="text-[#6B6B80] text-sm">Get updates about new courses and promotions</p>
                </div>
                <Switch
                  checked={notifications.marketing_emails}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, marketing_emails: checked })}
                />
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/5">
              <GlowButton variant="primary" onClick={() => toast.success("Notification preferences saved!")}>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </GlowButton>
            </div>
          </GlowCard>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <GlowCard>
            <h2 className="text-xl font-semibold text-white mb-6">Language Preferences</h2>
            
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Display Language</Label>
                <select
                  value={formData.language}
                  onChange={(e) => handleFieldChange("language", e.target.value)}
                  className="w-full md:w-96 h-11 bg-[#12121A] border border-white/10 text-white rounded-xl px-4 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all outline-none [color-scheme:dark]"
                >
                  {LANGUAGES.map(({ code, label, flag }) => (
                    <option key={code} value={code}>{flag} {label}</option>
                  ))}
                </select>
                <p className="text-xs text-[#6B6B80] mt-1">Choose your preferred language for the platform interface</p>
              </div>

              <div className="pt-4">
                <GlowButton variant="primary" onClick={() => {
                  const supabase = getSupabaseBrowserClient();
                  const { data: { session } } = supabase.auth.getSession();
                  if (session) {
                    fetch('/api/auth-service/profile', {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                      },
                      body: JSON.stringify({
                        language: formData.language,
                      }),
                    }).then(() => {
                      toast.success("Language preference updated!");
                      window.location.reload();
                    }).catch(() => {
                      toast.error("Failed to update language preference");
                    });
                  }
                }}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Language Preference
                </GlowButton>
              </div>
            </div>
          </GlowCard>
        </TabsContent>

        {/* Billing Tab - Rest remains the same */}
        <TabsContent value="billing">
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

        {/* Danger Zone Tab - Rest remains the same */}
        <TabsContent value="danger">
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
                    onClick={() => {
                      if (confirm("Are you absolutely sure? This action cannot be undone and will delete all your data, including courses, certificates, and personal information.")) {
                        toast.error("Account deletion is not available in demo mode");
                      }
                    }}
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
  );
}