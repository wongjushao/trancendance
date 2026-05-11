// frontend/app/(main)/courses/[id]/offerings/[offeringId]/schedules/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  Clock,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

// Helper to get auth token
const getAuthToken = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

interface Schedule {
  id: number;
  course_class_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface OfferingData {
  id: number;
  name: string;
  course_id: number;
  course?: {
    id: number;
    title: string;
  };
}

export default function ManageSchedulesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);
  const offeringId = parseInt(params.offeringId as string);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offering, setOffering] = useState<OfferingData | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  // Get auth token on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = await getAuthToken();
      setAccessToken(token);
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (accessToken) {
      loadData();
    }
  }, [offeringId, accessToken]);
  
  const loadData = async () => {
    if (!accessToken) return;
    
    try {
      setLoading(true);
      
      // Get offering details via backend API
      const offeringResponse = await fetch(`/api/org-service/course-classes/${offeringId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!offeringResponse.ok) {
        throw new Error('Failed to fetch offering');
      }
      
      const offeringData = await offeringResponse.json();
      
      // Get course title
      const courseResponse = await fetch(`/api/org-service/courses/${offeringData.course_id}/detail`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      let courseTitle = "";
      if (courseResponse.ok) {
        const courseData = await courseResponse.json();
        courseTitle = courseData.course?.title || "";
      }
      
      setOffering({
        id: offeringData.id,
        name: offeringData.name,
        course_id: offeringData.course_id,
        course: {
          id: offeringData.course_id,
          title: courseTitle,
        }
      });
      
      // Get schedules from the offering data (already included in the response)
      setSchedules(offeringData.schedules || []);
      
    } catch (error) {
      console.error("Error loading schedules:", error);
      toast.error("Failed to load schedule data");
    } finally {
      setLoading(false);
    }
  };
  
  const addSchedule = () => {
    setSchedules([
      ...schedules,
      {
        id: 0,
        course_class_id: offeringId,
        day_of_week: 1,
        start_time: "09:00",
        end_time: "11:00",
      },
    ]);
  };
  
  const updateSchedule = (index: number, updates: Partial<Schedule>) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], ...updates };
    setSchedules(updated);
  };
  
  const removeSchedule = (index: number) => {
    if (schedules.length === 1 && schedules[index].id === 0) {
      toast.error("You need at least one schedule");
      return;
    }
    const updated = schedules.filter((_, i) => i !== index);
    setSchedules(updated);
  };
  
  const saveSchedule = async (schedule: Schedule, index: number) => {
    if (!accessToken) {
      toast.error("Please log in");
      return;
    }
    
    if (schedule.id === 0) {
      // Create new schedule
      try {
        const response = await fetch(`/api/org-service/course-classes/${offeringId}/schedules`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to add schedule');
        }
        
        const data = await response.json();
        
        const updated = [...schedules];
        updated[index] = data;
        setSchedules(updated);
        toast.success("Schedule added");
      } catch (error: any) {
        console.error("Error adding schedule:", error);
        toast.error(error.message || "Failed to add schedule");
      }
    } else {
      // Update existing schedule
      try {
        const response = await fetch(`/api/org-service/class-schedules/${schedule.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update schedule');
        }
        
        toast.success("Schedule updated");
      } catch (error: any) {
        console.error("Error updating schedule:", error);
        toast.error(error.message || "Failed to update schedule");
      }
    }
  };
  
  const deleteSchedule = async (schedule: Schedule, index: number) => {
    if (!confirm("Are you sure you want to delete this schedule?")) {
      return;
    }
    
    if (!accessToken) {
      toast.error("Please log in");
      return;
    }
    
    try {
      if (schedule.id !== 0) {
        const response = await fetch(`/api/org-service/class-schedules/${schedule.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete schedule');
        }
      }
      
      const updated = schedules.filter((_, i) => i !== index);
      setSchedules(updated);
      toast.success("Schedule deleted");
    } catch (error: any) {
      console.error("Error deleting schedule:", error);
      toast.error(error.message || "Failed to delete schedule");
    }
  };
  
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Validate all schedules
      for (const schedule of schedules) {
        if (schedule.start_time >= schedule.end_time) {
          toast.error("Start time must be before end time for all schedules");
          setSaving(false);
          return;
        }
      }
      
      // Save all unsaved schedules
      for (let i = 0; i < schedules.length; i++) {
        if (schedules[i].id === 0) {
          await saveSchedule(schedules[i], i);
        }
      }
      
      toast.success("All schedules saved");
      router.push(`/courses/${courseId}/edit?tab=offerings`);
      
    } catch (error) {
      console.error("Error saving schedules:", error);
      toast.error("Failed to save schedules");
    } finally {
      setSaving(false);
    }
  };
  
  const getDayName = (day: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day];
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
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
              <h1 className="text-3xl font-bold text-white">Manage Schedules</h1>
              <p className="text-gray-400 mt-1">
                {offering?.name} • {offering?.course?.title}
              </p>
            </div>
          </div>
        </div>
        
        <GlowCard>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Class Schedule</h2>
                <p className="text-sm text-gray-400">Set the days and times for this offering</p>
              </div>
              <GlowButton size="sm" variant="secondary" onClick={addSchedule}>
                <Plus className="w-4 h-4 mr-2" />
                Add Schedule
              </GlowButton>
            </div>
            
            <div className="space-y-4">
              {schedules.map((schedule, index) => (
                <div key={index} className="bg-slate-800/30 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-gray-300">Schedule {index + 1}</h3>
                    <GlowButton
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteSchedule(schedule, index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </GlowButton>
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
                  
                  {schedule.id === 0 && (
                    <div className="mt-3 text-xs text-yellow-400">
                      * New schedule - will be saved when you click "Save All"
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {schedules.length === 0 && (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                <p className="text-gray-400">No schedules set for this offering</p>
                <GlowButton variant="secondary" className="mt-4" onClick={addSchedule}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Schedule
                </GlowButton>
              </div>
            )}
            
            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-400 mb-1">Schedule Information</h4>
                  <p className="text-sm text-gray-300">
                    Schedules help students know when live sessions occur. You can add multiple schedules
                    for different days (e.g., Monday and Wednesday classes).
                  </p>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-700 mt-6">
              <Link href={`/courses/${courseId}/edit?tab=offerings`}>
                <GlowButton variant="ghost">
                  Cancel
                </GlowButton>
              </Link>
              <GlowButton
                variant="primary"
                onClick={handleSaveAll}
                isLoading={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                Save All Schedules
              </GlowButton>
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}