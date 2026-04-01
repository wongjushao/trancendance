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

// Step 1: Send reset email
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
      redirectTo: `${getSiteUrl()}/reset-password`,
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

// ForgotPasswordContent router - reads ?step= from the URL (legacy support)
function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const step = searchParams.get("step");

  // If step=reset, redirect to the dedicated reset password page
  if (step === "reset") {
    // This handles legacy links that might have ?step=reset
    // We redirect to the new reset-password page
    if (typeof window !== "undefined") {
      window.location.href = "/reset-password";
    }
    return null;
  }

  return <SendResetForm />;
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordContent />
    </Suspense>
  );
}