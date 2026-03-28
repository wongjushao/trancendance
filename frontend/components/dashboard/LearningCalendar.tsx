// frontend/components/dashboard/LearningCalendar.tsx
"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, BookOpen } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  type: "course" | "assignment";
  date: Date;
  courseName: string;
  dueDate?: Date;
}

const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Advanced React Development",
    type: "course",
    date: new Date(2024, 2, 10),
    courseName: "Advanced React Development",
  },
  {
    id: "2",
    title: "React Hooks Assignment",
    type: "assignment",
    date: new Date(2024, 2, 15),
    courseName: "Advanced React Development",
    dueDate: new Date(2024, 2, 15),
  },
  {
    id: "3",
    title: "Backend Development Course",
    type: "course",
    date: new Date(2024, 2, 5),
    courseName: "Backend Development",
  },
  {
    id: "4",
    title: "Database Design Project",
    type: "assignment",
    date: new Date(2024, 2, 20),
    courseName: "Backend Development",
    dueDate: new Date(2024, 2, 20),
  },
];

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

export function LearningCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  
  const eventsByDate = mockEvents.reduce((acc, event) => {
    const dateKey = event.date.toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);
  
  const getEventsForDate = (day: number) => {
    const date = new Date(year, month, day);
    return eventsByDate[date.toDateString()] || [];
  };
  
  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Calendar</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={previousMonth}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[#A0A0B5]" />
          </button>
          <span className="text-sm text-white font-medium">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-[#A0A0B5]" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-xs text-[#6B6B80] py-1">
            {day}
          </div>
        ))}
        
        {blanks.map((_, i) => (
          <div key={`blank-${i}`} className="aspect-square p-1" />
        ))}
        
        {days.map((day) => {
          const events = getEventsForDate(day);
          const hasEvents = events.length > 0;
          const isSelected = selectedDate && 
            selectedDate.getDate() === day && 
            selectedDate.getMonth() === month;
          const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
          
          return (
            <button
              key={day}
              onClick={() => setSelectedDate(new Date(year, month, day))}
              className={`aspect-square p-1 rounded-lg transition-all ${
                isSelected
                  ? "bg-purple-500/20 ring-1 ring-purple-500"
                  : isToday
                  ? "bg-white/5 ring-1 ring-white/10"
                  : "hover:bg-white/5"
              }`}
            >
              <div className="relative h-full flex flex-col items-center justify-center">
                <span className={`text-sm ${
                  isSelected ? "text-purple-400 font-medium" : "text-white"
                }`}>
                  {day}
                </span>
                {hasEvents && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {events.slice(0, 2).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full ${
                          events[i].type === "assignment"
                            ? "bg-yellow-500"
                            : "bg-purple-500"
                        }`}
                      />
                    ))}
                    {events.length > 2 && (
                      <div className="w-1 h-1 rounded-full bg-[#6B6B80]" />
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      {selectedDate && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-sm text-[#A0A0B5] mb-3">
            Events on {selectedDate.toLocaleDateString()}
          </p>
          <div className="space-y-2">
            {getEventsForDate(selectedDate.getDate()).map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-2 bg-[#12121A] rounded-lg"
              >
                <div className={`p-1.5 rounded-lg ${
                  event.type === "assignment"
                    ? "bg-yellow-500/20"
                    : "bg-purple-500/20"
                }`}>
                  {event.type === "assignment" ? (
                    <Clock className="w-3 h-3 text-yellow-400" />
                  ) : (
                    <BookOpen className="w-3 h-3 text-purple-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{event.title}</p>
                  <p className="text-xs text-[#6B6B80] truncate">{event.courseName}</p>
                </div>
                {event.type === "assignment" && event.dueDate && (
                  <span className="text-[10px] text-yellow-400">
                    Due
                  </span>
                )}
              </div>
            ))}
            {getEventsForDate(selectedDate.getDate()).length === 0 && (
              <p className="text-sm text-[#6B6B80] text-center py-2">
                No events scheduled
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}