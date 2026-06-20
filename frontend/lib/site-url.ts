/**
 * Local Docker exposes the app on HTTPS port 8443 (WAF). Infisical and docs
 * often set NEXT_PUBLIC_SITE_URL to https://localhost, which targets port 443
 * and never hits the stack — normalize bare localhost to the WAF port.
 */
function normalizeLocalhostSiteUrl(raw: string): string {
  const trimmed = raw.replace(/\/$/, "");
  try {
    const u = new URL(trimmed);
    if (u.hostname === "localhost" && u.port === "") {
      return "https://localhost:8443";
    }
  } catch {
    /* keep trimmed */
  }
  return trimmed;
}

/**
 * Server-only canonical origin for redirects (auth routes, emails). Does not use
 * window — use inside Route Handlers and server components.
 */
export function getServerSiteOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) {
    return normalizeLocalhostSiteUrl(env);
  }
  return "https://localhost:3000";
}

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
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return normalizeLocalhostSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "https://localhost:3000";
}