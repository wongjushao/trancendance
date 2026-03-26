"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { getSiteUrl } from "@/lib/site-url";

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
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
    action?: { label: string; href: string };
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setIsLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const friendly = getFriendlyLoginError(error.message);
      setStatus({ type: "error", ...friendly });
      setIsLoading(false);
      return;
    }

    router.refresh();
    router.push("/dashboard");
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
          // Pass a hint about where the sign-in originated from
          // This helps with redirect logic if needed
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
    // No need to handle redirect here - Supabase handles it
  };

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
            <Label htmlFor="email" className="text-white mb-2 block">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status?.type === "error") setStatus(null);
                }}
                placeholder="you@example.com"
                className="pl-12 bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password" className="text-white mb-2 block">Password</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (status?.type === "error") setStatus(null);
                }}
                placeholder="••••••••"
                className="pl-12 pr-12 bg-[#12121A] border-white/10 text-white rounded-xl h-12"
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
