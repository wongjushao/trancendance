// frontend/app/(auth)/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, AlertCircle, Shield, Smartphone } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { getSiteUrl } from "@/lib/site-url";
import { validateEmail, validatePassword } from "@/lib/validation";
import { toast } from "sonner";

function getFriendlyLoginError(
  errorMessage: string
): { message: string; action?: { label: string; href: string } } {
  const lower = errorMessage.toLowerCase();

  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return {
      message: "Incorrect email or password. Double-check your details and try again.",
      action: { label: "Forgot your password?", href: "/forgot-password" },
    };
  }
  if (lower.includes("email not confirmed")) {
    return {
      message: "Your email address hasn't been confirmed yet. Check your inbox for the confirmation link.",
    };
  }
  if (lower.includes("no password set") || lower.includes("oauth")) {
    return {
      message: "This account was created with Google. Please sign in with Google instead.",
    };
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return {
      message: "Too many failed attempts. Please wait a few minutes before trying again.",
    };
  }
  if (lower.includes("user is banned") || lower.includes("user not allowed")) {
    return {
      message: "This account has been disabled. Please contact support for help.",
      action: { label: "Contact support", href: "/contact" },
    };
  }
  return { message: errorMessage };
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
    action?: { label: string; href: string };
  } | null>(null);

  // MFA state
  const [showMFA, setShowMFA] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [tempSession, setTempSession] = useState<any>(null);
  const [isVerifyingMFA, setIsVerifyingMFA] = useState(false);

  useEffect(() => {
    // Check if we're returning from OAuth with pending MFA
    const checkPendingMFAFromOAuth = async () => {
      // Check for MFA required cookie
      const mfaRequired = document.cookie.includes('mfa_required=true');
      const mfaToken = document.cookie.split('; ').find(row => row.startsWith('mfa_temp_token='))?.split('=')[1];
      
      if (mfaRequired && mfaToken) {
        // Clear the cookies
        document.cookie = 'mfa_required=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        document.cookie = 'mfa_temp_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        
        // Store token in session storage for MFA verification
        sessionStorage.setItem('mfa_temp_token', mfaToken);
        
        // Show MFA modal
        setShowMFA(true);
        toast.info('MFA verification required');
      }
    };
    
    checkPendingMFAFromOAuth();
  }, []);

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case "email":
        return validateEmail(value).error;
      case "password":
        return !value ? "Password is required" : undefined;
      default:
        return undefined;
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, field === "email" ? email : password);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched.email) {
      const error = validateEmail(value).error;
      setErrors((prev) => ({ ...prev, email: error }));
    }
    if (status) setStatus(null);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched.password) {
      const error = !value ? "Password is required" : undefined;
      setErrors((prev) => ({ ...prev, password: error }));
    }
    if (status) setStatus(null);
  };

  const validateForm = (): boolean => {
    const emailError = validateEmail(email).error;
    const passwordError = !password ? "Password is required" : undefined;
    
    const newErrors = {
      email: emailError,
      password: passwordError,
    };
    
    setErrors(newErrors);
    setTouched({ email: true, password: true });
    
    return !emailError && !passwordError;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const friendly = getFriendlyLoginError(error.message);
      setStatus({ type: "error", ...friendly });
      setIsLoading(false);
      return;
    }

    // Check if MFA is enabled for this user
    try {
      const token = data.session?.access_token;
      const response = await fetch('/api/auth-service/mfa/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const mfaStatus = await response.json();
        
        if (mfaStatus.enabled_mfa) {
          // MFA is enabled, show verification screen
          setTempSession(data.session);
          setShowMFA(true);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error('Error checking MFA status:', err);
      // Continue with login even if MFA check fails
    }

    router.refresh();
    router.push("/dashboard");
  };

  const handleMFAVerification = async () => {
    if (!mfaCode || mfaCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsVerifyingMFA(true);

    try {
      const response = await fetch('/api/auth-service/mfa/verify-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempSession?.access_token}`,
        },
        body: JSON.stringify({ code: mfaCode }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Set the session in Supabase
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.setSession({
          access_token: tempSession.access_token,
          refresh_token: tempSession.refresh_token,
        });
        
        toast.success("MFA verification successful!");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(data.error || "Invalid verification code");
        setMfaCode("");
      }
    } catch (err) {
      console.error('MFA verification error:', err);
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsVerifyingMFA(false);
    }
  };

  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    setStatus(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getSiteUrl()}/auth/callback`,
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
        message =
          "This Google account is associated with an existing email/password account. " +
          "Please sign in with your email and password instead.";
      }
      setStatus({ type: "error", message });
      setIsGoogleLoading(false);
    }
  };

  const getInputClassName = (field: string) => {
    const hasError = field === "email" ? errors.email : errors.password;
    return `pl-12 pr-12 bg-[#12121A] rounded-xl h-12 ${hasError && touched[field as keyof typeof touched] ? 'border-red-500' : 'border-white/10'} text-white`;
  };

  // Show MFA verification screen if needed
  if (showMFA) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-[#16161F] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Two-Factor Authentication</h1>
            <p className="text-[#A0A0B5]">Enter the verification code from your authenticator app</p>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="mfa-code" className="text-white mb-2 block">Verification Code</Label>
              <div className="relative">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
                <Input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setMfaCode(value);
                  }}
                  className="pl-12 text-center text-2xl tracking-widest bg-[#12121A] rounded-xl h-12 border-white/10 text-white"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Open Google Authenticator and enter the 6-digit code
              </p>
            </div>

            <GlowButton
              onClick={handleMFAVerification}
              isLoading={isVerifyingMFA}
              fullWidth
            >
              Verify & Sign In
            </GlowButton>

            <button
              onClick={() => {
                setShowMFA(false);
                setMfaCode("");
                setTempSession(null);
                setIsLoading(false);
              }}
              className="text-sm text-purple-400 hover:text-purple-300 text-center w-full"
            >
              ← Back to login
            </button>

            <div className="text-center text-xs text-[#6B6B80]">
              <p>Lost access to your authenticator app?</p>
              <p>Use one of your backup codes or contact support.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-[#16161F] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/10">

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
            <span className="text-3xl">📚</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-[#A0A0B5]">Sign in to continue learning</p>
        </div>

        <GlowButton variant="secondary" fullWidth isLoading={isGoogleLoading} onClick={handleGoogle} className="mb-6">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </GlowButton>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[#6B6B80] text-sm">or sign in with email</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <Label htmlFor="email" className="text-white mb-2 block">Email Address <span className="text-red-400">*</span></Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => handleBlur("email")}
                placeholder="you@example.com"
                className={getInputClassName("email")}
                required
              />
            </div>
            {touched.email && errors.email && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="password" className="text-white mb-2 block">Password <span className="text-red-400">*</span></Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onBlur={() => handleBlur("password")}
                placeholder="••••••••"
                className={getInputClassName("password")}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B80] hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {touched.password && errors.password && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.password}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
              Forgot password?
            </Link>
          </div>

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
            Sign In
          </GlowButton>
        </form>

        <p className="text-center text-[#A0A0B5] mt-6 text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}