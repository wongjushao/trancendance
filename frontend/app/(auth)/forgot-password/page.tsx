"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, ArrowLeft, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { getSiteUrl } from "@/lib/site-url";
import { useRouter } from "next/navigation";

// ── Step 1: Send reset email ──────────────────────────────────────────────────

function SendResetForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      // Use getSiteUrl() — never window.location.origin in Docker
      redirectTo: `${getSiteUrl()}/auth/confirm?type=recovery`,
    });

    setIsLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setIsSent(true);
  };

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
          <Mail className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
        <p className="text-[#A0A0B5]">
          {isSent
            ? "Check your email for reset instructions"
            : "Enter your email to receive a password reset link"}
        </p>
      </div>

      {!isSent ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email" className="text-white mb-2 block">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-12 bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-400">
              {error}
            </div>
          )}

          <GlowButton type="submit" variant="primary" fullWidth isLoading={isLoading}>
            Send Reset Link
          </GlowButton>
        </form>
      ) : (
        <div className="text-center space-y-6">
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <p className="text-green-400 text-sm">
              Reset link sent to <span className="font-semibold">{email}</span>.
              Check your inbox and click the link to set a new password.
            </p>
          </div>
          <p className="text-[#6B6B80] text-xs">
            Didn&apos;t receive it? Check your spam folder, or{" "}
            <button
              onClick={() => setIsSent(false)}
              className="text-purple-400 hover:text-purple-300 underline transition-colors"
            >
              try again
            </button>
            .
          </p>
        </div>
      )}

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-[#A0A0B5] hover:text-white mt-6 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Login
      </Link>
    </>
  );
}

// ── Step 2: Set new password (landed here from recovery email link) ───────────

function SetNewPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)             s++;
    if (/[A-Z]/.test(password))           s++;
    if (/[0-9]/.test(password))           s++;
    if (/[^A-Za-z0-9]/.test(password))    s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-red-500", "bg-yellow-500", "bg-blue-400", "bg-green-500"][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setIsDone(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  if (isDone) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Password Updated</h1>
          <p className="text-[#A0A0B5] text-sm">
            Your password has been changed successfully. Redirecting you to your dashboard…
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Set New Password</h1>
        <p className="text-[#A0A0B5]">Choose a strong password for your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="new-password" className="text-white mb-2 block">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
            <Input
              id="new-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="pl-12 pr-12 bg-[#12121A] border-white/10 text-white rounded-xl h-12"
              required
              minLength={8}
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
                      i <= strength ? strengthColor : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-[#6B6B80]">
                Strength:{" "}
                <span className={`font-semibold ${
                  strength <= 1 ? "text-red-400" :
                  strength === 2 ? "text-yellow-400" :
                  strength === 3 ? "text-blue-400" : "text-green-400"
                }`}>
                  {strengthLabel}
                </span>
              </p>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="confirm-password" className="text-white mb-2 block">Confirm New Password</Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
            <Input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your new password"
              className={`pl-12 pr-12 bg-[#12121A] border text-white rounded-xl h-12 ${
                confirmPassword && password !== confirmPassword
                  ? "border-red-500/50"
                  : confirmPassword && password === confirmPassword
                  ? "border-green-500/40"
                  : "border-white/10"
              }`}
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
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-medium text-red-400">
            {error}
          </div>
        )}

        <GlowButton type="submit" variant="primary" fullWidth isLoading={isLoading}>
          Update Password
        </GlowButton>
      </form>
    </>
  );
}

// ── Router — reads ?step= from the URL ───────────────────────────────────────

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const step = searchParams.get("step");

  return (
    <div className="w-full max-w-md">
      <div className="bg-[#16161F] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/10">
        {step === "reset" ? <SetNewPasswordForm /> : <SendResetForm />}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
