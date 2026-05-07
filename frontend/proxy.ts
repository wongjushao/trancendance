// frontend/proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

// Pages that require login AND a completed profile
const protectedRoutes = [
  "/dashboard",
  "/courses",
  "/assignments",
  "/analytics",
  "/profile",
  "/settings",
  "/messages",
  "/notifications",
  "/student",
  "/teacher",
  "/admin",
  "/organizations",
  "/organization-setup",
  "/teacher-request",
];

// Pages that require login but NOT a completed profile
const authOnlyRoutes = [
  "/onboarding",
  "/auth/mfa-verify",
  "/auth/error",
];

// Pages that logged-in users should NOT see (they get redirected to dashboard)
const publicOnlyRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/faq"
];

// Routes that should be accessible to both authenticated and unauthenticated users
const publicRoutes = [
  "/",
  "/privacy",
  "/terms",
  "/contact",
  "/auth/callback",
  "/auth/confirm",
  "/auth/error",
  "/accept-invite",
  "/invite/accept", // Add this for invite acceptance
];

async function checkOnboardingStatus(token: string): Promise<boolean> {
  try {
    // Don't call back into the Next server via NEXT_PUBLIC_SITE_URL here.
    // In Docker, that value is for *browser* redirects (often localhost/https) and
    // can be unreachable from inside the runtime (leading to ECONNREFUSED).
    // Call the auth service directly on the Docker network instead.
    const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://auth-service:5001").replace(
      /\/$/,
      ""
    );
    const response = await fetch(
      `${backendUrl}/api/auth-service/onboarding-status`,
      {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return data.onboarded === true;
  } catch (error) {
    console.error("[proxy] Error checking onboarding status:", error);
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Allow public routes without any checks (including accept-invite)
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + "/"))) {
    console.log("[proxy] Public route, allowing access:", pathname);
    return NextResponse.next();
  }

  // Allow MFA verify page without session check
  if (pathname === "/auth/mfa-verify") {
    console.log("[proxy] MFA verify page, allowing access");
    return NextResponse.next();
  }

  // Get user session
  const supabase = await createSupabaseServerClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  // Unauthenticated users
  if (!session || sessionError) {
    console.log("[proxy] User not authenticated");
    
    // Allow access to public-only routes
    if (publicOnlyRoutes.some(route => pathname === route) || 
        pathname === "/" ||
        pathname.startsWith("/_landing")) {
      return NextResponse.next();
    }
    
    // Redirect to login for protected routes
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated users
  console.log("[proxy] User authenticated:", session.user.id);

  const mfaPending = request.cookies.get("mfa_pending")?.value === "true";
  if (mfaPending && pathname !== "/auth/mfa-verify") {
    console.log("[proxy] MFA pending, redirecting to verification page");
    return NextResponse.redirect(new URL("/auth/mfa-verify", request.url));
  }

  // Don't re-show login/register to signed-in users
  if (publicOnlyRoutes.some(route => pathname === route)) {
    console.log("[proxy] Authenticated user trying to access public route, redirecting to dashboard");
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // For protected pages, check onboarding
  const isProtected = protectedRoutes.some(route => pathname === route || pathname.startsWith(route + "/"));
  const isAuthOnly = authOnlyRoutes.some(route => pathname === route || pathname.startsWith(route + "/"));
  
  if (isProtected || isAuthOnly) {
    console.log("[proxy] Protected or auth-only page, checking onboarding");
    
    const accessToken = session.access_token;
    const onboarded = await checkOnboardingStatus(accessToken);
    console.log("[proxy] Onboarding status result:", onboarded);
    
    if (isAuthOnly && !onboarded) {
      console.log("[proxy] Auth-only route and user not onboarded, allowing access");
      return NextResponse.next();
    }
    
    if (isProtected && !onboarded) {
      console.log("[proxy] Protected route and user not onboarded, redirecting to onboarding");
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    
    console.log("[proxy] Onboarded user, allowing access");
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
