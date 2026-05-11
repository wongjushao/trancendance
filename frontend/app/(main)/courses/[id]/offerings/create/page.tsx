"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  X,
  Building2,
  User,
  CheckCircle,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

// Helper to get auth token
const getAuthToken = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

interface ScheduleForm {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface OfferingFormData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  max_students: number;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  schedules: ScheduleForm[];
}

export default function CreateOfferingPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<OfferingFormData>({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    max_students: 0,
    status: "upcoming",
    schedules: [
      { day_of_week: 1, start_time: "09:00", end_time: "11:00" }
    ],
  });
  
  // Get auth token on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = await getAuthToken();
      setAccessToken(token);
    };
    initAuth();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!accessToken) return;
      
      try {
        // Get current user info
        const userResponse = await fetch('/api/auth-service/auth/me', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setCurrentUserId(userData.id);
        }
        
        // Get course details
        const courseResponse = await fetch(`/api/org-service/courses/${courseId}/detail`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (courseResponse.ok) {
          const courseData = await courseResponse.json();
          setCourseTitle(courseData.course?.title || `Course #${courseId}`);
        } else {
          setCourseTitle(`Course #${courseId}`);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load course data");
      }
    };
    
    if (accessToken) {
      loadData();
    }
  }, [courseId, accessToken]);
  
  const addSchedule = () => {
    setFormData({
      ...formData,
      schedules: [
        ...formData.schedules,
        { day_of_week: 1, start_time: "09:00", end_time: "11:00" }
      ]
    });
  };
  
  const updateSchedule = (index: number, updates: Partial<ScheduleForm>) => {
    const updatedSchedules = [...formData.schedules];
    updatedSchedules[index] = { ...updatedSchedules[index], ...updates };
    setFormData({ ...formData, schedules: updatedSchedules });
  };
  
  const removeSchedule = (index: number) => {
    if (formData.schedules.length === 1) {
      toast.error("You need at least one schedule");
      return;
    }
    const updatedSchedules = formData.schedules.filter((_, i) => i !== index);
    setFormData({ ...formData, schedules: updatedSchedules });
  };
  
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error("Please enter an offering name");
      return false;
    }
    
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        toast.error("Start date cannot be after end date");
        return false;
      }
    }
    
    for (const schedule of formData.schedules) {
      if (schedule.start_time >= schedule.end_time) {
        toast.error("Start time must be before end time");
        return false;
      }
    }
    
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    if (!accessToken) {
      toast.error("Please log in to create an offering");
      router.push("/login");
      return;
    }
    
    if (!currentUserId) {
      toast.error("Unable to identify current user. Please refresh and try again.");
      return;
    }
    
    setLoading(true);
    
    try {
      // Step 1: Create the course offering via backend API
      const offeringResponse = await fetch('/api/org-service/course-classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          course_id: courseId,
          name: formData.name,
          description: formData.description || null,
          instructor_id: currentUserId,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          max_students: formData.max_students || null,
          status: formData.status,
        }),
      });
      
      if (!offeringResponse.ok) {
        const error = await offeringResponse.json();
        throw new Error(error.error || 'Failed to create offering');
      }
      
      const offering = await offeringResponse.json();
      
      // Step 2: Add all schedules via backend API
      for (const schedule of formData.schedules) {
        const scheduleResponse = await fetch(`/api/org-service/course-classes/${offering.id}/schedules`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
          }),
        });
        
        if (!scheduleResponse.ok) {
          const error = await scheduleResponse.json();
          console.error('Error adding schedule:', error);
          toast.warning("Offering created but some schedules failed to save");
        }
      }
      
      toast.success("Course offering created successfully!");
      router.push(`/courses/${courseId}/edit?tab=offerings`);
      
    } catch (error: any) {
      console.error("Error creating offering:", error);
      toast.error(error.message || "Failed to create offering");
    } finally {
      setLoading(false);
    }
  };
  
  const getDayName = (day: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day];
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href={`/courses/${courseId}/edit?tab=offerings`}>
              <GlowButton variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Course
              </GlowButton>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Create Course Offering</h1>
              <p className="text-gray-400 mt-1">For: {courseTitle || `Course #${courseId}`}</p>
            </div>
          </div>
        </div>
        
        <GlowCard>
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Offering Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Spring 2025 Cohort, September Session, Weekend Class"
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This helps students identify which session they're enrolling in
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe this specific offering - special focus, schedule notes, prerequisites..."
                    rows={3}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
            
            {/* Date Range */}
            <div className="border-t border-slate-700 pt-6">
              <h2 className="text-lg font-semibold text-white mb-4">Date Range</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
            
            {/* Capacity & Status */}
            <div className="border-t border-slate-700 pt-6">
              <h2 className="text-lg font-semibold text-white mb-4">Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_students">Maximum Students</Label>
                  <Input
                    id="max_students"
                    type="number"
                    min="0"
                    value={formData.max_students || ""}
                    onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || 0 })}
                    placeholder="Unlimited if 0"
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Set to 0 for unlimited enrollment</p>
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming - Not yet started</SelectItem>
                      <SelectItem value="ongoing">Ongoing - Currently active</SelectItem>
                      <SelectItem value="completed">Completed - Finished</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Schedule */}
            <div className="border-t border-slate-700 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Class Schedule</h2>
                <GlowButton size="sm" variant="secondary" onClick={addSchedule}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Schedule
                </GlowButton>
              </div>
              
              <div className="space-y-3">
                {formData.schedules.map((schedule, index) => (
                  <div key={index} className="bg-slate-800/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-medium text-gray-300">Schedule {index + 1}</h3>
                      {formData.schedules.length > 1 && (
                        <GlowButton
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSchedule(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </GlowButton>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Day of Week</Label>
                        <Select
                          value={schedule.day_of_week.toString()}
                          onValueChange={(value) => updateSchedule(index, { day_of_week: parseInt(value) })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 1, 2, 3, 4, 5, 6].map(day => (
                              <SelectItem key={day} value={day.toString()}>
                                {getDayName(day)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Start Time</Label>
                        <Input
                          type="time"
                          value={schedule.start_time}
                          onChange={(e) => updateSchedule(index, { start_time: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs">End Time</Label>
                        <Input
                          type="time"
                          value={schedule.end_time}
                          onChange={(e) => updateSchedule(index, { end_time: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-400 mb-1">About Course Offerings</h4>
                  <p className="text-sm text-gray-300">
                    A course can have multiple offerings (sessions/cohorts). Each offering has its own 
                    instructor, schedule, student enrollment, and progress tracking. This allows you to 
                    reuse the same curriculum for different semesters or class times.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
              <Link href={`/courses/${courseId}/edit?tab=offerings`}>
                <GlowButton variant="ghost">
                  Cancel
                </GlowButton>
              </Link>
              <GlowButton
                variant="primary"
                onClick={handleSubmit}
                isLoading={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                Create Offering
              </GlowButton>
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}