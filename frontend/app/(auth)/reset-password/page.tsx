// frontend/app/(auth)/reset-password/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";
import { validatePassword, validateConfirmPassword } from "@/lib/validation";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [touched, setTouched] = useState<{ password?: boolean; confirmPassword?: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  
  // Get token from URL (from Supabase email link)
  const token = searchParams.get("token");
  const type = searchParams.get("type");

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case "password":
        return validatePassword(value).error;
      case "confirmPassword":
        return validateConfirmPassword(password, value).error;
      default:
        return undefined;
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, field === "password" ? password : confirmPassword);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched.password) {
      const error = validatePassword(value).error;
      setErrors((prev) => ({ ...prev, password: error }));
    }
    if (touched.confirmPassword) {
      const confirmError = validateConfirmPassword(value, confirmPassword).error;
      setErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleConfirmChange = (value: string) => {
    setConfirmPassword(value);
    if (touched.confirmPassword) {
      const error = validateConfirmPassword(password, value).error;
      setErrors((prev) => ({ ...prev, confirmPassword: error }));
    }
  };

  const validateForm = (): boolean => {
    const passwordError = validatePassword(password).error;
    const confirmError = validateConfirmPassword(password, confirmPassword).error;
    
    const newErrors = {
      password: passwordError,
      confirmPassword: confirmError,
    };
    
    setErrors(newErrors);
    setTouched({ password: true, confirmPassword: true });
    
    return !passwordError && !confirmError;
  };

  useEffect(() => {
    const validateToken = async () => {
      setIsValidating(true);
      
      // First check if there's an active session (user might already be logged in)
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.email_confirmed_at) {
        setIsValidating(false);
        return;
      }
      
      if (token && type === "recovery") {
        setResetToken(token);
        
        try {
          // Verify token via backend API
          const response = await fetch('/api/auth-service/verify-reset-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || "Invalid token");
          }
          
          if (!data.valid) {
            throw new Error(data.error || "Invalid or expired reset link");
          }
          
          // console.log("Token verified for user:", data.email);
          
        } catch (err: any) {
          console.error("Token validation error:", err);
          setErrors({ password: err.message || "This password reset link is invalid or has expired. Please request a new one." });
        }
      } else if (!token) {
        // Check if user is already authenticated with a valid session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession?.user?.email_confirmed_at) {
          setErrors({ password: "No valid password reset token found. Please request a new password reset link." });
        }
      }
      
      setIsValidating(false);
    };
    
    validateToken();
  }, [token, type]);

  const getPasswordStrength = () => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][getPasswordStrength()];
  const strengthColor = ["", "bg-red-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"][getPasswordStrength()];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use the reset-password endpoint which handles token verification
      const response = await fetch('/api/auth-service/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          password,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }
      
      setIsSuccess(true);
      toast.success("Password updated successfully! Redirecting to login...");
      
      // Only sign out if there was a session (but with reset flow, there shouldn't be)
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.signOut();
      }
      
      setTimeout(() => {
        router.push("/login");
      }, 3000);
      
    } catch (err: any) {
      console.error("Password reset error:", err);
      setErrors({ password: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const getInputClassName = (field: string) => {
    const hasError = field === "password" ? errors.password : errors.confirmPassword;
    const showError = hasError && touched[field as keyof typeof touched];
    return `pl-12 pr-12 bg-[#12121A] rounded-xl h-12 ${showError ? 'border-red-500' : 'border-white/10'} text-white`;
  };
  
  if (isValidating) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-[#16161F] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30 animate-pulse">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Validating Reset Link</h2>
          <p className="text-[#A0A0B5]">Please wait while we verify your password reset link...</p>
        </div>
      </div>
    );
  }
  
  if (errors.password && errors.password.includes("invalid") || errors.password?.includes("expired")) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-[#16161F] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Invalid Reset Link</h2>
          <p className="text-[#A0A0B5] mb-6">{errors.password}</p>
          <Link href="/forgot-password">
            <GlowButton variant="primary" fullWidth>
              Request New Reset Link
            </GlowButton>
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-[#A0A0B5] hover:text-white mt-4 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    );
  }
  
  if (isSuccess) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-[#16161F] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Password Updated!</h2>
          <p className="text-[#A0A0B5] mb-4">
            Your password has been changed successfully.
          </p>
          <p className="text-sm text-[#6B6B80] mb-6">
            Redirecting you to the login page...
          </p>
          <Link href="/login">
            <GlowButton variant="primary" fullWidth>
              Go to Login
            </GlowButton>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-md">
      <div className="bg-[#16161F] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Set New Password</h1>
          <p className="text-[#A0A0B5]">
            Choose a strong password for your account
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="new-password" className="text-white mb-2 block">
              New Password <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onBlur={() => handleBlur("password")}
                placeholder="Min. 8 characters, with uppercase, number, and special character"
                className={getInputClassName("password")}
                required
                autoFocus
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
            
            {password && (
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
            {touched.password && errors.password && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.password}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="confirm-password" className="text-white mb-2 block">
              Confirm New Password <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => handleConfirmChange(e.target.value)}
                onBlur={() => handleBlur("confirmPassword")}
                placeholder="Repeat your new password"
                className={getInputClassName("confirmPassword")}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B80] hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {touched.confirmPassword && errors.confirmPassword && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.confirmPassword}
              </p>
            )}
          </div>
          
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-sm font-medium text-blue-400 mb-2">Password Requirements:</p>
            <ul className="text-xs text-[#A0A0B5] space-y-1">
              <li className={password.length >= 8 ? "text-green-400" : ""}>
                • At least 8 characters {password.length >= 8 ? "✓" : ""}
              </li>
              <li className={/[A-Z]/.test(password) ? "text-green-400" : ""}>
                • At least one uppercase letter {/[A-Z]/.test(password) ? "✓" : ""}
              </li>
              <li className={/[0-9]/.test(password) ? "text-green-400" : ""}>
                • At least one number {/[0-9]/.test(password) ? "✓" : ""}
              </li>
              <li className={/[^A-Za-z0-9]/.test(password) ? "text-green-400" : ""}>
                • At least one special character {/[^A-Za-z0-9]/.test(password) ? "✓" : ""}
              </li>
            </ul>
          </div>
          
          <GlowButton 
            type="submit" 
            variant="primary" 
            fullWidth 
            isLoading={isLoading}
            disabled={!password || !confirmPassword}
          >
            Update Password
          </GlowButton>
        </form>
        
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-[#A0A0B5] hover:text-white mt-6 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md">
        <div className="bg-[#16161F] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/10 text-center">
          <div className="animate-pulse">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 mx-auto mb-4" />
            <div className="h-6 w-32 bg-purple-500/20 rounded mx-auto mb-2" />
            <div className="h-4 w-48 bg-purple-500/20 rounded mx-auto" />
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}