import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import ProfileClient from "./ProfileClient";

/**
 * Server component wrapper.
 * Session comes from Supabase cookies (same as the rest of the app), not a bare `access_token` cookie.
 */
export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?redirect=/profile");
  }

  return <ProfileClient user={user} />;
}
