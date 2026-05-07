// frontend/contexts/ChatContext.tsx
'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { useSocket } from '@/hooks/useSocket';
import {
  forceRefreshMessages,
  syncMessages,
  type Message as SyncMessage,
} from '@/lib/chatViewSync';
import { formatChatTime, normalizeChatTimestamp } from '@/lib/chatTime';

interface ChatRoom {
  id: number;
  type: 'direct' | 'course';
  display_name: string;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
  related_course_id?: number;
  profile_user_id?: string | null;
  profile_avatar?: string | null;
  profile_is_online?: boolean;
  is_blocked_by_me?: boolean;
  has_blocked_me?: boolean;
}

interface Message {
  id: number | string;
  room_id: number;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  message_type: string;
  created_at: string;
  timestamp: string;
  is_me: boolean;
  friend_request_status?: string;
  read_by_peer?: boolean;
}

interface IncomingSocketMessage {
  id: number;
  room_id: number;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  message_type?: string;
  created_at?: string | null;
  timestamp?: string | null;
  read_by_peer?: boolean;
}

interface IncomingPresenceChange {
  user_id?: string;
  is_online?: boolean;
}

interface ChatContextType {
  rooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  messages: Message[];
  isLoading: boolean;
  sendMessage: (content: string) => void;
  selectRoom: (room: ChatRoom | null) => void;
  loadMessages: (roomId: number, page?: number) => Promise<void>;
  refreshRooms: () => Promise<ChatRoom[]>;
  blockUser: (profileId: string) => Promise<void>;
  unblockUser: (profileId: string) => Promise<void>;
  isConnected: boolean;
  isConnecting: boolean;
  reconnect: () => void;
  socketError: string | null;
  peerTypingLabel: string | null;
  signalTypingFromComposer: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};

const isAuthErrorMessage = (msg: string | null | undefined): boolean => {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes('not authenticated') ||
    m.includes('authentication failed') ||
    m.includes('unauthorized') ||
    m.includes('jwt') ||
    m.includes('token') ||
    m.includes('expired')
  );
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const pendingMessagesRef = useRef<Map<string, { content: string; timestamp: string }>>(
    new Map(),
  );
  const lastToastedErrorRef = useRef<string | null>(null);
  const typingEmitThrottleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  const typingIdleStopTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  const peerTypingHideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  const markReadDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  const [peerTypingLabel, setPeerTypingLabel] = useState<string | null>(null);

  // ---------------- AUTH ----------------
  // Note: getSupabaseBrowserClient() is memoized, so the underlying GoTrue
  // client auto-refreshes the session in the background. We propagate every
  // update (including TOKEN_REFRESHED) into accessToken so useSocket reconnects
  // with a fresh JWT before the old one expires.
  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseBrowserClient();

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.access_token) {
        setAccessToken(session.access_token);
        setCurrentUserId(session.user.id);
      }
      setIsAuthReady(true);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        if (session?.access_token) {
          setAccessToken(session.access_token);
          setCurrentUserId(session.user.id);
        } else {
          setAccessToken(null);
          setCurrentUserId(null);
        }
        setIsAuthReady(true);
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ---------------- SOCKET ----------------
  const { isConnected, isConnecting, lastError, emit, on, reconnect } = useSocket(
    accessToken || undefined,
  );

  useEffect(() => {
    if (!lastError) return;
    if (lastToastedErrorRef.current === lastError) return;
    lastToastedErrorRef.current = lastError;

    if (isAuthErrorMessage(lastError)) {
      toast.error('Chat session expired. Please refresh and sign in again.');
    } else {
      toast.error(`Chat connection issue: ${lastError}`);
    }
  }, [lastError]);

  useEffect(() => {
    if (isConnected) {
      lastToastedErrorRef.current = null;
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected && currentRoom) {
      emit('join_room', { room_id: currentRoom.id });
    }
  }, [isConnected, currentRoom?.id, emit]);

  useEffect(() => {
    setPeerTypingLabel(null);
  }, [currentRoom?.id]);

  useEffect(() => {
    return () => {
      clearTimeout(typingEmitThrottleTimerRef.current);
      clearTimeout(typingIdleStopTimerRef.current);
      clearTimeout(peerTypingHideTimerRef.current);
      clearTimeout(markReadDebounceRef.current);
    };
  }, []);

  // ---------------- LISTEN FOR INCOMING MESSAGES ----------------
  useEffect(() => {
    if (!isConnected || !currentUserId) return;

    const unsubscribeReceive = on('receive_message', (message: IncomingSocketMessage) => {
      const isFromMe = message.sender_id === currentUserId;

      if (isFromMe) {
        let matchedKey: string | null = null;
        for (const [key, pending] of pendingMessagesRef.current.entries()) {
          if (pending.content === message.content) {
            matchedKey = key;
            break;
          }
        }

        if (matchedKey) {
          const createdAt = normalizeChatTimestamp(message.created_at);
          const formatted: Message = {
            ...message,
            message_type: message.message_type ?? 'text',
            created_at: createdAt,
            is_me: true,
            timestamp: message.timestamp || formatChatTime(createdAt),
            read_by_peer: message.read_by_peer === true,
          };
          setMessages((prev) => prev.map((m) => (m.id === matchedKey ? formatted : m)));
          pendingMessagesRef.current.delete(matchedKey);
          return;
        }
      }

      const createdAt = normalizeChatTimestamp(message.created_at);
      const formatted: Message = {
        ...message,
        message_type: message.message_type ?? 'text',
        created_at: createdAt,
        is_me: isFromMe,
        timestamp: message.timestamp || formatChatTime(createdAt),
        read_by_peer: message.read_by_peer === true,
      };

      if (currentRoom && message.room_id === currentRoom.id) {
        setMessages((prev) =>
          prev.some((m) => m.id === message.id) ? prev : [...prev, formatted],
        );
      }

      setRooms((prev) =>
        prev.map((room) => {
          if (room.id !== message.room_id) return room;
          const shouldIncrement = currentRoom?.id !== message.room_id && !isFromMe;
          return {
            ...room,
            last_message: message.content,
            last_message_time: message.created_at,
            unread_count: shouldIncrement
              ? (room.unread_count || 0) + 1
              : room.unread_count,
          };
        }),
      );
    });

    const unsubscribeSent = on('message_sent', () => {
      /* server ack — no UI action needed */
    });

    const unsubscribePresence = on('presence_changed', (presence: IncomingPresenceChange) => {
      if (!presence?.user_id || typeof presence.is_online !== 'boolean') return;

      setRooms((prev) =>
        prev.map((room) =>
          room.profile_user_id === presence.user_id
            ? { ...room, profile_is_online: presence.is_online }
            : room,
        ),
      );
      setCurrentRoom((room) =>
        room?.profile_user_id === presence.user_id
          ? { ...room, profile_is_online: presence.is_online }
          : room,
      );
    });

    const unsubscribeTyping = on(
      'user_typing',
      (payload: { room_id?: number; user_id?: string; typing?: boolean }) => {
        if (!payload?.room_id || payload.user_id === currentUserId) return;
        if (!currentRoom || payload.room_id !== currentRoom.id) return;

        if (payload.typing) {
          const label = currentRoom.type === 'direct' ? currentRoom.display_name : 'Someone';
          setPeerTypingLabel(label);
          clearTimeout(peerTypingHideTimerRef.current);
          peerTypingHideTimerRef.current = setTimeout(() => setPeerTypingLabel(null), 4500);
        } else {
          clearTimeout(peerTypingHideTimerRef.current);
          setPeerTypingLabel(null);
        }
      },
    );

    const unsubscribeMessagesRead = on(
      'messages_read',
      (payload: { room_id?: number; reader_id?: string; last_read_message_id?: number }) => {
        const lr = payload?.last_read_message_id;
        if (
          lr == null ||
          !payload?.reader_id ||
          payload.reader_id === currentUserId ||
          !currentRoom ||
          payload.room_id !== currentRoom.id
        ) {
          return;
        }
        if (currentRoom.type !== 'direct' || currentRoom.profile_user_id !== payload.reader_id) {
          return;
        }

        setMessages((prev) =>
          prev.map((m) =>
            typeof m.id === 'number' && m.is_me && m.id <= lr ? { ...m, read_by_peer: true } : m,
          ),
        );
      },
    );

    const unsubscribeError = on('chat_error', (error: unknown) => {
      let msg = 'Unknown error';
      if (typeof error === 'string') {
        msg = error;
      } else if (error && typeof error === 'object') {
        const e = error as { message?: string; data?: string };
        msg = e.message || e.data || JSON.stringify(error);
      }

      if (lastToastedErrorRef.current === msg) return;
      if (isAuthErrorMessage(msg)) return; // handled by lastError toast

      lastToastedErrorRef.current = msg;
      toast.error(msg);
    });

    return () => {
      unsubscribeReceive();
      unsubscribeSent();
      unsubscribePresence();
      unsubscribeTyping();
      unsubscribeMessagesRead();
      unsubscribeError();
    };
  }, [isConnected, on, currentRoom, currentUserId]);

  // ---------------- LOAD MESSAGES ----------------
  const loadMessages = useCallback(
    async (roomId: number, _page = 1, append = false, forceRefresh = false) => {
      if (!accessToken || !currentUserId) return;

      try {
        const messagesData: SyncMessage[] = forceRefresh
          ? await forceRefreshMessages(roomId, accessToken, currentUserId, 50)
          : await syncMessages(roomId, accessToken, currentUserId, {
              forceRefresh: false,
              pageSize: 50,
            });

        if (append) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMessages = messagesData.filter((m) => !existingIds.has(m.id));
            return [...prev, ...newMessages];
          });
        } else {
          setMessages(messagesData);
        }
      } catch (e) {
        console.error('[ChatContext] loadMessages error:', e);
        toast.error('Failed to load messages');
        if (!append) setMessages([]);
      }
    },
    [accessToken, currentUserId],
  );

  // ---------------- SELECT ROOM ----------------
  const selectRoom = useCallback(
    async (room: ChatRoom | null) => {
      if (!room) {
        setCurrentRoom(null);
        setMessages([]);
        return;
      }
      if (currentRoom?.id === room.id) return;

      setCurrentRoom(room);
      setMessages([]);

      if (typeof window !== 'undefined') {
        localStorage.setItem('last_room_id', room.id.toString());
      }

      await loadMessages(room.id, 1, false, true);

      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, unread_count: 0 } : r)),
      );

      if (isConnected) {
        emit('join_room', { room_id: room.id });
      }
    },
    [currentRoom, loadMessages, isConnected, emit],
  );

  // ---------------- FETCH ROOMS ----------------
  const refreshRooms = useCallback(async () => {
    if (!accessToken) return [];

    setIsLoading(true);
    try {
      const res = await fetch('/api/chat-service/rooms', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      const fetched: ChatRoom[] = data.rooms || [];
      const unique = fetched.filter(
        (room, idx, self) => idx === self.findIndex((r) => r.id === room.id),
      );
      setRooms(unique);

      if (unique.length > 0 && !currentRoom) {
        const savedId =
          typeof window !== 'undefined' ? localStorage.getItem('last_room_id') : null;
        let initial = unique[0];
        if (savedId) {
          const found = unique.find((r) => r.id === Number(savedId));
          if (found) initial = found;
        }
        await selectRoom(initial);
      }

      return unique;
    } catch (e) {
      console.error('[ChatContext] fetchRooms error', e);
      setRooms([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, currentRoom, selectRoom]);

  useEffect(() => {
    if (!accessToken || !isAuthReady) return;
    void refreshRooms();
  }, [accessToken, isAuthReady, refreshRooms]);

  useEffect(() => {
    if (!currentRoom || !isConnected || !currentUserId) return;
    if (
      currentRoom.type === 'direct' &&
      (currentRoom.is_blocked_by_me || currentRoom.has_blocked_me)
    ) {
      return;
    }

    const numericIds = messages
      .map((m) => m.id)
      .filter((id): id is number => typeof id === 'number');
    if (numericIds.length === 0) return;

    const maxId = Math.max(...numericIds);
    clearTimeout(markReadDebounceRef.current);
    markReadDebounceRef.current = setTimeout(() => {
      emit('mark_read', { room_id: currentRoom.id, message_id: maxId });
    }, 700);

    return () => clearTimeout(markReadDebounceRef.current);
  }, [messages, currentRoom, isConnected, currentUserId, emit]);

  const signalTypingFromComposer = useCallback(() => {
    if (!currentRoom || !isConnected) return;
    if (
      currentRoom.type === 'direct' &&
      (currentRoom.is_blocked_by_me || currentRoom.has_blocked_me)
    ) {
      return;
    }

    clearTimeout(typingEmitThrottleTimerRef.current);
    typingEmitThrottleTimerRef.current = setTimeout(() => {
      emit('typing', { room_id: currentRoom.id, typing: true });
    }, 350);

    clearTimeout(typingIdleStopTimerRef.current);
    typingIdleStopTimerRef.current = setTimeout(() => {
      emit('typing', { room_id: currentRoom.id, typing: false });
    }, 2800);
  }, [currentRoom, isConnected, emit]);

  // ---------------- SEND MESSAGE ----------------
  const sendMessage = useCallback(
    (content: string) => {
      if (!currentRoom) {
        toast.error('No room selected');
        return;
      }
      if (!isConnected) {
        toast.error('Chat disconnected. Please wait for reconnection.');
        return;
      }
      if (!content.trim()) return;
      if (!currentUserId) {
        toast.error('Authentication error');
        return;
      }
      if (currentRoom.is_blocked_by_me || currentRoom.has_blocked_me) {
        toast.error('Messaging is blocked for this conversation');
        return;
      }

      clearTimeout(typingEmitThrottleTimerRef.current);
      clearTimeout(typingIdleStopTimerRef.current);
      emit('typing', { room_id: currentRoom.id, typing: false });

      const now = new Date();
      const tempId = `temp-${now.getTime()}-${Math.random().toString(36).substring(2, 8)}`;

      const optimistic: Message = {
        id: tempId,
        room_id: currentRoom.id,
        sender_id: currentUserId,
        sender_name: 'You',
        content: content.trim(),
        message_type: 'text',
        created_at: now.toISOString(),
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        is_me: true,
        read_by_peer: false,
      };

      setMessages((prev) => [...prev, optimistic]);
      pendingMessagesRef.current.set(tempId, {
        content: content.trim(),
        timestamp: now.toISOString(),
      });

      const success = emit('send_message', {
        room_id: currentRoom.id,
        content: content.trim(),
        temp_id: tempId,
      });

      if (!success) {
        setTimeout(() => {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          pendingMessagesRef.current.delete(tempId);
          toast.error('Failed to send message. Please try again.');
        }, 5000);
      }
    },
    [currentRoom, isConnected, emit, currentUserId],
  );

  const updateRoomBlockState = useCallback(
    (profileId: string, status: { is_blocked_by_me: boolean; has_blocked_me: boolean }) => {
      setRooms((prev) =>
        prev.map((room) =>
          room.profile_user_id === profileId
            ? {
                ...room,
                is_blocked_by_me: status.is_blocked_by_me,
                has_blocked_me: status.has_blocked_me,
              }
            : room,
        ),
      );
      setCurrentRoom((room) =>
        room?.profile_user_id === profileId
          ? {
              ...room,
              is_blocked_by_me: status.is_blocked_by_me,
              has_blocked_me: status.has_blocked_me,
            }
          : room,
      );
    },
    [],
  );

  const setBlockState = useCallback(
    async (profileId: string, shouldBlock: boolean) => {
      if (!accessToken) {
        toast.error('Authentication error');
        return;
      }

      const res = await fetch(`/api/chat-service/blocks/${profileId}`, {
        method: shouldBlock ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Failed to ${shouldBlock ? 'block' : 'unblock'} user`);
      }

      updateRoomBlockState(profileId, {
        is_blocked_by_me: data.is_blocked_by_me === true,
        has_blocked_me: data.has_blocked_me === true,
      });
    },
    [accessToken, updateRoomBlockState],
  );

  const blockUser = useCallback(
    async (profileId: string) => {
      await setBlockState(profileId, true);
      toast.success('User blocked');
    },
    [setBlockState],
  );

  const unblockUser = useCallback(
    async (profileId: string) => {
      await setBlockState(profileId, false);
      toast.success('User unblocked');
    },
    [setBlockState],
  );

  return (
    <ChatContext.Provider
      value={{
        rooms,
        currentRoom,
        messages,
        isLoading: isLoading || !isAuthReady,
        sendMessage,
        selectRoom,
        loadMessages,
        refreshRooms,
        blockUser,
        unblockUser,
        isConnected,
        isConnecting,
        reconnect,
        socketError: lastError,
        peerTypingLabel,
        signalTypingFromComposer,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};