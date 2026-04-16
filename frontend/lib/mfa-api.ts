// frontend/lib/mfa-api.ts
import { getSupabaseBrowserClient } from './supabase/browser-client';
import { MFAApiResponse, MFASetupResponse } from '@/types/mfa';

async function getAuthToken(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No authentication token found');
  }
  return session.access_token;
}

async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function getMFAStatus(): Promise<MFAApiResponse> {
  return fetchWithAuth<MFAApiResponse>('/api/auth-service/mfa/status');
}

export async function setupMFA(): Promise<MFASetupResponse> {
  return fetchWithAuth<MFASetupResponse>('/api/auth-service/mfa/setup', {
    method: 'POST',
  });
}

export async function verifyAndEnableMFA(code: string): Promise<{
  enabled_mfa: boolean;
  backup_codes: string[];
}> {
  return fetchWithAuth('/api/auth-service/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function disableMFA(): Promise<void> {
  return fetchWithAuth('/api/auth-service/mfa/disable', {
    method: 'POST',
  });
}

export async function verifyLoginMFA(accessToken: string, code: string): Promise<{
  success: boolean;
  message: string;
}> {
  const response = await fetch('/api/auth-service/mfa/verify-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Verification failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}