import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

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

async function checkOnboardingStatus(token: string): Promise<boolean> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://auth-service:5001';
    
    console.log('[proxy] Checking onboarding status for token');

    const response = await fetch(
      `${backendUrl}/api/auth-service/onboarding-status`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    console.log('[proxy] Onboarding status response:', response.status);

    if (!response.ok) {
      console.log('[proxy] Failed to check onboarding status');
      return false;
    }
    
    const data = await response.json();
    console.log('[proxy] Onboarding status:', data.onboarded);
    return data.onboarded;
  } catch (error) {
    console.error('Error checking onboarding status in proxy:', error);
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected    = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthOnly     = AUTH_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute    = AUTH_PREFIXES.some((p) => pathname.startsWith(p));

  // Unauthenticated users
  if (!user && (isProtected || isAuthOnly)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Authenticated users
  if (user) {
    console.log('[proxy] User authenticated:', user.id);
    // Don't re-show login/register to signed-in users
    if (isAuthRoute) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // For protected pages and onboarding, check profile completeness via backend
    if (isProtected || isAuthOnly) {
      console.log('[proxy] Protected or auth-only page, checking onboarding');
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.log('[proxy] No session token')
        return NextResponse.redirect(new URL("/", request.url));
      }

      // Check onboarding status via backend
      const onboarded = await checkOnboardingStatus(session.access_token);
      console.log('[proxy] Onboarding status result:', onboarded);
      if (!onboarded) {
        console.log('[proxy] Not onboarded, redirecting to onboarding');
        // Incomplete profile → force onboarding, unless already there
        if (!isAuthOnly) {
          return NextResponse.redirect(new URL("/onboarding", request.url));
        }
        // Already on /onboarding, let them through
        return NextResponse.next();
      }

      // Profile IS complete
      console.log('[proxy] Onboarded user, allowing access');
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