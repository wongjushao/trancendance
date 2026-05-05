// frontend/app/(main)/courses/[id]/reviews/create/page.tsx
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
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isEnrolled } from "@/lib/supabase/enrollment";

export default function CreateReviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [error, setError] = useState("");
  
  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseBrowserClient();
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/login");
          return;
        }
        
        // Get course details
        const { data: courseData } = await supabase
          .from("courses")
          .select("id, title")
          .eq("id", courseId)
          .single();
        setCourse(courseData);
        
        // Check if enrolled
        const isEnrolledFlag = await isEnrolled(courseId, user.id);
        if (!isEnrolledFlag) {
          toast.error("You must be enrolled in this course to leave a review");
          router.push(`/courses/${courseId}`);
          return;
        }
        
        // Check if already reviewed
        const { data: existingReview } = await supabase
          .from("course_reviews")
          .select("id")
          .eq("course_id", courseId)
          .eq("user_id", user.id)
          .single();
        
        if (existingReview) {
          toast.error("You have already reviewed this course");
          router.push(`/courses/${courseId}/reviews`);
          return;
        }
        
      } catch (error) {
        console.error("Error checking access:", error);
        toast.error("Failed to verify access");
      } finally {
        setLoading(false);
      }
    };
    
    checkAccess();
  }, [courseId, router]);
  
  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }
    
    setSubmitting(true);
    setError("");
    
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }
      
      const { error: submitError } = await supabase
        .from("course_reviews")
        .insert({
          course_id: courseId,
          user_id: user.id,
          rating: rating,
          review: review.trim() || null,
        });
      
      if (submitError) throw submitError;
      
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
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
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
          <div>
            <h1 className="text-3xl font-bold text-white">Write a Review</h1>
            <p className="text-gray-400 mt-1">{course?.title}</p>
          </div>
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