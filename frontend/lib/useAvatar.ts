import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from './supabase/browser-client';

interface ProfileData {
  id: string;
  avatar_url: string | null;
  username: string | null;
}

// Create a global event system for avatar updates
const AVATAR_UPDATED_EVENT = 'avatar-updated';

export function useAvatar() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvatar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      setIsLoading(false);
      return;
    }
    
    try {
      // Add cache-busting timestamp
      const timestamp = Date.now();
      const response = await fetch(`/api/auth-service/profile?t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        cache: 'no-store',
      });
      
      if (response.ok) {
        const data: ProfileData = await response.json();
        setAvatarUrl(data.avatar_url);
        // Store in localStorage for quick access
        if (data.avatar_url) {
          localStorage.setItem('avatar_url', data.avatar_url);
        }
      } else {
        setError('Failed to fetch profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No active session');
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await fetch('/api/auth-service/upload-avatar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload avatar');
    }
    
    const data = await response.json();
    
    // Update local state immediately
    setAvatarUrl(data.avatar_url);
    
    // Store in localStorage
    if (data.avatar_url) {
      localStorage.setItem('avatar_url', data.avatar_url);
    }
    
    // Dispatch a global event so other components can refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AVATAR_UPDATED_EVENT, { 
        detail: { avatarUrl: data.avatar_url } 
      }));
    }
    
    return data.avatar_url;
  }, []);

  const refreshAvatar = useCallback(async () => {
    await fetchAvatar();
  }, [fetchAvatar]);

  useEffect(() => {
    // Try to get from localStorage first for instant display
    const storedAvatar = localStorage.getItem('avatar_url');
    if (storedAvatar) {
      setAvatarUrl(storedAvatar);
    }
    
    fetchAvatar();

    // Listen for avatar update events from other components
    const handleAvatarUpdate = (event: CustomEvent) => {
      if (event.detail?.avatarUrl) {
        setAvatarUrl(event.detail.avatarUrl);
        localStorage.setItem('avatar_url', event.detail.avatarUrl);
      } else {
        // If no URL provided, refresh from server
        fetchAvatar();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(AVATAR_UPDATED_EVENT, handleAvatarUpdate as EventListener);
      
      return () => {
        window.removeEventListener(AVATAR_UPDATED_EVENT, handleAvatarUpdate as EventListener);
      };
    }
  }, [fetchAvatar]);

  return {
    avatarUrl,
    isLoading,
    error,
    uploadAvatar,
    refreshAvatar,
  };
}