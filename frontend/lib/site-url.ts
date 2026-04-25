/**
 * Returns the canonical site URL for use in auth redirects.
 *
 * Priority:
 *  1. NEXT_PUBLIC_SITE_URL env var (set this in docker-compose / .env)
 *  2. window.location.origin as a fallback (only safe in local dev when
 *     the browser is what's making the request, not the Docker container)
 *
 * Never use window.location.origin directly in auth callbacks — in Docker
 * it resolves to the internal bind address (0.0.0.0:3000) which browsers
 * refuse to connect to.
 */
export function getSiteUrl(): string {
  // Prefer the explicitly configured URL
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    // Strip trailing slash for consistent concatenation
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  // Browser fallback — only reached if env var is not set
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Server-side fallback
  return "https://localhost:3000";
}