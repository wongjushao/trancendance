"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Suspense } from "react";

// Reads the `?message=` param set by the callback/confirm routes
function ErrorContent() {
  const searchParams = useSearchParams();
  const rawMessage = searchParams.get("message");

  const friendlyMessage = getFriendlyMessage(rawMessage);

  return (
    <div className="w-full max-w-md">
      <div className="bg-[#16161F] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-red-500/10 text-center">

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-white mb-2">
          Something went wrong
        </h1>
        <p className="text-[#A0A0B5] text-sm mb-6 leading-relaxed">
          {friendlyMessage}
        </p>

        {/* Raw error detail (only shown when it differs from the friendly copy) */}
        {rawMessage && rawMessage !== friendlyMessage && (
          <div className="mb-6 rounded-xl border border-white/5 bg-[#12121A] px-4 py-3 text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B80] mb-1">
              Error detail
            </p>
            <p className="text-xs text-[#A0A0B5] break-words">{rawMessage}</p>
          </div>
        )}

        {/* Actions — plain <Link> tags styled with GlowButton's exact CSS classes */}
        <div className="space-y-3">
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 w-full bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>

          {/* <Link
            href="/register"
            className="px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 w-full bg-[#12121A] text-white border border-white/10 hover:border-purple-500/50 hover:bg-white/5"
          >
            <RefreshCw className="w-4 h-4" />
            Try signing up again
          </Link> */}
        </div>

        {/* Support note */}
        <p className="mt-6 text-xs text-[#6B6B80]">
          Need help?{" "}
          <Link
            href="/contact"
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── Friendly message mapping 

function getFriendlyMessage(raw: string | null): string {
  if (!raw) {
    return "An unexpected error occurred during authentication. Please try again.";
  }

  const lower = raw.toLowerCase();

  if (lower.includes("expired") || lower.includes("invalid") || lower.includes("missing")) {
    return "This link has expired or is invalid. Confirmation links are single-use and expire after 24 hours. Please request a new one.";
  }
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "This email is already registered. Try logging in instead.";
  }
  if (lower.includes("email not confirmed")) {
    return "Your email hasn't been confirmed yet. Check your inbox for the confirmation link.";
  }
  if (lower.includes("missing confirmation code")) {
    return "No confirmation code was found in the link. Please use the full link from your email.";
  }

  return raw;
}

// ── Page export 
// useSearchParams() requires a Suspense boundary in Next.js app router
export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <ErrorContent />
    </Suspense>
  );
}
