// frontend/components/chat/ChatBubble.tsx
'use client';

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

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);

  // Mock conversations data
  const conversations: Conversation[] = [
    {
      id: "1",
      name: "John Doe",
      avatar: "JD",
      lastMessage: "Hey, how's the course going?",
      time: "2 min ago",
      unread: 2,
    },
    {
      id: "2",
      name: "Jane Smith",
      avatar: "JS",
      lastMessage: "Don't forget about the assignment due tomorrow",
      time: "1 hour ago",
      unread: 0,
    },
    {
      id: "3",
      name: "Course Assistant",
      avatar: "CA",
      lastMessage: "New announcement posted",
      time: "3 hours ago",
      unread: 1,
    },
  ];

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating Button - Only change is the positioning classes */}
      <button
        onClick={toggleChat}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-purple-600 p-3 text-white shadow-lg hover:bg-purple-700 transition-all"
        aria-label="Open chat"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-40 h-[500px] w-80 rounded-lg bg-gray-900 shadow-xl flex flex-col overflow-hidden border border-gray-700">
          {/* Header */}
          <div className="bg-purple-600 p-3 flex justify-between items-center">
            <h3 className="text-white font-semibold">Messages</h3>
            <button onClick={toggleChat} className="text-white hover:text-gray-200">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                className="pl-8 bg-gray-800 border-gray-700 text-white"
                onChange={(e) => console.log(e.target.value)}
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                className="w-full p-3 text-left hover:bg-gray-800 transition-colors border-b border-gray-700 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
                  {conv.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-white">{conv.name}</span>
                    <span className="text-xs text-gray-400">{conv.time}</span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-xs text-white">
                    {conv.unread}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* New Message Button */}
          <div className="p-3 border-t border-gray-700">
            <button className="w-full bg-purple-600 text-white rounded-lg py-2 hover:bg-purple-700 transition-colors">
              New Message
            </button>
          </div>
        </div>
      )}
    </>
  );
}