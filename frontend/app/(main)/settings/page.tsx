// frontend/app/(main)/settings/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Camera, Mail, Briefcase, Calendar as CalendarIcon, Save, X, 
  Globe, User, Lock, Bell, Shield, CreditCard, Loader2,
  CheckCircle, AlertCircle, Eye, EyeOff
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

const PROFILE_UPDATED_EVENT = 'profile-updated';

const LANGUAGES = [
  { code: "EN", label: "English", flag: "🇺🇸" },
  { code: "CN", label: "中文 (Chinese)", flag: "🇨🇳" },
  { code: "BM", label: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "ES", label: "Español", flag: "🇪🇸" },
  { code: "FR", label: "Français", flag: "🇫🇷" },
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
  
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    job_title: "",
    custom_job_title: "",
    birthday: "",
    language: "",
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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const validateProfile = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    }
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }
    if (formData.username.includes(" ")) {
      newErrors.username = "Username cannot contain spaces";
    }
    if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }
    if (!formData.birthday) {
      newErrors.birthday = "Birthday is required";
    }
    if (!formData.language) {
      newErrors.language = "Language is required";
    }
    if (formData.job_title === "Other" && !formData.custom_job_title.trim()) {
      newErrors.custom_job_title = "Please enter your job title";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
          timezone: detectTimezone(),
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
      
      toast.success("Profile updated successfully!");
      refreshAvatar();
      
      // Dispatch profile updated event to notify all components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
      }
      
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};
    
    if (!passwordData.new_password) {
      newErrors.new_password = "New password is required";
    } else if (passwordData.new_password.length < 8) {
      newErrors.new_password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(passwordData.new_password)) {
      newErrors.new_password = "Password must contain at least one uppercase letter";
    } else if (!/[0-9]/.test(passwordData.new_password)) {
      newErrors.new_password = "Password must contain at least one number";
    } else if (!/[^A-Za-z0-9]/.test(passwordData.new_password)) {
      newErrors.new_password = "Password must contain at least one special character";
    }
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      newErrors.confirm_password = "Passwords do not match";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) {
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
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
        <p className="text-[#A0A0B5]">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-[#12121A] border border-white/5 p-1 rounded-2xl mb-8">
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
          <TabsTrigger value="billing" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            <CreditCard className="w-4 h-4 mr-2" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <GlowCard>
            <h2 className="text-xl font-semibold text-white mb-6">Profile Picture</h2>
            <div className="flex items-center gap-6 pb-6 border-b border-white/5">
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
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                    First Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="First name"
                    className={`bg-[#12121A] border-white/10 text-white rounded-xl h-11 ${
                      errors.first_name ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.first_name && (
                    <p className="text-xs text-red-400 mt-1">{errors.first_name}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                    Last Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Last name"
                    className={`bg-[#12121A] border-white/10 text-white rounded-xl h-11 ${
                      errors.last_name ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.last_name && (
                    <p className="text-xs text-red-400 mt-1">{errors.last_name}</p>
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
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="username"
                      className={`pl-8 bg-[#12121A] border-white/10 text-white rounded-xl h-11 ${
                        errors.username ? 'border-red-500' : ''
                      }`}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-xs text-red-400 mt-1">{errors.username}</p>
                  )}
                  <p className="text-xs text-[#6B6B80] mt-1">No spaces. 3+ characters. This is your unique identifier.</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Email Address</Label>
                  <Input
                    value={formData.email}
                    disabled
                    className="bg-[#12121A] border-white/10 text-white rounded-xl h-11 opacity-60 cursor-not-allowed"
                  />
                  <p className="text-xs text-[#6B6B80] mt-1">Email cannot be changed</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                    Job Title <span className="text-red-400">*</span>
                  </Label>
                  <select
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value, custom_job_title: "" })}
                    className="w-full h-11 bg-[#12121A] border border-white/10 text-white rounded-xl px-4 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all outline-none [color-scheme:dark]"
                  >
                    <option value="">Select your job title</option>
                    {JOB_TITLES.map((title) => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                </div>
                
                {formData.job_title === "Other" && (
                  <div>
                    <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                      Custom Job Title <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      value={formData.custom_job_title}
                      onChange={(e) => setFormData({ ...formData, custom_job_title: e.target.value })}
                      placeholder="e.g., Full Stack Developer"
                      className={`bg-[#12121A] border-white/10 text-white rounded-xl h-11 ${
                        errors.custom_job_title ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.custom_job_title && (
                      <p className="text-xs text-red-400 mt-1">{errors.custom_job_title}</p>
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
                      onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                      max={new Date().toISOString().split("T")[0]}
                      className={`pl-10 bg-[#12121A] border-white/10 text-white rounded-xl h-11 [color-scheme:dark] ${
                        errors.birthday ? 'border-red-500' : ''
                      }`}
                    />
                  </div>
                  {errors.birthday && (
                    <p className="text-xs text-red-400 mt-1">{errors.birthday}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                    Language <span className="text-red-400">*</span>
                  </Label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className={`w-full h-11 bg-[#12121A] border border-white/10 text-white rounded-xl px-4 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all outline-none [color-scheme:dark] ${
                      errors.language ? 'border-red-500' : ''
                    }`}
                  >
                    <option value="">Select language</option>
                    {LANGUAGES.map(({ code, label, flag }) => (
                      <option key={code} value={code}>{flag} {label}</option>
                    ))}
                  </select>
                  {errors.language && (
                    <p className="text-xs text-red-400 mt-1">{errors.language}</p>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Bio</Label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  placeholder="Tell us a bit about yourself..."
                  className="w-full px-4 py-3 bg-[#12121A] border border-white/10 rounded-xl text-white focus:border-purple-500/50 outline-none transition-all resize-none"
                />
                <p className="text-xs text-[#6B6B80] mt-1 text-right">{formData.bio.length}/300</p>
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
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    placeholder="Enter new password"
                    className={`pl-10 pr-12 bg-[#12121A] border-white/10 text-white rounded-xl h-11 ${
                      errors.new_password ? 'border-red-500' : ''
                    }`}
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
                {errors.new_password && (
                  <p className="text-xs text-red-400 mt-1">{errors.new_password}</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    placeholder="Confirm new password"
                    className={`pl-10 pr-12 bg-[#12121A] border-white/10 text-white rounded-xl h-11 ${
                      errors.confirm_password ? 'border-red-500' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B80] hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirm_password && (
                  <p className="text-xs text-red-400 mt-1">{errors.confirm_password}</p>
                )}
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-400">
                    <p className="font-medium mb-1">Password Requirements:</p>
                    <ul className="text-xs space-y-1">
                      <li>• At least 8 characters long</li>
                      <li>• At least one uppercase letter</li>
                      <li>• At least one number</li>
                      <li>• At least one special character</li>
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

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <GlowCard>
            <h2 className="text-xl font-semibold text-white mb-6">Notification Preferences</h2>
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

        {/* Billing Tab */}
        <TabsContent value="billing">
          <GlowCard>
            <h2 className="text-xl font-semibold text-white mb-6">Billing Information</h2>
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-[#6B6B80] mx-auto mb-4" />
              <p className="text-white font-medium mb-2">No active subscription</p>
              <p className="text-[#A0A0B5] text-sm mb-6">You're currently on the free plan</p>
              <GlowButton variant="primary">Upgrade to Plus</GlowButton>
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}