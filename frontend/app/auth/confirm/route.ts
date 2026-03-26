import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { EmailOtpType } from "@supabase/supabase-js";

function getSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const siteOrigin = getSiteOrigin();

  console.log("[auth/confirm] Debug:", { code_exists: !!code, token_hash_exists: !!token_hash, type });

  const supabase = await createSupabaseServerClient();

  try {
    // Handle code-based flow (OAuth, password reset)
    if (code) {
      console.log("[auth/confirm] Exchanging code for session");
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error("[auth/confirm] Code exchange error:", error);
        return NextResponse.redirect(
          `${siteOrigin}/auth/error?message=${encodeURIComponent(error.message)}`
        );
      }
      
      // Check if this is a new user (created within last 10 seconds)
      const user = data.session?.user;
      const isNewUser = user?.created_at && 
        Date.now() - new Date(user.created_at).getTime() < 10000;
      
      if (type === "recovery") {
        console.log("[auth/confirm] Password reset flow");
        return NextResponse.redirect(`${siteOrigin}/forgot-password?step=reset`);
      }
      
      const redirectPath = isNewUser ? "/onboarding" : next;
      console.log("[auth/confirm] Redirecting to:", redirectPath);
      return NextResponse.redirect(`${siteOrigin}${redirectPath}`);
    }
    
    // Handle token_hash flow (email confirmation)
    if (token_hash && type) {
      console.log("[auth/confirm] Verifying OTP");
      const { error } = await supabase.auth.verifyOtp({ type, token_hash });
      
      if (error) {
        console.error("[auth/confirm] OTP verification error:", error);
        return NextResponse.redirect(
          `${siteOrigin}/auth/error?message=${encodeURIComponent(error.message)}`
        );
      }
      
      if (type === "recovery") {
        return NextResponse.redirect(`${siteOrigin}/forgot-password?step=reset`);
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