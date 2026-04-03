// frontend/components/dashboard/UpcomingItems.tsx
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

const getTypeIcon = (type: string) => {
  switch (type) {
    case "assignment":
      return FileText;
    case "exam":
      return Target;
    case "live_session":
      return Video;
    default:
      return Calendar;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "assignment":
      return "text-blue-400 bg-blue-500/10";
    case "exam":
      return "text-purple-400 bg-purple-500/10";
    case "live_session":
      return "text-orange-400 bg-orange-500/10";
    default:
      return "text-emerald-400 bg-emerald-500/10";
  }
};

export function UpcomingItems({ items }: UpcomingItemsProps) {
  const sortedItems = [...items].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <GlowCard>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-semibold text-white">Upcoming Deadlines</h3>
            <p className="text-xs text-gray-400 mt-1">Stay on track with your goals</p>
          </div>
          <Link href="/assignments">
            <ChevronRight className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
          </Link>
        </div>

        <div className="space-y-3">
          {sortedItems.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No upcoming deadlines</p>
              <p className="text-xs text-gray-500 mt-1">Enjoy your free time! 🎉</p>
            </div>
          ) : (
            sortedItems.map((item) => {
              const Icon = getTypeIcon(item.type);
              const colorClass = getTypeColor(item.type);
              const isUrgent = (item.date.getTime() - new Date().getTime()) / (1000 * 3600 * 24) < 2;
              
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-400">{item.courseName}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>
                        {item.date.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {isUrgent && (
                      <span className="text-xs text-red-400 font-medium">Urgent</span>
                    )}
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