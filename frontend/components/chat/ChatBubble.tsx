// frontend/components/chat/ChatBubble.tsx
"use client";

import { useState } from "react";
import { MessageCircle, X, Send, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
}

const mockConversations: Conversation[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    avatar: "SJ",
    lastMessage: "Great question about hooks!",
    time: "2 min ago",
    unread: 2,
  },
  {
    id: "2",
    name: "Advanced React - Discussion",
    avatar: "≡ƒôÜ",
    lastMessage: "New lesson available",
    time: "1 hour ago",
    unread: 0,
  },
  {
    id: "3",
    name: "Tech University",
    avatar: "≡ƒÅó",
    lastMessage: "Welcome to the community!",
    time: "3 hours ago",
    unread: 1,
  },
];

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = mockConversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle function - clicking the icon both opens and closes
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating Button - Now toggles open/close */}
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30 hover:scale-105 transition-all duration-300 flex items-center justify-center group"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
          3
        </span>
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-96 bg-[#16161F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-violet-600/10">
            <h3 className="text-white font-semibold">Messages</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#A0A0B5]" />
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#12121A] border-white/10 text-white rounded-xl h-9 text-sm"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left"
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">{conv.avatar}</span>
                  </div>
                  {conv.unread > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-[8px] text-white">{conv.unread}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-white text-sm font-medium truncate">{conv.name}</p>
                    <span className="text-[10px] text-[#6B6B80]">{conv.time}</span>
                  </div>
                  <p className="text-xs text-[#A0A0B5] truncate">{conv.lastMessage}</p>
                </div>
              </button>
            ))}
          </div>

          {/* New Message Button */}
          <div className="p-3 border-t border-white/5">
            <button className="w-full py-2 text-sm text-purple-400 hover:text-purple-300 transition-colors">
              + New Message
            </button>
          </div>
        </div>
      )}
    </>
  );
}