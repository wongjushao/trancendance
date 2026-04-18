// frontend/lib/mfa-api.ts
import { getSupabaseBrowserClient } from './supabase/browser-client';
import { MFAApiResponse, MFASetupResponse } from '@/types/mfa';

async function getAuthToken(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No authenticated user');
  }
  return session.access_token;
}

async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  const url = `/api/auth-service${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export async function getMFAStatus(): Promise<MFAApiResponse> {
  return fetchWithAuth<MFAApiResponse>('/mfa/status');
}

export async function setupMFA(): Promise<MFASetupResponse> {
  return fetchWithAuth<MFASetupResponse>('/mfa/setup', {
    method: 'POST',
  });
}

export async function verifyAndEnableMFA(code: string): Promise<{
  success: boolean;
  backup_codes: string[];
  message: string;
}> {
  return fetchWithAuth('/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function disableMFA(): Promise<void> {
  return fetchWithAuth('/mfa/disable', {
    method: 'POST',
  });
}

export async function verifyLoginMFA(accessToken: string, code: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const response = await fetch('/api/auth-service/mfa/verify-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ code }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      return { success: true, message: data.message || 'MFA verified successfully' };
    }
    
    return { 
      success: false, 
      message: data.message || 'Invalid verification code' 
    };
  } catch (error) {
    console.error('MFA verification error:', error);
    return { success: false, message: 'Failed to verify MFA code' };
  }
}