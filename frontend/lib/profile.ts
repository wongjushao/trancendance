/**
 * lib/profile.ts
 *
 * Shared helper for checking whether a user has completed onboarding.
 * Used by both proxy.ts (server-side) and onboarding/page.tsx (client-side).
 *
 * "Complete" means every mandatory field in the profiles table has been filled.
 * These are the fields collected during onboarding:
 *   username, bio, timezone, language, birthday
 *
 * phone_number and invited_by are optional in the DB (nullable) so we don't
 * block on them. If your team decides to make them required, add them here.
 */

export const REQUIRED_PROFILE_FIELDS = [
  "username",
  "bio",
  "timezone",
  "language",
  "birthday",
] as const;

export type ProfileRow = {
  username: string | null;
  bio: string | null;
  timezone: string | null;
  language: string | null;
  birthday: string | null;
};

/**
 * Returns true if all mandatory profile fields are non-null and non-empty.
 */
export function isProfileComplete(profile: ProfileRow | null): boolean {
  if (!profile) return false;
  return REQUIRED_PROFILE_FIELDS.every(
    (field) => profile[field] !== null && profile[field] !== ""
  );
}
