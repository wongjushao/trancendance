import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import ProfileClient from "./ProfileClient";

/**
 * Server component wrapper.
 * Fetches the real Supabase user and passes it to the client component
 * which handles all the interactive tabs (framer-motion, state, etc.)
 */
export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return <ProfileClient user={user} />;
}
