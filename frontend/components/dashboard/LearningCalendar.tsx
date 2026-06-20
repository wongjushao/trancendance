// frontend/components/dashboard/LearningCalendar.tsx

"use client";
import { useState, useEffect } from "react";
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, 
  BookOpen, FileText, CheckCircle, AlertCircle, Video, Target, CalendarDays
} from "lucide-react";
import { motion } from "framer-motion";
import { GlowButton } from "@/components/lms/GlowButton";

// Define event types
interface CalendarEvent {
  id: string;
  title: string;
  type: "course" | "assignment" | "exam" | "deadline" | "live_session";
  status: "upcoming" | "in-progress" | "completed" | "overdue";
  date: Date;
  courseName: string;
  dueDate?: Date;
  startDate?: Date;
  endDate?: Date;
  priority?: "high" | "medium" | "low";
  description?: string;
  userId: string;
}

// Enhanced mock data with demonstration events
const DEMO_EVENTS: CalendarEvent[] = [
  {
    id: "1",
    title: "Complete React Fundamentals",
    type: "assignment",
    status: "upcoming",
    date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 2),
    courseName: "Advanced React Development",
    priority: "high",
    userId: "demo"
  },
  {
    id: "2",
    title: "Team Project Meeting",
    type: "live_session",
    status: "upcoming",
    date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 5),
    courseName: "Project Management",
    priority: "medium",
    userId: "demo"
  },
  {
    id: "3",
    title: "Final Exam",
    type: "exam",
    status: "upcoming",
    date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 10),
    courseName: "Data Structures",
    priority: "high",
    userId: "demo"
  },
  {
    id: "4",
    title: "Submit Assignment: API Integration",
    type: "assignment",
    status: "upcoming",
    date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1),
    courseName: "Backend Development",
    priority: "high",
    userId: "demo"
  },
  {
    id: "5",
    title: "Code Review Session",
    type: "live_session",
    status: "upcoming",
    date: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 3),
    courseName: "Software Engineering",
    priority: "medium",
    userId: "demo"
  }
];

const getEventColor = (type: string, status: string) => {
  if (status === "completed") return "bg-green-500/20 border-green-500/30 text-green-400";
  if (status === "overdue") return "bg-red-500/20 border-red-500/30 text-red-400";
  
  switch (type) {
    case "assignment":
      return "bg-blue-500/20 border-blue-500/30 text-blue-400";
    case "exam":
      return "bg-purple-500/20 border-purple-500/30 text-purple-400";
    case "live_session":
      return "bg-orange-500/20 border-orange-500/30 text-orange-400";
    case "deadline":
      return "bg-red-500/20 border-red-500/30 text-red-400";
    default:
      return "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
  }
};

const getEventIcon = (type: string) => {
  switch (type) {
    case "assignment":
      return FileText;
    case "exam":
      return Target;
    case "live_session":
      return Video;
    case "deadline":
      return AlertCircle;
    default:
      return BookOpen;
  }
};

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case "high":
      return "text-red-400";
    case "medium":
      return "text-yellow-400";
    case "low":
      return "text-green-400";
    default:
      return "text-gray-400";
  }
};

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

// Helper to load/save user events
const loadUserEvents = (userId: string): CalendarEvent[] => {
  if (typeof window === "undefined") return DEMO_EVENTS;
  
  const stored = localStorage.getItem(`calendar_events_${userId}`);
  if (stored) {
    const parsed = JSON.parse(stored);
    return parsed.map((event: any) => ({
      ...event,
      date: new Date(event.date),
      dueDate: event.dueDate ? new Date(event.dueDate) : undefined,
      startDate: event.startDate ? new Date(event.startDate) : undefined,
      endDate: event.endDate ? new Date(event.endDate) : undefined,
    }));
  }
  return DEMO_EVENTS;
};

export function LearningCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [userId, setUserId] = useState<string>("demo");

  // Load events on mount
  useEffect(() => {
    const loadEvents = async () => {
      // In a real app, you'd get userId from Supabase
      const userEvents = loadUserEvents(userId);
      setEvents(userEvents);
    };
    loadEvents();
  }, [userId]);

  const getEventsForDate = (day: number) => {
    if (!selectedDate) return [];
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const targetDate = new Date(year, month, day);
    
    // Compare dates by date string to ignore time component
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === targetDate.toDateString();
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleDateSelect = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    setSelectedDate(new Date(year, month, day));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const selectedDateEvents = selectedDate 
    ? events.filter(event => event.date.toDateString() === selectedDate.toDateString())
    : [];

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  };

  const isSelected = (day: number) => {
    return selectedDate && 
           day === selectedDate.getDate() && 
           month === selectedDate.getMonth() && 
           year === selectedDate.getFullYear();
  };

  const hasEventsOnDay = (day: number) => {
    const date = new Date(year, month, day);
    return events.some(event => event.date.toDateString() === date.toDateString());
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header with View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Learning Calendar</h3>
        </div>
        <div className="flex items-center gap-2">
          <GlowButton
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="px-3 py-1 text-sm"
          >
            Today
          </GlowButton>
          <div className="flex items-center gap-1">
            <GlowButton
              variant="ghost"
              size="sm"
              onClick={previousMonth}
              className="p-1"
            >
              <ChevronLeft className="w-4 h-4" />
            </GlowButton>
            <span className="text-sm font-medium text-white min-w-[120px] text-center">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <GlowButton
              variant="ghost"
              size="sm"
              onClick={nextMonth}
              className="p-1"
            >
              <ChevronRight className="w-4 h-4" />
            </GlowButton>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px bg-gray-800">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="bg-gray-900/50 p-2 text-center">
              <span className="text-xs font-medium text-gray-400">{day}</span>
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-px bg-gray-800">
          {days.map((day, index) => (
            <div
              key={index}
              onClick={() => day !== null && handleDateSelect(day)}
              className={`
                min-h-[80px] bg-gray-900/30 p-2 transition-all cursor-pointer
                ${day !== null ? 'hover:bg-gray-800/50' : ''}
                ${isSelected(day!) && day !== null ? 'ring-2 ring-purple-500/50 bg-purple-500/10' : ''}
              `}
            >
              {day !== null && (
                <>
                  <div className="flex justify-between items-start">
                    <span className={`
                      text-sm font-medium inline-flex items-center justify-center w-6 h-6 rounded-full
                      ${isToday(day) ? 'bg-purple-600 text-white' : 'text-gray-300'}
                      ${isSelected(day) && !isToday(day) ? 'bg-purple-500/30 text-purple-400' : ''}
                    `}>
                      {day}
                    </span>
                    {hasEventsOnDay(day) && (
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                    )}
                  </div>
                  
                  {/* Event indicators - show up to 2 events */}
                  <div className="mt-1 space-y-0.5">
                    {getEventsForDate(day).slice(0, 2).map((event, idx) => {
                      const Icon = getEventIcon(event.type);
                      return (
                        <div key={idx} className="flex items-center gap-1 text-[10px]">
                          <Icon className="w-2.5 h-2.5" />
                          <span className="truncate text-gray-400">{event.title}</span>
                        </div>
                      );
                    })}
                    {getEventsForDate(day).length > 2 && (
                      <div className="text-[10px] text-gray-500">
                        +{getEventsForDate(day).length - 2} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/30"></div>
          <span className="text-gray-400">Assignment</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/30"></div>
          <span className="text-gray-400">Exam</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500/30"></div>
          <span className="text-gray-400">Live Session</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30"></div>
          <span className="text-gray-400">Course</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30"></div>
          <span className="text-gray-400">Deadline</span>
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <div className="bg-gray-900/50 rounded-lg border border-gray-800">
          <div className="p-4 border-b border-gray-800">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-purple-400" />
              Events for {selectedDate.toLocaleDateString('default', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h4>
          </div>
          <div className="p-4">
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No events scheduled for this day</p>
                <p className="text-sm text-gray-500 mt-1">Enjoy your free time! 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => {
                  const Icon = getEventIcon(event.type);
                  const colorClass = getEventColor(event.type, event.status);
                  const priorityColor = getPriorityColor(event.priority);
                  
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg border ${colorClass}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <Icon className="w-5 h-5 mt-0.5" />
                          <div className="flex-1">
                            <h5 className="font-medium text-white mb-1">{event.title}</h5>
                            <p className="text-sm text-gray-300">{event.courseName}</p>
                            {event.description && (
                              <p className="text-xs text-gray-400 mt-1">{event.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {event.priority && (
                            <span className={`text-xs font-medium ${priorityColor}`}>
                              {event.priority.charAt(0).toUpperCase() + event.priority.slice(1)} Priority
                            </span>
                          )}
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>
                              {event.type === "assignment" && "Due "}
                              {event.type === "exam" && "Exam at "}
                              {event.type === "live_session" && "Starts at "}
                              {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}