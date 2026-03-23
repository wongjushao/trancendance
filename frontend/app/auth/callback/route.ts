import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

/**
 * Returns the canonical site origin for server-side redirects.
 *
 * IMPORTANT: Do NOT use `new URL(request.url).origin` here.
 * Inside Docker, request.url uses the internal bind address (0.0.0.0:3000),
 * which browsers cannot reach. We must use the env var instead.
 */
function getSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Use env-based origin — NOT origin from request.url
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

    // If the user was created within the last 10 seconds, treat as new → onboarding
    const user = data.session?.user;
    const isNewUser =
      user?.created_at &&
      Date.now() - new Date(user.created_at).getTime() < 10_000;

    const redirectPath = isNewUser ? "/onboarding" : next;

    return NextResponse.redirect(`${siteOrigin}${redirectPath}`);
  } catch (err) {
    console.error("[auth/callback] Unexpected error:", err);
    return NextResponse.redirect(
      `${siteOrigin}/auth/error?message=An+unexpected+error+occurred`
    );
  }
}
