// frontend/app/(main)/courses/[id]/chat/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Users,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import {
  getChatMessages,
  sendMessage,
  addUserToChatRoom,
  autoCreateCourseChatRoom,
} from "@/lib/supabase/chat";
import { isEnrolled } from "@/lib/supabase/enrollment";

interface Message {
  id: number;
  room_id: number;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
}

interface ChatRoom {
  id: number;
  type: string;
  related_course_id: number;
  created_at: string;
}

export default function CourseChatPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isEnrolledState, setIsEnrolledState] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);
  
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseBrowserClient();
        
        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.push("/login");
          return;
        }
        setUser(authUser);
        
        // Get course details
        const { data: courseData } = await supabase
          .from("courses")
          .select("id, title, thumbnail")
          .eq("id", courseId)
          .single();
        setCourse(courseData);
        
        // Check enrollment
        const enrolled = await isEnrolled(courseId, authUser.id);
        if (!enrolled) {
          toast.error("You must be enrolled to access the course chat");
          router.push(`/courses/${courseId}`);
          return;
        }
        setIsEnrolledState(true);
        
        // Get or create chat room
        let room = await autoCreateCourseChatRoom(courseId);
        setChatRoom(room);
        
        // Ensure user is added to chat room
        await addUserToChatRoom(room.id, authUser.id);
        
        // Load messages
        const msgs = await getChatMessages(room.id, 100);
        setMessages(msgs || []);
        
        // Subscribe to new messages
        subscriptionRef.current = supabase
          .channel(`chat_room_${room.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `room_id=eq.${room.id}`,
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
        
        // Simulate online users count (in production, use presence)
        setOnlineUsers(Math.floor(Math.random() * 20) + 5);
        
      } catch (error) {
        console.error("Error initializing chat:", error);
        toast.error("Failed to load chat");
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [courseId, router]);
  
  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!chatRoom) return;
    if (!user) return;
    
    setSending(true);
    try {
      await sendMessage(chatRoom.id, user.id, newMessage.trim());
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
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
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };
  
  const getInitials = (firstName: string, lastName: string, username: string) => {
    if (firstName) return firstName[0];
    if (lastName) return lastName[0];
    if (username) return username[0];
    return "U";
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  if (!isEnrolledState) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href={`/courses/${courseId}/learn`}>
              <GlowButton variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Course
              </GlowButton>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Course Chat</h1>
              <p className="text-sm text-gray-400">{course?.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm">{onlineUsers} online</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-3">
            <GlowCard>
              <div className="flex flex-col h-[600px]">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                      <p className="text-gray-400">No messages yet</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Be the first to say something!
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex items-start gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                        >
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={message.sender?.avatar_url || undefined} />
                            <AvatarFallback>
                              {getInitials(
                                message.sender?.first_name || "",
                                message.sender?.last_name || "",
                                message.sender?.username || ""
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isOwn
                                ? "bg-purple-600 text-white"
                                : "bg-slate-700 text-gray-200"
                            }`}
                          >
                            {!isOwn && (
                              <div className="text-xs text-gray-400 mb-1">
                                {message.sender?.first_name} {message.sender?.last_name}
                              </div>
                            )}
                            <p className="text-sm break-words">{message.content}</p>
                            <div
                              className={`text-xs mt-1 ${
                                isOwn ? "text-purple-200" : "text-gray-500"
                              }`}
                            >
                              {formatMessageTime(message.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Message Input */}
                <div className="border-t border-slate-700 p-4">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="flex-1"
                      disabled={sending}
                    />
                    <GlowButton
                      onClick={handleSendMessage}
                      isLoading={sending}
                      disabled={!newMessage.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </GlowButton>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Be respectful and helpful to fellow learners
                  </p>
                </div>
              </div>
            </GlowCard>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <GlowCard>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-3">Course Info</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-400">Course:</span>
                    <p className="text-white mt-1">{course?.title}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Chat Guidelines:</span>
                    <ul className="text-gray-300 mt-1 space-y-1 list-disc list-inside">
                      <li>Be respectful</li>
                      <li>No spam or self-promotion</li>
                      <li>Help fellow learners</li>
                      <li>Stay on topic</li>
                    </ul>
                  </div>
                </div>
              </div>
            </GlowCard>
          </div>
        </div>
      </div>
    </div>
  );
}