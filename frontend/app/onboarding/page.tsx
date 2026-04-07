// frontend/app/onboarding/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Camera, ArrowRight, ArrowLeft,
  Check, Calendar, FileText, AlertCircle,
  Briefcase, Search, Building2, Users,
} from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { clearOnboardingCache } from "@/lib/onboarding";
import { useRole } from "@/components/providers/RoleProvider";
import { UserRole, Organization, mockOrganizations } from "@/lib/role";
import { OrganizationAutoDetect } from "@/components/onboarding/OrganizationAutoDetect";
import { createRoleRequest } from "@/lib/role-requests";
import { toast } from "sonner";
import {
  validateUsername,
  validateName,
  validateBio,
  validateBirthday,
  validateLanguage,
  validateJobTitle,
} from "@/lib/validation";

// Constants
const TOTAL_STEPS = 4;

const LANGUAGES = [
  { code: "EN", label: "English" },
  { code: "CN", label: "中文 (Chinese)" },
  { code: "BM", label: "Bahasa Melayu" },
] as const;

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

const INTERESTS = [
  "Web Development",
  "Mobile Development",
  "Data Science",
  "Machine Learning",
  "Artificial Intelligence",
  "UI/UX Design",
  "DevOps",
  "Cloud Computing",
  "Cybersecurity",
  "Blockchain",
  "Game Development",
  "Product Management",
  "Digital Marketing",
  "Business Strategy",
  "Leadership",
];

const STEP_LABELS = ["Profile", "Personal & Career", "Organization", "Interests"];

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'student', label: 'Student', description: 'Learn at your own pace, take courses, and earn certificates.' },
  { value: 'teacher', label: 'Teacher', description: 'Create courses, share knowledge, and mentor students.' },
  { value: 'org_admin', label: 'Organization Admin', description: 'Manage your organization\'s members, courses, and settings.' },
];

// Types
type FormData = {
  // Profile Info
  avatar: File | null;
  avatarPreview: string;
  username: string;
  firstName: string;
  lastName: string;
  bio: string;
  email: string;
  
  // Personal & Career Info
  birthday: string;
  language: string;
  jobTitle: string;
  customJobTitle: string;
  desiredRole: UserRole;
  
  // Organization
  selectedOrganizationId: number | null;
  
  // Interests
  interests: string[];
};

// Helpers
function detectLanguage(): string {
  try {
    const lang = navigator.language || "en";
    if (lang.startsWith("zh")) return "CN";
    if (lang.startsWith("ms")) return "BM";
    return "EN";
  } catch {
    return "EN";
  }
}

const SELECT_CLASS =
  "w-full bg-[#12121A] border border-white/10 text-white rounded-xl h-12 px-4 " +
  "focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 " +
  "transition-all outline-none appearance-none cursor-pointer [color-scheme:dark]";

export default function OnboardingPage() {
  const router = useRouter();
  const { setRole } = useRole();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [detectedOrg, setDetectedOrg] = useState<Organization | null>(null);
  
  // Validation states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<FormData>({
    avatar: null,
    avatarPreview: "",
    username: "",
    firstName: "",
    lastName: "",
    bio: "",
    email: "",
    birthday: "",
    language: detectLanguage(),
    jobTitle: "",
    customJobTitle: "",
    desiredRole: "student",
    selectedOrganizationId: null,
    interests: [],
  });

  // Filter organizations based on search
  const filteredOrganizations = mockOrganizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle organization detection from email domain
  const handleOrganizationDetected = (org: Organization | null) => {
    setDetectedOrg(org);
    if (org) {
      setFormData(prev => ({
        ...prev,
        selectedOrganizationId: org.id
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedOrganizationId: null
      }));
    }
  };

  // Validation functions
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    
    const firstNameError = validateName(formData.firstName, "First name").error;
    if (firstNameError) errors.firstName = firstNameError;
    
    const lastNameError = validateName(formData.lastName, "Last name").error;
    if (lastNameError) errors.lastName = lastNameError;
    
    const usernameError = validateUsername(formData.username).error;
    if (usernameError) errors.username = usernameError;
    
    const bioError = validateBio(formData.bio).error;
    if (bioError) errors.bio = bioError;
    
    setFieldErrors(errors);
    setFieldTouched({
      firstName: true,
      lastName: true,
      username: true,
      bio: true,
    });
    
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    
    const birthdayError = validateBirthday(formData.birthday).error;
    if (birthdayError) errors.birthday = birthdayError;
    
    const languageError = validateLanguage(formData.language).error;
    if (languageError) errors.language = languageError;
    
    const jobTitleError = validateJobTitle(
      formData.jobTitle,
      formData.jobTitle === "Other",
      formData.customJobTitle
    ).error;
    if (jobTitleError) errors.jobTitle = jobTitleError;
    
    setFieldErrors(errors);
    setFieldTouched({
      birthday: true,
      language: true,
      jobTitle: true,
    });
    
    return Object.keys(errors).length === 0;
  };

  // Handle field blur for validation
  const handleFieldBlur = (field: string, value: string, step: number) => {
    setFieldTouched(prev => ({ ...prev, [field]: true }));
    
    let error: string | undefined;
    switch (field) {
      case "firstName":
      case "lastName":
        error = validateName(value, field === "firstName" ? "First name" : "Last name").error;
        break;
      case "username":
        error = validateUsername(value).error;
        break;
      case "bio":
        error = validateBio(value).error;
        break;
      case "birthday":
        error = validateBirthday(value).error;
        break;
      case "language":
        error = validateLanguage(value).error;
        break;
      default:
        return;
    }
    
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  };

  // Load user data from Google OAuth if available
  useEffect(() => {
    const loadUserData = async () => {
      setIsLoadingUser(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace("/");
        return;
      }

      // Fast path: check if already onboarded via the backend
      const session = await supabase.auth.getSession();
      if (session.data.session?.access_token) {
        try {
          const response = await fetch('/api/auth-service/onboarding-status', {
            headers: {
              'Authorization': `Bearer ${session.data.session.access_token}`,
            },
          });
          if (response.ok) {
            const status = await response.json();
            if (status.onboarded) {
              router.replace("/dashboard");
              return;
            }
          }
        } catch (e) {
          console.error('Error checking onboarding status:', e);
        }
      }

      // Pre-fill from Google OAuth data if available
      const userMetadata = user.user_metadata || {};
      const userEmail = user.email || "";
      
      const googleName = userMetadata.full_name || userMetadata.name || "";
      const googleFirstName = userMetadata.given_name || "";
      const googleLastName = userMetadata.family_name || "";
      
      const suggestedUsername = googleName
        ? googleName.toLowerCase().replace(/\s+/g, ".")
        : userEmail.split("@")[0];
      
      setFormData((prev) => ({
        ...prev,
        email: userEmail,
        firstName: prev.firstName || googleFirstName || (googleName.split(" ")[0] || ""),
        lastName: prev.lastName || googleLastName || (googleName.split(" ").slice(1).join(" ") || ""),
        username: prev.username || suggestedUsername,
      }));

      setIsLoadingUser(false);
    };
    
    loadUserData();
  }, [router]);

  // Navigation
  const handleBack = () => {
    setStepError(null);
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleNext = async () => {
    setSubmitError(null);
    setStepError(null);
    
    let isValid = false;
    if (currentStep === 1) isValid = validateStep1();
    else if (currentStep === 2) isValid = validateStep2();
    else if (currentStep === 3) isValid = true; // Organization selection is optional
    else if (currentStep === 4) isValid = true; // Interests are optional
    
    if (!isValid) {
      setStepError("Please fix the errors above before continuing.");
      return;
    }

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
      return;
    }

    // Final submit
    setIsSaving(true);

    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();

    if (!user || !session) {
      setSubmitError("Your session has expired. Please log in again.");
      setIsSaving(false);
      router.replace("/login");
      return;
    }

    // Determine final job title (use custom if "Other" was selected)
    let finalJobTitle = formData.jobTitle;
    if (formData.jobTitle === "Other" && formData.customJobTitle.trim()) {
      finalJobTitle = formData.customJobTitle.trim();
    }

    // POST to backend: /api/auth-service/register
    const payload: Record<string, any> = {
      username: formData.username.trim(),
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      bio: formData.bio.trim(),
      language: formData.language,
      birthday: formData.birthday,
      job_title: finalJobTitle,
      interests: formData.interests,
      desired_role: formData.desiredRole,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...(formData.desiredRole === "teacher" && formData.selectedOrganizationId ? {
        organization_id: formData.selectedOrganizationId,
      } : {}),
    };

    console.log('[onboarding] Submitting payload to backend:', payload);

    let backendOk = false;
    let backendErrorMessage: string | null = null;

    try {
      const res = await fetch("/api/auth-service/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      console.log('[onboarding] Backend response status:', res.status);
      console.log('[onboarding] Backend response body:', responseText);

      if (res.ok) {
        backendOk = true;
        console.log('[onboarding] Backend success');
      } else {
        const body = await res.json().catch(() => ({}));
        backendErrorMessage = body?.error || `Server responded with status ${res.status}.`;
        console.error("[onboarding] Backend error:", res.status, backendErrorMessage);
      }
    } catch (err) {
      backendErrorMessage = "Could not reach the server. Please check your connection.";
      console.error("[onboarding] Backend unreachable:", err);
    }

    if (!backendOk) {
      setSubmitError(backendErrorMessage ?? "An unexpected error occurred.");
      setIsSaving(false);
      return;
    }

    // Wait for database to commit the transaction
    console.log('[onboarding] Waiting for database commit...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Refresh the session to get updated user data
    const { data: { session: refreshedSession } } = await supabase.auth.getSession();
    
    if (refreshedSession) {
      // Verify onboarding status one more time
      try {
        const verifyResponse = await fetch('/api/auth-service/onboarding-status', {
          headers: {
            'Authorization': `Bearer ${refreshedSession.access_token}`,
          },
        });
        
        if (verifyResponse.ok) {
          const status = await verifyResponse.json();
          console.log('[onboarding] Verification status:', status);
          
          if (!status.onboarded) {
            console.warn('[onboarding] Profile saved but verification shows not onboarded:', status.missing_fields);
          }
        }
      } catch (e) {
        console.error('[onboarding] Verification check failed:', e);
      }
    }

    // Set role data after successful registration
    let role: UserRole;
    let pendingRole: 'teacher' | 'org_admin' | null = null;

    if (formData.desiredRole === 'org_admin') {
      role = 'pending_org_admin';
      pendingRole = 'org_admin';
    } else if (formData.desiredRole === 'teacher') {
      role = 'pending_teacher';
      pendingRole = 'teacher';
    } else {
      role = 'student';
      pendingRole = null;
    }
    
    const selectedOrg = formData.selectedOrganizationId 
      ? mockOrganizations.find(o => o.id === formData.selectedOrganizationId)
      : null;
    
    setRole({
      role,
      organizationId: formData.selectedOrganizationId || null,
      organizationName: selectedOrg?.name || null,
      pendingRole,
      pendingOrganizationId: formData.selectedOrganizationId,
      pendingOrganizationName: selectedOrg?.name,
    });

    // Create role request if teacher role was selected
    if (formData.desiredRole === 'teacher' && formData.selectedOrganizationId) {
      const selectedOrgForRequest = mockOrganizations.find(o => o.id === formData.selectedOrganizationId);
      if (selectedOrgForRequest && user) {
        createRoleRequest(
          user.id,
          `${formData.firstName} ${formData.lastName}`.trim(),
          formData.email,
          'teacher',
          formData.selectedOrganizationId,
          selectedOrgForRequest.name
        );
        console.log('[onboarding] Created teacher role request for organization:', selectedOrgForRequest.name);
      }
    }

    // Upload avatar if one was selected
    if (formData.avatar) {
      console.log('[onboarding] Uploading avatar...');
      try {
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', formData.avatar);
        
        const uploadRes = await fetch('/api/auth-service/upload-avatar', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: avatarFormData,
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          console.log('[onboarding] Avatar uploaded successfully:', uploadData.avatar_url);
          localStorage.setItem('avatar_url', uploadData.avatar_url);
          
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('avatar-updated', { 
              detail: { avatarUrl: uploadData.avatar_url } 
            }));
          }
        } else {
          const errorData = await uploadRes.json();
          console.error('[onboarding] Avatar upload failed:', errorData.error);
          toast.error("Profile created but avatar upload failed. You can upload it later from settings.");
        }
      } catch (err) {
        console.error('[onboarding] Avatar upload error:', err);
        toast.error("Profile created but avatar upload failed. You can upload it later from settings.");
      }
    }

    clearOnboardingCache();
    
    // Dispatch profile updated event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('profile-updated'));
    }
    
    // Final redirect to dashboard
    console.log('[onboarding] Redirecting to dashboard...');
    router.push("/dashboard");
  };

  // Form helpers
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        avatar: file,
        avatarPreview: previewUrl,
      }));
    }
  };

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const setField = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setStepError(null);
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
      
      // Clear field error when user starts typing
      if (fieldErrors[field]) {
        setFieldErrors(prev => ({ ...prev, [field]: undefined }));
      }
    };

  const getFieldError = (field: string) => {
    return fieldTouched[field] && fieldErrors[field];
  };

  const getInputClassName = (field: string) => {
    const hasError = getFieldError(field);
    return `bg-[#12121A] border rounded-xl h-12 ${hasError ? 'border-red-500' : 'border-white/10'} text-white`;
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Generate initials for avatar fallback
  const getInitials = () => {
    const first = formData.firstName?.[0] || "";
    const last = formData.lastName?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] relative overflow-hidden flex flex-col">
      <div className="absolute top-20 -left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl">

          {/* Progress bar */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-3">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      transition-all duration-500 text-sm font-semibold
                      ${step < currentStep
                        ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30"
                        : step === currentStep
                        ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                        : "bg-[#12121A] text-[#6B6B80] border border-white/5"
                      }
                    `}>
                      {step < currentStep ? <Check className="w-4 h-4" /> : step}
                    </div>
                    <span className={`text-[10px] font-medium uppercase tracking-wider hidden sm:block ${
                      step === currentStep ? "text-purple-400" : "text-[#6B6B80]"
                    }`}>
                      {STEP_LABELS[step - 1]}
                    </span>
                  </div>
                  {step < TOTAL_STEPS && (
                    <div className="flex-1 h-[2px] mx-2 sm:mx-4 bg-[#12121A] mb-5">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-violet-600"
                        initial={{ width: "0%" }}
                        animate={{ width: step < currentStep ? "100%" : "0%" }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content card */}
          <div className="bg-[#16161F]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-purple-500/5 min-h-[550px] flex flex-col">
            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >

                  {/* Step 1: Profile */}
                  {currentStep === 1 && (
                    <div className="space-y-6 py-4">
                      <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Your Profile</h2>
                        <p className="text-[#A0A0B5]">Let's get to know you</p>
                      </div>
                      
                      {/* Avatar Upload */}
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative group">
                          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center overflow-hidden shadow-xl shadow-purple-500/20">
                            {formData.avatarPreview ? (
                              <img 
                                src={formData.avatarPreview} 
                                alt="Profile Preview" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-black text-4xl tracking-tighter">
                                {getInitials()}
                              </span>
                            )}
                          </div>
                          <label
                            htmlFor="avatar-upload"
                            className="absolute bottom-1 right-1 p-2 bg-purple-600 rounded-full text-white cursor-pointer shadow-lg hover:bg-purple-500 transition-colors"
                          >
                            <Camera className="w-5 h-5" />
                          </label>
                        </div>
                        <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" id="avatar-upload" />
                        <p className="text-xs text-[#6B6B80]">Optional — add a photo to personalize your profile</p>
                      </div>

                      {/* Name Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-[#A0A0B5]">
                            First Name <span className="text-red-400">*</span>
                          </Label>
                          <Input 
                            value={formData.firstName} 
                            onChange={setField("firstName")}
                            onBlur={() => handleFieldBlur("firstName", formData.firstName, 1)}
                            placeholder="Alex"
                            className={getInputClassName("firstName")}
                          />
                          {getFieldError("firstName") && (
                            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {fieldErrors.firstName}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-[#A0A0B5]">
                            Last Name <span className="text-red-400">*</span>
                          </Label>
                          <Input 
                            value={formData.lastName} 
                            onChange={setField("lastName")}
                            onBlur={() => handleFieldBlur("lastName", formData.lastName, 1)}
                            placeholder="Smith"
                            className={getInputClassName("lastName")}
                          />
                          {getFieldError("lastName") && (
                            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {fieldErrors.lastName}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Email - Display only */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#A0A0B5]">
                          Email Address
                        </Label>
                        <Input 
                          value={formData.email} 
                          disabled
                          className="bg-[#12121A] border-white/10 text-white rounded-xl h-12 opacity-60 cursor-not-allowed" 
                        />
                        <p className="text-xs text-[#6B6B80]">Your email cannot be changed</p>
                      </div>

                      {/* Username */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#A0A0B5]">
                          Username <span className="text-red-400">*</span>
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B80] text-sm font-medium">@</span>
                          <Input 
                            value={formData.username} 
                            onChange={setField("username")}
                            onBlur={() => handleFieldBlur("username", formData.username, 1)}
                            placeholder="alex_smith"
                            className={`pl-8 ${getInputClassName("username")}`}
                          />
                        </div>
                        {getFieldError("username") && (
                          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fieldErrors.username}
                          </p>
                        )}
                        <p className="text-xs text-[#6B6B80]">No spaces. 3+ characters. Letters, numbers, dots, underscores, hyphens only.</p>
                      </div>

                      {/* Bio */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#A0A0B5]">
                          Bio <span className="text-red-400">*</span>
                        </Label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-3.5 w-4 h-4 text-[#6B6B80]" />
                          <textarea
                            value={formData.bio}
                            onChange={setField("bio")}
                            onBlur={() => handleFieldBlur("bio", formData.bio, 1)}
                            placeholder="Tell us about yourself — your background, what you're passionate about..."
                            rows={8}
                            maxLength={500}
                            className={`w-full pl-10 pr-4 py-3 ${getInputClassName("bio")} resize-y`}
                            style={{ minHeight: '200px' }}
                          />
                        </div>
                        {getFieldError("bio") && (
                          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fieldErrors.bio}
                          </p>
                        )}
                        <p className="text-xs text-[#6B6B80] text-right">{formData.bio.length}/500 (minimum 10 characters)</p>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Personal & Career */}
                  {currentStep === 2 && (
                    <div className="space-y-6 py-4">
                      <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Tell Us About Yourself</h2>
                        <p className="text-[#A0A0B5]">Personal details and career information</p>
                      </div>

                      {/* Birthday */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#A0A0B5]">
                          Birthday <span className="text-red-400">*</span>
                        </Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80] z-10" />
                          <Input
                            type="date"
                            value={formData.birthday}
                            onChange={setField("birthday")}
                            onBlur={() => handleFieldBlur("birthday", formData.birthday, 2)}
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
                        <p className="text-xs text-[#6B6B80]">You must be at least 13 years old to register</p>
                      </div>

                      {/* Language */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#A0A0B5]">
                          Language <span className="text-red-400">*</span>
                        </Label>
                        <select
                          value={formData.language}
                          onChange={setField("language")}
                          onBlur={() => handleFieldBlur("language", formData.language, 2)}
                          className={`${getInputClassName("language")} pl-4 pr-8`}
                        >
                          <option value="">Select your language</option>
                          {LANGUAGES.map(({ code, label }) => (
                            <option key={code} value={code}>{label}</option>
                          ))}
                        </select>
                        {getFieldError("language") && (
                          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fieldErrors.language}
                          </p>
                        )}
                      </div>

                      {/* Job Title */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#A0A0B5]">
                          Job Title <span className="text-red-400">*</span>
                        </Label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80] pointer-events-none z-10" />
                          <select
                            value={formData.jobTitle}
                            onChange={setField("jobTitle")}
                            onBlur={() => handleFieldBlur("jobTitle", formData.jobTitle, 2)}
                            className={`w-full pl-10 ${getInputClassName("jobTitle")}`}
                          >
                            <option value="">Select your job title</option>
                            {JOB_TITLES.map((title) => (
                              <option key={title} value={title}>{title}</option>
                            ))}
                          </select>
                        </div>
                        {getFieldError("jobTitle") && (
                          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fieldErrors.jobTitle}
                          </p>
                        )}
                      </div>

                      {/* Custom job title input */}
                      {formData.jobTitle === "Other" && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-[#A0A0B5]">
                            Custom Job Title <span className="text-red-400">*</span>
                          </Label>
                          <Input
                            value={formData.customJobTitle}
                            onChange={setField("customJobTitle")}
                            placeholder="e.g., Full Stack Developer, DevOps Engineer"
                            className={getInputClassName("customJobTitle")}
                          />
                          {getFieldError("customJobTitle") && (
                            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {fieldErrors.customJobTitle}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Role Selection */}
                      <div className="space-y-3 pt-2">
                        <Label className="text-sm font-medium text-[#A0A0B5]">
                          How would you like to use Educatorio?
                        </Label>
                        <p className="text-xs text-[#6B6B80] -mt-1">
                          You'll start with student access. Role changes require approval from an organization admin.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                          {ROLES.map((role) => (
                            <button
                              key={role.value}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, desiredRole: role.value }))}
                              className={`p-4 rounded-xl border transition-all text-left ${
                                formData.desiredRole === role.value
                                  ? "bg-purple-500/10 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                                  : "bg-[#12121A] border-white/10 hover:border-purple-500/30"
                              }`}
                            >
                              <div className={`font-bold mb-1 ${
                                formData.desiredRole === role.value ? "text-purple-400" : "text-white"
                              }`}>
                                {role.label}
                              </div>
                              <p className="text-xs text-[#6B6B80] leading-relaxed">
                                {role.description}
                              </p>
                            </button>
                          ))}
                        </div>
                        
                        {formData.desiredRole === "admin" && (
                          <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <p className="text-xs text-blue-400">
                              After completing onboarding, you'll be asked to set up your organization.
                              Your admin privileges will be activated after verification.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Organization Selection */}
                  {currentStep === 3 && (
                    <div className="space-y-6 py-4">
                      <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Join an Organization</h2>
                        <p className="text-[#A0A0B5]">
                          {formData.desiredRole === "teacher" 
                            ? "Select the organization where you'd like to teach. Your request will be sent to the organization admin for approval."
                            : formData.desiredRole === "admin"
                            ? "You'll create a new organization after onboarding. Admin privileges will be activated after verification."
                            : "You can join organizations later from your dashboard."}
                        </p>
                      </div>

                      {/* Organization Auto-Detect Component */}
                      <OrganizationAutoDetect
                        email={formData.email}
                        organizations={mockOrganizations}
                        onOrganizationDetected={handleOrganizationDetected}
                      />

                      {formData.desiredRole === "teacher" ? (
                        <div className="space-y-4">
                          {/* Search Bar */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                            <Input
                              type="text"
                              placeholder="Search organizations by name or domain..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10 bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                            />
                          </div>

                          {/* Organization List */}
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {filteredOrganizations.map((org) => (
                              <button
                                key={org.id}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, selectedOrganizationId: org.id }))}
                                className={`w-full p-4 rounded-xl border transition-all text-left ${
                                  formData.selectedOrganizationId === org.id
                                    ? "bg-purple-500/10 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                                    : "bg-[#12121A] border-white/10 hover:border-purple-500/30"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`p-2 rounded-lg ${
                                    formData.selectedOrganizationId === org.id
                                      ? "bg-purple-500/20"
                                      : "bg-[#1A1A24]"
                                  }`}>
                                    <Building2 className={`w-5 h-5 ${
                                      formData.selectedOrganizationId === org.id
                                        ? "text-purple-400"
                                        : "text-[#A0A0B5]"
                                    }`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className={`font-semibold ${
                                        formData.selectedOrganizationId === org.id
                                          ? "text-purple-400"
                                          : "text-white"
                                      }`}>
                                        {org.name}
                                      </p>
                                      {org.verified && (
                                        <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                                          Verified
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-[#6B6B80] mb-1">{org.domain}</p>
                                    <p className="text-xs text-[#6B6B80] line-clamp-1">{org.description}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-[#6B6B80]">
                                      <span className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        {org.memberCount.toLocaleString()} members
                                      </span>
                                    </div>
                                  </div>
                                  {formData.selectedOrganizationId === org.id && (
                                    <Check className="w-5 h-5 text-purple-400 shrink-0" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>

                          {filteredOrganizations.length === 0 && (
                            <div className="text-center py-8">
                              <Building2 className="w-12 h-12 text-[#6B6B80] mx-auto mb-3" />
                              <p className="text-white font-medium mb-1">No organizations found</p>
                              <p className="text-sm text-[#6B6B80]">Try a different search term</p>
                            </div>
                          )}

                          {formData.selectedOrganizationId && (
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                              <p className="text-xs text-blue-400">
                                A request will be sent to the organization admin to approve your teacher role.
                                You'll have student access until your request is approved.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : formData.desiredRole === "admin" ? (
                        <div className="p-6 bg-purple-500/5 border border-purple-500/20 rounded-xl text-center">
                          <Building2 className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                          <p className="text-white font-medium mb-2">You'll create a new organization</p>
                          <p className="text-sm text-[#A0A0B5]">
                            After completing onboarding, you'll be guided to set up your organization.
                            Your admin privileges will be activated after verification.
                          </p>
                        </div>
                      ) : (
                        <div className="p-6 bg-[#12121A] border border-white/5 rounded-xl text-center">
                          <Building2 className="w-12 h-12 text-[#6B6B80] mx-auto mb-3" />
                          <p className="text-white font-medium mb-2">Join organizations later</p>
                          <p className="text-sm text-[#A0A0B5]">
                            You can browse and join organizations from your dashboard after onboarding.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 4: Interests */}
                  {currentStep === 4 && (
                    <div className="space-y-8 py-4">
                      <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Your Interests</h2>
                        <p className="text-[#A0A0B5]">We'll personalize your learning feed based on these</p>
                        <p className="text-xs text-[#6B6B80] mt-1">Select as many as you like (max 20)</p>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {INTERESTS.map((interest) => (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => toggleInterest(interest)}
                            className={`
                              p-3 rounded-xl border text-sm font-medium transition-all text-center
                              ${formData.interests.includes(interest)
                                ? "bg-purple-500/10 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                                : "bg-[#12121A] border-white/5 text-[#6B6B80] hover:border-white/20 hover:text-white"
                              }
                            `}
                          >
                            {interest}
                          </button>
                        ))}
                      </div>

                      {formData.interests.length > 0 && (
                        <p className="text-center text-xs text-[#6B6B80]">
                          {formData.interests.length} interest{formData.interests.length !== 1 ? 's' : ''} selected
                        </p>
                      )}

                      {submitError && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                          <p className="text-red-400 text-sm">{submitError}</p>
                        </div>
                      )}
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="mt-10 pt-6 border-t border-white/5 space-y-4">

              {/* Step error shown in footer */}
              {stepError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-red-400 text-sm">{stepError}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <GlowButton variant="ghost" onClick={handleBack} disabled={currentStep === 1}
                  className="text-[#6B6B80] hover:text-white disabled:opacity-30">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </GlowButton>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#6B6B80] hidden sm:block">
                    Step {currentStep} of {TOTAL_STEPS}
                  </span>
                  <GlowButton variant="primary" onClick={handleNext} isLoading={isSaving} className="px-8">
                    {currentStep === TOTAL_STEPS ? "Complete Setup" : "Continue"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </GlowButton>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}