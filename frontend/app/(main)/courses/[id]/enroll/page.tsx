// frontend/app/(main)/courses/[id]/enroll/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter }from "next/navigation";
import { Building2, Calendar, Clock, Users, CheckCircle, AlertCircle, Loader2, MessageSquare, Shield, LogIn } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { enrollInCourse, isEnrolled } from "@/lib/supabase/enrollment";
import { getCourseWithDetails } from "@/lib/supabase/courses";
import { isUserInOrganization, sendJoinOrganizationRequest } from '@/lib/supabase/organization';

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
  const [joinRequestPending, setJoinRequestPending] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(false);

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
        
        // Get user's organization membership (non-pending only)
        const { data: membership } = await supabase
          .from("organization_members")
          .select("organization_id, member_role")
          .eq("user_id", currentUser.id)
          .not("member_role", "eq", "pending")
          .maybeSingle();
        
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
        
        // Check if there's a pending join request for the course's organization
        if (courseData?.organization_id) {
          const { data: pendingRequest } = await supabase
            .from("organization_members")
            .select("id")
            .eq("organization_id", courseData.organization_id)
            .eq("user_id", currentUser.id)
            .eq("member_role", "pending")
            .maybeSingle();
          
          setJoinRequestPending(!!pendingRequest);
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

  const handleJoinOrganization = async () => {
    if (!course || !user) return;
    
    setCheckingMembership(true);
    
    try {
      const supabase = getSupabaseBrowserClient();
      
      // Check if user already has a pending request
      const { data: existingRequest } = await supabase
        .from("organization_members")
        .select("id, member_role")
        .eq("organization_id", course.organization_id)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (existingRequest) {
        if (existingRequest.member_role === "pending") {
          toast.info(`You already have a pending request to join this organization`);
          setJoinRequestPending(true);
        } else {
          toast.info(`You are already a member of this organization`);
          // Refresh user organization
          const { data: membership } = await supabase
            .from("organization_members")
            .select("organization_id, member_role")
            .eq("user_id", user.id)
            .eq("member_role", existingRequest.member_role)
            .maybeSingle();
          if (membership) {
            const { data: org } = await supabase
              .from("organizations")
              .select("id, name")
              .eq("id", membership.organization_id)
              .single();
            setUserOrganization(org);
          }
        }
        return;
      }
      
      // Send join request
      const { error } = await supabase
        .from("organization_members")
        .insert({
          organization_id: course.organization_id,
          user_id: user.id,
          member_role: "pending",
        });
      
      if (error) throw error;
      
      setJoinRequestPending(true);
      toast.success(
        `Join request sent to ${course.organization?.name || "organization"}! The admin will review your request.`,
        { duration: 5000 }
      );
      
    } catch (error: any) {
      console.error("Error sending join request:", error);
      toast.error(error.message || "Failed to send join request");
    } finally {
      setCheckingMembership(false);
    }
  };

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
    
    setSubmitting(true);
    
    try {
      const supabase = getSupabaseBrowserClient();
      
      // Get course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('visibility, organization_id, title')
        .eq('id', courseId)
        .single();
      
      if (courseError) throw courseError;
      
      // For public courses - direct enrollment
      if (courseData?.visibility === 'public') {
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch('/api/org-service/users/enroll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            email: user.email,
            course_class_id: selectedOffering,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to enroll in course");
        }
        
        toast.success("Successfully enrolled in the course!");
        router.push(`/courses/${courseId}/learn`);
        return;
      }
      
      // For organization/private courses, check organization membership
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("id, member_role")
        .eq("organization_id", courseData.organization_id)
        .eq("user_id", user.id)
        .not("member_role", "eq", "pending")
        .maybeSingle();
      
      if (!orgMember) {
        const { data: pendingRequest } = await supabase
          .from("organization_members")
          .select("id")
          .eq("organization_id", courseData.organization_id)
          .eq("user_id", user.id)
          .eq("member_role", "pending")
          .maybeSingle();
        
        if (pendingRequest) {
          toast.warning(
            `Your join request to ${courseData.title} organization is pending approval. You'll be able to enroll once approved.`,
            { duration: 5000 }
          );
        } else {
          const wantsToJoin = confirm(
            `This course is only available to members of the organization. Would you like to send a join request to the organization admin?`
          );
          
          if (wantsToJoin) {
            await sendJoinOrganizationRequest(user.id, courseData.organization_id);
            setJoinRequestPending(true);
            toast.info(
              "Join request sent! You'll receive a notification when approved, then you can enroll in this course.",
              { duration: 5000 }
            );
          }
        }
        return;
      }
      
      // User is in organization, proceed with enrollment via backend
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/org-service/users/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          email: user.email,
          course_class_id: selectedOffering,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to enroll in course");
      }
      
      toast.success("Successfully enrolled in the course!");
      router.push(`/courses/${courseId}/learn`);
      
    } catch (error: any) {
      console.error("Error enrolling:", error);
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
    return (offering.status === "upcoming" || offering.status === "ongoing") && !isFull;
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

  // Determine if the user can enroll (is in organization OR course is public)
  const canEnrollDirectly = course.visibility === "public" || (userOrganization?.id === course.organization_id);
  const needsOrganizationRequest = course.visibility !== "public" && !userOrganization && !joinRequestPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Organization Banner */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400">
            <Building2 className="w-4 h-4" />
            <span className="text-sm">
              {course.visibility === "public" 
                ? "Public Course - Open to everyone" 
                : `Course provided by: ${course.organization?.name}`}
            </span>
          </div>
          <Badge variant="outline" className={course.visibility === "public" ? "text-green-400 border-green-400" : "text-purple-400 border-purple-400"}>
            {course.visibility === "public" ? "Open Enrollment" : "Organization Only"}
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
                const isSelected = selectedOffering === offering.id;
                const enrolledCount = offering.members?.filter((m: any) => m.role === "student").length || 0;
                
                return (
                  <div
                    key={offering.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-slate-700 hover:border-slate-600"
                    }`}
                    onClick={() => setSelectedOffering(offering.id)}
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
                  </div>
                );
              })}
            </div>
            
            {/* Info message for users who need to join organization first */}
            {needsOrganizationRequest && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-400 font-medium">Organization Access Required</p>
                    <p className="text-sm text-gray-300 mt-1">
                      This course is only available to members of <span className="font-semibold">{course.organization?.name}</span>.
                      You need to join the organization before you can enroll.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Info message for users with pending join request */}
            {course.visibility !== "public" && joinRequestPending && !userOrganization && (
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-400 font-medium">Join Request Pending</p>
                    <p className="text-sm text-gray-300 mt-1">
                      Your request to join {course.organization?.name} is pending approval by an organization admin.
                      Once approved, you'll be able to enroll in this course.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-700">
              <GlowButton variant="ghost" onClick={() => router.back()}>
                Cancel
              </GlowButton>
              
              {/* Show appropriate button based on user's status */}
              {needsOrganizationRequest ? (
                <GlowButton
                  variant="outline"
                  onClick={handleJoinOrganization}
                  isLoading={checkingMembership}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Request to Join Organization
                </GlowButton>
              ) : joinRequestPending && !userOrganization ? (
                <GlowButton
                  variant="secondary"
                  disabled
                  className="opacity-70 cursor-not-allowed"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Awaiting Organization Approval
                </GlowButton>
              ) : (
                <GlowButton
                  variant="primary"
                  onClick={handleEnroll}
                  isLoading={submitting}
                  disabled={!selectedOffering}
                >
                  {course.visibility === "public" ? "Enroll Now" : "Enroll in Course"}
                </GlowButton>
              )}
            </div>
          </div>
        </GlowCard>
        
        {/* Show organization request button below as well (for visibility) */}
        {needsOrganizationRequest && !canEnrollDirectly && (
          <div className="mt-4">
            <GlowButton variant="outline" fullWidth onClick={handleJoinOrganization} isLoading={checkingMembership}>
              <LogIn className="w-4 h-4 mr-2" />
              Request to Join {course.organization?.name} First
            </GlowButton>
            <p className="text-center text-sm text-gray-500 mt-2">
              You need to be a member of {course.organization?.name} to enroll in this course.
            </p>
          </div>
        )}
        
        <div className="mt-4 text-center text-sm text-green-400">
          ✓ You'll get immediate access to the course upon enrollment
        </div>
      </div>
    </div>
  );
}