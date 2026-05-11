// frontend/app/auth/mfa-verify/page.tsx
"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Shield, Smartphone, AlertCircle, Loader2 } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export default function MFAVerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    const checkPendingMFA = async () => {
      // console.log("[MFA Verify] Checking for pending MFA...");

      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      // Check pending MFA markers from the login and OAuth flows.
      const mfaRequired = sessionStorage.getItem("mfa_required");
      const cookiePending = document.cookie
        .split("; ")
        .some((cookie) => cookie === "mfa_pending=true");
      const access = sessionStorage.getItem("mfa_access_token") || session?.access_token || null;
      const refresh = sessionStorage.getItem("mfa_refresh_token") || session?.refresh_token || null;
      
      // console.log("[MFA Verify] mfa_required:", mfaRequired);
      // console.log("[MFA Verify] cookie pending:", cookiePending);
      // console.log("[MFA Verify] access present:", !!access);
      // console.log("[MFA Verify] refresh present:", !!refresh);
      
      if ((mfaRequired !== "true" && !cookiePending) || !access || !refresh) {
        // console.log("[MFA Verify] No pending MFA found, redirecting to login");
        // Clean up any stale data
        sessionStorage.removeItem("mfa_access_token");
        sessionStorage.removeItem("mfa_refresh_token");
        sessionStorage.removeItem("mfa_user_id");
        sessionStorage.removeItem("mfa_required");
        document.cookie = "mfa_pending=; path=/; max-age=0; SameSite=Lax";
        router.replace("/login");
        return;
      }
      
      setAccessToken(access);
      setRefreshToken(refresh);
      setIsLoading(false);
      // console.log("[MFA Verify] MFA verification ready");
    };

    checkPendingMFA();
  }, [router]);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    if (!accessToken || !refreshToken) {
      setError("Session expired. Please log in again.");
      router.replace("/login");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // console.log("[MFA Verify] Verifying code with backend...");
      
      const supabase = getSupabaseBrowserClient();
      
      // Now verify the MFA code
      const response = await fetch('/api/auth-service/mfa/verify-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ code }),
      });
      
      const data = await response.json();
      // console.log("[MFA Verify] Verification response:", { success: data.success, status: response.status });
      
      if (response.ok && data.success) {
        // console.log("[MFA Verify] MFA verification successful!");
        
        // Clear MFA data from sessionStorage
        sessionStorage.removeItem("mfa_access_token");
        sessionStorage.removeItem("mfa_refresh_token");
        sessionStorage.removeItem("mfa_user_id");
        sessionStorage.removeItem("mfa_required");
        document.cookie = "mfa_pending=; path=/; max-age=0; SameSite=Lax";
        
        // Check onboarding status
        setTimeout(async () => {
          const onboardingResponse = await fetch("/api/auth-service/onboarding-status", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          const onboardingData = await onboardingResponse.json();
          
          if (onboardingData.onboarded) {
            // console.log("[MFA Verify] User onboarded, redirecting to dashboard");
            router.replace("/dashboard");
          } else {
            // console.log("[MFA Verify] User not onboarded, redirecting to onboarding");
            router.replace("/onboarding");
          }
        }, 500);
      } else {
        setError(data.message || "Invalid verification code");
        setCode("");
      }
    } catch (err) {
      console.error("[MFA Verify] MFA verification error:", err);
      setError("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.signOut({ scope: "local" });

    // Clear all MFA data
    sessionStorage.removeItem("mfa_access_token");
    sessionStorage.removeItem("mfa_refresh_token");
    sessionStorage.removeItem("mfa_user_id");
    sessionStorage.removeItem("mfa_required");
    document.cookie = "mfa_pending=; path=/; max-age=0; SameSite=Lax";
    router.replace("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-violet-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Two-Factor Authentication
            </h1>
            <p className="text-gray-400">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <Label htmlFor="code" className="text-gray-300 mb-2 block">
                Verification Code
              </Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "");
                  setCode(value);
                  setError(null);
                }}
                className="bg-gray-800/50 border-gray-700 text-white text-center text-2xl tracking-widest"
                autoFocus
                disabled={isVerifying}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <GlowButton
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isVerifying}
                className="flex-1"
              >
                Cancel
              </GlowButton>
              <GlowButton
                type="submit"
                variant="primary"
                isLoading={isVerifying}
                disabled={!code || code.length !== 6}
                className="flex-1"
              >
                Verify
              </GlowButton>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <Smartphone className="w-4 h-4" />
              <span>Open your authenticator app to get your verification code</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}