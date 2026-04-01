// frontend/app/auth/callback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

function getSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

async function checkOnboardingStatus(token: string): Promise<boolean> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://auth-service:5001';
    
    const response = await fetch(
      `${backendUrl}/api/auth-service/onboarding-status`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    if (!response.ok) {
      console.error('Failed to check onboarding status:', response.status);
      return false;
    }
    
    const data = await response.json();
    return data.onboarded;
  } catch (error) {
    console.error('Error checking onboarding status in callback:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const type = searchParams.get("type");

  const siteOrigin = getSiteOrigin();

  if (!code) {
    return NextResponse.redirect(
      `${siteOrigin}/auth/error?message=Missing+confirmation+code`
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error:", error.message);
      return NextResponse.redirect(
        `${siteOrigin}/auth/error?message=${encodeURIComponent(error.message)}`
      );
    }

    const user = data.session?.user;
    const accessToken = data.session?.access_token;

    if (!user || !accessToken) {
      console.error("[auth/callback] No user or token after exchange");
      return NextResponse.redirect(
        `${siteOrigin}/auth/error?message=Authentication+failed`
      );
    }

    console.log("[auth/callback] User debug:", {
      userId: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      app_metadata: user.app_metadata,
    });

    // Check if this is a password reset flow
    if (type === "recovery") {
      console.log("[auth/callback] Password reset flow - redirecting to reset-password");
      return NextResponse.redirect(`${siteOrigin}/reset-password`);
    }

    // Check onboarding status via backend
    const onboarded = await checkOnboardingStatus(accessToken);
    console.log("[auth/callback] Onboarding status from database:", onboarded);
    
    let redirectPath = next;
    
    if (!onboarded) {
      // User hasn't completed profile - needs onboarding
      redirectPath = "/onboarding";
      console.log("[auth/callback] User needs onboarding");
    } else {
      // User has completed profile - go to dashboard
      console.log("[auth/callback] Onboarded user, redirecting to dashboard");
      redirectPath = "/dashboard";
    }

    console.log("[auth/callback] Final redirect to:", redirectPath);
    return NextResponse.redirect(`${siteOrigin}${redirectPath}`);
    
  } catch (err) {
    console.error("[auth/callback] Unexpected error:", err);
    return NextResponse.redirect(
      `${siteOrigin}/auth/error?message=An+unexpected+error+occurred`
    );
  }
}