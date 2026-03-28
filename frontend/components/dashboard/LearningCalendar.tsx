// frontend/components/dashboard/LearningCalendar.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, 
  BookOpen, FileText, CheckCircle, AlertCircle, Plus, Edit2, 
  Trash2, X, Save, Video, Target, CalendarDays
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
  userId: string; // To associate events with users
}

// Local storage key for user events
const USER_EVENTS_KEY = "user_calendar_events";

// Enhanced mock data with demonstration events
const DEMO_EVENTS: CalendarEvent[] = [
  {
    id: "demo-1",
    title: "Advanced React Development",
    type: "course",
    status: "in-progress",
    date: new Date(2026, 2, 10),
    startDate: new Date(2026, 2, 1),
    endDate: new Date(2026, 3, 15),
    courseName: "Advanced React Development",
    priority: "medium",
    description: "Master React hooks, context, and advanced patterns",
    userId: "demo"
  },
  {
    id: "demo-2",
    title: "React Hooks Assignment",
    type: "assignment",
    status: "upcoming",
    date: new Date(2026, 2, 15),
    dueDate: new Date(2026, 2, 15),
    courseName: "Advanced React Development",
    priority: "high",
    description: "Implement custom hooks for form validation",
    userId: "demo"
  },
  {
    id: "demo-3",
    title: "Backend Development Course",
    type: "course",
    status: "in-progress",
    date: new Date(2026, 2, 5),
    startDate: new Date(2026, 2, 1),
    endDate: new Date(2026, 3, 10),
    courseName: "Backend Development",
    priority: "medium",
    description: "Build scalable backend services with Node.js",
    userId: "demo"
  },
  {
    id: "demo-4",
    title: "Database Design Project",
    type: "assignment",
    status: "upcoming",
    date: new Date(2026, 2, 20),
    dueDate: new Date(2026, 2, 20),
    courseName: "Backend Development",
    priority: "high",
    description: "Design a normalized database schema",
    userId: "demo"
  },
  {
    id: "demo-5",
    title: "UI/UX Design Fundamentals",
    type: "course",
    status: "completed",
    date: new Date(2026, 1, 28),
    startDate: new Date(2026, 0, 10),
    endDate: new Date(2026, 1, 28),
    courseName: "UI/UX Design Fundamentals",
    priority: "low",
    description: "Learn design principles and create stunning user interfaces",
    userId: "demo"
  },
  {
    id: "demo-6",
    title: "Final Exam: React",
    type: "exam",
    status: "upcoming",
    date: new Date(2026, 2, 25),
    dueDate: new Date(2026, 2, 25),
    courseName: "Advanced React Development",
    priority: "high",
    description: "Comprehensive exam covering all React concepts",
    userId: "demo"
  },
  {
    id: "demo-7",
    title: "Live Coding Session",
    type: "live_session",
    status: "upcoming",
    date: new Date(2026, 2, 18),
    startDate: new Date(2026, 2, 18, 15, 0),
    endDate: new Date(2026, 2, 18, 17, 0),
    courseName: "Advanced React Development",
    priority: "medium",
    description: "Live coding session with instructor",
    userId: "demo"
  },
  {
    id: "demo-8",
    title: "Peer Review Deadline",
    type: "deadline",
    status: "overdue",
    date: new Date(2026, 2, 5),
    dueDate: new Date(2026, 2, 5),
    courseName: "UI/UX Design Fundamentals",
    priority: "high",
    description: "Review 3 peer submissions",
    userId: "demo"
  }
];

const getEventColor = (type: string, status: string) => {
  if (status === "completed") return "bg-green-500";
  if (status === "overdue") return "bg-red-500";
  
  switch (type) {
    case "assignment":
      return "bg-yellow-500";
    case "exam":
      return "bg-red-500";
    case "live_session":
      return "bg-blue-500";
    case "deadline":
      return "bg-orange-500";
    case "course":
    default:
      return "bg-purple-500";
  }
};

const getEventIcon = (type: string) => {
  switch (type) {
    case "assignment":
      return FileText;
    case "exam":
      return AlertCircle;
    case "live_session":
      return Video;
    case "deadline":
      return Target;
    default:
      return BookOpen;
  }
};

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case "high":
      return "text-red-400 bg-red-500/10";
    case "medium":
      return "text-yellow-400 bg-yellow-500/10";
    case "low":
      return "text-green-400 bg-green-500/10";
    default:
      return "text-purple-400 bg-purple-500/10";
  }
};

const EVENT_TYPES = [
  { value: "course", label: "Course", color: "purple", icon: BookOpen },
  { value: "assignment", label: "Assignment", color: "yellow", icon: FileText },
  { value: "exam", label: "Exam", color: "red", icon: AlertCircle },
  { value: "live_session", label: "Live Session", color: "blue", icon: Video },
  { value: "deadline", label: "Deadline", color: "orange", icon: Target }
];

const PRIORITIES = [
  { value: "high", label: "High", color: "red" },
  { value: "medium", label: "Medium", color: "yellow" },
  { value: "low", label: "Low", color: "green" }
];

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

// Helper to load/save user events
const loadUserEvents = (userId: string): CalendarEvent[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(`${USER_EVENTS_KEY}_${userId}`);
  if (stored) {
    const events = JSON.parse(stored);
    // Convert date strings back to Date objects
    return events.map((event: any) => ({
      ...event,
      date: new Date(event.date),
      dueDate: event.dueDate ? new Date(event.dueDate) : undefined,
      startDate: event.startDate ? new Date(event.startDate) : undefined,
      endDate: event.endDate ? new Date(event.endDate) : undefined,
    }));
  }
  return DEMO_EVENTS; // Return demo events for new users
};

const saveUserEvents = (userId: string, events: CalendarEvent[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${USER_EVENTS_KEY}_${userId}`, JSON.stringify(events));
};

export function LearningCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"month" | "week">("month");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [userId, setUserId] = useState<string>("current-user");
  
  // New event form state
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: "",
    type: "course",
    status: "upcoming",
    priority: "medium",
    description: "",
    courseName: ""
  });

  // Load events on mount
  useEffect(() => {
    const loadEvents = async () => {
      // In a real app, you'd get userId from Supabase
      const currentUserId = localStorage.getItem("user_id") || "current-user";
      setUserId(currentUserId);
      const userEvents = loadUserEvents(currentUserId);
      setEvents(userEvents);
    };
    loadEvents();
  }, []);

  // Save events when they change
  useEffect(() => {
    if (events.length > 0) {
      saveUserEvents(userId, events);
    }
  }, [events, userId]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  
  const eventsByDate = events.reduce((acc, event) => {
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
  
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  // Add new event
  const handleAddEvent = () => {
    if (!selectedDate) {
      toast.error("Please select a date first");
      return;
    }
    
    if (!newEvent.title || !newEvent.type || !newEvent.courseName) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    const event: CalendarEvent = {
      id: Date.now().toString(),
      title: newEvent.title!,
      type: newEvent.type as any,
      status: "upcoming",
      date: selectedDate,
      courseName: newEvent.courseName!,
      priority: newEvent.priority as any,
      description: newEvent.description,
      userId
    };
    
    // Add due date for assignments
    if (event.type === "assignment" && newEvent.dueDate) {
      event.dueDate = newEvent.dueDate;
    }
    
    setEvents([...events, event]);
    setIsAddingEvent(false);
    setNewEvent({
      title: "",
      type: "course",
      status: "upcoming",
      priority: "medium",
      description: "",
      courseName: ""
    });
    toast.success("Event added to calendar!");
  };
  
  // Edit event
  const handleEditEvent = () => {
    if (!editingEvent) return;
    
    setEvents(events.map(event => 
      event.id === editingEvent.id ? editingEvent : event
    ));
    setEditingEvent(null);
    toast.success("Event updated!");
  };
  
  // Delete event
  const handleDeleteEvent = (eventId: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      setEvents(events.filter(event => event.id !== eventId));
      toast.success("Event deleted!");
    }
  };
  
  // Toggle event status
  const toggleEventStatus = (event: CalendarEvent) => {
    const newStatus = event.status === "completed" ? "upcoming" : "completed";
    setEvents(events.map(e => 
      e.id === event.id ? { ...e, status: newStatus } : e
    ));
    toast.success(`Marked as ${newStatus === "completed" ? "completed" : "in progress"}!`);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  // Calculate upcoming deadlines
  const upcomingDeadlines = events
    .filter(event => {
      const today = new Date();
      const eventDate = new Date(event.date);
      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return (event.type === "assignment" || event.type === "exam" || event.type === "deadline") 
        && event.status !== "completed" 
        && diffDays >= 0 
        && diffDays <= 7;
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header with View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Academic Calendar</h3>
          <div className="flex gap-1 bg-[#12121A] rounded-lg p-1">
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                view === "month" 
                  ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white" 
                  : "text-[#A0A0B5] hover:text-white"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                view === "week" 
                  ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white" 
                  : "text-[#A0A0B5] hover:text-white"
              }`}
            >
              Week
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            Today
          </button>
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
      
      {/* Calendar Grid */}
      <div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs text-[#6B6B80] py-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
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
            const hasHighPriority = events.some(e => e.priority === "high" && e.status !== "completed");
            
            return (
              <button
                key={day}
                onClick={() => setSelectedDate(new Date(year, month, day))}
                className={`
                  aspect-square p-1 rounded-lg transition-all relative group
                  ${isSelected
                    ? "bg-purple-500/20 ring-2 ring-purple-500"
                    : isToday
                    ? "bg-white/5 ring-1 ring-white/10"
                    : "hover:bg-white/5"
                  }
                `}
              >
                <div className="relative h-full flex flex-col items-center justify-center">
                  <span className={`text-sm ${
                    isSelected ? "text-purple-400 font-medium" : 
                    isToday ? "text-white font-medium" : "text-white"
                  }`}>
                    {day}
                  </span>
                  
                  {/* Event indicators */}
                  {hasEvents && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {events.slice(0, 3).map((event, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${getEventColor(event.type, event.status)}`}
                          title={`${event.title} (${event.type})`}
                        />
                      ))}
                      {events.length > 3 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#6B6B80]" />
                      )}
                    </div>
                  )}
                  
                  {/* Priority badge for high priority events */}
                  {hasHighPriority && !hasEvents && (
                    <div className="absolute bottom-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-2 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-xs text-[#A0A0B5]">Course</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-xs text-[#A0A0B5]">Assignment</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-xs text-[#A0A0B5]">Exam / Overdue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-[#A0A0B5]">Live Session</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-[#A0A0B5]">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-xs text-[#A0A0B5]">Deadline</span>
        </div>
      </div>
      
      {/* Selected Date Events with Add/Edit/Delete */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 pt-4 border-t border-white/5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-[#A0A0B5]">
                  Events on <span className="text-white font-medium">{selectedDate.toLocaleDateString(undefined, { 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <GlowButton 
                  variant="primary" 
                  size="sm"
                  onClick={() => setIsAddingEvent(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Event
                </GlowButton>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-[#6B6B80] hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
            
            {/* Add Event Form */}
            {isAddingEvent && (
              <div className="mb-4 p-4 bg-[#12121A] rounded-xl border border-purple-500/20">
                <h4 className="text-white font-medium mb-3">Add New Event</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-[#A0A0B5] mb-1 block">Event Title *</Label>
                    <Input
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="e.g., React Hooks Assignment"
                      className="bg-[#0B0B0F] border-white/10 text-white"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-[#A0A0B5] mb-1 block">Event Type *</Label>
                      <select
                        value={newEvent.type}
                        onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                        className="w-full bg-[#0B0B0F] border border-white/10 text-white rounded-lg px-3 py-2"
                      >
                        {EVENT_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <Label className="text-sm text-[#A0A0B5] mb-1 block">Priority</Label>
                      <select
                        value={newEvent.priority}
                        onChange={(e) => setNewEvent({ ...newEvent, priority: e.target.value as any })}
                        className="w-full bg-[#0B0B0F] border border-white/10 text-white rounded-lg px-3 py-2"
                      >
                        {PRIORITIES.map(priority => (
                          <option key={priority.value} value={priority.value}>{priority.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-[#A0A0B5] mb-1 block">Course Name *</Label>
                    <Input
                      value={newEvent.courseName}
                      onChange={(e) => setNewEvent({ ...newEvent, courseName: e.target.value })}
                      placeholder="e.g., Advanced React Development"
                      className="bg-[#0B0B0F] border-white/10 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm text-[#A0A0B5] mb-1 block">Description (Optional)</Label>
                    <textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      placeholder="Add details about this event..."
                      rows={2}
                      className="w-full bg-[#0B0B0F] border border-white/10 text-white rounded-lg px-3 py-2 resize-none"
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <GlowButton variant="primary" size="sm" onClick={handleAddEvent}>
                      <Save className="w-4 h-4 mr-1" />
                      Add Event
                    </GlowButton>
                    <GlowButton 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setIsAddingEvent(false);
                        setNewEvent({
                          title: "",
                          type: "course",
                          status: "upcoming",
                          priority: "medium",
                          description: "",
                          courseName: ""
                        });
                      }}
                    >
                      Cancel
                    </GlowButton>
                  </div>
                </div>
              </div>
            )}
            
            {/* Edit Event Form */}
            {editingEvent && (
              <div className="mb-4 p-4 bg-[#12121A] rounded-xl border border-purple-500/20">
                <h4 className="text-white font-medium mb-3">Edit Event</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-[#A0A0B5] mb-1 block">Event Title *</Label>
                    <Input
                      value={editingEvent.title}
                      onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                      className="bg-[#0B0B0F] border-white/10 text-white"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-[#A0A0B5] mb-1 block">Event Type</Label>
                      <select
                        value={editingEvent.type}
                        onChange={(e) => setEditingEvent({ ...editingEvent, type: e.target.value as any })}
                        className="w-full bg-[#0B0B0F] border border-white/10 text-white rounded-lg px-3 py-2"
                      >
                        {EVENT_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <Label className="text-sm text-[#A0A0B5] mb-1 block">Priority</Label>
                      <select
                        value={editingEvent.priority}
                        onChange={(e) => setEditingEvent({ ...editingEvent, priority: e.target.value as any })}
                        className="w-full bg-[#0B0B0F] border border-white/10 text-white rounded-lg px-3 py-2"
                      >
                        {PRIORITIES.map(priority => (
                          <option key={priority.value} value={priority.value}>{priority.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-[#A0A0B5] mb-1 block">Course Name</Label>
                    <Input
                      value={editingEvent.courseName}
                      onChange={(e) => setEditingEvent({ ...editingEvent, courseName: e.target.value })}
                      className="bg-[#0B0B0F] border-white/10 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm text-[#A0A0B5] mb-1 block">Description</Label>
                    <textarea
                      value={editingEvent.description || ""}
                      onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                      rows={2}
                      className="w-full bg-[#0B0B0F] border border-white/10 text-white rounded-lg px-3 py-2 resize-none"
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <GlowButton variant="primary" size="sm" onClick={handleEditEvent}>
                      <Save className="w-4 h-4 mr-1" />
                      Save Changes
                    </GlowButton>
                    <GlowButton variant="ghost" size="sm" onClick={() => setEditingEvent(null)}>
                      Cancel
                    </GlowButton>
                  </div>
                </div>
              </div>
            )}
            
            {/* Events List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {getEventsForDate(selectedDate.getDate()).map((event) => {
                const Icon = getEventIcon(event.type);
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 bg-[#12121A] rounded-xl hover:bg-[#1A1A24] transition-all group"
                  >
                    <div className={`p-2 rounded-lg ${getEventColor(event.type, event.status).replace("bg-", "bg-")}/20`}>
                      <Icon className={`w-4 h-4 ${getEventColor(event.type, event.status).replace("bg-", "text-")}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-white font-medium text-sm group-hover:text-purple-400 transition-colors">
                          {event.title}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getPriorityColor(event.priority)}`}>
                          {event.priority || "Normal"} priority
                        </span>
                        {event.status === "completed" && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400">
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            Completed
                          </span>
                        )}
                        {event.status === "overdue" && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400">
                            <AlertCircle className="w-3 h-3 inline mr-1" />
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6B6B80] truncate">{event.courseName}</p>
                      {event.description && (
                        <p className="text-xs text-[#A0A0B5] mt-1 line-clamp-2">{event.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-[#6B6B80]">
                        {event.type === "assignment" && event.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Due: {event.dueDate.toLocaleDateString()}
                          </span>
                        )}
                        {event.type === "live_session" && event.startDate && event.endDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {event.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                            {event.endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleEventStatus(event)}
                        className="p-1.5 hover:bg-green-500/20 rounded-lg transition-colors"
                        title={event.status === "completed" ? "Mark as incomplete" : "Mark as complete"}
                      >
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      </button>
                      <button
                        onClick={() => setEditingEvent(event)}
                        className="p-1.5 hover:bg-purple-500/20 rounded-lg transition-colors"
                        title="Edit event"
                      >
                        <Edit2 className="w-4 h-4 text-purple-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Delete event"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {getEventsForDate(selectedDate.getDate()).length === 0 && !isAddingEvent && (
                <div className="text-center py-8">
                  <CalendarDays className="w-12 h-12 text-[#6B6B80] mx-auto mb-3" />
                  <p className="text-[#A0A0B5] text-sm">No events scheduled</p>
                  <GlowButton 
                    variant="primary" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setIsAddingEvent(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Event
                  </GlowButton>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Upcoming Deadlines Section */}
      {upcomingDeadlines.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-sm font-medium text-white">Upcoming Deadlines</p>
          </div>
          <div className="space-y-2">
            {upcomingDeadlines.map((deadline) => {
              const today = new Date();
              const deadlineDate = new Date(deadline.date);
              const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <div key={deadline.id} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                  <div>
                    <p className="text-white text-sm font-medium">{deadline.title}</p>
                    <p className="text-xs text-[#A0A0B5]">{deadline.courseName}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-medium ${
                      diffDays === 0 ? "text-red-400" : 
                      diffDays === 1 ? "text-orange-400" : "text-yellow-400"
                    }`}>
                      {diffDays === 0 ? "Due today!" : 
                       diffDays === 1 ? "Due tomorrow" : 
                       `Due in ${diffDays} days`}
                    </p>
                    <p className="text-[10px] text-[#6B6B80]">{deadlineDate.toLocaleDateString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}