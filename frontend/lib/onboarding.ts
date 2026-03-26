import { getSupabaseBrowserClient } from './supabase/browser-client';

interface OnboardingStatusResponse {
  onboarded: boolean;
  user_id: string;
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