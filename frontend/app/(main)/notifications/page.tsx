"use client";

import { 
  Bell, 
  CheckCircle, 
  MessageSquare, 
  FileText, 
  Users, 
  Settings 
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";

const notifications = [
  {
    id: 1,
    type: "assignment",
    icon: FileText,
    title: "New Assignment Posted",
    message: "React Hooks Implementation assignment has been posted in Advanced React Development",
    time: "5 minutes ago",
    read: false,
    color: "purple",
  },
  {
    id: 2,
    type: "grade",
    icon: CheckCircle,
    title: "Assignment Graded",
    message: "Your Database Design Project has been graded: 165/180",
    time: "2 hours ago",
    read: false,
    color: "green",
  },
  {
    id: 3,
    type: "message",
    icon: MessageSquare,
    title: "New Message",
    message: "Sarah Johnson sent you a message about your submission",
    time: "5 hours ago",
    read: true,
    color: "blue",
  },
  {
    id: 4,
    type: "course",
    icon: Bell,
    title: "Course Update",
    message: "New lesson available in Backend Development: API Authentication",
    time: "1 day ago",
    read: true,
    color: "purple",
  },
  {
    id: 5,
    type: "invite",
    icon: Users,
    title: "Organization Invite",
    message: "You've been invited to join Design Academy organization",
    time: "2 days ago",
    read: true,
    color: "yellow",
  },
  {
    id: 6,
    type: "system",
    icon: Settings,
    title: "System Update",
    message: "New features have been added to the platform",
    time: "3 days ago",
    read: true,
    color: "gray",
  },
];

export default function NotificationsPage() {
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const getColorClasses = (color: string) => {
    switch (color) {
      case "purple":
        return "bg-purple-500/20 text-purple-400";
      case "green":
        return "bg-green-500/20 text-green-400";
      case "blue":
        return "bg-blue-500/20 text-blue-400";
      case "yellow":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };
  
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Notifications</h1>
          <p className="text-[#A0A0B5]">
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notifications` 
              : "You're all caught up!"}
          </p>
        </div>
        <div className="flex gap-3">
          <GlowButton variant="outline" className="text-xs sm:text-sm">
            Mark All as Read
          </GlowButton>
          <GlowButton variant="secondary" className="px-3">
            <Settings className="w-5 h-5" />
          </GlowButton>
        </div>
      </div>
      
      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((notification) => {
          const Icon = notification.icon;
          
          return (
            <GlowCard 
              key={notification.id} 
              className={`
                hover:scale-[1.005] active:scale-100 transition-all cursor-pointer
                ${!notification.read ? "border-l-4 border-l-purple-500 bg-white/[0.02]" : "opacity-80 hover:opacity-100"}
              `}
            >
              <div className="flex items-start gap-4">
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                  ${getColorClasses(notification.color)}
                  shadow-lg shadow-black/20
                `}>
                  <Icon className="w-6 h-6" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <span className="truncate">{notification.title}</span>
                      {!notification.read && (
                        <span className="shrink-0 w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"></span>
                      )}
                    </h3>
                    <span className="text-[#6B6B80] text-xs whitespace-nowrap">
                      {notification.time}
                    </span>
                  </div>
                  <p className="text-[#A0A0B5] text-sm sm:text-base leading-relaxed mb-4">
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center gap-4">
                    {!notification.read && (
                      <button className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors">
                        Mark as Read
                      </button>
                    )}
                    <button className="text-sm font-medium text-[#6B6B80] hover:text-white transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </GlowCard>
          );
        })}
      </div>
      
      {/* Empty State */}
      {notifications.length === 0 && (
        <GlowCard className="text-center py-20 bg-white/[0.01]">
          <div className="relative inline-block mb-6">
            <Bell className="w-16 h-16 text-[#6B6B80]/40 mx-auto" />
            <div className="absolute inset-0 blur-2xl bg-purple-500/10 rounded-full"></div>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No notifications</h3>
          <p className="text-[#A0A0B5]">We'll let you know when something important happens.</p>
        </GlowCard>
      )}
    </div>
  );
}