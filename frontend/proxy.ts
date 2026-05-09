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
  "/invite/accept",
];

// Routes that should bypass setup check
const bypassSetupRoutes = [
  "/setup",
  "/onboarding", 
  "/auth/mfa-verify",
  "/admin",  // ADDED - bypass setup check for admin panel
];

async function checkOnboardingStatus(token: string): Promise<boolean> {
  try {
    const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://auth-service:5001").replace(/\/$/, "");
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

async function checkOrganizationSetupStatus(orgId: string, token: string): Promise<boolean> {
  try {
    const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://org-service:5003").replace(/\/$/, "");
    const response = await fetch(
      `${backendUrl}/api/org-service/orgs/${orgId}/setup-status`,
      {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      console.error("[proxy] Setup status check failed:", response.status);
      return true; // Assume complete on error to avoid infinite redirects
    }
    const data = await response.json();
    return data.is_setup_complete === true;
  } catch (error) {
    console.error("[proxy] Error checking organization setup status:", error);
    return true; // Assume complete on error to avoid infinite redirects
  }
}

async function checkUserCanPromote(orgId: string, token: string): Promise<boolean> {
  try {
    const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://org-service:5003").replace(/\/$/, "");
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `${backendUrl}/api/org-service/orgs/${orgId}/can-promote`,
      {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`[proxy] can-promote check failed with status: ${response.status}`);
      // If the endpoint doesn't exist or fails, default to checking via database directly
      return await checkUserIsAdminViaDB(orgId, token);
    }
    const data = await response.json();
    console.log(`[proxy] can-promote result for org ${orgId}:`, data);
    return data.can_promote === true;
  } catch (error) {
    console.error("[proxy] Error checking promotion permission:", error);
    // Fallback: check directly via database
    return await checkUserIsAdminViaDB(orgId, token);
  }
}

// Fallback function to check admin status directly from database
async function checkUserIsAdminViaDB(orgId: string, token: string): Promise<boolean> {
  try {
    // Get user info from the token
    const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://auth-service:5001").replace(/\/$/, "");
    
    // First, get user ID from auth service
    const userResponse = await fetch(
      `${backendUrl}/api/auth-service/profile`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!userResponse.ok) {
      console.error("[proxy] Failed to get user profile");
      return false;
    }
    
    const userData = await userResponse.json();
    const userId = userData.id;
    
    if (!userId) {
      console.error("[proxy] No user ID found");
      return false;
    }
    
    // Check organization membership directly via org-service
    const orgResponse = await fetch(
      `${backendUrl.replace("auth-service", "org-service")}/api/org-service/orgs/${orgId}/members/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!orgResponse.ok) {
      console.error("[proxy] Failed to check membership");
      return false;
    }
    
    const memberData = await orgResponse.json();
    const isAdmin = memberData.member_role === "admin" || memberData.member_role === "sub_admin";
    console.log(`[proxy] User ${userId} is admin: ${isAdmin}`);
    return isAdmin;
    
  } catch (error) {
    console.error("[proxy] Error in fallback admin check:", error);
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

  // Allow public routes without any checks
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

  // Check if this is a route that should bypass setup check
  const shouldBypassSetup = bypassSetupRoutes.some(route => pathname.includes(route));
  
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
  }

  // Check organization setup status for admin panel access
  // Extract organization ID from path patterns
  const orgMatch = pathname.match(/\/organizations\/(\d+)\/(admin|setup|members|courses|settings)/);
  
  if (orgMatch && !shouldBypassSetup) {
    const orgId = orgMatch[1];
    const subpath = orgMatch[2];
    const accessToken = session.access_token;
    
    console.log(`[proxy] Checking organization access for org ${orgId}, subpath: ${subpath}`);
    
    // For admin panel, check if user has admin permission
    if (subpath === "admin") {
      // Check if user is admin via the can-promote endpoint or fallback
      const canPromote = await checkUserCanPromote(orgId, accessToken);
      
      if (!canPromote) {
        console.log(`[proxy] User is not admin for org ${orgId}, redirecting to org page`);
        return NextResponse.redirect(new URL(`/organizations/${orgId}`, request.url));
      }
      
      console.log(`[proxy] User is admin for org ${orgId}, allowing access to admin panel`);
      // Skip setup check for admin panel - allow access even if setup incomplete
      return NextResponse.next();
    }
    
    // For non-admin organization pages, check if setup is complete
    if (subpath !== "setup") {
      const isSetupComplete = await checkOrganizationSetupStatus(orgId, accessToken);
      
      if (!isSetupComplete) {
        console.log(`[proxy] Organization ${orgId} setup incomplete, redirecting to setup page`);
        return NextResponse.redirect(new URL(`/organizations/${orgId}/setup`, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};