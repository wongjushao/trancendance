// frontend/app/(main)/courses/[id]/reviews/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  StarHalf,
  Users,
  Calendar,
  MessageSquare,
  ThumbsUp,
  Flag,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isEnrolled } from "@/lib/supabase/enrollment";

interface Review {
  id: number;
  rating: number;
  review: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    avatar_url: string;
  };
}

interface RatingStats {
  average: number;
  total: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export default function CourseReviewsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<RatingStats>({
    average: 0,
    total: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [isEnrolledState, setIsEnrolledState] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const itemsPerPage = 10;
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseBrowserClient();
        
        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);
        
        // Get course details
        const { data: courseData } = await supabase
          .from("courses")
          .select("id, title, description, thumbnail, level, category, organization_id")
          .eq("id", courseId)
          .single();
        setCourse(courseData);
        
        // Check if user is enrolled
        if (authUser && courseData) {
          const { data: classMembers } = await supabase
            .from("class_members")
            .select("id")
            .eq("user_id", authUser.id);
          
          if (classMembers && classMembers.length > 0) {
            setIsEnrolledState(true);
            
            // Check if user has already reviewed
            const { data: existingReview } = await supabase
              .from("course_reviews")
              .select("id")
              .eq("course_id", courseId)
              .eq("user_id", authUser.id)
              .single();
            setHasUserReviewed(!!existingReview);
          }
        }
        
        // Get all reviews with user profiles
        const { data: reviewsData } = await supabase
          .from("course_reviews")
          .select(`
            *,
            user:profiles!user_id (
              id,
              first_name,
              last_name,
              username,
              avatar_url
            )
          `)
          .eq("course_id", courseId)
          .order("created_at", { ascending: false });
        
        if (reviewsData) {
          setReviews(reviewsData);
          
          // Calculate stats
          const total = reviewsData.length;
          const sum = reviewsData.reduce((acc, r) => acc + r.rating, 0);
          const average = total > 0 ? sum / total : 0;
          
          const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          reviewsData.forEach(r => {
            distribution[r.rating as keyof typeof distribution]++;
          });
          
          setStats({ average, total, distribution });
        }
        
      } catch (error) {
        console.error("Error loading reviews:", error);
        toast.error("Failed to load reviews");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [courseId]);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  
  const renderStars = (rating: number, size: "sm" | "md" | "lg" = "md") => {
    const sizes = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-5 h-5" };
    const sizeClass = sizes[size];
    
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : star - 0.5 <= rating
                ? "text-yellow-400 fill-yellow-400 half-star"
                : "text-gray-600"
            }`}
          />
        ))}
      </div>
    );
  };
  
  const getInitials = (firstName: string, lastName: string, username: string) => {
    if (firstName) return firstName[0];
    if (lastName) return lastName[0];
    if (username) return username[0];
    return "U";
  };
  
  const paginatedReviews = reviews.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(reviews.length / itemsPerPage);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/courses/${courseId}`}>
              <GlowButton variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Course
              </GlowButton>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Course Reviews</h1>
              <p className="text-gray-400 mt-1">{course?.title}</p>
            </div>
          </div>
          {isEnrolledState && !hasUserReviewed && (
            <Link href={`/courses/${courseId}/reviews/create`}>
              <GlowButton variant="primary">
                <MessageSquare className="w-4 h-4 mr-2" />
                Write a Review
              </GlowButton>
            </Link>
          )}
        </div>
        
        {/* Rating Summary */}
        <GlowCard className="mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Average Rating */}
              <div className="text-center md:text-left">
                <div className="text-5xl font-bold text-white">{stats.average.toFixed(1)}</div>
                <div className="flex justify-center md:justify-start mt-2">
                  {renderStars(Math.round(stats.average), "lg")}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Based on {stats.total} {stats.total === 1 ? "review" : "reviews"}
                </div>
              </div>
              
              {/* Rating Distribution */}
              <div className="col-span-2">
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-3">
                      <div className="w-12 text-sm text-gray-400">{star} stars</div>
                      <div className="flex-1">
                        <Progress
                          value={(stats.distribution[star as keyof typeof stats.distribution] / stats.total) * 100}
                          className="h-2"
                        />
                      </div>
                      <div className="w-12 text-sm text-gray-400 text-right">
                        {stats.distribution[star as keyof typeof stats.distribution]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </GlowCard>
        
        {/* Reviews List */}
        <GlowCard>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              All Reviews ({stats.total})
            </h2>
            
            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold text-white mb-2">No Reviews Yet</h3>
                <p className="text-gray-400 mb-6">
                  Be the first to share your experience with this course!
                </p>
                {isEnrolledState && !hasUserReviewed && (
                  <Link href={`/courses/${courseId}/reviews/create`}>
                    <GlowButton variant="primary">
                      Write a Review
                    </GlowButton>
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  {paginatedReviews.map((review) => (
                    <div key={review.id} className="border-b border-slate-700 pb-6 last:border-0">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src={review.user.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(
                              review.user.first_name || "",
                              review.user.last_name || "",
                              review.user.username || ""
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div>
                              <div className="font-semibold text-white">
                                {review.user.first_name} {review.user.last_name}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {renderStars(review.rating, "sm")}
                                <span className="text-xs text-gray-500">
                                  {formatDate(review.created_at)}
                                </span>
                              </div>
                            </div>
                            {review.updated_at !== review.created_at && (
                              <Badge variant="secondary" className="text-xs">
                                Edited
                              </Badge>
                            )}
                          </div>
                          {review.review && (
                            <p className="text-gray-300 mt-3 leading-relaxed">
                              {review.review}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6 pt-4 border-t border-slate-700">
                    <GlowButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </GlowButton>
                    <span className="text-gray-400 px-4 py-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <GlowButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </GlowButton>
                  </div>
                )}
              </>
            )}
          </div>
        </GlowCard>
      </div>
    </div>
  );
}