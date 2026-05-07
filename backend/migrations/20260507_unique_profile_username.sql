-- Enforce case-insensitive username uniqueness.
-- This keeps NULL usernames allowed, but prevents values like "john" and "John"
-- from belonging to different profiles.

CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_username_lower
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL AND btrim(username) <> '';
