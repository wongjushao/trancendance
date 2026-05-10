import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import ProfileClient from "./ProfileClient";

/**
 * Server component wrapper.
 * Fetches the authenticated user via backend API and passes it to the client component
 */
export default async function ProfilePage() {
  const cookieStore = cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) redirect("/");

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth-service/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) redirect("/");

    const user = await response.json();

    return <ProfileClient user={user} />;
  } catch (error) {
    console.error("Error fetching user:", error);
    redirect("/");
  }
}