// frontend/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSiteOrigin(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}

async function checkMFAStatus(userId: string, token: string): Promise<{
  enabled_mfa: boolean;
  totp_configured: boolean;
}> {
  try {
    const response = await fetch(
      `${getSiteOrigin()}/api/auth-service/mfa/status`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      console.error("[Auth Callback] MFA status check failed:", response.status);
      return { enabled_mfa: false, totp_configured: false };
    }
    const data = await response.json();
    console.log("[Auth Callback] MFA status response:", data);
    return {
      enabled_mfa: data.enabled_mfa === true,
      totp_configured: data.totp_configured === true,
    };
  } catch (error) {
    console.error("[Auth Callback] Error checking MFA status:", error);
    return { enabled_mfa: false, totp_configured: false };
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
    console.error("[Auth Callback] No code provided");
    return NextResponse.redirect(
      new URL("/auth/error?message=No authorization code provided", getSiteOrigin())
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
    const mfaStatus = await checkMFAStatus(user.id, accessToken);
    console.log("[Auth Callback] MFA Status:", mfaStatus);

    const mfaEnabled = mfaStatus.enabled_mfa && mfaStatus.totp_configured;

    if (mfaEnabled) {
      console.log("[Auth Callback] MFA is enabled - redirecting to MFA verification");
      
      // Create an HTML page that stores the token and redirects
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>MFA Required</title>
            <script>
              // Clear any existing session data
              localStorage.clear();
              
              // Store tokens in sessionStorage (client-side only)
              sessionStorage.setItem('mfa_access_token', '${accessToken}');
              sessionStorage.setItem('mfa_refresh_token', '${refreshToken}');
              sessionStorage.setItem('mfa_user_id', '${user.id}');
              sessionStorage.setItem('mfa_required', 'true');
              
              console.log('MFA data stored in sessionStorage');
              
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