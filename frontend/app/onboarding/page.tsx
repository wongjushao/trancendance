"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, User, Building2, BookOpen, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

const TOTAL_STEPS = 4;

const interests = [
  "Web Development", "Mobile Development", "Data Science", "Machine Learning",
  "UI/UX Design", "DevOps", "Cloud Computing", "Cybersecurity",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    photo:        null as File | null,
    photoPreview: "" as string,
    firstName:    "",
    lastName:     "",
    role:         "",
    organization: "",
    interests:    [] as string[],
  });

  // ── Pre-fill name fields from Supabase user metadata on mount ────────────
  useEffect(() => {
    const prefill = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fullName: string =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "";

      const [first = "", ...rest] = fullName.trim().split(" ");
      const last = rest.join(" ");

      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || first,
        lastName:  prev.lastName  || last,
      }));
    };

    prefill();
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleNext = async () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
      return;
    }

    // Final step — save collected data to Supabase user_metadata
    setIsSaving(true);
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name:    `${formData.firstName} ${formData.lastName}`.trim(),
        role:         formData.role,
        organization: formData.organization,
        interests:    formData.interests,
        onboarded:    true,
      },
    });

    setIsSaving(false);

    if (error) {
      console.error("[onboarding] Failed to save user metadata:", error.message);
      // Still proceed — don't block the user if metadata save fails
    }

    router.push("/dashboard");
  };

  // ── Photo handler ─────────────────────────────────────────────────────────
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setFormData({
        ...formData,
        photo:        file,
        photoPreview: URL.createObjectURL(file),
      });
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

  return (
    <div className="min-h-screen bg-[#0B0B0F] relative overflow-hidden flex flex-col">
      {/* Background blobs */}
      <div className="absolute top-20 -left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px]" />

      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">

          {/* Progress bar */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                    ${step < currentStep
                      ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white"
                      : step === currentStep
                      ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                      : "bg-[#12121A] text-[#6B6B80] border border-white/5"
                    }
                  `}>
                    {step < currentStep ? <Check className="w-5 h-5" /> : step}
                  </div>
                  {step < TOTAL_STEPS && (
                    <div className="flex-1 h-[2px] mx-4 bg-[#12121A]">
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
            <p className="text-center text-[#6B6B80] font-medium tracking-wide uppercase text-xs">
              Step {currentStep} of {TOTAL_STEPS}
            </p>
          </div>

          {/* Content card */}
          <div className="bg-[#16161F]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-purple-500/5 min-h-[450px] flex flex-col">
            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >

                  {/* Step 1: Upload Photo */}
                  {currentStep === 1 && (
                    <div className="text-center space-y-8 py-4">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-bold text-white">Create your profile</h2>
                        <p className="text-[#A0A0B5]">First, let&apos;s put a face to the name</p>
                      </div>
                      <div className="flex flex-col items-center gap-6">
                        <div className="relative group">
                          <div className="w-36 h-36 rounded-full bg-[#12121A] border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden transition-all group-hover:border-purple-500/50">
                            {formData.photoPreview ? (
                              <Image src={formData.photoPreview} alt="Profile Preview" fill className="object-cover" />
                            ) : (
                              <User className="w-12 h-12 text-[#6B6B80]" />
                            )}
                          </div>
                          <label htmlFor="photo-upload" className="absolute bottom-1 right-1 p-2 bg-purple-600 rounded-full text-white cursor-pointer shadow-lg hover:bg-purple-500 transition-colors">
                            <Camera className="w-5 h-5" />
                          </label>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="hidden"
                          id="photo-upload"
                        />
                        <p className="text-xs text-[#6B6B80]">Supports JPG, PNG or GIF. Max 5MB.</p>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Personal Info — pre-filled from Supabase */}
                  {currentStep === 2 && (
                    <div className="space-y-8 py-4">
                      <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Personal Details</h2>
                        <p className="text-[#A0A0B5]">How should we address you?</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-sm font-medium text-[#A0A0B5]">First Name</Label>
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            placeholder="e.g. Alex"
                            className="bg-[#12121A] border-white/10 text-white rounded-xl h-12 focus:border-purple-500/50 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-sm font-medium text-[#A0A0B5]">Last Name</Label>
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            placeholder="e.g. Smith"
                            className="bg-[#12121A] border-white/10 text-white rounded-xl h-12 focus:border-purple-500/50 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role" className="text-sm font-medium text-[#A0A0B5]">Professional Role</Label>
                        <select
                          id="role"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          className="w-full bg-[#12121A] border border-white/10 text-white rounded-xl h-12 px-4 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all outline-none appearance-none cursor-pointer"
                        >
                          <option value="">Select your current role</option>
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Organization */}
                  {currentStep === 3 && (
                    <div className="space-y-8 py-4">
                      <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Connect to a Campus</h2>
                        <p className="text-[#A0A0B5]">Collaborate with your school or organization</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="organization" className="text-sm font-medium text-[#A0A0B5]">Search Organization</Label>
                        <Input
                          id="organization"
                          value={formData.organization}
                          onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                          placeholder="Search for school or enter join code"
                          className="bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button className="p-5 bg-[#12121A] border border-white/5 rounded-2xl hover:border-purple-500/40 hover:bg-purple-500/5 transition-all text-left group">
                          <div className="flex items-center gap-3 mb-2">
                            <Building2 className="w-5 h-5 text-purple-400" />
                            <p className="text-white font-semibold group-hover:text-purple-400">Join Existing</p>
                          </div>
                          <p className="text-[#6B6B80] text-xs leading-relaxed">Enter a unique code provided by your institution.</p>
                        </button>
                        <button className="p-5 bg-[#12121A] border border-white/5 rounded-2xl hover:border-purple-500/40 hover:bg-purple-500/5 transition-all text-left group">
                          <div className="flex items-center gap-3 mb-2">
                            <BookOpen className="w-5 h-5 text-purple-400" />
                            <p className="text-white font-semibold group-hover:text-purple-400">Create New</p>
                          </div>
                          <p className="text-[#6B6B80] text-xs leading-relaxed">Register your school or study group on the platform.</p>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Interests */}
                  {currentStep === 4 && (
                    <div className="space-y-8 py-4">
                      <div className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Your Interests</h2>
                        <p className="text-[#A0A0B5]">We&apos;ll tailor your learning feed based on these</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {interests.map((interest) => (
                          <button
                            key={interest}
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
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/5">
              <GlowButton
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="text-[#6B6B80] hover:text-white disabled:opacity-30"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </GlowButton>

              <GlowButton
                variant="primary"
                onClick={handleNext}
                isLoading={isSaving}
                className="px-8"
              >
                {currentStep === TOTAL_STEPS ? "Finish Setup" : "Next Step"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </GlowButton>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
