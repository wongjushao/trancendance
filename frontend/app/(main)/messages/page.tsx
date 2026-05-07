// frontend/app/(main)/messages/page.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Paperclip, Search, MessageCircle, User, Ban, Check, X } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
}

interface ChatProfile {
  id: string;
  display_name: string;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  job_title?: string | null;
  department?: string | null;
  timezone?: string | null;
  is_me: boolean;
  is_blocked_by_me: boolean;
  has_blocked_me: boolean;
}

export default function MessagesPage() {
  const router = useRouter();
  const {
    rooms,
    currentRoom,
    messages,
    isLoading,
    sendMessage,
    selectRoom,
    loadMessages,
    isConnected,
    blockUser,
    unblockUser,
  } = useChat();

  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"dm" | "course">("dm");
  const [searchQuery, setSearchQuery] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileActionLoading, setProfileActionLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ChatProfile | null>(null);
  const [friendRequestActions, setFriendRequestActions] = useState<Record<string, "accepted" | "rejected" | "loading">>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Get auth credentials
  useEffect(() => {
    const getAuth = async () => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
        setCurrentUserId(session.user.id);
      }
    };
    getAuth();
  }, []);

  // Filter rooms based on active tab and search
  const filteredRooms = rooms.filter((room) => {
    const matchesTab =
      activeTab === "dm" ? room.type === "direct" : room.type === "course";
    const matchesSearch = room.display_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Force refresh messages from database on room change (single source of truth)
  useEffect(() => {
    if (currentRoom && accessToken && currentUserId) {
      clearRoomCache(currentRoom.id);
      forceRefreshMessages(currentRoom.id, accessToken, currentUserId, 50).catch(
        (err) => {
          console.error("[MessagesPage] Error force refreshing messages:", err);
        },
      );
    }
  }, [currentRoom?.id, accessToken, currentUserId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    }
  };

  const openProfile = useCallback(
    async (profileId?: string | null) => {
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
        console.error("[MessagesPage] Error loading chat profile:", error);
        setSelectedProfile(null);
      } finally {
        setProfileLoading(false);
      }
    },
    [accessToken],
  );

  const handleToggleBlock = async () => {
    if (!selectedProfile || selectedProfile.is_me) return;

    setProfileActionLoading(true);
    try {
      if (selectedProfile.is_blocked_by_me) {
        await unblockUser(selectedProfile.id);
        setSelectedProfile((profile) =>
          profile ? { ...profile, is_blocked_by_me: false } : profile,
        );
      } else {
        await blockUser(selectedProfile.id);
        setSelectedProfile((profile) =>
          profile ? { ...profile, is_blocked_by_me: true } : profile,
        );
      }
    } catch (error) {
      console.error("[MessagesPage] Error updating block state:", error);
    } finally {
      setProfileActionLoading(false);
    }
  };

  const openFullProfile = useCallback((profile: ChatProfile) => {
    const identifier = profile.username || profile.display_name || profile.id;
    setProfileOpen(false);
    router.push(`/profile/${encodeURIComponent(identifier)}`);
  }, [router]);

  const respondToFriendRequest = useCallback(
    async (message: Message, action: "accept" | "reject") => {
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
    },
    [accessToken, currentRoom, loadMessages],
  );

  const messagingBlocked =
    currentRoom?.type === "direct" &&
    (currentRoom.is_blocked_by_me || currentRoom.has_blocked_me);

  // Sort messages by created_at to ensure proper order
  const sortedMessages = [...messages].sort((a, b) => {
    return chatTimestampMs(a.created_at) - chatTimestampMs(b.created_at);
  });

  // Group messages by date
  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    msgs.forEach((msg) => {
      const dateKey = formatChatDateKey(msg.created_at);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate(sortedMessages as Message[]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-4rem)] bg-[#0B0B0F]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-4rem)] bg-[#0B0B0F] rounded-none sm:rounded-xl overflow-hidden border border-white/5">
      {/* Sidebar - Hidden on mobile when chat is open */}
      <div
        className={`${
          currentRoom ? "hidden md:flex" : "flex"
        } w-full md:w-72 lg:w-80 xl:w-96 border-r border-white/10 bg-[#14141C] flex-col min-h-0`}
      >
        <div className="p-3 sm:p-4 border-b border-white/10 bg-[#14141C]">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 tracking-tight">
            Messages
          </h1>

          {/* Search Bar */}
          <div className="relative mb-3 sm:mb-4 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80] group-focus-within:text-purple-400 transition-colors" />
            <Input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#0B0B0F] border-white/10 text-white rounded-xl h-10 focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:border-purple-500/40 transition-all"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("dm")}
              className={`flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                activeTab === "dm"
                  ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30"
                  : "bg-[#0B0B0F] text-[#A0A0B5] hover:text-white hover:bg-white/5 border border-white/10"
              }`}
            >
              Direct Messages
            </button>
            <button
              onClick={() => setActiveTab("course")}
              className={`flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                activeTab === "course"
                  ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30"
                  : "bg-[#0B0B0F] text-[#A0A0B5] hover:text-white hover:bg-white/5 border border-white/10"
              }`}
            >
              Course Chats
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="px-4 py-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {isConnected && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60 animate-ping" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
            </span>
            <span className="text-xs text-[#A0A0B5]">
              {isConnected ? "Connected" : "Reconnecting..."}
            </span>
          </div>
        </div>

        {/* Rooms List */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {filteredRooms.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle className="h-12 w-12 text-[#6B6B80] mx-auto mb-3 opacity-30" />
                <p className="text-[#A0A0B5]">
                  No {activeTab === "dm" ? "direct messages" : "course chats"} found
                </p>
                <p className="text-sm text-[#6B6B80] mt-2">
                  {activeTab === "dm"
                    ? "Start a conversation from a friend's profile"
                    : "Join a course to see its chat"}
                </p>
              </div>
            ) : (
              filteredRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => selectRoom(room)}
                  className={`w-full p-2.5 sm:p-3 text-left rounded-xl transition-all duration-200 active:scale-[0.99] ${
                    currentRoom?.id === room.id
                      ? "bg-purple-500/10 border border-purple-500/30 shadow-[0_0_0_1px_rgba(168,85,247,0.15),0_8px_24px_-12px_rgba(168,85,247,0.4)]"
                      : "border border-transparent hover:bg-white/5 hover:border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 sm:h-12 sm:w-12 ring-1 ring-white/5">
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-600 text-white text-base sm:text-lg font-semibold">
                        {room.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-white font-medium truncate text-sm sm:text-base">
                          {room.display_name}
                        </p>
                        {room.last_message_time && (
                          <span className="text-[10px] sm:text-xs text-[#6B6B80] flex-shrink-0 mt-0.5">
                            {new Date(room.last_message_time).toLocaleDateString(
                              [],
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                        )}
                      </div>
                      {room.last_message && (
                        <p className="text-xs sm:text-sm text-[#A0A0B5] truncate mt-1">
                          {room.last_message}
                        </p>
                      )}
                      {room.unread_count > 0 && (
                        <div className="mt-1.5">
                          <span className="bg-gradient-to-r from-purple-500 to-violet-600 text-white text-[10px] sm:text-xs rounded-full px-2 py-0.5 font-medium shadow-sm shadow-purple-500/40">
                            {room.unread_count} new
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      {currentRoom ? (
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-gradient-to-b from-[#0F0F15] via-[#0F0F15] to-[#0B0B0F]">
          {/* Chat Header */}
          <div className="h-14 sm:h-16 border-b border-white/10 bg-[#14141C]/95 backdrop-blur-sm px-3 sm:px-4 md:px-6 flex items-center flex-shrink-0">
            <button
              onClick={() => selectRoom(null)}
              className="md:hidden mr-2 p-2 text-[#A0A0B5] hover:text-white rounded-lg hover:bg-white/5 active:scale-95 transition-all"
              aria-label="Back to conversations"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar className="h-9 w-9 sm:h-10 sm:w-10 ring-1 ring-white/5 flex-shrink-0">
                {currentRoom.profile_avatar && <AvatarImage src={currentRoom.profile_avatar} />}
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-600 text-white font-semibold">
                  {currentRoom.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="font-semibold text-white truncate text-sm sm:text-base">
                  {currentRoom.display_name}
                </h2>
                <p className="text-[10px] sm:text-xs text-[#A0A0B5]">
                  {currentRoom.type === "direct" ? "Direct Message" : "Course Chat"}
                </p>
              </div>
            </div>
            {currentRoom.type === "direct" && currentRoom.profile_user_id && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => openProfile(currentRoom.profile_user_id)}
                className="ml-2 text-[#A0A0B5] hover:text-white hover:bg-white/5"
              >
                <User className="h-4 w-4 mr-1.5" />
                Profile
              </Button>
            )}
          </div>

          {/* Messages Area */}
          <ScrollArea
            className="flex-1 min-h-0 px-3 py-4 sm:p-4 md:p-6"
            ref={scrollAreaRef}
          >
            <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
              {messagingBlocked && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {currentRoom?.is_blocked_by_me
                    ? "You blocked this user. Unblock them from their profile to send messages again."
                    : "This user has blocked you, so messaging is unavailable."}
                </div>
              )}

              {sortedMessages.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageCircle className="h-12 w-12 text-[#6B6B80] mx-auto mb-3 opacity-30" />
                  <p className="text-[#A0A0B5]">No messages yet</p>
                  <p className="text-sm text-[#6B6B80] mt-2">
                    Start the conversation!
                  </p>
                </div>
              ) : (
                Object.entries(messageGroups).map(([date, dateMessages]) => (
                  <div key={date} className="space-y-3 md:space-y-4">
                    {/* Date separator */}
                    <div className="flex justify-center sticky top-0 z-10 pointer-events-none">
                      <span className="text-[10px] sm:text-xs text-[#A0A0B5] bg-[#1A1A24]/90 backdrop-blur-sm px-3 py-1 rounded-full border border-white/5 shadow-sm pointer-events-auto">
                        {date === new Date().toLocaleDateString() ? "Today" : date}
                      </span>
                    </div>

                    {/* Messages for this date */}
                    {dateMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 md:gap-3 ${
                          msg.is_me ? "justify-end" : "justify-start"
                        } animate-in fade-in slide-in-from-bottom-1 duration-200`}
                      >
                        {!msg.is_me && (
                          <button
                            type="button"
                            onClick={() => openProfile(msg.sender_id)}
                            className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 rounded-full"
                            aria-label={`Open ${msg.sender_name || "user"} profile`}
                          >
                          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 ring-1 ring-white/5">
                            <AvatarImage src={msg.sender_avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-600 text-white text-[10px] sm:text-xs font-semibold">
                              {msg.sender_name?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          </button>
                        )}
                        <div
                          className={`flex flex-col ${
                            msg.is_me ? "items-end" : "items-start"
                          } max-w-[80%] sm:max-w-[75%] md:max-w-[70%] min-w-0`}
                        >
                          {!msg.is_me && (
                            <button
                              type="button"
                              onClick={() => openProfile(msg.sender_id)}
                              className="text-[10px] sm:text-xs text-[#A0A0B5] mb-1 ml-1 truncate max-w-full hover:text-white"
                            >
                              {msg.sender_name}
                            </button>
                          )}
                          {msg.message_type === "friend_request" && !msg.is_me ? (
                            <div className="rounded-2xl rounded-tl-sm border border-purple-400/30 bg-purple-500/10 p-4 text-sm text-white">
                              <p className="font-medium">{msg.content}</p>
                              <p className="mt-1 text-xs text-[#A0A0B5]">Accept to become friends, or reject to decline the request.</p>
                              {(friendRequestActions[String(msg.id)] || msg.friend_request_status) === "accepted" || (friendRequestActions[String(msg.id)] || msg.friend_request_status) === "rejected" ? (
                                <p className="mt-3 text-xs font-medium text-purple-200">
                                  Request {friendRequestActions[String(msg.id)] || msg.friend_request_status}
                                </p>
                              ) : (
                                <div className="mt-3 flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => respondToFriendRequest(msg, "accept")}
                                    disabled={friendRequestActions[String(msg.id)] === "loading"}
                                    className="h-8 rounded-full bg-green-600 px-3 text-xs text-white hover:bg-green-500"
                                  >
                                    <Check className="mr-1 h-3.5 w-3.5" />
                                    Accept
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => respondToFriendRequest(msg, "reject")}
                                    disabled={friendRequestActions[String(msg.id)] === "loading"}
                                    className="h-8 rounded-full border-white/10 px-3 text-xs text-white hover:bg-white/10"
                                  >
                                    <X className="mr-1 h-3.5 w-3.5" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              className={`px-3 py-2 md:px-4 md:py-2.5 rounded-2xl text-sm break-words whitespace-pre-wrap transition-shadow ${
                                msg.is_me
                                  ? "bg-gradient-to-br from-purple-500 to-violet-600 text-white rounded-tr-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
                                  : "bg-[#252530] text-white rounded-tl-sm border border-white/10 hover:border-white/20"
                              }`}
                            >
                              {msg.content}
                            </div>
                          )}
                          <span className="text-[10px] sm:text-xs text-[#6B6B80] mt-1 px-1">
                            {msg.timestamp}
                          </span>
                        </div>
                        {msg.is_me && (
                          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 ring-1 ring-white/5">
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-600 text-white text-[10px] sm:text-xs font-semibold">
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

          {/* Input Area */}
          <div className="p-3 sm:p-4 border-t border-white/10 bg-[#14141C]/95 backdrop-blur-sm flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
            <form
              onSubmit={handleSendMessage}
              className="max-w-4xl mx-auto flex items-center gap-1.5 sm:gap-2"
            >
              <button
                type="button"
                className="p-2 text-[#A0A0B5] hover:text-purple-400 transition-colors rounded-lg hover:bg-white/5 active:scale-95 flex-shrink-0"
                title="Attach file (coming soon)"
                aria-label="Attach file"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={messagingBlocked ? "Messaging is blocked" : "Type a message..."}
                className="flex-1 min-w-0 bg-[#0B0B0F] border-white/10 text-white rounded-full px-4 h-10 sm:h-11 focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:border-purple-500/40 transition-all"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                className="bg-gradient-to-r from-purple-500 to-violet-600 hover:shadow-lg hover:shadow-purple-500/40 active:scale-95 rounded-full h-10 w-10 sm:h-11 sm:w-11 transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!newMessage.trim() || !isConnected || messagingBlocked}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-gradient-to-br from-[#0F0F15] to-[#0B0B0F]">
          <div className="text-center px-6">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full" />
              <MessageCircle className="relative h-16 w-16 text-purple-400/60 mx-auto" />
            </div>
            <p className="text-[#E0E0F0] text-lg font-medium">
              Select a chat to start messaging
            </p>
            <p className="text-sm text-[#6B6B80] mt-2">
              Choose a conversation from the sidebar
            </p>
          </div>
        </div>
      )}
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#14141C] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-white">Chat Profile</h3>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-[#A0A0B5] hover:bg-white/5 hover:text-white"
              >
                Close
              </button>
            </div>

            {profileLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              </div>
            ) : selectedProfile ? (
              <div className="mt-5 space-y-5">
                <button
                  type="button"
                  onClick={() => openFullProfile(selectedProfile)}
                  className="flex w-full items-center gap-4 rounded-xl p-2 text-left transition-colors hover:bg-white/[0.04]"
                  aria-label={`Open ${selectedProfile.display_name} full profile`}
                >
                  <Avatar className="h-16 w-16 ring-1 ring-white/10">
                    {selectedProfile.avatar_url && <AvatarImage src={selectedProfile.avatar_url} />}
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-600 text-xl font-semibold text-white">
                      {selectedProfile.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-white">
                      {selectedProfile.display_name}
                    </p>
                    {selectedProfile.username && (
                      <p className="truncate text-sm text-[#A0A0B5]">@{selectedProfile.username}</p>
                    )}
                    {(selectedProfile.job_title || selectedProfile.department) && (
                      <p className="mt-1 text-sm text-[#A0A0B5]">
                        {[selectedProfile.job_title, selectedProfile.department].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </button>

                {selectedProfile.bio && (
                  <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-[#E0E0F0]">
                    {selectedProfile.bio}
                  </p>
                )}

                {selectedProfile.has_blocked_me && (
                  <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">
                    This user has blocked you.
                  </p>
                )}

                {!selectedProfile.is_me && (
                  <Button
                    type="button"
                    variant={selectedProfile.is_blocked_by_me ? "secondary" : "destructive"}
                    onClick={handleToggleBlock}
                    disabled={profileActionLoading}
                    className="w-full"
                  >
                    {profileActionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Ban className="mr-2 h-4 w-4" />
                    )}
                    {selectedProfile.is_blocked_by_me ? "Unblock User" : "Block User"}
                  </Button>
                )}
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-[#A0A0B5]">
                Profile could not be loaded.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}