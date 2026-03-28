// frontend/components/dashboard/UpcomingItems.tsx
"use client";

import Link from "next/link";
import { Calendar, Clock, ChevronRight } from "lucide-react";

interface UpcomingItem {
  id: string;
  title: string;
  type: "course" | "assignment";
  courseName: string;
  date: Date;
  dueDate?: Date;
}

const mockUpcoming: UpcomingItem[] = [
  {
    id: "1",
    title: "React Hooks Assignment",
    type: "assignment",
    courseName: "Advanced React Development",
    date: new Date(2024, 2, 15),
    dueDate: new Date(2024, 2, 15),
  },
  {
    id: "2",
    title: "Advanced React Development",
    type: "course",
    courseName: "Advanced React Development",
    date: new Date(2024, 2, 18),
  },
  {
    id: "3",
    title: "Database Design Project",
    type: "assignment",
    courseName: "Backend Development",
    date: new Date(2024, 2, 20),
    dueDate: new Date(2024, 2, 20),
  },
  {
    id: "4",
    title: "Backend Development Course",
    type: "course",
    courseName: "Backend Development",
    date: new Date(2024, 2, 22),
  },
];

export function UpcomingItems() {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white">Upcoming</h3>
      
      <div className="space-y-2">
        {mockUpcoming.map((item) => (
          <Link
            key={item.id}
            href={item.type === "assignment" ? `/assignments/${item.id}` : `/courses/${item.id}`}
          >
            <div className="p-3 bg-[#12121A] rounded-xl hover:bg-white/5 transition-colors group cursor-pointer">
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-lg ${
                  item.type === "assignment"
                    ? "bg-yellow-500/20"
                    : "bg-purple-500/20"
                }`}>
                  {item.type === "assignment" ? (
                    <Clock className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <Calendar className="w-4 h-4 text-purple-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate group-hover:text-purple-400 transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[#6B6B80] text-xs truncate">{item.courseName}</p>
                  <p className="text-[10px] text-[#6B6B80] mt-1">
                    {item.type === "assignment" ? "Due " : "Starts "}
                    {item.date.toLocaleDateString()}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#6B6B80] group-hover:text-purple-400 transition-colors shrink-0" />
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      <Link href="/assignments">
        <button className="w-full text-center text-xs text-purple-400 hover:text-purple-300 transition-colors mt-2">
          View All →
        </button>
      </Link>
    </div>
  );
}