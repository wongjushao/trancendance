// frontend/app/(main)/dashboard/page.tsx

import { BookOpen, Clock, Trophy, Target, Calendar, TrendingUp } from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

// ΓöÇΓöÇ Static mock data (replace with real DB queries when ready) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const upcomingAssignments = [
  { id: 1, title: "React Hooks Deep Dive",    course: "Advanced React",      dueDate: "2026-03-08", status: "pending" },
  { id: 2, title: "Database Design Project",  course: "Backend Development", dueDate: "2026-03-10", status: "pending" },
  { id: 3, title: "UI/UX Case Study",         course: "Design Principles",   dueDate: "2026-03-12", status: "in-progress" },
];

const recentActivity = [
  { id: 1, text: "Completed lesson: Authentication in Node.js", time: "2 hours ago" },
  { id: 2, text: "New comment on your submission",              time: "5 hours ago" },
  { id: 3, text: "Assignment graded: REST API Design",          time: "1 day ago" },
  { id: 4, text: "Enrolled in Advanced TypeScript",             time: "2 days ago" },
];

const activeCourses = [
  {
    id: 1,
    title: "Advanced React Development",
    instructor: "Sarah Johnson",
    progress: 65,
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400",
    students: 1234,
    lessons: 24,
  },
  {
    id: 2,
    title: "Backend with Node.js",
    instructor: "Michael Chen",
    progress: 45,
    thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400",
    students: 892,
    lessons: 18,
  },
  {
    id: 3,
    title: "UI/UX Design Fundamentals",
    instructor: "Emily Rodriguez",
    progress: 80,
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400",
    students: 2341,
    lessons: 32,
  },
];

// ΓöÇΓöÇ Page ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export default async function DashboardPage() {
  // Fetch the real Supabase user server-side.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Safety net ΓÇö should never be hit thanks to middleware + layout guard
  if (!user) redirect("/");

  return <DashboardClient user={user} upcomingAssignments={upcomingAssignments} recentActivity={recentActivity} activeCourses={activeCourses} />;
}