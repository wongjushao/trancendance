// frontend/app/(auth)/forgot-password/page.tsx
"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateEmail } from "@/lib/validation";

// Step 1: Send reset email
function SendResetForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const validateEmailField = (value: string): string | null => {
    const result = validateEmail(value);
    return result.isValid ? null : result.error || null;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched) {
      const validationError = validateEmailField(value);
      setError(validationError);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    const validationError = validateEmailField(email);
    setError(validationError);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    
    const validationError = validateEmailField(email);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };

      setIsLoading(false);

      if (!data.ok) {
        setError(data.message ?? "Something went wrong. Please try again.");
        return;
      }

      setIsSent(true);
    } catch {
      setIsLoading(false);
      setError("Something went wrong. Please try again.");
    }
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
            <Label htmlFor="email" className="text-white mb-2 block">Email Address <span className="text-red-400">*</span></Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={handleBlur}
                placeholder="you@example.com"
                className={`pl-12 bg-[#12121A] rounded-xl h-12 ${error && touched ? 'border-red-500' : 'border-white/10'} text-white`}
                required
              />
            </div>
            {error && touched && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>

          <GlowButton type="submit" variant="primary" fullWidth isLoading={isLoading}>
            Send Reset Link
          </GlowButton>
        </form>
      ) : (
        <div className="text-center space-y-6">
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="text-green-400 font-medium">Reset link sent!</p>
            </div>
            <p className="text-green-400 text-sm">
              Reset link sent to <span className="font-semibold">{email}</span>.
              Check your inbox and click the link to set a new password.
            </p>
          </div>
          <p className="text-[#6B6B80] text-xs">
            Didn&apos;t receive it? Check your spam folder, or{" "}
            <button
              onClick={() => {
                setIsSent(false);
                setError(null);
                setTouched(false);
              }}
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