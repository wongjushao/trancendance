"use client";

import { useState } from "react";
import { Search, Send, Paperclip, MoreVertical, Phone, Video } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";

const chatRooms = [
  { 
    id: 1, 
    name: "Advanced React - Discussion", 
    type: "course",
    lastMessage: "Great question about hooks!",
    lastTime: "2 min ago",
    unread: 3,
    avatar: "📚",
  },
  { 
    id: 2, 
    name: "Sarah Johnson", 
    type: "direct",
    lastMessage: "The assignment is due tomorrow",
    lastTime: "1 hour ago",
    unread: 0,
    avatar: "SJ",
  },
  { 
    id: 3, 
    name: "Tech University", 
    type: "organization",
    lastMessage: "Welcome to the community!",
    lastTime: "3 hours ago",
    unread: 1,
    avatar: "🎓",
  },
  { 
    id: 4, 
    name: "Study Group Alpha", 
    type: "group",
    lastMessage: "Let's meet at 3pm",
    lastTime: "Yesterday",
    unread: 0,
    avatar: "👥",
  },
];

const messagesData = [
  {
    id: 1,
    sender: "Sarah Johnson",
    avatar: "SJ",
    text: "Hi! How are you progressing with the React Hooks assignment?",
    time: "10:30 AM",
    isMe: false,
  },
  {
    id: 2,
    sender: "You",
    avatar: "JD",
    text: "Going well! I'm almost done with the custom hooks part.",
    time: "10:32 AM",
    isMe: true,
  },
  {
    id: 3,
    sender: "Sarah Johnson",
    avatar: "SJ",
    text: "That's great! Remember to add proper error handling and tests.",
    time: "10:33 AM",
    isMe: false,
  },
  {
    id: 4,
    sender: "You",
    avatar: "JD",
    text: "Will do! Quick question - should the validation hook return an object or array?",
    time: "10:35 AM",
    isMe: true,
  },
  {
    id: 5,
    sender: "Sarah Johnson",
    avatar: "SJ",
    text: "An object would be more flexible. You can structure it like { errors, isValid, validate }",
    time: "10:36 AM",
    isMe: false,
  },
];

export default function MessagesPage() {
  const [selectedChat, setSelectedChat] = useState(chatRooms[1]);
  const [messageText, setMessageText] = useState("");
  
  return (
    <div className="space-y-6 h-full flex flex-col">
      <h1 className="text-4xl font-bold text-white shrink-0">Messages</h1>
      
      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0 pb-6">
        {/* Chat List Sidebar */}
        <div className="col-span-12 lg:col-span-4 h-[500px] lg:h-full">
          <GlowCard className="h-full flex flex-col p-0 overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-white/5 bg-[#0A0A0F]/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
                <Input
                  type="text"
                  placeholder="Search messages..."
                  className="pl-10 bg-[#12121A] border-white/10 text-white rounded-xl focus:ring-purple-500/50"
                />
              </div>
            </div>
            
            {/* Chat List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5">
              {chatRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedChat(room)}
                  className={`
                    w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-all border-b border-white/5
                    ${selectedChat.id === room.id ? "bg-white/10" : ""}
                  `}
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">{room.avatar}</span>
                    </div>
                    {room.unread > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-[10px] text-white border-2 border-[#0A0A0F]">
                        {room.unread}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-medium truncate">{room.name}</p>
                      <span className="text-[#6B6B80] text-xs">{room.lastTime}</span>
                    </div>
                    <p className="text-[#A0A0B5] text-sm truncate">{room.lastMessage}</p>
                  </div>
                </button>
              ))}
            </div>
          </GlowCard>
        </div>
        
        {/* Chat Window */}
        <div className="col-span-12 lg:col-span-8 h-[600px] lg:h-full">
          <GlowCard className="h-full flex flex-col p-0 overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#0A0A0F]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-semibold text-sm">{selectedChat.avatar}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{selectedChat.name}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <p className="text-[#6B6B80] text-xs">Active now</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1 sm:gap-2">
                <button className="p-2 hover:bg-white/5 rounded-lg transition-colors group">
                  <Phone className="w-5 h-5 text-[#A0A0B5] group-hover:text-purple-400" />
                </button>
                <button className="p-2 hover:bg-white/5 rounded-lg transition-colors group">
                  <Video className="w-5 h-5 text-[#A0A0B5] group-hover:text-purple-400" />
                </button>
                <button className="p-2 hover:bg-white/5 rounded-lg transition-colors group">
                  <MoreVertical className="w-5 h-5 text-[#A0A0B5] group-hover:text-purple-400" />
                </button>
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-white/[0.01]">
              {messagesData.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.isMe ? "flex-row-reverse" : ""}`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0 mt-1">
                    <span className="text-white font-semibold text-[10px]">{message.avatar}</span>
                  </div>
                  
                  <div className={`flex flex-col max-w-[80%] sm:max-w-[70%] ${message.isMe ? "items-end" : ""}`}>
                    {!message.isMe && (
                      <span className="text-[#A0A0B5] text-xs mb-1 ml-1">{message.sender}</span>
                    )}
                    <div
                      className={`
                        px-4 py-3 rounded-2xl text-sm sm:text-base shadow-lg
                        ${message.isMe 
                          ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-tr-none" 
                          : "bg-[#12121A] text-white rounded-tl-none border border-white/5"
                        }
                      `}
                    >
                      <p className="leading-relaxed">{message.text}</p>
                    </div>
                    <span className="text-[#6B6B80] text-[10px] mt-1.5 px-1">{message.time}</span>
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-semibold text-[10px]">SJ</span>
                </div>
                <div className="bg-[#12121A] px-4 py-3 rounded-2xl rounded-tl-none border border-white/5">
                  <div className="flex gap-1.5 items-center h-4">
                    <div className="w-1.5 h-1.5 bg-purple-500/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-1.5 h-1.5 bg-purple-500/70 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Message Input */}
            <div className="p-4 border-t border-white/5 bg-[#0A0A0F]/50">
              <div className="flex items-center gap-2 sm:gap-3">
                <button className="p-2 hover:bg-white/5 rounded-lg transition-colors shrink-0">
                  <Paperclip className="w-5 h-5 text-[#A0A0B5]" />
                </button>
                
                <Input
                  type="text"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 bg-[#12121A] border-white/10 text-white rounded-xl focus:ring-purple-500/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && messageText.trim()) {
                      setMessageText("");
                    }
                  }}
                />
                
                <GlowButton 
                  variant="primary"
                  disabled={!messageText.trim()}
                  onClick={() => setMessageText("")}
                  className="shrink-0 p-3 sm:px-4"
                >
                  <Send className="w-5 h-5" />
                  <span className="hidden sm:inline ml-2">Send</span>
                </GlowButton>
              </div>
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}