// frontend/app/(main)/courses/[id]/offerings/[offeringId]/edit/page.tsx
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
  Loader2,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

// Helper to get auth token
const getAuthToken = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

interface OfferingFormData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  max_students: number;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
}

interface OfferingData {
  id: number;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  max_students: number | null;
  status: string;
  instructor_id: string | null;
  course_id: number;
}

export default function EditOfferingPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);
  const offeringId = parseInt(params.offeringId as string);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [offering, setOffering] = useState<OfferingData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<OfferingFormData>({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    max_students: 0,
    status: "upcoming",
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
    if (accessToken) {
      loadData();
    }
  }, [courseId, offeringId, router, accessToken]);
  
  const loadData = async () => {
    if (!accessToken) return;
    
    try {
      setLoading(true);
      
      // Get course details via backend API
      const courseResponse = await fetch(`/api/org-service/courses/${courseId}/detail`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (courseResponse.ok) {
        const courseData = await courseResponse.json();
        setCourseTitle(courseData.course?.title || "");
      }
      
      // Get offering details via backend API
      const offeringResponse = await fetch(`/api/org-service/course-classes/${offeringId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!offeringResponse.ok) {
        if (offeringResponse.status === 404) {
          toast.error("Offering not found");
          router.push(`/courses/${courseId}/edit?tab=offerings`);
          return;
        }
        throw new Error('Failed to fetch offering');
      }
      
      const offeringData = await offeringResponse.json();
      setOffering(offeringData);
      
      setFormData({
        name: offeringData.name || "",
        description: offeringData.description || "",
        start_date: offeringData.start_date || "",
        end_date: offeringData.end_date || "",
        max_students: offeringData.max_students || 0,
        status: offeringData.status || "upcoming",
      });
      
    } catch (error) {
      console.error("Error loading offering:", error);
      toast.error("Failed to load offering data");
    } finally {
      setLoading(false);
    }
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
    
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!accessToken) {
      toast.error("Please log in");
      return;
    }
    
    setSaving(true);
    
    try {
      const response = await fetch(`/api/org-service/course-classes/${offeringId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          max_students: formData.max_students || null,
          status: formData.status,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update offering');
      }
      
      toast.success("Offering updated successfully!");
      router.push(`/courses/${courseId}/edit?tab=offerings`);
      
    } catch (error: any) {
      console.error("Error updating offering:", error);
      toast.error(error.message || "Failed to update offering");
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this offering? This will also remove all student enrollments and schedules.")) {
      return;
    }
    
    if (!accessToken) {
      toast.error("Please log in");
      return;
    }
    
    setSaving(true);
    
    try {
      const response = await fetch(`/api/org-service/course-classes/${offeringId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete offering');
      }
      
      toast.success("Offering deleted successfully!");
      router.push(`/courses/${courseId}/edit?tab=offerings`);
      
    } catch (error: any) {
      console.error("Error deleting offering:", error);
      toast.error(error.message || "Failed to delete offering");
      setSaving(false);
    }
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
              <h1 className="text-3xl font-bold text-white">Edit Offering</h1>
              <p className="text-gray-400 mt-1">
                Course: {courseTitle} • {offering?.name}
              </p>
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
                    placeholder="e.g., Spring 2025 Cohort, September Session"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe this specific offering..."
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
            
            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-400 mb-1">Note</h4>
                  <p className="text-sm text-gray-300">
                    To manage schedules for this offering, click the "Manage Schedules" button below.
                    Student enrollments can be managed from the Students tab.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-between gap-3 pt-4 border-t border-slate-700">
              <GlowButton
                variant="ghost"
                className="text-red-400 hover:text-red-300"
                onClick={handleDelete}
                isLoading={saving}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Offering
              </GlowButton>
              <div className="flex gap-3">
                <Link href={`/courses/${courseId}/offerings/${offeringId}/schedules`}>
                  <GlowButton variant="secondary">
                    <Clock className="w-4 h-4 mr-2" />
                    Manage Schedules
                  </GlowButton>
                </Link>
                <Link href={`/courses/${courseId}/edit?tab=offerings`}>
                  <GlowButton variant="ghost">
                    Cancel
                  </GlowButton>
                </Link>
                <GlowButton
                  variant="primary"
                  onClick={handleSubmit}
                  isLoading={saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </GlowButton>
              </div>
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}