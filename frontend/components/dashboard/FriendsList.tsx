// frontend/components/dashboard/FriendsList.tsx
"use client";

import { useState } from "react";
import { UserPlus, MoreHorizontal, MessageCircle, UserMinus } from "lucide-react";

interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "offline" | "away";
  lastActive?: string;
  courseCount?: number;
}

const mockFriends: Friend[] = [
  {
    id: "1",
    name: "Alice Johnson",
    avatar: "AJ",
    status: "online",
    courseCount: 8,
  },
  {
    id: "2",
    name: "Bob Smith",
    avatar: "BS",
    status: "offline",
    lastActive: "2 hours ago",
    courseCount: 5,
  },
  {
    id: "3",
    name: "Carol White",
    avatar: "CW",
    status: "online",
    courseCount: 12,
  },
  {
    id: "4",
    name: "David Brown",
    avatar: "DB",
    status: "away",
    lastActive: "1 hour ago",
    courseCount: 3,
  },
];

const statusColors = {
  online: "bg-green-500",
  offline: "bg-gray-500",
  away: "bg-yellow-500",
};

export function FriendsList() {
  const [showAddFriend, setShowAddFriend] = useState(false);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Friends</h3>
        <button
          onClick={() => setShowAddFriend(!showAddFriend)}
          className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4 text-[#A0A0B5]" />
        </button>
      </div>
      
      {showAddFriend && (
        <div className="p-3 bg-[#12121A] rounded-xl border border-white/5">
          <input
            type="text"
            placeholder="Enter email or username..."
            className="w-full px-3 py-2 bg-[#1A1A24] border border-white/10 rounded-lg text-white text-sm placeholder:text-[#6B6B80] outline-none focus:border-purple-500/50"
          />
          <p className="text-[10px] text-[#6B6B80] mt-2">
            Search by email or username to connect
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        {mockFriends.map((friend) => (
          <div
            key={friend.id}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">{friend.avatar}</span>
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-[#0B0B0F] ${statusColors[friend.status]}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{friend.name}</p>
              <p className="text-[10px] text-[#6B6B80]">
                {friend.status === "online" 
                  ? "Online" 
                  : friend.status === "away" 
                  ? "Away" 
                  : friend.lastActive}
              </p>
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1.5 hover:bg-purple-500/20 rounded-lg transition-colors">
                <MessageCircle className="w-4 h-4 text-purple-400" />
              </button>
              <button className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                <MoreHorizontal className="w-4 h-4 text-[#6B6B80]" />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {mockFriends.length === 0 && (
        <div className="text-center py-6">
          <UserPlus className="w-8 h-8 text-[#6B6B80] mx-auto mb-2" />
          <p className="text-sm text-[#A0A0B5]">No friends yet</p>
          <p className="text-xs text-[#6B6B80]">Add friends to see them here</p>
        </div>
      )}
    </div>
  );
}