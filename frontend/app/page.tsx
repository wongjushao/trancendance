import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import LandingGuest from "./_landing/LandingGuest";
import LandingAuthed from "./_landing/LandingAuthed";

/**
 * Root page — server component.
 *
 * Checks Supabase session and renders one of two versions:
 *   - LandingGuest   → the public marketing/sign-up page
 *   - LandingAuthed  → a personalised welcome-back page for signed-in users
 *
 * Neither child component needs to do its own auth check.
 */
export default async function RootPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return <LandingAuthed user={user} />;
  }

  return <LandingGuest />;
}
