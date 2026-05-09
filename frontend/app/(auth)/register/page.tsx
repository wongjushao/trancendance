// frontend/app/(auth)/register/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, AlertCircle, CheckCircle } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { getSiteUrl } from "@/lib/site-url";
import {
  validateEmail,
  validatePassword,
  validateName,
  validateConfirmPassword,
} from "@/lib/validation";
import { fetchOrganizationMemberInvitationFromBackend } from "@/lib/invites";
import { readPendingOrgInvitation, writePendingOrgInvitation } from "@/lib/org-invitation-pending";

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

function getFriendlyRegisterError(
  errorMessage: string,
  email: string
): { message: string; action?: { label: string; href: string } } {
  const lower = errorMessage.toLowerCase();

  if (lower.includes("provider") && lower.includes("already linked")) {
    return {
      message: `${email} is already linked to a Google account.`,
      action: { label: "Sign in with Google", href: "/login" },
    };
  }
  if (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already exists")
  ) {
    return {
      message: `An account with ${email} already exists.`,
      action: { label: "Log in instead", href: "/login" },
    };
  }
  if (lower.includes("email rate limit") || lower.includes("too many requests")) {
    return { message: "Too many sign-up attempts. Please wait a few minutes and try again." };
  }
  if (lower.includes("password") && lower.includes("weak")) {
    return { message: "Your password is too weak. Try mixing letters, numbers, and symbols." };
  }
  if (lower.includes("invalid email") || lower.includes("unable to validate email")) {
    return { message: "Please enter a valid email address." };
  }
  return { message: errorMessage };
}

function normalizeSignupEmail(email: string): string {
  return email.trim().toLowerCase();
}

export default function RegisterPage() {
  const router = useRouter();
  const inviteTokenRef = useRef<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<{ orgName: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
    action?: { label: string; href: string };
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrateInvitation() {
      if (typeof window === "undefined") return;

      const sp = new URLSearchParams(window.location.search);
      const tokenFromUrl = sp.get("invite_token");

      const pending = readPendingOrgInvitation();
      const token = tokenFromUrl ?? pending?.token ?? null;
      inviteTokenRef.current = token;

      if (!token) {
        if (pending?.email) {
          setFormData((prev) => ({
            ...prev,
            email: normalizeSignupEmail(pending.email),
          }));
          setInviteNotice({ orgName: pending.organizationName });
        }
        return;
      }

      const backend = await fetchOrganizationMemberInvitationFromBackend(token);
      if (cancelled || !backend.ok) {
        if (!cancelled && pending?.email) {
          setFormData((prev) => ({
            ...prev,
            email: normalizeSignupEmail(pending.email),
          }));
          setInviteNotice({ orgName: pending.organizationName });
        }
        return;
      }

      const d = backend.data;
      const emailNorm = normalizeSignupEmail(d.email);
      writePendingOrgInvitation({
        token,
        email: emailNorm,
        role: d.member_role,
        organizationId: d.organization_id,
        organizationName: d.organization_name || "Organization",
        invitedByName: d.invited_by_name || "",
        inviteSource: "backend",
      });

      setFormData((prev) => ({
        ...prev,
        email: emailNorm,
      }));
      setInviteNotice({ orgName: d.organization_name || "your organization" });
    }

    hydrateInvitation();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !session?.user?.email) return;
      const pending = readPendingOrgInvitation();
      if (
        !pending ||
        normalizeSignupEmail(session.user.email) !== normalizeSignupEmail(pending.email)
      ) {
        return;
      }
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/register")) {
        router.replace(`/accept-invite?token=${encodeURIComponent(pending.token)}`);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case "name":
        return validateName(value, "Full name").error;
      case "email":
        return validateEmail(value).error;
      case "password":
        return validatePassword(value).error;
      case "confirmPassword":
        return validateConfirmPassword(formData.password, value).error;
      default:
        return undefined;
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field as keyof typeof formData]);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
    
    if (field === "password" && touched["confirmPassword"]) {
      const confirmError = validateConfirmPassword(value, formData.confirmPassword).error;
      setErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    const nameError = validateName(formData.name, "Full name").error;
    if (nameError) {
      newErrors.name = nameError;
      isValid = false;
    }

    const emailError = validateEmail(formData.email).error;
    if (emailError) {
      newErrors.email = emailError;
      isValid = false;
    }

    const passwordError = validatePassword(formData.password).error;
    if (passwordError) {
      newErrors.password = passwordError;
      isValid = false;
    }

    const confirmError = validateConfirmPassword(formData.password, formData.confirmPassword).error;
    if (confirmError) {
      newErrors.confirmPassword = confirmError;
      isValid = false;
    }

    setErrors(newErrors);
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    return isValid;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();

    const inviteTok = inviteTokenRef.current?.trim();
    const redirectBase = `${getSiteUrl()}/auth/callback`;
    const emailRedirectTo =
      inviteTok && inviteTok.length > 0
        ? `${redirectBase}?invite_token=${encodeURIComponent(inviteTok)}`
        : redirectBase;

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo,
        data: { full_name: formData.name },
      },
    });

    setIsLoading(false);

    if (error) {
      const friendly = getFriendlyRegisterError(error.message, formData.email);
      setStatus({ type: "error", ...friendly });
      return;
    }

    // Supabase quirk: duplicate email returns no error but identities is empty
    if (data.user && data.user.identities?.length === 0) {
      setStatus({
        type: "error",
        message: `An account with ${formData.email} already exists.`,
        action: { label: "Log in instead", href: "/login" },
      });
      return;
    }

    if (data.session?.access_token && inviteTok && inviteTok.length > 0) {
      router.replace(`/accept-invite?token=${encodeURIComponent(inviteTok)}`);
      return;
    }

    setStatus({
      type: "success",
      message:
        inviteTok && inviteTok.length > 0
          ? "Account created! Confirm your email from your inbox — we'll take you to accept your invitation right after."
          : "Account created! Check your email and click the confirmation link to activate it.",
    });
  };

  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    setStatus(null);
    const supabase = getSupabaseBrowserClient();

    const inviteTok = inviteTokenRef.current?.trim();
    const redirectBase = `${getSiteUrl()}/auth/callback`;
    const redirectTo =
      inviteTok && inviteTok.length > 0
        ? `${redirectBase}?invite_token=${encodeURIComponent(inviteTok)}`
        : redirectBase;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      },
    });

    if (error) {
      const lower = error.message.toLowerCase();
      let message = error.message;
      if (lower.includes("provider") || lower.includes("already linked")) {
        message = "This Google account is already linked to an existing account. Try logging in instead.";
      }
      setStatus({ type: "error", message, action: { label: "Log in", href: "/login" } });
      setIsGoogleLoading(false);
    }
  };

  const getFieldError = (field: string) => {
    return touched[field] ? errors[field as keyof FormErrors] : undefined;
  };

  const getInputClassName = (field: string) => {
    const hasError = getFieldError(field);
    return `pl-12 bg-[#12121A] rounded-xl h-12 ${hasError ? 'border-red-500' : 'border-white/10'} text-white`;
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-[#16161F] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
            <span className="text-3xl">🚀</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-[#A0A0B5]">Start your learning journey today</p>
        </div>

        {inviteNotice && (
          <div className="mb-6 rounded-xl border border-purple-500/25 bg-purple-500/10 p-4 text-sm text-purple-100">
            You're signing up to join{" "}
            <span className="font-semibold text-white">{inviteNotice.orgName}</span>.
            Use the same email address this invitation was sent to so you can finish joining after you verify your account.
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <Label htmlFor="name" className="text-white mb-2 block">Full Name <span className="text-red-400">*</span></Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                placeholder="Your full name"
                className={getInputClassName("name")}
                required
              />
            </div>
            {getFieldError("name") && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {getFieldError("name")}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="email" className="text-white mb-2 block">Email Address <span className="text-red-400">*</span></Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                placeholder="you@example.com"
                className={getInputClassName("email")}
                required
              />
            </div>
            {getFieldError("email") && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {getFieldError("email")}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="password" className="text-white mb-2 block">Password <span className="text-red-400">*</span></Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                placeholder="Min. 6 characters"
                className={getInputClassName("password")}
                required
              />
            </div>
            {getFieldError("password") && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {getFieldError("password")}
              </p>
            )}
            {formData.password && !getFieldError("password") && (
              <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Password is strong
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-white mb-2 block">Confirm Password <span className="text-red-400">*</span></Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                onBlur={() => handleBlur("confirmPassword")}
                placeholder="Repeat your password"
                className={getInputClassName("confirmPassword")}
                required
              />
            </div>
            {getFieldError("confirmPassword") && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {getFieldError("confirmPassword")}
              </p>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm text-[#A0A0B5] cursor-pointer">
            <input type="checkbox" className="mt-1 rounded border-white/10" required />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="text-purple-400 hover:text-purple-300 transition-colors">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-purple-400 hover:text-purple-300 transition-colors">Privacy Policy</Link>
            </span>
          </label>

          {status && (
            <div className={`rounded-xl border p-3 text-sm font-medium ${
              status.type === "success"
                ? "border-green-500/20 bg-green-500/10 text-green-400"
                : "border-red-500/20 bg-red-500/10 text-red-400"
            }`}>
              <p>{status.message}</p>
              {status.action && (
                <Link href={status.action.href} className="inline-block mt-2 underline hover:opacity-80 font-semibold">
                  {status.action.label} →
                </Link>
              )}
            </div>
          )}

          <GlowButton type="submit" variant="primary" fullWidth isLoading={isLoading}>
            Create Account
          </GlowButton>
        </form>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[#6B6B80] text-sm">or sign up with</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <GlowButton variant="secondary" fullWidth isLoading={isGoogleLoading} onClick={handleGoogle}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </GlowButton>

        <p className="text-center text-[#A0A0B5] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}