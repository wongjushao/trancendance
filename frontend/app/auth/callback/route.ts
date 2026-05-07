// frontend/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

function getSiteOrigin(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  return "https://localhost:3000";
}

function getAuthServiceOrigin(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_URL || "https://auth-service:5001").replace(/\/$/, "");
}

async function checkMFAStatus(token: string): Promise<{
  enabled_mfa: boolean;
  totp_configured: boolean;
}> {
  try {
    const response = await fetch(
      `${getAuthServiceOrigin()}/api/auth-service/mfa/status`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      console.error("[Auth Callback] MFA status check failed:", response.status);
      throw new Error("MFA status check failed");
    }
    const data = await response.json();
    console.log("[Auth Callback] MFA status response:", data);
    return {
      enabled_mfa: data.enabled_mfa === true,
      totp_configured: data.totp_configured === true,
    };
  } catch (error) {
    console.error("[Auth Callback] Error checking MFA status:", error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  console.log("[Auth Callback] Processing request", { hasCode: !!code, error });

  if (error) {
    console.error("[Auth Callback] OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/auth/error?message=${encodeURIComponent(errorDescription || error)}`, getSiteOrigin())
    );
  }

  if (!code) {
    console.warn("[Auth Callback] No code provided; redirecting to login after email confirmation");
    return NextResponse.redirect(
      new URL("/login?confirmed=true", getSiteOrigin())
    );
  }

  try {
    const supabase = await createSupabaseServerClient();

    console.log("[Auth Callback] Exchanging code for session...");
    const { data: sessionData, error: sessionError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error("[Auth Callback] Session exchange error:", sessionError);
      return NextResponse.redirect(
        new URL(`/auth/error?message=${encodeURIComponent(sessionError.message)}`, getSiteOrigin())
      );
    }

    if (!sessionData.session) {
      console.error("[Auth Callback] No session returned");
      return NextResponse.redirect(
        new URL("/auth/error?message=No session created", getSiteOrigin())
      );
    }

    const accessToken = sessionData.session.access_token;
    const refreshToken = sessionData.session.refresh_token;
    const user = sessionData.user;

    console.log("[Auth Callback] User authenticated:", { userId: user.id, email: user.email });

    // Check if this is a password reset flow
    const type = requestUrl.searchParams.get("type");
    if (type === "recovery") {
      console.log("[Auth Callback] Password recovery flow");
      return NextResponse.redirect(new URL("/reset-password", getSiteOrigin()));
    }

    // Check MFA status
    console.log("[Auth Callback] Checking MFA status...");
    const mfaStatus = await checkMFAStatus(accessToken);
    console.log("[Auth Callback] MFA Status:", mfaStatus);

    const mfaEnabled = mfaStatus.enabled_mfa && mfaStatus.totp_configured;

    if (mfaEnabled) {
      console.log("[Auth Callback] MFA is enabled - redirecting to MFA verification without creating session");

      const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>MFA Required</title>
          <script>
            // Store tokens in sessionStorage (client-side only)
            sessionStorage.setItem('mfa_access_token', ${JSON.stringify(accessToken)});
            sessionStorage.setItem('mfa_refresh_token', ${JSON.stringify(refreshToken)});
            sessionStorage.setItem('mfa_user_id', ${JSON.stringify(user.id)});
            sessionStorage.setItem('mfa_required', 'true');
            document.cookie = 'mfa_pending=true; path=/; max-age=600; SameSite=Lax';
            
            console.log('MFA data stored in sessionStorage');
            console.log('Refresh token stored:', !!sessionStorage.getItem('mfa_refresh_token'));
            
            // Redirect to MFA verify page
            window.location.href = '/auth/mfa-verify';
          </script>
        </head>
        <body>
          <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: black; color: white;">
            <div>Redirecting to MFA verification...</div>
          </div>
        </body>
      </html>
    `;

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }

    // No MFA required, proceed to dashboard
    console.log("[Auth Callback] No MFA required, redirecting to dashboard");
    return NextResponse.redirect(new URL("/dashboard", getSiteOrigin()));
    
  } catch (error) {
    console.error("[Auth Callback] Unexpected error:", error);
    return NextResponse.redirect(
      new URL("/auth/error?message=Authentication failed", getSiteOrigin())
    );
  }
}