// frontend/app/auth/mfa-verify/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Smartphone, AlertCircle } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { verifyLoginMFA } from "@/lib/mfa-api";
import { toast } from "sonner";

export default function MFAVerifyPage() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const router = useRouter();

  // Check if we have a pending MFA verification
  useEffect(() => {
    const checkPendingMFA = async () => {
      // Try to get token from session storage (set by OAuth callback)
      let token = sessionStorage.getItem('mfa_temp_token');
      
      // If not in session storage, try cookies (set by callback route)
      if (!token) {
        const mfaTokenCookie = document.cookie.split('; ').find(row => row.startsWith('mfa_temp_token='));
        if (mfaTokenCookie) {
          token = mfaTokenCookie.split('=')[1];
          // Clear the cookie
          document.cookie = 'mfa_temp_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
          document.cookie = 'mfa_required=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
          sessionStorage.setItem('mfa_temp_token', token);
        }
      }
      
      if (!token) {
        // No pending MFA, redirect to login
        toast.error("No MFA verification pending");
        router.push("/login");
        return;
      }
      
      setTempToken(token);
      
      // Check if we already have a session
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      // If we have a session but MFA is required, we need to verify
      if (session && session.access_token !== token) {
        // Try to restore session from temp token
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: token,
          refresh_token: session.refresh_token,
        });
        
        if (setSessionError) {
          console.error("Error setting session:", setSessionError);
        }
      }
    };
    
    checkPendingMFA();
  }, [router]);

  // Helper to get cookie value
  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code || code.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (!tempToken) {
        throw new Error("No verification token found");
      }
      
      // Verify MFA code with backend
      await verifyLoginMFA(tempToken, code);
      
      // Clear MFA cookies and session storage
      document.cookie = 'mfa_required=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      document.cookie = 'mfa_temp_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      sessionStorage.removeItem('mfa_temp_token');
      
      // Get the current session
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No session found after MFA verification");
      }
      
      // Refresh the session to get the updated user state
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error("Error refreshing session:", refreshError);
      }
      
      // Check onboarding status
      const response = await fetch('/api/auth-service/onboarding-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.onboarded) {
          router.push("/dashboard");
        } else {
          router.push("/onboarding");
        }
      } else {
        router.push("/dashboard");
      }
      
      toast.success("MFA verification successful");
      
    } catch (err) {
      console.error("MFA verification error:", err);
      setError(err instanceof Error ? err.message : "Verification failed");
      toast.error("Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Clear MFA cookies and redirect to login
    document.cookie = 'mfa_required=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'mfa_temp_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    sessionStorage.removeItem('mfa_temp_token');
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">MFA Verification Required</h1>
            <p className="text-gray-400 mt-2">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <Label htmlFor="code" className="text-gray-300">
                Verification Code
              </Label>
              <div className="relative mt-2">
                <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    if (value.length <= 6) setCode(value);
                  }}
                  className="pl-10 bg-gray-800/50 border-gray-700 text-white text-center text-2xl tracking-widest"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Open Google Authenticator and enter the 6-digit code
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <GlowButton
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </GlowButton>
              <GlowButton
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="flex-1"
              >
                Verify
              </GlowButton>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-xs text-center text-gray-500">
              Lost access to your authenticator app? Contact support for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}