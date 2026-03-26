"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Camera, User, Building2, BookOpen, ArrowRight, ArrowLeft,
  Check, Calendar, Globe, FileText, AlertCircle,
  Briefcase, Sparkles, Mail, Users as UsersIcon,
} from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { clearOnboardingCache } from "@/lib/onboarding";

// ── Constants ────────────────────────────────────────────────────────────────

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

const STEP_LABELS = ["Profile", "Personal", "Career", "Interests"];

// ── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  // Profile Info
  avatar: File | null;
  avatarPreview: string;
  username: string;
  firstName: string;
  lastName: string;
  bio: string;
  
  // Personal Info
  birthday: string;
  timezone: string;
  language: string;
  
  // Career Info
  jobTitle: string;
  
  // Interests
  interests: string[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kuala_Lumpur";
  } catch {
    return "Asia/Kuala_Lumpur";
  }
}

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

// Shared className for ALL <select> elements
const SELECT_CLASS =
  "w-full bg-[#12121A] border border-white/10 text-white rounded-xl h-12 px-4 " +
  "focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 " +
  "transition-all outline-none appearance-none cursor-pointer [color-scheme:dark]";

// ── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    avatar: null,
    avatarPreview: "",
    username: "",
    firstName: "",
    lastName: "",
    bio: "",
    birthday: "",
    timezone: detectTimezone(),
    language: detectLanguage(),
    jobTitle: "",
    interests: [],
  });

  // ── Load user data from Google OAuth if available (but NOT avatar) ──────────
  useEffect(() => {
    const loadUserData = async () => {
      setIsLoadingUser(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace("/");
        return;
      }

      // Fast path: check if already onboarded
      if (user.user_metadata?.onboarded === true) {
        router.replace("/dashboard");
        return;
      }

      // Pre-fill from Google OAuth data if available (name only, no avatar)
      const userMetadata = user.user_metadata || {};
      const userEmail = user.email || "";
      
      // Extract Google name data
      const googleName = userMetadata.full_name || userMetadata.name || "";
      const googleFirstName = userMetadata.given_name || "";
      const googleLastName = userMetadata.family_name || "";
      
      // Auto-generate username from email or name
      const suggestedUsername = googleName
        ? googleName.toLowerCase().replace(/\s+/g, ".")
        : userEmail.split("@")[0];
      
      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || googleFirstName || (googleName.split(" ")[0] || ""),
        lastName: prev.lastName || googleLastName || (googleName.split(" ").slice(1).join(" ") || ""),
        username: prev.username || suggestedUsername,
        // Do NOT set avatarPreview from Google
      }));

      setIsLoadingUser(false);
    };
    
    loadUserData();
  }, [router]);

  // ── Per-step validation ────────────────────────────────────────────────────
  function validateStep(step: number): string | null {
    if (step === 1) {
      if (!formData.firstName.trim()) return "First name is required.";
      if (!formData.lastName.trim()) return "Last name is required.";
      if (!formData.username.trim()) return "Username is required.";
      if (formData.username.includes(" ")) return "Username cannot contain spaces.";
      if (formData.username.length < 3) return "Username must be at least 3 characters.";
      if (!formData.bio.trim()) return "Bio is required — tell us a little about yourself.";
    }
    if (step === 2) {
      if (!formData.birthday) return "Birthday is required.";
    }
    if (step === 3) {
      if (!formData.jobTitle) return "Please select your job title to continue.";
    }
    return null;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleBack = () => {
    setStepError(null);
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleNext = async () => {
    setSubmitError(null);
    const err = validateStep(currentStep);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
      return;
    }

    // ── Final submit ─────────────────────────────────────────────────────────
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

    // ── POST to backend: /api/auth-service/register ──────────────────────────
    const payload: Record<string, any> = {
      username: formData.username.trim(),
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      bio: formData.bio.trim(),
      timezone: formData.timezone,
      language: formData.language,
      birthday: formData.birthday,
      job_title: formData.jobTitle,
      interests: formData.interests,
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

    // ── Upload avatar if one was selected ────────────────────────────────────
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
          console.error('[onboarding] Avatar upload failed');
          // Don't show error for avatar upload failure - it's optional
        }
      } catch (err) {
        console.error('[onboarding] Avatar upload error:', err);
        // Don't fail onboarding if avatar upload fails
      }
    }

    clearOnboardingCache();
    router.push("/dashboard");
  };

  // ── Form helpers ───────────────────────────────────────────────────────────
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Create local preview
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

  const set = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setStepError(null);
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
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

  // ── Render ─────────────────────────────────────────────────────────────────
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

                  {/* Step 1: Profile (Photo + Basic Info) */}
                  {currentStep === 1 && (
                    <div className="space-y-6 py-4">
                      <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Your Profile</h2>
                        <p className="text-[#A0A0B5]">Let's get to know you</p>
                      </div>
                      
                      {/* Avatar Upload - no Google avatar prefill */}
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
                            onChange={set("firstName")} 
                            placeholder="Alex"
                            className="bg-[#12121A] border-white/10 text-white rounded-xl h-12" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-[#A0A0B5]">
                            Last Name <span className="text-red-400">*</span>
                          </Label>
                          <Input 
                            value={formData.lastName} 
                            onChange={set("lastName")} 
                            placeholder="Smith"
                            className="bg-[#12121A] border-white/10 text-white rounded-xl h-12" 
                          />
                        </div>
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
                            onChange={set("username")} 
                            placeholder="alex_smith"
                            className="pl-8 bg-[#12121A] border-white/10 text-white rounded-xl h-12" 
                          />
                        </div>
                        <p className="text-xs text-[#6B6B80]">No spaces. 3+ characters. This is your unique identifier.</p>
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
                            onChange={set("bio")}
                            placeholder="Tell us about yourself — your background, what you're passionate about..."
                            rows={3}
                            maxLength={300}
                            className="w-full pl-10 pr-4 py-3 bg-[#12121A] border border-white/10 text-white rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all placeholder:text-[#6B6B80] text-sm"
                          />
                        </div>
                        <p className="text-xs text-[#6B6B80] text-right">{formData.bio.length}/300</p>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Personal Details (Birthday + Language) */}
                  {currentStep === 2 && (
                    <div className="space-y-6 py-4">
                      <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Personal Details</h2>
                        <p className="text-[#A0A0B5]">Tell us a bit about yourself</p>
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
                            onChange={set("birthday")}
                            max={new Date().toISOString().split("T")[0]}
                            className="pl-10 bg-[#12121A] border-white/10 text-white rounded-xl h-12 [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      {/* Language - User selectable */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#A0A0B5]">
                          Language <span className="text-red-400">*</span>
                        </Label>
                        <select
                          value={formData.language}
                          onChange={set("language")}
                          className={SELECT_CLASS}
                        >
                          {LANGUAGES.map(({ code, label }) => (
                            <option key={code} value={code}>{label}</option>
                          ))}
                        </select>
                        <p className="text-xs text-[#6B6B80]">
                          Your timezone has been automatically detected as: <span className="text-purple-400">{formData.timezone}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Career */}
                  {currentStep === 3 && (
                    <div className="space-y-8 py-4">
                      <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Your Career</h2>
                        <p className="text-[#A0A0B5]">Help us personalize your learning experience</p>
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
                            onChange={set("jobTitle")}
                            className={`${SELECT_CLASS} pl-10`}
                          >
                            <option value="">Select your job title</option>
                            {JOB_TITLES.map((title) => (
                              <option key={title} value={title}>{title}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Interests */}
                  {currentStep === 4 && (
                    <div className="space-y-8 py-4">
                      <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Your Interests</h2>
                        <p className="text-[#A0A0B5]">We'll personalize your learning feed based on these</p>
                        <p className="text-xs text-[#6B6B80] mt-1">Select as many as you like</p>
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