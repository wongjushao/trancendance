// frontend/app/(main)/chat/rooms/[roomId]/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Users,
  Loader2,
  MoreVertical,
  Phone,
  Video,
  Search,
  Pin,
  Trash2,
  Copy,
  UserPlus,
  Clock,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface Message {
  id: number;
  room_id: number;
  sender_id: string;
  content: string | null;
  message_type: string;
  created_at: string;
  sender: {
    id: string;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

interface ChatRoom {
  id: number;
  type: "direct" | "group" | "course";
  related_course_id: number | null;
  created_at: string;
  course?: {
    id: number;
    title: string;
    thumbnail: string | null;
  };
}

interface RoomMember {
  user_id: string;
  joined_at: string;
  user: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string;
  };
}

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = parseInt(params.roomId as string);
  const supabase = getSupabaseBrowserClient();

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [showMembers, setShowMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load room details and messages
  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUser(user);

      await loadRoomDetails();
      await loadMessages();
      await loadMembers();
      await subscribeToMessages();

      // Simulate online users (in production, use Supabase Presence)
      setOnlineCount(Math.floor(Math.random() * 10) + 1);
    };

    initialize();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [roomId]);

  const loadRoomDetails = async () => {
    // Get chat room details
    const { data: roomData, error: roomError } = await supabase
      .from("chat_rooms")
      .select(`
        *,
        course:courses!chat_rooms_related_course_id_fkey (
          id,
          title,
          thumbnail
        )
      `)
      .eq("id", roomId)
      .single();

    if (roomError) {
      console.error("Error loading room:", roomError);
      toast.error("Failed to load chat room");
      router.push("/chat/rooms");
      return;
    }

    setRoom(roomData as unknown as ChatRoom);
    setLoading(false);
  };

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey (
          id,
          username,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    setMessages((data || []) as Message[]);
  };

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from("chat_room_members")
      .select(`
        user_id,
        joined_at,
        user:profiles!chat_room_members_user_id_fkey (
          id,
          username,
          first_name,
          last_name,
          email,
          avatar_url
        )
      `)
      .eq("room_id", roomId);

    if (error) {
      console.error("Error loading members:", error);
      return;
    }

    setMembers((data || []) as unknown as RoomMember[]);
  };

  const subscribeToMessages = async () => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          // Fetch sender details for the new message
          const { data: senderData } = await supabase
            .from("profiles")
            .select("id, username, first_name, last_name, avatar_url")
            .eq("id", payload.new.sender_id)
            .single();

          const newMsg = {
            ...payload.new,
            sender: senderData,
          } as Message;

          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    setSending(true);
    const { error } = await supabase.from("messages").insert({
      room_id: roomId,
      sender_id: currentUser.id,
      content: newMessage.trim(),
      message_type: "text",
    });

    if (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diff / 60000);
    const diffHours = Math.floor(diff / 3600000);
    const diffDays = Math.floor(diff / 86400000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (firstName?: string | null, lastName?: string | null, username?: string | null) => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    if (firstName) return firstName[0].toUpperCase();
    if (username) return username[0].toUpperCase();
    return "U";
  };

  const getDisplayName = (user: any) => {
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    if (user.first_name) return user.first_name;
    if (user.username) return user.username;
    return "User";
  };

  const filteredMembers = members.filter((member) => {
    const name = getDisplayName(member.user).toLowerCase();
    const email = member.user.email?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-gray-900/50 rounded-xl overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/80">
          <div className="flex items-center gap-3">
            <Link href="/chat/rooms">
              <ArrowLeft className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
            </Link>
            <div>
              <h1 className="font-semibold text-white">
                {room?.type === "course" && room?.course?.title
                  ? `${room.course.title} Chat`
                  : "Chat Room"}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs text-gray-400">{onlineCount} online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Users className="w-5 h-5 text-gray-400" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <Phone className="w-4 h-4 mr-2" />
                  Start voice call
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Video className="w-4 h-4 mr-2" />
                  Start video call
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Search className="w-4 h-4 mr-2" />
                  Search messages
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Pin className="w-4 h-4 mr-2" />
                  Pin conversation
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-400">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                <Send className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-white">No messages yet</h3>
              <p className="text-sm text-gray-400 mt-1">
                Be the first to send a message in this chat!
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_id === currentUser?.id;
              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={message.sender?.avatar_url || ""} />
                    <AvatarFallback className="bg-purple-600 text-white text-xs">
                      {getInitials(
                        message.sender?.first_name,
                        message.sender?.last_name,
                        message.sender?.username
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 max-w-[70%] ${isOwn ? "text-right" : ""}`}>
                    {!isOwn && (
                      <p className="text-xs text-gray-400 mb-1">
                        {getDisplayName(message.sender)}
                      </p>
                    )}
                    <div
                      className={`inline-block p-3 rounded-lg ${
                        isOwn
                          ? "bg-purple-600 text-white rounded-tr-none"
                          : "bg-gray-800 text-gray-200 rounded-tl-none"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatMessageTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/80">
          <div className="flex items-center gap-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
              rows={1}
              style={{ minHeight: "44px", maxHeight: "120px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
            <GlowButton
              onClick={handleSendMessage}
              isLoading={sending}
              disabled={!newMessage.trim()}
              className="h-11 w-11 p-0"
            >
              <Send className="w-4 h-4" />
            </GlowButton>
          </div>
        </div>
      </div>

      {/* Members Sidebar */}
      {showMembers && (
        <div className="w-80 border-l border-gray-800 bg-gray-900/80 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-white">
                Members ({members.length})
              </h3>
              <button
                onClick={() => setShowMembers(false)}
                className="p-1 rounded-lg hover:bg-gray-800"
              >
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-800 border-gray-700"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredMembers.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={member.user.avatar_url || ""} />
                  <AvatarFallback className="bg-purple-600 text-white">
                    {getInitials(
                      member.user.first_name,
                      member.user.last_name,
                      member.user.username
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {getDisplayName(member.user)}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {member.user.email}
                  </p>
                </div>
                {member.user_id === currentUser?.id && (
                  <Badge variant="secondary" className="text-xs">
                    You
                  </Badge>
                )}
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-gray-800">
            <GlowButton variant="secondary" fullWidth size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite to Room
            </GlowButton>
          </div>
        </div>
      )}
    </div>
  );
}