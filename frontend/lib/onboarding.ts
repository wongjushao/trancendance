// frontend/lib/onboarding.ts

import type { Organization } from './role';
import { getSupabaseBrowserClient } from './supabase/browser-client';

interface CheckOrgApiRow {
  id: number;
  name: string;
  slug?: string;
  description?: string | null;
  domain: string;
}

function mapCheckOrgResponse(rows: CheckOrgApiRow[]): Organization[] {
  return rows.map((o) => ({
    id: o.id,
    name: o.name,
    domain: o.domain.toLowerCase(),
    description: (o.description ?? '').trim(),
    memberCount: 0,
    verified: true,
  }));
}

/** Organizations whose verified domains match the signed-in user's email (`GET /api/auth-service/check_org`). */
export async function fetchOrganizationsMatchingSessionDomain(
  accessToken: string
): Promise<Organization[]> {
  try {
    const response = await fetch('/api/auth-service/check_org', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      console.error('check_org failed:', response.status);
      return [];
    }
    const data: { organizations?: CheckOrgApiRow[] } = await response.json();
    return mapCheckOrgResponse(data.organizations ?? []);
  } catch (e) {
    console.error('check_org error:', e);
    return [];
  }
}

interface OnboardingStatusResponse {
  onboarded: boolean;
  user_id: string;
  missing_fields?: string[];
}

/**
 * Check if the current user has completed onboarding by calling the backend.
 * The backend determines this by checking if required profile fields are filled.
 */
export async function checkOnboardingStatus(): Promise<boolean> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return false;
    }
    
    const response = await fetch('/api/auth-service/onboarding-status', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });
    
    if (!response.ok) {
      console.error('Failed to check onboarding status:', response.status);
      return false;
    }
    
    const data: OnboardingStatusResponse = await response.json();
    return data.onboarded;
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

/**
 * Cache the onboarding status to avoid repeated API calls.
 */
let cachedOnboardingStatus: boolean | null = null;

export async function getCachedOnboardingStatus(forceRefresh = false): Promise<boolean> {
  if (forceRefresh || cachedOnboardingStatus === null) {
    cachedOnboardingStatus = await checkOnboardingStatus();
  }
  return cachedOnboardingStatus;
}

export function clearOnboardingCache(): void {
  cachedOnboardingStatus = null;
}