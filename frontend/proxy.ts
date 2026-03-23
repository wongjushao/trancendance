import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/courses",
  "/assignments",
  "/messages",
  "/notifications",
  "/analytics",
  "/admin",
  "/organizations",
  "/lessons",
  "/onboarding",
];

const AUTH_PREFIXES = ["/login", "/register", "/forgot-password"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthRoute = AUTH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // Unauthenticated user trying to access a protected page → redirect to /
  // No ?next= param — keeps the URL clean and avoids confusing the user
  if (!user && isProtected) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Already signed-in user visiting login/register → send to dashboard
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|auth/confirm|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
