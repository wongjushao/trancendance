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

    // Check if this is a returning user (has logged in before)
    // For Google OAuth, we can check last_sign_in_at vs created_at
    const isReturningUser = user.last_sign_in_at && 
      new Date(user.last_sign_in_at).getTime() > new Date(user.created_at).getTime() + 60000;
    
    console.log("[auth/callback] Is returning user:", isReturningUser);
    
    // Check onboarding status via backend
    const onboarded = await checkOnboardingStatus(accessToken);
    console.log("[auth/callback] Onboarding status from database:", onboarded);
    
    let redirectPath = next;
    
    // Special handling: If this is a returning user and they're marked as not onboarded
    // but they have a profile in the database, they might have incomplete fields
    // We should NOT send them to onboarding again
    if (isReturningUser && !onboarded) {
      console.log("[auth/callback] Returning user marked as not onboarded - checking if they have any profile data");
      // Try to get profile to see if it exists
      try {
        const profileResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://auth-service:5001'}/api/auth-service/profile`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
        
        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          console.log("[auth/callback] Profile exists for returning user:", profile);
          
          // If profile exists, consider them onboarded even if fields are incomplete
          // This prevents redirect loops for Google OAuth users
          if (profile.id) {
            console.log("[auth/callback] Returning user has profile, marking as onboarded");
            redirectPath = "/dashboard";
            
            // Update user metadata to mark as onboarded
            await supabase.auth.updateUser({
              data: { profile_completed: true, onboarded: true }
            });
          } else {
            redirectPath = "/onboarding";
          }
        } else {
          // No profile, they need onboarding
          redirectPath = "/onboarding";
        }
      } catch (e) {
        console.error("[auth/callback] Error checking profile:", e);
        redirectPath = "/onboarding";
      }
    } else if (!onboarded) {
      // New user with no profile - needs onboarding
      redirectPath = "/onboarding";
      console.log("[auth/callback] New user needs onboarding");
    } else {
      // Onboarded user - go to dashboard
      console.log("[auth/callback] Onboarded user, redirecting to dashboard");
      redirectPath = "/dashboard";
      
      // Ensure metadata is set
      try {
        await supabase.auth.updateUser({
          data: { profile_completed: true, onboarded: true }
        });
      } catch (e) {
        console.error("Error updating user metadata:", e);
      }
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