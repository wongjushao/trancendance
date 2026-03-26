"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Camera, User, Building2, BookOpen, ArrowRight, ArrowLeft,
  Check, Phone, Calendar, Hash, Globe, FileText, AlertCircle,
} from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isProfileComplete, type ProfileRow } from "@/lib/profile";
import { clearOnboardingCache } from "@/lib/onboarding";

// ── Constants ──────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;

const LANGUAGES = [
  { code: "EN", label: "English" },
  { code: "CN", label: "中文 (Chinese)" },
  { code: "BM", label: "Bahasa Melayu" },
] as const;

const TIMEZONES = [
  "Asia/Kuala_Lumpur",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Manila",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const INTERESTS = [
  "Web Development", "Mobile Development", "Data Science", "Machine Learning",
  "UI/UX Design", "DevOps", "Cloud Computing", "Cybersecurity",
  "Blockchain", "Game Development", "AI Research", "Product Management",
];

const STEP_LABELS = ["Photo", "Personal", "Profile", "Campus", "Interests"];

// ── Types ───────────────────────────────────────────────────────────────────

type FormData = {
  photo:        File | null;
  photoPreview: string;
  firstName:    string;
  lastName:     string;
  username:     string;
  birthday:     string;
  inviteCode:   string;
  role:         string;
  bio:          string;
  timezone:     string;
  language:     string;
  organization: string;
  interests:    string[];
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kuala_Lumpur";
  } catch {
    return "Asia/Kuala_Lumpur";
  }
}

// Shared className for ALL <select> elements on this page.
// [color-scheme:dark] tells the browser to render the native <option>
// popup in dark mode so options don't appear on a white background.
const SELECT_CLASS =
  "w-full bg-[#12121A] border border-white/10 text-white rounded-xl h-12 px-4 " +
  "focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 " +
  "transition-all outline-none appearance-none cursor-pointer [color-scheme:dark]";

const SELECT_ERROR_CLASS =
  "w-full bg-[#12121A] border border-red-500/60 text-white rounded-xl h-12 px-4 " +
  "focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 " +
  "transition-all outline-none appearance-none cursor-pointer [color-scheme:dark]";

// ── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving,    setIsSaving]    = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepError,   setStepError]   = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    photo:        null,
    photoPreview: "",
    firstName:    "",
    lastName:     "",
    username:     "",
    birthday:     "",
    inviteCode:   "",
    role:         "",
    bio:          "",
    timezone:     detectTimezone(),
    language:     "EN",
    organization: "",
    interests:    [],
  });

  // ── Guard: skip onboarding if already complete ──────────────────────────
  useEffect(() => {
    const check = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/"); return; }

      // Fast path: onboarded flag already stamped in user_metadata
      if (user.user_metadata?.onboarded === true) {
        router.replace("/dashboard");
        return;
      }

      // Slow path: check profiles table directly (read-only; backend owns writes)
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, bio, timezone, language, birthday")
        .eq("id", user.id)
        .single();

      if (isProfileComplete(profile as ProfileRow | null)) {
        router.replace("/dashboard");
        return;
      }

      // Pre-fill from auth metadata
      const fullName: string =
        user.user_metadata?.full_name || user.user_metadata?.name || "";
      const [first = "", ...rest] = fullName.trim().split(" ");

      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || first,
        lastName:  prev.lastName  || rest.join(" "),
        username:  prev.username  || user.email?.split("@")[0] || "",
      }));
    };
    check();
  }, [router]);

  // ── Per-step validation ──────────────────────────────────────────────────

  function validateStep(step: number): string | null {
    if (step === 2) {
      if (!formData.firstName.trim())       return "First name is required.";
      if (!formData.username.trim())        return "Username is required.";
      if (formData.username.includes(" "))  return "Username cannot contain spaces.";
      if (!formData.birthday)               return "Birthday is required.";
    }
    if (step === 3) {
      if (!formData.role)                   return "Please select your professional role to continue.";
      if (!formData.bio.trim())             return "Bio is required — tell us a little about yourself.";
      if (!formData.timezone)               return "Please select your timezone.";
    }
    return null;
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  const handleBack = () => {
    setStepError(null);
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleNext = async () => {
    setSubmitError(null);
    const err = validateStep(currentStep);
    if (err) { setStepError(err); return; }
    setStepError(null);

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
      return;
    }

    // ── Final submit ──────────────────────────────────────────────────────────
    setIsSaving(true);

    const supabase = getSupabaseBrowserClient();

    // Fetch both user and session in parallel
    const [{ data: { user } }, { data: { session } }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession(),
    ]);

    if (!user || !session) {
      setSubmitError("Your session has expired. Please log in again.");
      setIsSaving(false);
      router.replace("/login");
      return;
    }

    // ── POST to backend: /api/auth-service/register ──────────────────────────
    const payload: Record<string, string> = {
      username:  formData.username.trim(),
      bio:       formData.bio.trim(),
      timezone:  formData.timezone,
      language:  formData.language,
      birthday:  formData.birthday,
    };
    if (formData.inviteCode.trim()) payload.invite_code_input = formData.inviteCode.trim();

    console.log('[onboarding] Submitting payload to backend:', payload);

    let backendOk = false;
    let backendErrorMessage: string | null = null;

    try {
      const res = await fetch("/api/auth-service/register", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
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
        backendErrorMessage =
          body?.error ??
          `Server responded with status ${res.status}. Please try again.`;
        console.error("[onboarding] Backend error:", res.status, backendErrorMessage);
      }
    } catch (err) {
      backendErrorMessage =
        "Could not reach the server. Please check your connection and try again.";
      console.error("[onboarding] Backend unreachable:", err);
    }

    if (!backendOk) {
      setSubmitError(backendErrorMessage ?? "An unexpected error occurred. Please try again.");
      setIsSaving(false);
      return;
    }

    // ── Upload avatar if one was selected ─────────────────────────────────────
    if (formData.photo) {
      console.log('[onboarding] Uploading avatar...');
      try {
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', formData.photo);
        
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
          // Store in localStorage to prevent flash of missing avatar
          localStorage.setItem('avatar_url', uploadData.avatar_url);
          
          // Dispatch event for immediate update
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('avatar-updated', { 
              detail: { avatarUrl: uploadData.avatar_url } 
            }));
          }
        } else {
          const errorText = await uploadRes.text();
          console.error('[onboarding] Avatar upload failed:', uploadRes.status, errorText);
          // Show a toast notification but don't block onboarding
          setSubmitError("Profile created but avatar upload failed. You can upload it later.");
        }
      } catch (err) {
        console.error('[onboarding] Avatar upload error:', err);
        // Don't fail onboarding if avatar upload fails
        setSubmitError("Profile created but avatar upload failed. You can upload it later.");
      }
    }

    clearOnboardingCache();
    router.push("/dashboard");
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setFormData((prev) => ({
        ...prev,
        photo:        file,
        photoPreview: URL.createObjectURL(file),
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

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0B0B0F] relative overflow-hidden flex flex-col">
      <div className="absolute top-20 -left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl">

          {/* ── Progress bar ─────────────────────────────────────────────── */}
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

          {/* ── Content card ─────────────────────────────────────────────── */}
          <div className="bg-[#16161F]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-purple-500/5 min-h-[500px] flex flex-col">
            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >

                  {/* ── Step 1: Photo ────────────────────────────────────── */}
                  {currentStep === 1 && (
                    <div className="text-center space-y-8 py-4">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-bold text-white">Create your profile</h2>
                        <p className="text-[#A0A0B5]">First, let&apos;s put a face to the name</p>
                        <p className="text-xs text-[#6B6B80]">Optional — you can add a photo later in settings.</p>
                      </div>
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative group">
                          <div className="w-36 h-36 rounded-full bg-[#12121A] border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden transition-all group-hover:border-purple-500/50">
                            {formData.photoPreview ? (
                              <Image src={formData.photoPreview} alt="Profile Preview" fill className="object-cover" />
                            ) : (
                              <User className="w-12 h-12 text-[#6B6B80]" />
                            )}
                          </div>
                          <label
                            htmlFor="photo-upload"
                            className="absolute bottom-1 right-1 p-2 bg-purple-600 rounded-full text-white cursor-pointer shadow-lg hover:bg-purple-500 transition-colors"
                          >
                            <Camera className="w-5 h-5" />
                          </label>
                        </div>
                        <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" id="photo-upload" />
                        <p className="text-xs text-[#6B6B80]">Supports JPG, PNG or GIF · Max 5 MB</p>
                      </div>
                    </div>
                  )}

                  {/* ── Step 2: Personal Details ─────────────────────────── */}
                  {currentStep === 2 && (
                    <div className="space-y-6 py-4">
                      <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Personal Details</h2>
                        <p className="text-[#A0A0B5]">Tell us a bit about yourself</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-[#A0A0B5]">
                            First Name <span className="text-red-400">*</span>
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                            <Input value={formData.firstName} onChange={set("firstName")} placeholder="Alex"
                              className="pl-10 bg-[#12121A] border-white/10 text-white rounded-xl h-12" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-[#A0A0B5]">Last Name</Label>
                          <Input value={formData.lastName} onChange={set("lastName")} placeholder="Smith"
                            className="bg-[#12121A] border-white/10 text-white rounded-xl h-12" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#A0A0B5]">
                          Username <span className="text-red-400">*</span>
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B80] text-sm font-medium">@</span>
                          <Input value={formData.username} onChange={set("username")} placeholder="alex_smith"
                            className="pl-8 bg-[#12121A] border-white/10 text-white rounded-xl h-12" />
                        </div>
                        <p className="text-xs text-[#6B6B80]">No spaces. This is your unique identifier.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#A0A0B5]">Invite Code</Label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                          <Input value={formData.inviteCode} onChange={set("inviteCode")}
                            placeholder="Enter invite code (optional)"
                            className="pl-10 bg-[#12121A] border-white/10 text-white rounded-xl h-12 font-mono tracking-wider" />
                        </div>
                        <p className="text-xs text-[#6B6B80]">If a friend invited you, enter their code here.</p>
                      </div>
                    </div>
                  )}

                  {/* ── Step 3: Profile / Role ───────────────────────────── */}
                  {currentStep === 3 && (
                    <div className="space-y-6 py-4">
                      <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Your Profile</h2>
                        <p className="text-[#A0A0B5]">Help others know who you are</p>
                      </div>

                      {/* Professional Role */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#A0A0B5]">
                          Professional Role <span className="text-red-400">*</span>
                        </Label>
                        <select
                          value={formData.role}
                          onChange={(e) => {
                            setStepError(null);
                            setFormData((prev) => ({ ...prev, role: e.target.value }));
                          }}
                          className={stepError && !formData.role ? SELECT_ERROR_CLASS : SELECT_CLASS}
                        >
                          <option value="">Select your current role</option>
                          <option value="student">Student</option>
                          <option value="teacher">Teacher / Instructor</option>
                          <option value="admin">Administrator</option>
                          <option value="professional">Working Professional</option>
                          <option value="other">Other</option>
                        </select>
                        {stepError && !formData.role && (
                          <div className="flex items-center gap-2 mt-1 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                            <p className="text-red-400 text-sm">{stepError}</p>
                          </div>
                        )}
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
                            placeholder="Tell us about yourself — your background, what you're learning..."
                            rows={3}
                            maxLength={300}
                            className="w-full pl-10 pr-4 py-3 bg-[#12121A] border border-white/10 text-white rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all placeholder:text-[#6B6B80] text-sm"
                          />
                        </div>
                        <p className="text-xs text-[#6B6B80] text-right">{formData.bio.length}/300</p>
                      </div>

                      {/* Timezone + Language */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-[#A0A0B5]">
                            Timezone <span className="text-red-400">*</span>
                          </Label>
                          <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80] pointer-events-none z-10" />
                            <select
                              value={formData.timezone}
                              onChange={(e) => {
                                setStepError(null);
                                setFormData((prev) => ({ ...prev, timezone: e.target.value }));
                              }}
                              className={`${SELECT_CLASS} pl-10`}
                            >
                              <option value="">Select timezone</option>
                              {TIMEZONES.map((tz) => (
                                <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-[#A0A0B5]">
                            Language <span className="text-red-400">*</span>
                          </Label>
                          <select
                            value={formData.language}
                            onChange={(e) => {
                              setStepError(null);
                              setFormData((prev) => ({ ...prev, language: e.target.value }));
                            }}
                            className={SELECT_CLASS}
                          >
                            {LANGUAGES.map(({ code, label }) => (
                              <option key={code} value={code}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Step error for bio/timezone (role is already shown inline above) */}
                      {stepError && formData.role && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                          <p className="text-red-400 text-sm">{stepError}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Step 4: Campus ───────────────────────────────────── */}
                  {currentStep === 4 && (
                    <div className="space-y-8 py-4">
                      <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Connect to a Campus</h2>
                        <p className="text-[#A0A0B5]">Collaborate with your school or organization</p>
                        <p className="text-xs text-[#6B6B80] mt-1">Optional — you can do this later.</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#A0A0B5]">School or Organization</Label>
                        <Input value={formData.organization} onChange={set("organization")}
                          placeholder="Search for your school or enter a join code"
                          className="bg-[#12121A] border-white/10 text-white rounded-xl h-12" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button type="button"
                          className="p-5 bg-[#12121A] border border-white/5 rounded-2xl hover:border-purple-500/40 hover:bg-purple-500/5 transition-all text-left group">
                          <div className="flex items-center gap-3 mb-2">
                            <Building2 className="w-5 h-5 text-purple-400" />
                            <p className="text-white font-semibold group-hover:text-purple-400">Join Existing</p>
                          </div>
                          <p className="text-[#6B6B80] text-xs leading-relaxed">Enter a unique code provided by your institution.</p>
                        </button>
                        <button type="button"
                          className="p-5 bg-[#12121A] border border-white/5 rounded-2xl hover:border-purple-500/40 hover:bg-purple-500/5 transition-all text-left group">
                          <div className="flex items-center gap-3 mb-2">
                            <BookOpen className="w-5 h-5 text-purple-400" />
                            <p className="text-white font-semibold group-hover:text-purple-400">Create New</p>
                          </div>
                          <p className="text-[#6B6B80] text-xs leading-relaxed">Register your school or study group on the platform.</p>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Step 5: Interests ────────────────────────────────── */}
                  {currentStep === 5 && (
                    <div className="space-y-8 py-4">
                      <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Your Interests</h2>
                        <p className="text-[#A0A0B5]">We&apos;ll personalise your learning feed based on these.</p>
                        <p className="text-xs text-[#6B6B80] mt-1">Select as many as you like — optional.</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {INTERESTS.map((interest) => (
                          <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                            className={`p-3 rounded-xl border text-sm font-medium transition-all text-center ${
                              formData.interests.includes(interest)
                                ? "bg-purple-500/10 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                                : "bg-[#12121A] border-white/5 text-[#6B6B80] hover:border-white/20 hover:text-white"
                            }`}>
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

            {/* ── Footer ───────────────────────────────────────────────── */}
            <div className="mt-10 pt-6 border-t border-white/5 space-y-4">

              {/* Step error shown in footer for steps 2 and 4 (step 3 shows inline) */}
              {stepError && currentStep !== 3 && (
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
                    {currentStep === TOTAL_STEPS ? "Finish Setup" : "Next Step"}
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
