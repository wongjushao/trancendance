// frontend/lib/chatViewSync.ts
/**
 * Single Source of Truth for Message Syncing
 * 
 * This module handles all message fetching and synchronization logic.
 * It ensures that UI components always get the most recent state from the database.
 * 
 * Architecture:
 * DB → API → chatViewSync.ts → UI (page.tsx + chatbubble.tsx)
 */

export interface Message {
  id: number;
  room_id: number;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  created_at: string;
  timestamp: string;
  is_me: boolean;
  message_type?: string;
}

export interface Room {
  id: number;
  display_name: string;
  type: 'direct' | 'course';
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

export interface FetchMessagesResult {
  messages: Message[];
  total_count?: number;
  has_more?: boolean;
  last_timestamp?: string;
}

export interface SyncOptions {
  forceRefresh?: boolean;
  pageSize?: number;
  cursor?: number;
}

// Cache for storing last sync timestamps per room
const lastSyncTimestamps = new Map<number, string>();

// Cache for storing messages per room
const messageCache = new Map<number, Message[]>();

function getChatServiceBaseUrl(): string {
  // Use the environment variable from .env
  const explicitBase = process.env.NEXT_PUBLIC_CHAT_API_URL?.trim();
  if (explicitBase) {
    console.log('[chatViewSync] Using NEXT_PUBLIC_CHAT_API_URL:', explicitBase);
    return explicitBase.replace(/\/$/, '');
  }

  // Fallback for browser
  if (typeof window !== 'undefined') {
    console.log('[chatViewSync] Using window.location.origin');
    return window.location.origin;
  }

  console.log('[chatViewSync] Using default localhost:5002');
  return 'http://localhost:5002';
}

/**
 * Fetch latest messages from backend API for a specific room
 * Always fetches from database to ensure consistency
 */
export async function fetchLatestMessages(
  roomId: number,
  accessToken: string,
  currentUserId: string,
  options: SyncOptions = {}
): Promise<FetchMessagesResult> {
  const { forceRefresh = false, pageSize = 50, cursor } = options;

  console.log(`[chatViewSync] Fetching messages for room ${roomId}`, {
    forceRefresh,
    pageSize,
    cursor
  });

  try {
    // Build URL with cursor-based pagination
    const query = new URLSearchParams({ page_size: String(pageSize) });
    if (cursor) {
      query.set('cursor', String(cursor));
    }

    // Use relative path for Next.js API routes (will be proxied)
    const relativePath = `/api/chat-service/rooms/${roomId}/messages?${query.toString()}`;
    
    const requestInit: RequestInit = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: forceRefresh ? 'no-store' : 'default',
    };

    console.log(`[chatViewSync] Fetching from: ${relativePath}`);
    
    let response: Response;
    try {
      response = await fetch(relativePath, requestInit);
    } catch (err) {
      // If relative fetch fails, try absolute URL as fallback
      const absoluteUrl = `${getChatServiceBaseUrl()}${relativePath}`;
      console.warn('[chatViewSync] Relative fetch failed, trying absolute URL:', absoluteUrl);
      response = await fetch(absoluteUrl, requestInit);
    }

    console.log(`[chatViewSync] Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[chatViewSync] Failed to fetch messages: ${response.status} - ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
    }

    // Check content type before parsing JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`[chatViewSync] Invalid content type: ${contentType}`);
      console.error(`[chatViewSync] Response preview: ${(await response.text()).substring(0, 200)}`);
      throw new Error('API did not return JSON');
    }

    const data = await response.json();
    console.log(`[chatViewSync] Fetched ${data.messages?.length || 0} messages for room ${roomId}`);

    // Format messages with is_me flag
    const formattedMessages = (data.messages || []).map((msg: any) => ({
      ...msg,
      is_me: msg.sender_id === currentUserId,
      timestamp: msg.timestamp || new Date(msg.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

    // Update cache
    messageCache.set(roomId, formattedMessages);

    // Update last sync timestamp
    const lastTimestamp = formattedMessages.length > 0
      ? formattedMessages[formattedMessages.length - 1].created_at
      : new Date().toISOString();
    lastSyncTimestamps.set(roomId, lastTimestamp);

    return {
      messages: formattedMessages,
      total_count: data.total_count || data.total,
      has_more: data.has_more,
      last_timestamp: lastTimestamp,
    };
  } catch (error) {
    console.error('[chatViewSync] Error fetching messages:', error);
    throw error;
  }
}

/**
 * Sync messages for a room - ensures we have the latest state
 * Compares local cache timestamp with server and re-fetches if needed
 */
export async function syncMessages(
  roomId: number,
  accessToken: string,
  currentUserId: string,
  options: SyncOptions = {}
): Promise<Message[]> {
  const lastSync = lastSyncTimestamps.get(roomId);
  const now = new Date();
  
  // If no previous sync or force refresh, fetch from server
  if (!lastSync || options.forceRefresh) {
    console.log(`[chatViewSync] No previous sync or force refresh for room ${roomId}, fetching from server`);
    const result = await fetchLatestMessages(roomId, accessToken, currentUserId, options);
    return result.messages;
  }

  // Check if cache is stale (older than 30 seconds)
  const lastSyncDate = new Date(lastSync);
  const staleThreshold = 30 * 1000; // 30 seconds
  
  if (now.getTime() - lastSyncDate.getTime() > staleThreshold) {
    console.log(`[chatViewSync] Cache is stale for room ${roomId}, re-fetching from server`);
    const result = await fetchLatestMessages(roomId, accessToken, currentUserId, {
      ...options,
      forceRefresh: true,
    });
    return result.messages;
  }

  // Return cached messages
  console.log(`[chatViewSync] Using cached messages for room ${roomId}`);
  return messageCache.get(roomId) || [];
}

/**
 * Get last message timestamp for a room
 */
export function getLastMessageTimestamp(roomId: number): string | undefined {
  return lastSyncTimestamps.get(roomId);
}

/**
 * Force refresh messages for a room - bypasses cache
 */
export async function forceRefreshMessages(
  roomId: number,
  accessToken: string,
  currentUserId: string,
  pageSize = 50
): Promise<Message[]> {
  console.log(`[chatViewSync] Force refreshing messages for room ${roomId}`);
  const result = await fetchLatestMessages(roomId, accessToken, currentUserId, {
    forceRefresh: true,
    pageSize,
  });
  return result.messages;
}

/**
 * Clear cache for a specific room
 */
export function clearRoomCache(roomId: number): void {
  messageCache.delete(roomId);
  lastSyncTimestamps.delete(roomId);
  console.log(`[chatViewSync] Cleared cache for room ${roomId}`);
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  messageCache.clear();
  lastSyncTimestamps.clear();
  console.log('[chatViewSync] Cleared all caches');
}

/**
 * Get cached messages for a room without fetching
 */
export function getCachedMessages(roomId: number): Message[] | undefined {
  return messageCache.get(roomId);
}

/**
 * Append new messages to cache (for socket updates)
 */
export function appendMessagesToCache(roomId: number, newMessages: Message[]): void {
  const existing = messageCache.get(roomId) || [];
  const existingIds = new Set(existing.map(m => m.id));
  
  // Only add messages that don't already exist
  const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
  
  if (uniqueNewMessages.length > 0) {
    const updated = [...existing, ...uniqueNewMessages];
    messageCache.set(roomId, updated);
    
    // Update last sync timestamp
    const lastTimestamp = updated[updated.length - 1].created_at;
    lastSyncTimestamps.set(roomId, lastTimestamp);
    
    console.log(`[chatViewSync] Appended ${uniqueNewMessages.length} new messages to cache for room ${roomId}`);
  }
}

/**
 * Check if room cache exists and is not stale
 */
export function isCacheValid(roomId: number, maxAgeMs = 30 * 1000): boolean {
  const lastSync = lastSyncTimestamps.get(roomId);
  if (!lastSync) return false;
  
  const lastSyncDate = new Date(lastSync);
  const now = new Date();
  return now.getTime() - lastSyncDate.getTime() <= maxAgeMs;
}