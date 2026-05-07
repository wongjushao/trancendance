// frontend/components/chat/ChatBubble.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, X, Send, Maximize2, Paperclip, Loader2, ChevronLeft, RefreshCw, User, Ban, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChat } from "@/contexts/ChatContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { forceRefreshMessages, clearRoomCache } from "@/lib/chatViewSync";
import { chatTimestampMs, formatChatDateKey } from "@/lib/chatTime";
import { toast } from "sonner";

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

interface ChatProfile {
  id: string;
  display_name: string;
  username?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  job_title?: string | null;
  department?: string | null;
  is_me: boolean;
  is_blocked_by_me: boolean;
  has_blocked_me: boolean;
}

export function ChatBubble() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState<'dm' | 'course'>('dm');
  const [searchQuery, setSearchQuery] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { 
    rooms, 
    messages, 
    sendMessage, 
    loadMessages,
    selectRoom, 
    currentRoom, 
    isLoading, 
    isConnected,
    isConnecting,
    reconnect,
    blockUser,
    unblockUser,
    peerTypingLabel,
    signalTypingFromComposer,
  } = useChat();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileActionLoading, setProfileActionLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ChatProfile | null>(null);
  const [friendRequestActions, setFriendRequestActions] = useState<Record<string, "accepted" | "rejected" | "loading">>({});

  // Get auth credentials
  useEffect(() => {
    const getAuth = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
        setCurrentUserId(session.user.id);
      }
    };
    getAuth();
  }, []);

  // Auto-scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, []);

  // Scroll to bottom when messages change (new messages arrive)
  useEffect(() => {
    if (isOpen && view === 'chat' && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isOpen, view, scrollToBottom]);

  // Reload messages when entering chat view - force refresh from database
  useEffect(() => {
    if (view === 'chat' && currentRoom && accessToken && currentUserId) {
      console.log('[ChatBubble] Entering chat view, force refreshing messages from database for room:', currentRoom.id);
      // Clear cache to ensure fresh data
      clearRoomCache(currentRoom.id);
      // Force refresh from database (single source of truth)
      forceRefreshMessages(currentRoom.id, accessToken, currentUserId, 50)
        .then(refreshedMessages => {
          console.log('[ChatBubble] Force refreshed', refreshedMessages.length, 'messages');
        })
        .catch(err => {
          console.error('[ChatBubble] Error force refreshing messages:', err);
        });
    }
  }, [view, currentRoom?.id, accessToken, currentUserId]);

  // Listen for chat message received events
  useEffect(() => {
    const handleMessageReceived = (event: CustomEvent) => {
      if (isOpen && view === 'chat' && event.detail?.roomId === currentRoom?.id) {
        scrollToBottom();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('chat-message-received', handleMessageReceived as EventListener);
      return () => {
        window.removeEventListener('chat-message-received', handleMessageReceived as EventListener);
      };
    }
  }, [isOpen, view, currentRoom, scrollToBottom]);

  // Filter rooms based on active tab and search
  const filteredRooms = rooms.filter(room => {
    const matchesTab = activeTab === 'dm' ? room.type === 'direct' : room.type === 'course';
    const matchesSearch = room.display_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const toggleChat = () => {
    const newOpenState = !isOpen;
    setIsOpen(newOpenState);
    
    if (newOpenState) {
      // Reset to list view when opening
      setView('list');
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      newMessage.trim() &&
      currentRoom &&
      isConnected &&
      !currentRoom.is_blocked_by_me &&
      !currentRoom.has_blocked_me
    ) {
      sendMessage(newMessage);
      setNewMessage("");
      setTimeout(scrollToBottom, 100);
    }
  };

  const openProfile = useCallback(async (profileId?: string | null) => {
    if (!profileId || !accessToken) return;

    setProfileOpen(true);
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/chat-service/profiles/${profileId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load profile");
      setSelectedProfile(data.profile);
    } catch (error) {
      console.error("[ChatBubble] Error loading profile:", error);
      setSelectedProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [accessToken]);

  const handleToggleBlock = async () => {
    if (!selectedProfile || selectedProfile.is_me) return;

    setProfileActionLoading(true);
    try {
      if (selectedProfile.is_blocked_by_me) {
        await unblockUser(selectedProfile.id);
        setSelectedProfile((profile) => profile ? { ...profile, is_blocked_by_me: false } : profile);
      } else {
        await blockUser(selectedProfile.id);
        setSelectedProfile((profile) => profile ? { ...profile, is_blocked_by_me: true } : profile);
      }
    } catch (error) {
      console.error("[ChatBubble] Error updating block state:", error);
    } finally {
      setProfileActionLoading(false);
    }
  };

  const openFullProfile = useCallback((profile: ChatProfile) => {
    const identifier = profile.username || profile.display_name || profile.id;
    setProfileOpen(false);
    setIsOpen(false);
    router.push(`/profile/${encodeURIComponent(identifier)}`);
  }, [router]);

  const respondToFriendRequest = useCallback(async (message: Message, action: "accept" | "reject") => {
    if (!accessToken) {
      toast.error("Authentication error");
      return;
    }

    setFriendRequestActions((prev) => ({ ...prev, [String(message.id)]: "loading" }));
    try {
      const response = await fetch(`/api/auth-service/friends/respond/${message.sender_id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to respond to friend request");
      }

      const status = data.status === "accepted" ? "accepted" : "rejected";
      setFriendRequestActions((prev) => ({ ...prev, [String(message.id)]: status }));
      toast.success(status === "accepted" ? "Friend request accepted" : "Friend request rejected");
      if (currentRoom) {
        await loadMessages(currentRoom.id, 1);
      }
    } catch (error) {
      setFriendRequestActions((prev) => {
        const next = { ...prev };
        delete next[String(message.id)];
        return next;
      });
      toast.error(error instanceof Error ? error.message : "Failed to respond to friend request");
    }
  }, [accessToken, currentRoom, loadMessages]);

  const messagingBlocked =
    currentRoom?.type === 'direct' &&
    (currentRoom.is_blocked_by_me || currentRoom.has_blocked_me);

  const goToMessagesPage = () => {
    setIsOpen(false);
    router.push("/messages");
  };

  const handleSelectRoom = (room: ChatRoom) => {
    selectRoom(room);
    setView('chat');
    setSearchQuery("");
    setTimeout(scrollToBottom, 200);
  };

  const handleBackToList = () => {
    setView('list');
  };

  const handleManualReconnect = () => {
    reconnect();
  };

  // Sort messages by created_at to ensure proper order
  const sortedMessages = [...messages].sort((a, b) => {
    return chatTimestampMs(a.created_at) - chatTimestampMs(b.created_at);
  });

  // Group messages by date
  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    msgs.forEach(msg => {
      const dateKey = formatChatDateKey(msg.created_at);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate(sortedMessages);

  // Deduplicate rooms for display
  const uniqueFilteredRooms = filteredRooms.filter(
    (room, index, self) => index === self.findIndex((r) => r.id === room.id)
  );

  return (
    <>
      <button
        onClick={toggleChat}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 p-3 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        aria-label="Open chat"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 h-[550px] w-[400px] rounded-xl bg-[#1A1A24] shadow-2xl flex flex-col overflow-hidden border border-white/10">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-violet-600 p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {view === 'chat' && (
                  <button
                    onClick={handleBackToList}
                    className="text-white hover:text-gray-200 transition-colors p-1 rounded hover:bg-white/20"
                    title="Back to list"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-white">
                    {view === 'chat' && currentRoom ? currentRoom.display_name : 'Messages'}
                  </h3>
                  {view === 'chat' && currentRoom?.type === 'direct' && (
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/80">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          currentRoom.profile_is_online ? 'bg-green-400' : 'bg-[#A0A0B5]'
                        }`}
                      />
                      {currentRoom.profile_is_online ? 'Online' : 'Offline'}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {view === 'chat' && currentRoom?.type === 'direct' && currentRoom.profile_user_id && (
                  <button
                    onClick={() => openProfile(currentRoom.profile_user_id)}
                    className="text-white hover:text-gray-200 transition-colors p-1 rounded hover:bg-white/20"
                    title="View profile"
                  >
                    <User className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={goToMessagesPage}
                  className="text-white hover:text-gray-200 transition-colors p-1 rounded hover:bg-white/20"
                  title="Open full messages page"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : isConnecting ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
                <button onClick={toggleChat} className="text-white hover:text-gray-200 p-1 rounded hover:bg-white/20">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {view === 'list' ? (
            <>
              {/* Search Input */}
              <div className="p-3 border-b border-white/10 bg-[#1A1A24]">
                <Input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#0B0B0F] border-white/10 text-white rounded-xl h-9 text-sm"
                />
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/10 bg-[#1A1A24]">
                <button
                  onClick={() => setActiveTab('dm')}
                  className={`flex-1 py-3 text-sm font-medium transition-all relative ${
                    activeTab === 'dm' 
                      ? 'text-purple-400' 
                      : 'text-[#A0A0B5] hover:text-white'
                  }`}
                >
                  Direct Messages
                  {activeTab === 'dm' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-violet-600" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('course')}
                  className={`flex-1 py-3 text-sm font-medium transition-all relative ${
                    activeTab === 'course' 
                      ? 'text-purple-400' 
                      : 'text-[#A0A0B5] hover:text-white'
                  }`}
                >
                  Course Chats
                  {activeTab === 'course' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-violet-600" />
                  )}
                </button>
              </div>

              {/* Room List */}
              <div className="flex-1 overflow-y-auto bg-[#1A1A24]">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                  </div>
                ) : uniqueFilteredRooms.length === 0 ? (
                  <div className="text-center py-8 text-sm text-[#A0A0B5]">
                    No {activeTab === 'dm' ? 'direct messages' : 'course chats'} yet
                  </div>
                ) : (
                  uniqueFilteredRooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => handleSelectRoom(room)}
                      className="w-full p-3 text-left hover:bg-white/5 transition-colors border-b border-white/5"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-10 w-10">
                              {room.profile_avatar && <AvatarImage src={room.profile_avatar} />}
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-600 text-white">
                                {room.display_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {room.type === 'direct' && (
                              <span
                                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#1A1A24] ${
                                  room.profile_is_online ? 'bg-green-400' : 'bg-[#6B6B80]'
                                }`}
                                title={room.profile_is_online ? 'Online' : 'Offline'}
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{room.display_name}</p>
                            {room.last_message && (
                              <p className="text-xs text-[#A0A0B5] truncate">{room.last_message}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {room.last_message_time && (
                            <span className="text-xs text-[#6B6B80]">
                              {new Date(room.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {room.unread_count > 0 && (
                            <span className="bg-purple-500 text-white text-xs rounded-full px-2 py-0.5">
                              {room.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              {/* Chat Messages Area */}
              <div className="flex-1 overflow-hidden bg-[#13131A]">
                <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
                  <div className="space-y-4">
                    {messagingBlocked && (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                        {currentRoom?.is_blocked_by_me
                          ? "You blocked this user. Open their profile to unblock."
                          : "This user has blocked you."}
                      </div>
                    )}
                    {Object.entries(messageGroups).length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="h-12 w-12 text-[#6B6B80] mx-auto mb-3 opacity-30" />
                        <p className="text-[#A0A0B5] text-sm">No messages yet</p>
                        <p className="text-xs text-[#6B6B80] mt-1">Start the conversation!</p>
                      </div>
                    ) : (
                      Object.entries(messageGroups).map(([date, dateMessages]) => (
                        <div key={date} className="space-y-3">
                          {/* Date separator */}
                          <div className="flex justify-center">
                            <span className="text-xs text-[#6B6B80] bg-[#1A1A24] px-3 py-1 rounded-full">
                              {date === new Date().toLocaleDateString() ? 'Today' : date}
                            </span>
                          </div>
                          
                          {/* Messages for this date */}
                          {dateMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex gap-2 ${msg.is_me ? 'justify-end' : 'justify-start'}`}
                            >
                              {!msg.is_me && (
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarImage src={msg.sender_avatar} />
                                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-600 text-white text-xs">
                                    {msg.sender_name?.charAt(0).toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className={`flex flex-col ${msg.is_me ? 'items-end' : 'items-start'} max-w-[70%]`}>
                                {!msg.is_me && (
                                  <span className="text-xs text-[#A0A0B5] mb-1 ml-1">{msg.sender_name}</span>
                                )}
                                {msg.message_type === "friend_request" && !msg.is_me ? (
                                  <div className="rounded-2xl rounded-tl-none border border-purple-400/30 bg-purple-500/10 p-3 text-sm text-white">
                                    <p className="font-medium">{msg.content}</p>
                                    <p className="mt-1 text-xs text-[#A0A0B5]">Accept to become friends, or reject to decline.</p>
                                    {(friendRequestActions[String(msg.id)] || msg.friend_request_status) === "accepted" || (friendRequestActions[String(msg.id)] || msg.friend_request_status) === "rejected" ? (
                                      <p className="mt-3 text-xs font-medium text-purple-200">
                                        Request {friendRequestActions[String(msg.id)] || msg.friend_request_status}
                                      </p>
                                    ) : (
                                      <div className="mt-3 flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => respondToFriendRequest(msg, "accept")}
                                          disabled={friendRequestActions[String(msg.id)] === "loading"}
                                          className="inline-flex h-8 items-center rounded-full bg-green-600 px-3 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-60"
                                        >
                                          <Check className="mr-1 h-3.5 w-3.5" />
                                          Accept
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => respondToFriendRequest(msg, "reject")}
                                          disabled={friendRequestActions[String(msg.id)] === "loading"}
                                          className="inline-flex h-8 items-center rounded-full border border-white/10 px-3 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-60"
                                        >
                                          <X className="mr-1 h-3.5 w-3.5" />
                                          Reject
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div
                                    className={`px-4 py-2.5 rounded-2xl text-sm break-words ${
                                      msg.is_me
                                        ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-tr-none'
                                        : 'bg-[#252530] text-white rounded-tl-none border border-white/10'
                                    }`}
                                  >
                                    {msg.content}
                                  </div>
                                )}
                                <span className="text-xs text-[#6B6B80] mt-1 px-1 inline-flex items-center gap-1">
                                  {msg.timestamp}
                                  {msg.is_me && msg.message_type === 'text' && (
                                    <span
                                      className={`tabular-nums ${msg.read_by_peer ? 'text-sky-300' : 'text-white/45'}`}
                                      title={msg.read_by_peer ? 'Read' : 'Delivered'}
                                    >
                                      {msg.read_by_peer ? '✓✓' : '✓'}
                                    </span>
                                  )}
                                </span>
                              </div>
                              {msg.is_me && (
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-600 text-white text-xs">
                                    Me
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>

              {/* Input Area */}
              {isConnected ? (
                <form onSubmit={handleSendMessage} className="border-t border-white/10 bg-[#1A1A24]">
                  {peerTypingLabel && (
                    <p className="px-3 pt-2 text-[11px] text-[#A0A0B5] animate-pulse">
                      {peerTypingLabel} is typing…
                    </p>
                  )}
                  <div className="flex gap-2 p-3">
                    <button
                      type="button"
                      className="p-2 text-[#A0A0B5] hover:text-purple-400 transition-colors rounded-lg hover:bg-white/5"
                      title="Attach file (coming soon)"
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <Input
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        signalTypingFromComposer();
                      }}
                      placeholder={messagingBlocked ? "Messaging is blocked" : "Type a message..."}
                      className="flex-1 bg-[#0B0B0F] border-white/10 text-white text-sm rounded-full px-4 focus:ring-2 focus:ring-purple-500/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                    />
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-full px-4 hover:shadow-lg transition-all disabled:opacity-50"
                      disabled={!newMessage.trim() || messagingBlocked}
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              ) : isConnecting ? (
                <div className="p-3 border-t border-white/10 text-center bg-[#1A1A24]">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                    <p className="text-xs text-yellow-400">Connecting...</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 border-t border-white/10 text-center bg-[#1A1A24]">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-5 w-5 text-red-400">⚠️</div>
                    <p className="text-xs text-red-400">Disconnected from server</p>
                    <button 
                      onClick={handleManualReconnect}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Reconnect
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {profileOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#14141C] p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-white">Chat Profile</h3>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="rounded-lg px-2 py-1 text-xs text-[#A0A0B5] hover:bg-white/5 hover:text-white"
              >
                Close
              </button>
            </div>

            {profileLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
              </div>
            ) : selectedProfile ? (
              <div className="mt-4 space-y-4">
                <button
                  type="button"
                  onClick={() => openFullProfile(selectedProfile)}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/[0.04]"
                  aria-label={`Open ${selectedProfile.display_name} full profile`}
                >
                  <Avatar className="h-12 w-12">
                    {selectedProfile.avatar_url && <AvatarImage src={selectedProfile.avatar_url} />}
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-600 text-white">
                      {selectedProfile.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{selectedProfile.display_name}</p>
                    {selectedProfile.username && (
                      <p className="truncate text-xs text-[#A0A0B5]">@{selectedProfile.username}</p>
                    )}
                    {(selectedProfile.job_title || selectedProfile.department) && (
                      <p className="truncate text-xs text-[#A0A0B5]">
                        {[selectedProfile.job_title, selectedProfile.department].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </button>

                {selectedProfile.bio && (
                  <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-[#E0E0F0]">
                    {selectedProfile.bio}
                  </p>
                )}

                {selectedProfile.has_blocked_me && (
                  <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-100">
                    This user has blocked you.
                  </p>
                )}

                {!selectedProfile.is_me && (
                  <button
                    type="button"
                    onClick={handleToggleBlock}
                    disabled={profileActionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-60"
                  >
                    {profileActionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Ban className="h-4 w-4" />
                    )}
                    {selectedProfile.is_blocked_by_me ? "Unblock User" : "Block User"}
                  </button>
                )}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-[#A0A0B5]">Profile could not be loaded.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}