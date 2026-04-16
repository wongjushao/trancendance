// frontend/components/chat/ChatBubble.tsx
import { useState } from "react";
import { useRouter } from "next/navigation"; // Add this import
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

// Mock conversations data
const mockConversations: Conversation[] = [
  {
    id: "1",
    name: "Alice Johnson",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    lastMessage: "Hey, have you submitted the assignment?",
    time: "2m ago",
    unread: 2,
  },
  // ... other conversations
];

export function ChatBubble() {
  const router = useRouter(); // Add this
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const toggleChat = () => setIsOpen(!isOpen);

  const handleConversationClick = (conversationId: string) => {
    // Navigate to messages page instead of opening modal
    router.push(`/messages?conversation=${conversationId}`);
    setIsOpen(false); // Close the bubble
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 p-4 bg-purple-600 rounded-full shadow-lg hover:bg-purple-700 transition-all duration-200"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-gray-900 rounded-lg shadow-xl border border-gray-700">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold">Messages</h3>
            <button
              onClick={() => router.push("/messages")}
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              View All
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="max-h-96 overflow-y-auto">
            {mockConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleConversationClick(conv.id)}
                className="flex items-center gap-3 p-3 hover:bg-gray-800 cursor-pointer transition-colors"
              >
                <div className="relative">
                  <img
                    src={conv.avatar}
                    alt={conv.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {conv.unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 rounded-full text-xs text-white flex items-center justify-center">
                      {conv.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="text-white font-medium truncate">{conv.name}</p>
                    <span className="text-xs text-gray-400">{conv.time}</span>
                  </div>
                  <p className="text-gray-400 text-sm truncate">{conv.lastMessage}</p>
                </div>
              </div>
            ))}
          </div>

          {/* New Message Button */}
          <div className="p-3 border-t border-gray-700">
            <button
              onClick={() => router.push("/messages")}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-white text-sm transition-colors"
            >
              New Message
            </button>
          </div>
        </div>
      )}
    </>
  );
}