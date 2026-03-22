import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { EmailOtpType } from "@supabase/supabase-js";

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

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  // Use env-based origin — NOT origin from request.url
  const siteOrigin = getSiteOrigin();

  if (!token_hash || !type) {
    return NextResponse.redirect(
      `${siteOrigin}/auth/error?message=Invalid+or+expired+confirmation+link`
    );
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (error) {
      console.error("[auth/confirm] verifyOtp error:", error.message);
      return NextResponse.redirect(
        `${siteOrigin}/auth/error?message=${encodeURIComponent(error.message)}`
      );
    }

    if (type === "recovery") {
      return NextResponse.redirect(`${siteOrigin}/forgot-password?step=reset`);
    }

    return NextResponse.redirect(`${siteOrigin}${next}`);
  } catch (err) {
    console.error("[auth/confirm] Unexpected error:", err);
    return NextResponse.redirect(
      `${siteOrigin}/auth/error?message=An+unexpected+error+occurred`
    );
  }
}
