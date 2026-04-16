// frontend/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

function getSiteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

async function checkOnboardingStatus(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${getSiteOrigin()}/api/auth-service/onboarding-status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      return data.onboarded === true;
    }
    return false;
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return false;
  }
}

// Add this new function to check MFA status
async function checkMFAStatus(userId: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`${getSiteOrigin()}/api/auth-service/mfa/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      return data.enabled_mfa === true;
    }
    return false;
  } catch (error) {
    console.error("Error checking MFA status:", error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
  const error = requestUrl.searchParams.get("error");
  const error_description = requestUrl.searchParams.get("error_description");

  // Handle errors from Supabase OAuth
  if (error) {
    console.error("Auth callback error:", error, error_description);
    const redirectUrl = new URL("/auth/error", getSiteOrigin());
    redirectUrl.searchParams.set("message", error_description || error);
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    
    try {
      // Exchange the code for a session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error("Error exchanging code for session:", exchangeError);
        const redirectUrl = new URL("/auth/error", getSiteOrigin());
        redirectUrl.searchParams.set("message", exchangeError.message);
        return NextResponse.redirect(redirectUrl);
      }

      const session = data.session;
      if (!session) {
        const redirectUrl = new URL("/auth/error", getSiteOrigin());
        redirectUrl.searchParams.set("message", "No session created");
        return NextResponse.redirect(redirectUrl);
      }

      // Check if this is a password reset flow
      const isRecovery = requestUrl.searchParams.get("type") === "recovery";
      if (isRecovery) {
        // Redirect to reset password page
        const resetUrl = new URL("/auth/reset-password", getSiteOrigin());
        resetUrl.searchParams.set("token", session.access_token);
        return NextResponse.redirect(resetUrl);
      }

      // Check if MFA is enabled for this user
      const mfaEnabled = await checkMFAStatus(session.user.id, session.access_token);
      
      if (mfaEnabled) {
        // Store the session temporarily and redirect to MFA verification
        const response = NextResponse.redirect(new URL("/auth/mfa-verify", getSiteOrigin()));
        
        // Set cookies to indicate MFA is required and store user info
        response.cookies.set("mfa_required", "true", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 300, // 5 minutes
          path: "/",
        });
        
        // Store the access token for MFA verification
        response.cookies.set("mfa_temp_token", session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 300, // 5 minutes
          path: "/",
        });
        
        return response;
      }

      // Check onboarding status via backend
      const isOnboarded = await checkOnboardingStatus(session.access_token);
      
      // User hasn't completed profile - needs onboarding
      if (!isOnboarded) {
        return NextResponse.redirect(new URL("/onboarding", getSiteOrigin()));
      }
      
      // User has completed profile - go to dashboard
      return NextResponse.redirect(new URL("/dashboard", getSiteOrigin()));
      
    } catch (err) {
      console.error("Unexpected error in auth callback:", err);
      const redirectUrl = new URL("/auth/error", getSiteOrigin());
      redirectUrl.searchParams.set("message", "An unexpected error occurred");
      return NextResponse.redirect(redirectUrl);
    }
  }

  // No code parameter - redirect to home
  return NextResponse.redirect(new URL("/", getSiteOrigin()));
}