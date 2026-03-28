// frontend/components/dashboard/RecentItems.tsx
"use client";

import Link from "next/link";
import { BookOpen, CheckCircle, Clock } from "lucide-react";

interface RecentItem {
  id: string;
  title: string;
  type: "course" | "assignment";
  courseName: string;
  progress?: number;
  lastAccessed: Date;
  status?: "completed" | "in-progress" | "pending";
}

const mockRecent: RecentItem[] = [
  {
    id: "1",
    title: "Advanced React Development",
    type: "course",
    courseName: "Advanced React Development",
    progress: 65,
    lastAccessed: new Date(2024, 2, 12),
    status: "in-progress",
  },
  {
    id: "2",
    title: "Backend Development",
    type: "course",
    courseName: "Backend Development",
    progress: 45,
    lastAccessed: new Date(2024, 2, 10),
    status: "in-progress",
  },
  {
    id: "3",
    title: "React Hooks Assignment",
    type: "assignment",
    courseName: "Advanced React Development",
    lastAccessed: new Date(2024, 2, 9),
    status: "pending",
  },
];

export function RecentItems() {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
      
      <div className="space-y-2">
        {mockRecent.map((item) => (
          <Link
            key={item.id}
            href={item.type === "assignment" ? `/assignments/${item.id}` : `/courses/${item.id}`}
          >
            <div className="p-3 bg-[#12121A] rounded-xl hover:bg-white/5 transition-colors group cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-purple-500/20">
                  {item.type === "assignment" ? (
                    <Clock className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-purple-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate group-hover:text-purple-400 transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[#6B6B80] text-xs truncate">{item.courseName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.status === "completed" && (
                      <span className="text-[10px] text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Completed
                      </span>
                    )}
                    {item.status === "in-progress" && item.progress && (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-[#1A1A24] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-purple-400">{item.progress}%</span>
                      </div>
                    )}
                    {item.status === "pending" && (
                      <span className="text-[10px] text-yellow-400">Not started</span>
                    )}
                    <span className="text-[10px] text-[#6B6B80]">
                      {item.lastAccessed.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      <Link href="/courses">
        <button className="w-full text-center text-xs text-purple-400 hover:text-purple-300 transition-colors mt-2">
          Browse More Courses →
        </button>
      </Link>
    </div>
  );
}