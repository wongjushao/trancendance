// components/dashboard/RecentItems.tsx
import Link from "next/link";
import { BookOpen, CheckCircle, Clock, PlayCircle, Award, FileText } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";

interface RecentItem {
  id: string;
  type: "course" | "assignment" | "lesson" | "quiz" | "certificate";
  title: string;
  courseName: string;
  progress?: number;
  lastAccessed?: Date | string;
  status?: "completed" | "in-progress" | "pending";
  completed_at?: string | Date;
}

interface RecentItemsProps {
  items: RecentItem[];
}

export function RecentItems({ items }: RecentItemsProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "course":
        return <BookOpen className="w-4 h-4 text-purple-400" />;
      case "assignment":
        return <FileText className="w-4 h-4 text-yellow-400" />;
      case "lesson":
        return <PlayCircle className="w-4 h-4 text-blue-400" />;
      case "quiz":
        return <Award className="w-4 h-4 text-green-400" />;
      case "certificate":
        return <Award className="w-4 h-4 text-orange-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-3 h-3 text-green-400" />;
      case "in-progress":
        return <PlayCircle className="w-3 h-3 text-blue-400" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "in-progress":
        return "text-blue-400";
      default:
        return "text-gray-400";
    }
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return "Recently";
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return "Recently";
      
      const now = new Date();
      const diffMs = now.getTime() - dateObj.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      return dateObj.toLocaleDateString();
    } catch {
      return "Recently";
    }
  };

  // Generate unique keys using multiple identifiers
  const getUniqueKey = (item: RecentItem, index: number) => {
    return `${item.type}-${item.id}-${item.title}-${index}`;
  };

  return (
    <GlowCard>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          </div>
          <Link href="/dashboard/activity">
            <button className="text-sm text-gray-400 hover:text-white transition-colors">
              View all
            </button>
          </Link>
        </div>
        
        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No recent activity</p>
          ) : (
            items.map((item, index) => {
              const displayDate = item.completed_at || item.lastAccessed;
              return (
                <div
                  key={getUniqueKey(item, index)}
                  className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">
                      <span className="font-medium">{item.title}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-500 truncate">{item.courseName}</p>
                      {item.status && (
                        <div className="flex items-center gap-1">
                          {getStatusIcon(item.status)}
                          <span className={`text-xs ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                      )}
                      {displayDate && (
                        <span className="text-xs text-gray-500">
                          • {formatDate(displayDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.progress !== undefined && (
                    <div className="text-right">
                      <span className="text-sm font-medium text-purple-400">
                        {item.progress}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </GlowCard>
  );
}