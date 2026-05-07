// components/dashboard/UpcomingItems.tsx
import Link from "next/link";
import { Calendar, Clock, ChevronRight, Video, FileText, Target } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";

interface UpcomingItem {
  id: string | number;
  title: string;
  type: "course" | "assignment" | "exam" | "live_session";
  courseName: string;
  date: Date;
  dueDate?: Date;
}

interface UpcomingItemsProps {
  items: UpcomingItem[];
}

export function UpcomingItems({ items }: UpcomingItemsProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "course":
        return <Video className="w-4 h-4 text-purple-400" />;
      case "assignment":
        return <FileText className="w-4 h-4 text-yellow-400" />;
      case "exam":
        return <Target className="w-4 h-4 text-red-400" />;
      case "live_session":
        return <Video className="w-4 h-4 text-green-400" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "course":
        return "bg-purple-500/20 text-purple-400";
      case "assignment":
        return "bg-yellow-500/20 text-yellow-400";
      case "exam":
        return "bg-red-500/20 text-red-400";
      case "live_session":
        return "bg-green-500/20 text-green-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const formatDate = (date: Date) => {
    if (!date || isNaN(date.getTime())) return "Date TBD";
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString();
  };

  const getUniqueKey = (item: UpcomingItem, index: number) => {
    return `${item.type}-${item.id}-${index}`;
  };

  return (
    <GlowCard>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Upcoming Deadlines</h3>
          </div>
          <Link href="/dashboard/calendar">
            <button className="text-sm text-gray-400 hover:text-white transition-colors">
              View calendar
            </button>
          </Link>
        </div>
        
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No upcoming deadlines</p>
          ) : (
            items.map((item, index) => {
              const displayDate = item.dueDate || item.date;
              return (
                <div
                  key={getUniqueKey(item, index)}
                  className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getTypeColor(item.type)}`}>
                      {getTypeIcon(item.type)}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium line-clamp-1">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500">{item.courseName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-orange-400 whitespace-nowrap">
                      {formatDate(displayDate)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </GlowCard>
  );
}