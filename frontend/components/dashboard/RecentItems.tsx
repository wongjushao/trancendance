// frontend/components/dashboard/RecentItems.tsx
import Link from "next/link";
import { BookOpen, CheckCircle, Clock, PlayCircle } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";

interface RecentItem {
  id: string | number;
  title: string;
  type: "course" | "assignment";
  courseName: string;
  progress?: number;
  lastAccessed: Date;
  status?: "completed" | "in-progress" | "pending";
}

interface RecentItemsProps {
  items: RecentItem[];
}

const getStatusIcon = (status?: string) => {
  switch (status) {
    case "completed":
      return CheckCircle;
    case "in-progress":
      return PlayCircle;
    default:
      return Clock;
  }
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case "completed":
      return "text-green-400";
    case "in-progress":
      return "text-blue-400";
    default:
      return "text-yellow-400";
  }
};

export function RecentItems({ items }: RecentItemsProps) {
  return (
    <GlowCard>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-semibold text-white">Recently Accessed</h3>
            <p className="text-xs text-gray-400 mt-1">Pick up where you left off</p>
          </div>
          <Link href="/dashboard">
            <Clock className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
          </Link>
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-6">
              <BookOpen className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No recent activity</p>
              <p className="text-xs text-gray-500 mt-1">Start learning today! 🚀</p>
            </div>
          ) : (
            items.map((item) => {
              const StatusIcon = getStatusIcon(item.status);
              const statusColor = getStatusColor(item.status);
              
              return (
                <Link key={item.id} href={`/${item.type}s/${item.id}`}>
                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-white truncate">
                          {item.title}
                        </p>
                        <StatusIcon className={`w-3 h-3 ${statusColor} flex-shrink-0`} />
                      </div>
                      <p className="text-xs text-gray-400">{item.courseName}</p>
                      {item.progress !== undefined && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{item.progress}% complete</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-500 flex-shrink-0">
                      {item.lastAccessed.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </GlowCard>
  );
}