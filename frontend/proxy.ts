import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { isProfileComplete, type ProfileRow } from "@/lib/profile";

// Pages that require login AND a completed profile
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/courses",
  "/assignments",
  "/messages",
  "/notifications",
  "/analytics",
  "/admin",
  "/organizations",
  "/lessons",
];

// Pages that require login but NOT a completed profile
// (onboarding itself lives here — logged-in users with incomplete profiles can access it)
const AUTH_ONLY_PREFIXES = ["/onboarding"];

// Pages that logged-in users should not see (they're already in)
const AUTH_PREFIXES = ["/login", "/register", "/forgot-password"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected    = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthOnly     = AUTH_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute    = AUTH_PREFIXES.some((p) => pathname.startsWith(p));

  // ── Unauthenticated users ─────────────────────────────────────────────────

  if (!user && (isProtected || isAuthOnly)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // ── Authenticated users ───────────────────────────────────────────────────

  if (user) {
    // Don't re-show login/register to signed-in users
    if (isAuthRoute) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // For protected pages and onboarding, check profile completeness.
    // We only do the DB query when we're on a route that cares — skips
    // static assets, API routes, etc.
    if (isProtected || isAuthOnly) {

      // Fast path: user_metadata.onboarded flag set during final onboarding submit.
      // This avoids a DB round-trip on every navigation once onboarding is done.
      const alreadyOnboarded = user.user_metadata?.onboarded === true;

      let profileComplete = alreadyOnboarded;

      if (!alreadyOnboarded) {
        // Slow path: query the profiles table directly
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, bio, timezone, language, birthday")
          .eq("id", user.id)
          .single();

        profileComplete = isProfileComplete(profile as ProfileRow | null);
      }

      if (!profileComplete) {
        // Incomplete profile → force onboarding, unless already there
        if (!isAuthOnly) {
          return NextResponse.redirect(new URL("/onboarding", request.url));
        }
        // Already on /onboarding, let them through
        return NextResponse.next();
      }

      // Profile IS complete
      if (isAuthOnly) {
        // Block re-entry to onboarding for completed users
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|auth/confirm|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
