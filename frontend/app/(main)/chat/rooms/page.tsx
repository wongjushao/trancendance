// frontend/app/(main)/chat/rooms/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  Users,
  Search,
  Loader2,
  ChevronRight,
  Clock,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { getUserChatRooms } from "@/lib/supabase/chat";

interface ChatRoomWithDetails {
  room_id: number;
  joined_at: string;
  chat_rooms: {
    id: number;
    type: string;
    related_course_id: number | null;
    created_at: string;
    course: {
      id: number;
      title: string;
      thumbnail: string | null;
    } | null;
  };
}

export default function ChatRoomsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<ChatRoomWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    const loadRooms = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseBrowserClient();
        
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.push("/login");
          return;
        }
        setUser(authUser);
        
        const roomsData = await getUserChatRooms(authUser.id);
        setRooms((roomsData || []) as unknown as ChatRoomWithDetails[]);
        
      } catch (error) {
        console.error("Error loading chat rooms:", error);
        toast.error("Failed to load chat rooms");
      } finally {
        setLoading(false);
      }
    };
    
    loadRooms();
  }, [router]);
  
  const filteredRooms = rooms.filter(room => {
    if (!room.chat_rooms.course) return false;
    return room.chat_rooms.course.title.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
            <MessageSquare className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Chat Rooms</h1>
          <p className="text-gray-400 mt-2">
            Join course discussions and connect with fellow learners
          </p>
        </div>
        
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search chat rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {/* Chat Rooms List */}
        {filteredRooms.length === 0 ? (
          <GlowCard>
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold text-white mb-2">No Chat Rooms</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm 
                  ? "No chat rooms match your search" 
                  : "Join courses to access their chat rooms"}
              </p>
              {!searchTerm && (
                <GlowButton onClick={() => router.push("/courses")}>
                  Browse Courses
                </GlowButton>
              )}
            </div>
          </GlowCard>
        ) : (
          <div className="space-y-3">
            {filteredRooms.map((room) => {
              const course = room.chat_rooms.course;
              if (!course) return null;
              
              return (
                <GlowCard key={room.room_id} className="hover:scale-[1.01] transition-transform duration-200">
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => router.push(`/courses/${course.id}/chat`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Course Thumbnail */}
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                          {course.thumbnail ? (
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <MessageSquare className="w-6 h-6 text-white" />
                          )}
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-white">{course.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              Course Chat
                            </Badge>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Joined {formatDate(room.joined_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    </div>
                  </div>
                </GlowCard>
              );
            })}
          </div>
        )}
        
        {/* Stats */}
        {rooms.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-400">
            You are in {rooms.length} active chat {rooms.length === 1 ? "room" : "rooms"}
          </div>
        )}
      </div>
    </div>
  );
}