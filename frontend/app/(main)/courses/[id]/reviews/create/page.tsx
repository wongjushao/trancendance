"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  Send,
  AlertCircle,
  Loader2,
  Crown,
  Shield,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useRole } from "@/components/providers/RoleProvider";

export default function CreateReviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);
  const supabase = getSupabaseBrowserClient();
  const { roleData } = useRole();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [error, setError] = useState("");
  const [canReview, setCanReview] = useState(false);
  const [isCourseInstructor, setIsCourseInstructor] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState<string | null>(null);

  // ADD these helper functions after imports:
  const getAuthToken = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const token = await getAuthToken();
    if (!token) throw new Error("Not authenticated");
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `Request failed: ${response.status}`);
    }
    
    return response.json();
  };

  useEffect(() => {
    checkAccess();
  }, [courseId]);

  const checkAccess = async () => {
    try {
      setLoading(true);
      
      // Get current user profile from backend
      const userProfile = await apiRequest('/api/auth-service/profile');
      if (!userProfile) {
        router.push("/login");
        return;
      }
      
      // Get course details
      const courseDetail = await apiRequest(`/api/org-service/courses/${courseId}/detail`);
      const courseData = courseDetail.course;
      setCourse(courseData);
      
      // Check if user is the course instructor/creator
      const isInstructor = courseData.created_by === userProfile.id;
      setIsCourseInstructor(isInstructor);
      
      // Get user's role in the organization
      const orgRoleResponse = await apiRequest(`/api/org-service/orgs/${courseData.organization_id}/members/${userProfile.id}`);
      const orgRole = orgRoleResponse?.member_role || null;
      setUserRole(orgRole);
      
      // Check if already reviewed
      const reviews = courseDetail.reviews || [];
      const existingReview = reviews.find((r: any) => r.user?.id === userProfile.id);
      if (existingReview) {
        setBlockReason("You have already reviewed this course");
        setCanReview(false);
        setLoading(false);
        return;
      }
      
      // Check if enrolled as student using the enrollment status endpoint
      const enrollmentStatus = await apiRequest(`/api/org-service/courses/${courseId}/enrollment/status`);
      const isEnrolledAsStudent = enrollmentStatus.enrolled === true;
      
      // Determine if user can review
      if (isInstructor) {
        setBlockReason("Course instructors cannot review their own courses");
        setCanReview(false);
      } else if (orgRole === "teacher") {
        // Check if this teacher is associated with this course
        const courseDetailForCheck = await apiRequest(`/api/org-service/courses/${courseId}/detail`);
        const isTeacherForCourse = courseDetailForCheck.course?.instructor_id === userProfile.id;
        
        if (isTeacherForCourse) {
          setBlockReason("Teachers cannot review courses they are assigned to");
          setCanReview(false);
        } else if (!isEnrolledAsStudent) {
          setBlockReason("You must be enrolled as a student to review this course");
          setCanReview(false);
        } else {
          setCanReview(true);
          setBlockReason(null);
        }
      } else if (!isEnrolledAsStudent) {
        setBlockReason("You must be enrolled in this course to leave a review");
        setCanReview(false);
      } else {
        setCanReview(true);
        setBlockReason(null);
      }
      
    } catch (error) {
      console.error("Error checking access:", error);
      toast.error("Failed to verify access");
      setCanReview(false);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }
    
    if (!canReview) {
      setError(blockReason || "You are not eligible to review this course");
      return;
    }
    
    setSubmitting(true);
    setError("");
    
    try {
      const userProfile = await apiRequest('/api/auth-service/profile');
      if (!userProfile) {
        router.push("/login");
        return;
      }
      
      // Double-check enrollment via backend
      const enrollmentStatus = await apiRequest(`/api/org-service/courses/${courseId}/enrollment/status`);
      
      if (!enrollmentStatus.enrolled) {
        setError("You are no longer enrolled in this course");
        setCanReview(false);
        setSubmitting(false);
        return;
      }
      
      // Submit review via backend API
      await apiRequest(`/api/org-service/courses/${courseId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating: rating,
          review: review.trim() || null,
        }),
      });
      
      toast.success("Review submitted successfully!");
      router.push(`/courses/${courseId}/reviews`);
      
    } catch (error) {
      console.error("Error submitting review:", error);
      setError("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarButtons = () => {
    const stars = [1, 2, 3, 4, 5];
    const displayRating = hoverRating || rating;
    
    return (
      <div className="flex gap-2">
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={`w-10 h-10 ${
                star <= displayRating
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-gray-600"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };
  
  const getUserRoleBadge = () => {
    if (isCourseInstructor) {
      return (
        <Badge className="bg-purple-500/20 text-purple-400">
          <Crown className="w-3 h-3 mr-1" />
          Instructor
        </Badge>
      );
    }
    if (userRole === "teacher") {
      return (
        <Badge className="bg-blue-500/20 text-blue-400">
          <Shield className="w-3 h-3 mr-1" />
          Teacher
        </Badge>
      );
    }
    return null;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  // Show blocking message if user cannot review
  if (!canReview && blockReason) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href={`/courses/${courseId}/reviews`}>
              <GlowButton variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Reviews
              </GlowButton>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Cannot Write Review</h1>
              <p className="text-gray-400 mt-1">{course?.title}</p>
            </div>
            {getUserRoleBadge()}
          </div>
          
          <GlowCard>
            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-yellow-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Review Not Available</h2>
              <p className="text-gray-400 mb-4">{blockReason}</p>
              <div className="flex gap-3 justify-center">
                <Link href={`/courses/${courseId}/reviews`}>
                  <GlowButton variant="primary">
                    Back to Reviews
                  </GlowButton>
                </Link>
                <Link href={`/courses/${courseId}`}>
                  <GlowButton variant="outline">
                    View Course
                  </GlowButton>
                </Link>
              </div>
            </div>
          </GlowCard>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/courses/${courseId}/reviews`}>
            <GlowButton variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Reviews
            </GlowButton>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white">Write a Review</h1>
            <p className="text-gray-400 mt-1">{course?.title}</p>
          </div>
          {getUserRoleBadge()}
        </div>
        
        <GlowCard>
          <div className="p-6 space-y-6">
            {/* Rating Section */}
            <div>
              <Label className="text-base font-semibold">Your Rating *</Label>
              <div className="mt-3">{renderStarButtons()}</div>
              {rating > 0 && (
                <p className="text-sm text-gray-400 mt-2">
                  You selected {rating} {rating === 1 ? "star" : "stars"}
                </p>
              )}
            </div>
            
            {/* Review Text */}
            <div>
              <Label htmlFor="review" className="text-base font-semibold">
                Your Review (Optional)
              </Label>
              <Textarea
                id="review"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your experience with this course. What did you like? What could be improved?"
                rows={6}
                className="mt-3"
              />
              <p className="text-xs text-gray-500 mt-2">
                {review.length}/2000 characters
              </p>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            
            {/* Guidelines */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="font-semibold text-blue-400 mb-2">Review Guidelines</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Be specific about what you learned and how it helped you</li>
                <li>• Focus on the course content, instructor, and learning experience</li>
                <li>• Keep reviews constructive and respectful</li>
                <li>• Avoid sharing personal information</li>
                <li>• Reviews cannot be edited after submission</li>
              </ul>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
              <Link href={`/courses/${courseId}/reviews`}>
                <GlowButton variant="ghost">Cancel</GlowButton>
              </Link>
              <GlowButton
                variant="primary"
                onClick={handleSubmit}
                isLoading={submitting}
                disabled={rating === 0}
              >
                <Send className="w-4 h-4 mr-2" />
                Submit Review
              </GlowButton>
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}