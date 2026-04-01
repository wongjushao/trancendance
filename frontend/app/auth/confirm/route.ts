// frontend/app/auth/confirm/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { EmailOtpType } from "@supabase/supabase-js";

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
    console.error('Error checking onboarding status in confirm:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const siteOrigin = getSiteOrigin();

  console.log("[auth/confirm] Debug:", { 
    code_exists: !!code, 
    token_hash_exists: !!token_hash, 
    type 
  });

  const supabase = await createSupabaseServerClient();

  try {
    // Handle code-based flow (OAuth, Google Sign-in, password reset)
    if (code) {
      console.log("[auth/confirm] Exchanging code for session");
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error("[auth/confirm] Code exchange error:", error);
        return NextResponse.redirect(
          `${siteOrigin}/auth/error?message=${encodeURIComponent(error.message)}`
        );
      }
      
      const user = data.session?.user;
      const accessToken = data.session?.access_token;
      
      if (!user || !accessToken) {
        console.error("[auth/confirm] No user or token after exchange");
        return NextResponse.redirect(
          `${siteOrigin}/auth/error?message=Authentication+failed`
        );
      }
      
      // Check if this is a password reset flow
      if (type === "recovery") {
        console.log("[auth/confirm] Password reset flow - redirecting to reset-password");
        // Redirect to the reset password page where the user can set a new password
        return NextResponse.redirect(`${siteOrigin}/reset-password`);
      }
      
      // Always check the actual database profile status via backend
      const onboarded = await checkOnboardingStatus(accessToken);
      console.log("[auth/confirm] Onboarding status from database:", onboarded);
      
      let redirectPath = next;
      
      if (!onboarded) {
        redirectPath = "/onboarding";
        console.log("[auth/confirm] User needs onboarding, redirecting to:", redirectPath);
      } else {
        console.log("[auth/confirm] User already onboarded, redirecting to:", redirectPath);
        // Update metadata to mark onboarding completed (optional - for UI state)
        try {
          const { error: updateError } = await supabase.auth.updateUser({
            data: { profile_completed: true }
          });
          if (updateError) {
            console.error("Failed to update user metadata:", updateError);
          }
        } catch (e) {
          console.error("Error updating user metadata:", e);
        }
      }
      
      console.log("[auth/confirm] Final redirect to:", redirectPath);
      return NextResponse.redirect(`${siteOrigin}${redirectPath}`);
    }
    
    // Handle token_hash flow (email confirmation)
    if (token_hash && type) {
      console.log("[auth/confirm] Verifying OTP");
      const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
      
      if (error) {
        console.error("[auth/confirm] OTP verification error:", error);
        return NextResponse.redirect(
          `${siteOrigin}/auth/error?message=${encodeURIComponent(error.message)}`
        );
      }
      
      const user = data.user;
      const session = data.session;
      
      if (type === "recovery") {
        console.log("[auth/confirm] Recovery flow via token_hash - redirecting to reset-password");
        return NextResponse.redirect(`${siteOrigin}/reset-password`);
      }
      
      // For email confirmation, check onboarding status
      if (user && session?.access_token) {
        const onboarded = await checkOnboardingStatus(session.access_token);
        
        let redirectPath = next;
        
        if (!onboarded) {
          redirectPath = "/onboarding";
        }
        
        return NextResponse.redirect(`${siteOrigin}${redirectPath}`);
      }
      
      return NextResponse.redirect(`${siteOrigin}${next}`);
    }
    
    // No valid parameters
    console.error("[auth/confirm] Missing code or token_hash");
    return NextResponse.redirect(
      `${siteOrigin}/auth/error?message=Invalid+confirmation+link`
    );
    
  } catch (err) {
    console.error("[auth/confirm] Unexpected error:", err);
    return NextResponse.redirect(
      `${siteOrigin}/auth/error?message=An+unexpected+error+occurred`
    );
  }
}