// frontend/lib/profile.ts

/**
 * lib/profile.ts
 *
 * Shared helper for checking whether a user has completed onboarding.
 * Used by the backend to determine onboarding status.
 */

export const REQUIRED_PROFILE_FIELDS = [
  "username",
  "first_name",
  "last_name",
  "bio",
  "language",
  "birthday",
  "job_title",
] as const;

export type ProfileRow = {
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  language: string | null;
  birthday: string | null;
  job_title: string | null;
};

/**
 * Returns true if all mandatory profile fields are non-null and non-empty.
 * This is the same logic used by the backend to determine onboarding status.
 */
export function isProfileComplete(profile: ProfileRow | null): boolean {
  if (!profile) return false;
  return REQUIRED_PROFILE_FIELDS.every(
    (field) => {
      const value = profile[field];
      return value !== null && value !== "";
    }
  );
}