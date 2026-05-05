// frontend/app/(main)/courses/[id]/enroll/page.tsx (SIMPLIFIED - No approval)
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, Calendar, Clock, Users, CheckCircle, AlertCircle, Loader2, MessageSquare, Shield } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { enrollInCourse, isEnrolled } from "@/lib/supabase/enrollment";
import { getCourseWithDetails } from "@/lib/supabase/courses";

export default function EnrollPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);
  
  const [course, setCourse] = useState<any>(null);
  const [selectedOffering, setSelectedOffering] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userOrganization, setUserOrganization] = useState<any>(null);
  const [existingEnrollment, setExistingEnrollment] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          router.push("/login");
          return;
        }
        setUser(currentUser);
        
        // Get user's organization membership
        const { data: membership } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", currentUser.id)
          .single();
        
        if (membership) {
          const { data: org } = await supabase
            .from("organizations")
            .select("id, name")
            .eq("id", membership.organization_id)
            .single();
          setUserOrganization(org);
        }
        
        // Get course data
        const courseData = await getCourseWithDetails(courseId);
        setCourse(courseData);
        
        // Check if already enrolled
        if (courseData?.course_classes) {
          for (const offering of courseData.course_classes) {
            const enrollment = await isEnrolled(offering.id, currentUser.id);
            if (enrollment) {
              setExistingEnrollment(enrollment);
              setSelectedOffering(offering.id);
              break;
            }
          }
        }
      } catch (error) {
        console.error("Error loading course:", error);
        toast.error("Failed to load course");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [courseId, router]);

  const handleEnroll = async () => {
    if (!selectedOffering) {
      toast.error("Please select a course offering");
      return;
    }
    
    if (!user) {
      toast.error("Please login to enroll");
      router.push("/login");
      return;
    }
    
    // Check if user belongs to the course's organization
    if (course?.organization_id !== userOrganization?.id) {
      toast.error("You must be a member of the organization to enroll in this course");
      return;
    }
    
    setSubmitting(true);
    try {
      await enrollInCourse(selectedOffering, user.id);
      toast.success("Successfully enrolled in the course!");
      router.push(`/courses/${courseId}/learn`);
    } catch (error: any) {
      toast.error(error.message || "Failed to enroll in course");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <GlowCard>
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Course Not Found</h2>
              <GlowButton onClick={() => router.push("/courses")}>Back to Courses</GlowButton>
            </div>
          </GlowCard>
        </div>
      </div>
    );
  }

  // Check organization access
  if (userOrganization?.id !== course.organization_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <GlowCard>
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Organization Access Required</h2>
              <p className="text-gray-400 mb-6">
                This course is only available to members of {course.organization?.name || "the organization"}.
                You need to join this organization before enrolling.
              </p>
              <GlowButton onClick={() => router.push("/organizations")}>
                View Organizations
              </GlowButton>
            </div>
          </GlowCard>
        </div>
      </div>
    );
  }

  if (existingEnrollment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <GlowCard>
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Already Enrolled</h2>
              <p className="text-gray-400 mb-6">
                You are already enrolled in this course. Continue with your learning!
              </p>
              <GlowButton onClick={() => router.push(`/courses/${courseId}/learn`)}>
                Continue Learning
              </GlowButton>
            </div>
          </GlowCard>
        </div>
      </div>
    );
  }

  // Check if any offerings are available
  const availableOfferings = course.course_classes?.filter((offering: any) => {
    const isFull = offering.max_students && offering.members?.length >= offering.max_students;
    return offering.status === "upcoming" || offering.status === "ongoing";
  });

  if (!availableOfferings || availableOfferings.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <GlowCard>
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">No Active Offerings</h2>
              <p className="text-gray-400 mb-6">
                There are no active offerings for this course at the moment.
                Please check back later.
              </p>
              <GlowButton onClick={() => router.push("/courses")}>
                Browse Other Courses
              </GlowButton>
            </div>
          </GlowCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Organization Banner */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400">
            <Building2 className="w-4 h-4" />
            <span className="text-sm">Course provided by: {course.organization?.name}</span>
          </div>
          <Badge variant="outline" className="text-green-400 border-green-400">
            Open Enrollment
          </Badge>
        </div>
        
        {/* Course Header */}
        <GlowCard className="mb-6">
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white mb-2">{course.title}</h1>
            <p className="text-gray-400">{course.description}</p>
            
            <div className="flex flex-wrap gap-4 mt-4">
              <Badge className="bg-purple-500/20 text-purple-300">
                {course.level?.toUpperCase()}
              </Badge>
              <Badge variant="outline">{course.category}</Badge>
              {course.tags?.map((tag: string) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </div>
        </GlowCard>
        
        {/* Offerings Selection */}
        <GlowCard>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Select a Course Offering</h2>
            
            <div className="space-y-4">
              {availableOfferings.map((offering: any) => {
                const isFull = offering.max_students && offering.members?.length >= offering.max_students;
                const isSelected = selectedOffering === offering.id;
                const enrolledCount = offering.members?.filter((m: any) => m.role === "student").length || 0;
                
                return (
                  <div
                    key={offering.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-slate-700 hover:border-slate-600"
                    } ${isFull ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => !isFull && setSelectedOffering(offering.id)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-white">{offering.name}</h3>
                        <p className="text-sm text-gray-400">{offering.description}</p>
                      </div>
                      {isSelected && <CheckCircle className="w-5 h-5 text-purple-500" />}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {offering.start_date ? new Date(offering.start_date).toLocaleDateString() : "TBD"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>{offering.schedules?.length || 0} sessions/week</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{enrolledCount} / {offering.max_students || "∞"} students</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <MessageSquare className="w-4 h-4" />
                        <span>Course chat available</span>
                      </div>
                    </div>
                    
                    {offering.schedules && offering.schedules.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <div className="text-sm text-gray-400">Schedule:</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {offering.schedules.map((schedule: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][schedule.day_of_week]} {schedule.start_time}-{schedule.end_time}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {isFull && (
                      <div className="mt-3 text-sm text-red-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        This offering is full
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-700">
              <GlowButton variant="ghost" onClick={() => router.back()}>
                Cancel
              </GlowButton>
              <GlowButton
                variant="primary"
                onClick={handleEnroll}
                isLoading={submitting}
                disabled={!selectedOffering}
              >
                Enroll Now
              </GlowButton>
            </div>
          </div>
        </GlowCard>
        
        <div className="mt-4 text-center text-sm text-green-400">
          ✓ You'll get immediate access to the course upon enrollment
        </div>
      </div>
    </div>
  );
}