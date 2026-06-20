import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { getServerSiteOrigin } from "@/lib/site-url";

function validateRequestEmail(email: string): string | null {
  if (!email) {
    return "Email is required";
  }
  const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address (e.g., name@example.com)";
  }
  const domain = email.split("@")[1];
  if (domain && !domain.includes(".") && domain !== "localhost") {
    return "Email domain must contain a dot";
  }
  return null;
}

function mapAuthError(error: { message: string; status?: number }): string {
  const status = error.status;
  const m = (error.message || "").toLowerCase();
  if (
    status === 429 ||
    m.includes("rate limit") ||
    m.includes("too many requests")
  ) {
    return "Too many reset attempts. Please wait a few minutes and try again.";
  }
  return error.message || "Something went wrong. Please try again.";
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        ok: false,
        message: "Invalid request.",
      });
    }

    const email =
      typeof body === "object" &&
      body !== null &&
      "email" in body
        ? String((body as { email: unknown }).email ?? "").trim()
        : "";

    const validationError = validateRequestEmail(email);
    if (validationError) {
      return NextResponse.json({ ok: false, message: validationError });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getServerSiteOrigin()}/reset-password`,
    });

    if (error) {
      return NextResponse.json({ ok: false, message: mapAuthError(error) });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({
      ok: false,
      message: "Something went wrong. Please try again.",
    });
  }
}
