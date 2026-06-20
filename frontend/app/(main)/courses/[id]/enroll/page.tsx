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

  const getAuthToken = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get current user via backend API
        const userResponse = await fetch('/api/auth-service/profile', {
          headers: {
            'Authorization': `Bearer ${await getAuthToken()}`
          }
        });
        
        if (!userResponse.ok) {
          router.push("/login");
          return;
        }
        
        const userProfile = await userResponse.json();
        setUser(userProfile);
        
        // Get user's organization membership via backend API
        const orgResponse = await fetch('/api/org-service/organizations/memberships', {
          headers: {
            'Authorization': `Bearer ${await getAuthToken()}`
          }
        });
        
        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          const memberships = orgData.organizations || [];
          if (memberships.length > 0) {
            // Get the first approved membership (non-pending)
            const approvedMembership = memberships.find((m: any) => m.member_role !== 'pending');
            if (approvedMembership) {
              setUserOrganization({
                id: approvedMembership.id,
                name: approvedMembership.name
              });
            }
          }
        }
        
        // Get course data via backend API
        const courseResponse = await fetch(`/api/org-service/courses/${courseId}/detail`, {
          headers: {
            'Authorization': `Bearer ${await getAuthToken()}`
          }
        });
        
        if (!courseResponse.ok) {
          throw new Error('Failed to load course');
        }
        
        const courseData = await courseResponse.json();
        setCourse(courseData.course);
        
        // Check if already enrolled via backend API
        if (courseData.course_classes && courseData.course_classes.length > 0) {
          for (const offering of courseData.course_classes) {
            const enrollmentResponse = await fetch(`/api/org-service/course-classes/${offering.id}/enrollment/status`, {
              headers: {
                'Authorization': `Bearer ${await getAuthToken()}`
              }
            });
            
            if (enrollmentResponse.ok) {
              const enrollmentStatus = await enrollmentResponse.json();
              if (enrollmentStatus.enrolled) {
                setExistingEnrollment({ course_class_id: offering.id });
                setSelectedOffering(offering.id);
                break;
              }
            }
          }
        }
        
        // Check if there's a pending join request via backend API
        if (courseData.course?.organization_id) {
          const pendingResponse = await fetch(`/api/org-service/organizations/${courseData.course.organization_id}/membership-status`, {
            headers: {
              'Authorization': `Bearer ${await getAuthToken()}`
            }
          });
          
          if (pendingResponse.ok) {
            const status = await pendingResponse.json();
            setJoinRequestPending(status.status === 'pending');
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

  const handleJoinOrganization = async () => {
    if (!course || !user) return;
    
    setCheckingMembership(true);
    
    try {
      // Check membership status via backend
      const statusResponse = await fetch(`/api/org-service/organizations/${course.organization_id}/membership-status`, {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });
      
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        
        if (status.member_role === 'pending') {
          toast.info(`You already have a pending request to join this organization`);
          setJoinRequestPending(true);
          return;
        }
        
        if (status.member_role && status.member_role !== 'pending') {
          toast.info(`You are already a member of this organization`);
          // Refresh user organization
          const orgResponse = await fetch('/api/org-service/organizations/memberships', {
            headers: {
              'Authorization': `Bearer ${await getAuthToken()}`
            }
          });
          if (orgResponse.ok) {
            const orgData = await orgResponse.json();
            const memberships = orgData.organizations || [];
            const approvedMembership = memberships.find((m: any) => m.member_role !== 'pending');
            if (approvedMembership) {
              setUserOrganization({
                id: approvedMembership.id,
                name: approvedMembership.name
              });
            }
          }
          return;
        }
      }
      
      // Send join request via backend
      const response = await fetch('/api/org-service/organizations/join-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({
          organization_id: course.organization_id,
          user_id: user.id
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send join request');
      }
      
      setJoinRequestPending(true);
      const nameForToast =
        (course.organization_name || course.organization?.name || "").trim() || "the organization";
      toast.success(
        `Join request sent to ${nameForToast}! The admin will review your request.`,
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
      const token = await getAuthToken();
      
      // CHANGE THIS URL - use the existing endpoint
      const response = await fetch(`/api/org-service/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        // No body needed - the endpoint uses the authenticated user from the token
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
  const orgDisplayName =
    (course.organization_name || course.organization?.name || "").trim() || "";

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
                : orgDisplayName
                  ? `Course provided by: ${orgDisplayName}`
                  : "Private course"}
            </span>
          </div>
          <Badge
            variant="outline"
            className={
              course.visibility === "public"
                ? "text-green-400 border-green-400"
                : course.visibility === "org"
                  ? "text-blue-300 border-blue-500/40"
                  : "text-slate-300 border-slate-500/40"
            }
          >
            {course.visibility === "public"
              ? "Open Enrollment"
              : course.visibility === "org"
                ? "Organization Only"
                : "Private"}
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
                      This course is only available to members of{" "}
                      <span className="font-semibold">{orgDisplayName || "this organization"}</span>.
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
                      Your request to join {orgDisplayName || "the organization"} is pending approval by an organization admin.
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
              Request to Join {orgDisplayName || "Organization"} First
            </GlowButton>
            <p className="text-center text-sm text-gray-500 mt-2">
              You need to be a member of {orgDisplayName || "this organization"} to enroll in this course.
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