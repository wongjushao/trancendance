// app/(main)/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  TrendingUp,
  Calendar,
  Activity,
  Award,
  ChevronRight,
  Users,
  Star,
  Target,
  Zap,
  Sparkles,
  Settings,
  Plus,
  BarChart3,
  AlertCircle,
  Loader2,
  Building2,
  ChevronDown,
  Check,
  Crown,
  GraduationCap,
  School,
  FileText,
  MessageSquare,
  UserPlus,
  Edit,
  Eye,
  Filter,
  Search,
  Download,
  PlayCircle,
} from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { LearningCalendar } from "@/components/dashboard/LearningCalendar";
import { UpcomingItems } from "@/components/dashboard/UpcomingItems";
import { RecentItems } from "@/components/dashboard/RecentItems";

interface Organization {
  id: number;
  name: string;
  role: "student" | "teacher" | "admin" | "sub_admin";
}

interface EnrolledCourse {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  instructor_name: string;
  progress: number;
  completed_lessons: number;
  total_lessons: number;
  last_accessed_at: string;
  rating: number;
  certificate_earned: boolean;
}

interface TeacherCourse {
  id: number;
  title: string;
  thumbnail: string;
  students: number;
  progress: number;
  rating: number;
  status: "published" | "draft";
}

interface PendingGrading {
  id: number;
  title: string;
  course_name: string;
  submissions: number;
  due_date: string;
}

interface AdminStats {
  total_students: number;
  active_students: number;
  total_courses: number;
  published_courses: number;
  average_rating: number;
  completion_rate: number;
  pending_approvals: number;
}

interface TopCourse {
  id: number;
  title: string;
  students: number;
  rating: number;
  completion: number;
}

export default function UnifiedDashboardPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  
  // User & Organization State
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [userRoles, setUserRoles] = useState<Set<string>>(new Set());
  
  // UI State
  const [greeting, setGreeting] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [activeTab, setActiveTab] = useState("learning");
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  
  // Student Section State
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [studentStats, setStudentStats] = useState({
    total_courses: 0,
    completed_courses: 0,
    average_progress: 0,
    streak_days: 0,
    pending_tasks: 0,
  });
  
  // Teacher Section State
  const [teacherCourses, setTeacherCourses] = useState<TeacherCourse[]>([]);
  const [pendingGrading, setPendingGrading] = useState<PendingGrading[]>([]);
  const [teacherStats, setTeacherStats] = useState({
    total_students: 0,
    active_courses: 0,
    average_rating: 0,
    completion_rate: 0,
  });
  
  // Admin Section State
  const [adminStats, setAdminStats] = useState<AdminStats>({
    total_students: 0,
    active_students: 0,
    total_courses: 0,
    published_courses: 0,
    average_rating: 0,
    completion_rate: 0,
    pending_approvals: 0,
  });
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
    
    loadUserData();
  }, []);

  useEffect(() => {
    if (selectedOrgId && initialLoadComplete) {
      loadDashboardData();
    }
  }, [selectedOrgId, activeTab, initialLoadComplete]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setDataLoadError(null);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!user) {
        router.push("/login");
        return;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name, username")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
      }

      if (profile) {
        if (profile.first_name && profile.last_name) {
          setDisplayName(`${profile.first_name} ${profile.last_name}`);
        } else if (profile.first_name) {
          setDisplayName(profile.first_name);
        } else if (profile.username) {
          setDisplayName(profile.username);
        } else {
          setDisplayName(user.email?.split('@')[0] || "Learner");
        }
      } else {
        setDisplayName(user.email?.split('@')[0] || "Learner");
      }

      // Get user's organizations and roles
      const { data: memberships, error: membershipsError } = await supabase
        .from("organization_members")
        .select(`
          organization_id,
          member_role,
          organizations!inner(id, name)
        `)
        .eq("user_id", user.id)
        .not("member_role", "eq", "pending");

      if (membershipsError) {
        console.error("Memberships fetch error:", membershipsError);
      }

      const orgs: Organization[] = [];
      const roles = new Set<string>();

      memberships?.forEach(m => {
        const role = m.member_role;
        orgs.push({
          id: m.organization_id,
          name: m.organizations?.name || `Organization ${m.organization_id}`,
          role: role as Organization["role"],
        });
        if (role === "admin") roles.add("admin");
        if (role === "sub_admin") roles.add("admin");
        if (role === "teacher") roles.add("teacher");
        roles.add("student");
      });

      // Also check class_members for student-only orgs
      if (orgs.length === 0) {
        const { data: classMembers, error: classMembersError } = await supabase
          .from("class_members")
          .select(`
            course_class_id,
            course_classes!inner(
              course_id,
              courses!inner(
                organization_id,
                organizations!inner(id, name)
              )
            )
          `)
          .eq("user_id", user.id)
          .limit(1);

        if (classMembersError) {
          console.error("Class members fetch error:", classMembersError);
        }

        if (classMembers && classMembers.length > 0) {
          const org = classMembers[0]?.course_classes?.courses?.organizations;
          if (org) {
            orgs.push({ id: org.id, name: org.name, role: "student" });
            roles.add("student");
          }
        } else {
          roles.add("student");
        }
      }

      setOrganizations(orgs);
      setUserRoles(roles);
      
      // Set default organization
      if (orgs.length > 0) {
        setSelectedOrgId(orgs[0].id);
      }

      // Set default active tab based on highest role
      if (roles.has("admin")) {
        setActiveTab("admin");
      } else if (roles.has("teacher")) {
        setActiveTab("teaching");
      } else {
        setActiveTab("learning");
      }
      
      setInitialLoadComplete(true);

    } catch (error) {
      console.error("Error loading user data:", error);
      setDataLoadError("Failed to load user data. Please refresh the page.");
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    if (!selectedOrgId) return;
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return;

      // Load based on active tab for better performance
      if (activeTab === "learning") {
        await loadLearningData(user.id);
      }
      if (activeTab === "teaching" && (userRoles.has("teacher") || userRoles.has("admin"))) {
        await loadTeachingData(user.id);
      }
      if (activeTab === "admin" && userRoles.has("admin")) {
        await loadAdminData(user.id);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    }
  };

  const loadLearningData = async (userId: string) => {
    try {
      // Get enrolled courses via class_members
      const { data: classMembers, error: classMembersError } = await supabase
        .from("class_members")
        .select(`
          id,
          enrolled_at,
          course_class_id,
          course_classes!inner(
            id,
            course_id,
            courses!inner(
              id,
              title,
              description,
              thumbnail,
              created_by,
              profiles!courses_created_by_fkey(first_name, last_name, username)
            )
          )
        `)
        .eq("user_id", userId)
        .eq("role", "student");

      if (classMembersError) {
        console.error("Error fetching class members:", classMembersError);
        return;
      }

      if (!classMembers || classMembers.length === 0) {
        setEnrolledCourses([]);
        setStudentStats({
          total_courses: 0,
          completed_courses: 0,
          average_progress: 0,
          streak_days: 0,
          pending_tasks: 0,
        });
        return; // ← Important: exit early
      }

      // --- Batch all course IDs ---
      const courseIds = [...new Set(
        classMembers
          .filter(cm => cm.course_classes?.courses)
          .map(cm => cm.course_classes.courses.id)
      )];

      if (courseIds.length === 0) {
        setEnrolledCourses([]);
        return;
      }

      // --- QUERY 1: All modules and lessons for these courses ---
      const { data: allModules, error: modulesError } = await supabase
        .from("modules")
        .select(`
          id,
          course_id,
          classes!inner (
            id,
            lessons!inner (
              id,
              title
            )
          )
        `)
        .in("course_id", courseIds);

      if (modulesError) {
        console.error("Error fetching modules:", modulesError);
      }

      // --- Build lesson count per course ---
      const lessonCountMap = new Map<number, number>();
      // --- NEW: Build lesson_id -> course_id mapping for recent activity ---
      const lessonToCourseMap = new Map<number, number>();
      
      allModules?.forEach((module: any) => {
        let lessonCount = 0;
        module.classes?.forEach((classItem: any) => {
          classItem.lessons?.forEach((lesson: any) => {
            lessonCount++;
            // Store mapping: lesson_id -> course_id
            lessonToCourseMap.set(lesson.id, module.course_id);
          });
        });
        lessonCountMap.set(module.course_id, (lessonCountMap.get(module.course_id) || 0) + lessonCount);
      });

      // --- QUERY 2: All lesson progress for these class members ---
      const classMemberIds = classMembers.map(cm => cm.id);
      const { data: allProgress, error: progressError } = await supabase
        .from("lesson_progress")
        .select("class_member_id, lesson_id, status")
        .in("class_member_id", classMemberIds);

      if (progressError) {
        console.error("Error fetching lesson progress:", progressError);
      }

      // Group progress by class_member_id
      const progressByMember = new Map<string, { completed: Set<number> }>();
      allProgress?.forEach((p: any) => {
        if (!progressByMember.has(p.class_member_id)) {
          progressByMember.set(p.class_member_id, { completed: new Set() });
        }
        if (p.status === "completed") {
          progressByMember.get(p.class_member_id)!.completed.add(p.lesson_id);
        }
      });

      // --- QUERY 3: All upcoming assignments ---
      const { data: allAssignments, error: assignmentsError } = await supabase
        .from("assignments")
        .select("id, title, due_at, course_id, courses!inner(title)")
        .in("course_id", courseIds)
        .gte("due_at", new Date().toISOString())
        .order("due_at", { ascending: true })
        .limit(5);

      if (assignmentsError) {
        console.error("Error fetching assignments:", assignmentsError);
      }

      // --- QUERY 4: All recent completed lessons ---
      const { data: allRecentProgress, error: recentError } = await supabase
        .from("lesson_progress")
        .select(`
          id,
          completed_at,
          lesson_id,
          class_member_id
        `)
        .in("class_member_id", classMemberIds)
        .eq("status", "completed")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(10);

      if (recentError) {
        console.error("Error fetching recent progress:", recentError);
      }

      // --- Build courses using batched data ---
      const coursesMap = new Map<number, EnrolledCourse>();
      let totalProgressSum = 0;
      let completedCount = 0;

      for (const cm of classMembers) {
        const course = cm.course_classes?.courses;
        if (!course) continue;

        // Skip if user is the instructor
        if (course.created_by === userId) {
          continue;
        }

        const totalLessons = lessonCountMap.get(course.id) || 0;
        const memberProgress = progressByMember.get(cm.id);
        const completedLessons = memberProgress?.completed.size || 0;
        const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
        const existingCourse = coursesMap.get(course.id);

        if (existingCourse) {
          if (progress > existingCourse.progress) {
            existingCourse.progress = Math.round(progress);
            existingCourse.completed_lessons = completedLessons;
            existingCourse.last_accessed_at = cm.enrolled_at;
          }
        } else {
          coursesMap.set(course.id, {
            id: course.id,
            title: course.title,
            description: course.description || "",
            thumbnail: course.thumbnail || "",
            instructor_name: course.profiles?.first_name 
              ? `${course.profiles.first_name} ${course.profiles.last_name || ""}`.trim()
              : course.profiles?.username || "Instructor",
            progress: Math.round(progress),
            completed_lessons: completedLessons,
            total_lessons: totalLessons,
            last_accessed_at: cm.enrolled_at,
            rating: 0,
            certificate_earned: false,
          });
        }

        totalProgressSum += progress;
        if (progress === 100) completedCount++;
      }

      const coursesData = Array.from(coursesMap.values());
      setEnrolledCourses(coursesData);
      setStudentStats({
        total_courses: coursesData.length,
        completed_courses: completedCount,
        average_progress: coursesData.length > 0 ? Math.round(totalProgressSum / coursesData.length) : 0,
        streak_days: 0,
        pending_tasks: 0,
      });

      // Set upcoming deadlines
      setUpcomingDeadlines(allAssignments || []);

      // --- FIXED: Build recent activity using the lesson-to-course mapping ---
      const uniqueActivities = new Map();
      
      for (const progress of allRecentProgress || []) {
        // Skip if we already have this lesson
        if (uniqueActivities.has(progress.lesson_id)) continue;
        
        // Find which course this lesson belongs to using our mapping
        const courseId = lessonToCourseMap.get(progress.lesson_id);
        const course = coursesData.find(c => c.id === courseId);
        
        // Get lesson title (optional - you can fetch if needed)
        let lessonTitle = "Lesson";
        // If you want lesson titles, you'd need to fetch them or store in mapping
        
        uniqueActivities.set(progress.lesson_id, {
          id: `${progress.id}-${Date.now()}-${progress.lesson_id}`,
          type: "lesson",
          title: `Lesson ${progress.lesson_id}`, // Or fetch actual title
          courseName: course?.title || "Course",
          completed_at: progress.completed_at,
          status: "completed",
        });
      }
      
      setRecentActivity(Array.from(uniqueActivities.values()).slice(0, 5));

    } catch (error) {
      console.error("Error in loadLearningData:", error);
    }
  };

  const loadTeachingData = async (userId: string) => {
    try {
      // Get courses created by this user
      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (coursesError) {
        console.error("Error fetching teacher courses:", coursesError);
        return;
      }

      if (!courses || courses.length === 0) {
        setTeacherCourses([]);
        setTeacherStats({
          total_students: 0,
          active_courses: 0,
          average_rating: 0,
          completion_rate: 0,
        });
        setPendingGrading([]);
        return;
      }

      const courseIds = courses.map(c => c.id);

      // --- OPTIMIZATION: Single query for ALL course classes ---
      const { data: allCourseClasses, error: classesError } = await supabase
        .from("course_classes")
        .select("id, course_id")
        .in("course_id", courseIds);

      if (classesError) {
        console.error("Error fetching course classes:", classesError);
      }

      // Build classIds by course
      const classIdsByCourse = new Map<number, number[]>();
      allCourseClasses?.forEach((cc: any) => {
        if (!classIdsByCourse.has(cc.course_id)) {
          classIdsByCourse.set(cc.course_id, []);
        }
        classIdsByCourse.get(cc.course_id)!.push(cc.id);
      });

      const allClassIds = allCourseClasses?.map(cc => cc.id) || [];

      // --- OPTIMIZATION: Single query for ALL student counts ---
      let studentCountMap = new Map<number, number>();
      if (allClassIds.length > 0) {
        const { data: allClassMembers, error: membersError } = await supabase
          .from("class_members")
          .select("course_class_id, user_id")
          .in("course_class_id", allClassIds)
          .eq("role", "student");

        if (membersError) {
          console.error("Error fetching class members:", membersError);
        } else {
          // Count unique students per course class, then aggregate by course
          const studentsPerClass = new Map<number, Set<string>>();
          allClassMembers?.forEach((cm: any) => {
            if (!studentsPerClass.has(cm.course_class_id)) {
              studentsPerClass.set(cm.course_class_id, new Set());
            }
            studentsPerClass.get(cm.course_class_id)!.add(cm.user_id);
          });

          // Aggregate by course
          for (const [courseId, classIds] of classIdsByCourse) {
            let uniqueStudents = new Set<string>();
            for (const classId of classIds) {
              const students = studentsPerClass.get(classId);
              if (students) {
                students.forEach(s => uniqueStudents.add(s));
              }
            }
            studentCountMap.set(courseId, uniqueStudents.size);
          }
        }
      }

      // --- OPTIMIZATION: Single query for ALL reviews ---
      const { data: allReviews, error: reviewsError } = await supabase
        .from("course_reviews")
        .select("course_id, rating")
        .in("course_id", courseIds);

      if (reviewsError) {
        console.error("Error fetching reviews:", reviewsError);
      }

      // Calculate average rating per course
      const ratingMap = new Map<number, { sum: number; count: number }>();
      allReviews?.forEach((review: any) => {
        if (!ratingMap.has(review.course_id)) {
          ratingMap.set(review.course_id, { sum: 0, count: 0 });
        }
        const entry = ratingMap.get(review.course_id)!;
        entry.sum += review.rating;
        entry.count++;
      });

      // --- OPTIMIZATION: Single query for ALL assignments and submissions ---
      const { data: allAssignments, error: assignError } = await supabase
        .from("assignments")
        .select("id, title, due_at, course_id")
        .in("course_id", courseIds)
        .order("due_at", { ascending: true })
        .limit(5);

      if (assignError) {
        console.error("Error fetching assignments:", assignError);
      }

      const assignmentIds = allAssignments?.map(a => a.id) || [];
      let pendingGradingMap = new Map<number, { submissions: number; title: string; due_date: string; course_name: string }>();

      if (assignmentIds.length > 0) {
        const { data: allSubmissions, error: subError } = await supabase
          .from("submissions")
          .select("assignment_id, grade")
          .in("assignment_id", assignmentIds);

        if (subError) {
          console.error("Error fetching submissions:", subError);
        } else {
          // Count pending per assignment
          const pendingCount = new Map<number, number>();
          allSubmissions?.forEach((sub: any) => {
            if (sub.grade === null) {
              pendingCount.set(sub.assignment_id, (pendingCount.get(sub.assignment_id) || 0) + 1);
            }
          });

          // Build pending grading map
          allAssignments?.forEach((assignment: any) => {
            const count = pendingCount.get(assignment.id) || 0;
            if (count > 0) {
              pendingGradingMap.set(assignment.id, {
                submissions: count,
                title: assignment.title,
                due_date: assignment.due_at,
                course_name: courses.find(c => c.id === assignment.course_id)?.title || "Unknown",
              });
            }
          });
        }
      }

      // Build teacher courses data
      const teacherCoursesData: TeacherCourse[] = [];
      let totalStudents = 0;
      let totalRatingSum = 0;
      let ratingCount = 0;

      for (const course of courses) {
        const studentCount = studentCountMap.get(course.id) || 0;
        totalStudents += studentCount;

        const ratingData = ratingMap.get(course.id);
        const avgRating = ratingData ? ratingData.sum / ratingData.count : 0;
        if (ratingData) {
          totalRatingSum += avgRating;
          ratingCount++;
        }

        teacherCoursesData.push({
          id: course.id,
          title: course.title,
          thumbnail: course.thumbnail || "",
          students: studentCount,
          progress: 0,
          rating: avgRating,
          status: course.status === "published" ? "published" : "draft",
        });
      }

      setTeacherCourses(teacherCoursesData);
      setTeacherStats({
        total_students: totalStudents,
        active_courses: courses.filter(c => c.status === "published").length,
        average_rating: ratingCount > 0 ? totalRatingSum / ratingCount : 0,
        completion_rate: 0,
      });

      // Set pending grading
      const pendingList: PendingGrading[] = Array.from(pendingGradingMap.values())
        .map(p => ({
          id: 0, // We don't have the original assignment ID in this structure
          title: p.title,
          course_name: p.course_name,
          submissions: p.submissions,
          due_date: p.due_date,
        }))
        .slice(0, 3);
      
      setPendingGrading(pendingList);

    } catch (error) {
      console.error("Error in loadTeachingData:", error);
    }
  };

  const loadAdminData = async (userId: string) => {
    if (!selectedOrgId) return;
    
    try {
      // Check if user is admin of this organization
      const { data: memberCheck, error: memberError } = await supabase
        .from("organization_members")
        .select("member_role")
        .eq("organization_id", selectedOrgId)
        .eq("user_id", userId)
        .single();

      if (memberError) {
        console.error("Error checking member role:", memberError);
      }

      if (!memberCheck || (memberCheck.member_role !== "admin" && memberCheck.member_role !== "sub_admin")) {
        setAdminStats({
          total_students: 0,
          active_students: 0,
          total_courses: 0,
          published_courses: 0,
          average_rating: 0,
          completion_rate: 0,
          pending_approvals: 0,
        });
        setTopCourses([]);
        return;
      }

      // Get all courses in this organization
      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .eq("organization_id", selectedOrgId);

      if (coursesError) {
        console.error("Error fetching courses:", coursesError);
      }

      const totalCourses = courses?.length || 0;
      const publishedCourses = courses?.filter(c => c.status === "published").length || 0;

      if (!courses || courses.length === 0) {
        setAdminStats({
          total_students: 0,
          active_students: 0,
          total_courses: 0,
          published_courses: 0,
          average_rating: 0,
          completion_rate: 0,
          pending_approvals: 0,
        });
        setTopCourses([]);
        return;
      }

      const courseIds = courses.map(c => c.id);

      // --- OPTIMIZATION: Single query for ALL course classes ---
      const { data: allCourseClasses, error: classesError } = await supabase
        .from("course_classes")
        .select("id, course_id")
        .in("course_id", courseIds);

      if (classesError) {
        console.error("Error fetching course classes:", classesError);
      }

      const classIdsByCourse = new Map<number, number[]>();
      const allClassIds: number[] = [];

      allCourseClasses?.forEach((cc: any) => {
        allClassIds.push(cc.id);
        if (!classIdsByCourse.has(cc.course_id)) {
          classIdsByCourse.set(cc.course_id, []);
        }
        classIdsByCourse.get(cc.course_id)!.push(cc.id);
      });

      // --- OPTIMIZATION: Single query for ALL class members (students) ---
      let totalStudents = 0;
      let activeStudents = 0;
      let studentCountByCourse = new Map<number, number>();
      let completionByCourse = new Map<number, number>();

      if (allClassIds.length > 0) {
        const { data: allClassMembers, error: membersError } = await supabase
          .from("class_members")
          .select("id, user_id, enrolled_at, course_class_id")
          .in("course_class_id", allClassIds)
          .eq("role", "student");

        if (membersError) {
          console.error("Error fetching class members:", membersError);
        } else {
          // Calculate totals
          const uniqueStudents = new Set(allClassMembers?.map(cm => cm.user_id));
          totalStudents = uniqueStudents.size;

          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const activeSet = new Set();
          allClassMembers?.forEach(cm => {
            if (new Date(cm.enrolled_at) > thirtyDaysAgo) {
              activeSet.add(cm.user_id);
            }
          });
          activeStudents = activeSet.size;

          // Count students per course
          const studentsPerClassMemberId = new Map<number, Set<string>>();
          allClassMembers?.forEach((cm: any) => {
            if (!studentsPerClassMemberId.has(cm.course_class_id)) {
              studentsPerClassMemberId.set(cm.course_class_id, new Set());
            }
            studentsPerClassMemberId.get(cm.course_class_id)!.add(cm.user_id);
          });

          // Aggregate by course
          for (const [courseId, classIds] of classIdsByCourse) {
            let uniqueCourseStudents = new Set<string>();
            for (const classId of classIds) {
              const students = studentsPerClassMemberId.get(classId);
              if (students) {
                students.forEach(s => uniqueCourseStudents.add(s));
              }
            }
            studentCountByCourse.set(courseId, uniqueCourseStudents.size);
          }

          // --- Get completion rates per course ---
          const classMemberIds = allClassMembers?.map(cm => cm.id) || [];
          if (classMemberIds.length > 0) {
            const { data: allProgress, error: progressError } = await supabase
              .from("lesson_progress")
              .select("class_member_id, status")
              .in("class_member_id", classMemberIds);

            if (progressError) {
              console.error("Error fetching progress:", progressError);
            } else {
              const progressByClassMember = new Map<number, { total: number; completed: number }>();
              allProgress?.forEach((p: any) => {
                if (!progressByClassMember.has(p.class_member_id)) {
                  progressByClassMember.set(p.class_member_id, { total: 0, completed: 0 });
                }
                const stats = progressByClassMember.get(p.class_member_id)!;
                stats.total++;
                if (p.status === "completed") stats.completed++;
              });

              // Calculate completion rate per course by mapping class members to courses
              const classMemberToCourse = new Map<number, number>();
              allClassMembers?.forEach((cm: any) => {
                // Find which course this class member belongs to
                for (const [courseId, classIds] of classIdsByCourse) {
                  if (classIds.includes(cm.course_class_id)) {
                    classMemberToCourse.set(cm.id, courseId);
                    break;
                  }
                }
              });

              const courseCompletion = new Map<number, { total: number; completed: number }>();
              for (const [cmId, stats] of progressByClassMember) {
                const courseId = classMemberToCourse.get(cmId);
                if (courseId) {
                  if (!courseCompletion.has(courseId)) {
                    courseCompletion.set(courseId, { total: 0, completed: 0 });
                  }
                  const courseStats = courseCompletion.get(courseId)!;
                  courseStats.total += stats.total;
                  courseStats.completed += stats.completed;
                }
              }

              for (const [courseId, stats] of courseCompletion) {
                completionByCourse.set(courseId, stats.total > 0 ? (stats.completed / stats.total) * 100 : 0);
              }
            }
          }
        }
      }

      // --- OPTIMIZATION: Single query for ALL reviews ---
      const { data: allReviews, error: reviewsError } = await supabase
        .from("course_reviews")
        .select("course_id, rating")
        .in("course_id", courseIds);

      if (reviewsError) {
        console.error("Error fetching reviews:", reviewsError);
      }

      const ratingByCourse = new Map<number, { sum: number; count: number }>();
      allReviews?.forEach((review: any) => {
        if (!ratingByCourse.has(review.course_id)) {
          ratingByCourse.set(review.course_id, { sum: 0, count: 0 });
        }
        const entry = ratingByCourse.get(review.course_id)!;
        entry.sum += review.rating;
        entry.count++;
      });

      // Build courses with stats
      const coursesWithStats = courses.map(course => ({
        id: course.id,
        title: course.title,
        students: studentCountByCourse.get(course.id) || 0,
        rating: (() => {
          const r = ratingByCourse.get(course.id);
          return r ? r.sum / r.count : 0;
        })(),
        completion: completionByCourse.get(course.id) || 0,
      }));

      const topCoursesSorted = [...coursesWithStats]
        .sort((a, b) => b.students - a.students)
        .slice(0, 3);

      const avgRating = coursesWithStats.reduce((sum, c) => sum + c.rating, 0) / (coursesWithStats.length || 1);
      const avgCompletion = coursesWithStats.reduce((sum, c) => sum + c.completion, 0) / (coursesWithStats.length || 1);

      setAdminStats({
        total_students: totalStudents,
        active_students: activeStudents,
        total_courses: totalCourses,
        published_courses: publishedCourses,
        average_rating: Math.round(avgRating * 10) / 10,
        completion_rate: Math.round(avgCompletion),
        pending_approvals: 0,
      });

      setTopCourses(topCoursesSorted);

    } catch (error) {
      console.error("Error loading admin data:", error);
    }
  };

  const switchOrganization = (orgId: number) => {
    setSelectedOrgId(orgId);
    setShowOrgSwitcher(false);
  };

  const currentOrg = organizations.find(o => o.id === selectedOrgId);

  // Available tabs based on user roles
  const availableTabs = [
    { id: "learning", label: "My Learning", icon: BookOpen, show: true },
    { id: "teaching", label: "My Teaching", icon: GraduationCap, show: userRoles.has("teacher") || userRoles.has("admin") },
    { id: "admin", label: "Organization Admin", icon: Crown, show: userRoles.has("admin") },
  ];

  // Show loading only during initial load
  if (loading && !initialLoadComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Show error if data load failed
  if (dataLoadError && organizations.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <GlowCard className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-400 mb-6">{dataLoadError}</p>
          <GlowButton onClick={() => window.location.reload()}>
            Refresh Page
          </GlowButton>
        </GlowCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with Organization Switcher */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {greeting}, {displayName}! 👋
            </h1>
            <p className="text-gray-400">
              Welcome to your dashboard
            </p>
          </div>

          {/* Organization Switcher - MODIFY to only show for students */}
          {organizations.length > 1 && (userRoles.has("admin") || userRoles.has("teacher")) ? (
            // Teachers/Admins: Show organization name as text, not a switcher
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg">
              <Building2 className="w-4 h-4 text-purple-400" />
              <span className="text-white">{currentOrg?.name}</span>
            </div>
          ) : organizations.length > 1 ? (
            // Students: Show organization switcher (keep existing)
            <div className="relative">
              <button
                onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Building2 className="w-4 h-4 text-purple-400" />
                <span className="text-white">{currentOrg?.name}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showOrgSwitcher ? "rotate-180" : ""}`} />
              </button>

              {showOrgSwitcher && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowOrgSwitcher(false)} />
                  <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 rounded-lg border border-slate-700 shadow-xl z-50">
                    {organizations.map(org => (
                      <button
                        key={org.id}
                        onClick={() => switchOrganization(org.id)}
                        className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-700 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          {org.role === "admin" && <Crown className="w-3 h-3 text-yellow-400" />}
                          {org.role === "teacher" && <GraduationCap className="w-3 h-3 text-blue-400" />}
                          {org.role === "student" && <School className="w-3 h-3 text-green-400" />}
                          <span className="text-sm text-white">{org.name}</span>
                        </div>
                        {selectedOrgId === org.id && (
                          <Check className="w-3 h-3 text-purple-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* Role-based Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            {availableTabs.filter(tab => tab.show).map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="data-[state=active]:bg-purple-600">
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* ========== STUDENT / MY LEARNING TAB ========== */}
          <TabsContent value="learning" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={BookOpen} label="Enrolled Courses" value={studentStats.total_courses} />
              <StatCard icon={Award} label="Completed Courses" value={studentStats.completed_courses} />
              <StatCard icon={Target} label="Avg. Progress" value={`${studentStats.average_progress}%`} />
              <StatCard icon={Clock} label="Current Streak" value={`${studentStats.streak_days} days`} />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Calendar */}
              <div className="lg:col-span-2">
                <LearningCalendar />
              </div>
              
              {/* Right Column - Upcoming Items */}
              <div className="space-y-6">
                <UpcomingItems items={upcomingDeadlines.map(d => ({
                  id: d.id,
                  title: d.title,
                  type: "assignment",
                  courseName: d.courses?.title || "Course",
                  date: new Date(d.due_at),
                  dueDate: new Date(d.due_at),
                }))} />
                <RecentItems items={recentActivity} />
              </div>
            </div>

            {/* Continue Learning Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Continue Learning</h2>
                <Link href="/courses">
                  <GlowButton variant="ghost" size="sm">View All →</GlowButton>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrolledCourses.length === 0 ? (
                  <GlowCard>
                    <div className="p-8 text-center">
                      <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No courses enrolled yet</p>
                      <Link href="/courses">
                        <GlowButton size="sm" className="mt-3">Browse Courses</GlowButton>
                      </Link>
                    </div>
                  </GlowCard>
                ) : (
                  enrolledCourses.slice(0, 4).map((course) => (
                    <GlowCard key={course.id} className="hover:shadow-lg transition-all">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white line-clamp-1">{course.title}</h3>
                            <p className="text-xs text-gray-400">{course.instructor_name}</p>
                          </div>
                          {course.certificate_earned && (
                            <Award className="w-5 h-5 text-yellow-400" />
                          )}
                        </div>

                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{course.progress}%</span>
                          </div>
                          <Progress value={course.progress} className="h-2" />
                        </div>

                        <div className="flex justify-between text-xs text-gray-400 mb-3">
                          <span>{course.completed_lessons}/{course.total_lessons} lessons</span>
                        </div>

                        <Link href={`/courses/${course.id}/learn`}>
                          <GlowButton variant="outline" size="sm" fullWidth>
                            Continue Learning
                          </GlowButton>
                        </Link>
                      </div>
                    </GlowCard>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* ========== TEACHER / MY TEACHING TAB ========== */}
          <TabsContent value="teaching" className="space-y-6">
            {/* Teacher Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Students" value={teacherStats.total_students} />
              <StatCard icon={BookOpen} label="Active Courses" value={teacherStats.active_courses} />
              <StatCard icon={Star} label="Avg. Rating" value={teacherStats.average_rating.toFixed(1)} />
              <StatCard icon={Target} label="Completion Rate" value={`${Math.round(teacherStats.completion_rate)}%`} />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <GlowButton onClick={() => router.push("/courses/create")}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Course
              </GlowButton>
            </div>

            {/* Pending Grading */}
            {pendingGrading.length > 0 && (
              <GlowCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Pending Grading</h3>
                  <div className="space-y-3">
                    {pendingGrading.map(assignment => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{assignment.title}</p>
                          <p className="text-sm text-gray-400">{assignment.course_name}</p>
                          <p className="text-xs text-orange-400 mt-1">{assignment.submissions} submissions pending</p>
                        </div>
                        <GlowButton size="sm" onClick={() => router.push(`/assignments/${assignment.id}/grade`)}>
                          Grade Now
                        </GlowButton>
                      </div>
                    ))}
                  </div>
                </div>
              </GlowCard>
            )}

            {/* My Courses */}
            <GlowCard>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">My Courses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teacherCourses.length === 0 ? (
                    <div className="col-span-2 text-center py-8 text-gray-400">
                      No courses created yet
                    </div>
                  ) : (
                    teacherCourses.map(course => (
                      <div key={course.id} className="flex items-center gap-4 p-3 bg-slate-800/30 rounded-lg">
                        <div className="w-16 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{course.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>{course.students} students</span>
                            <span>⭐ {course.rating.toFixed(1)}</span>
                            <Badge className={course.status === "published" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                              {course.status}
                            </Badge>
                          </div>
                        </div>
                        <GlowButton size="sm" variant="ghost" onClick={() => router.push(`/courses/${course.id}/edit`)}>
                          <Edit className="w-4 h-4" />
                        </GlowButton>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </GlowCard>
          </TabsContent>

          {/* ========== ADMIN / ORGANIZATION ADMIN TAB ========== */}
          <TabsContent value="admin" className="space-y-6">
            {/* Admin Stats (no loading spinner inside) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Students" value={adminStats.total_students} />
              <StatCard icon={Activity} label="Active Students" value={adminStats.active_students} />
              <StatCard icon={BookOpen} label="Published Courses" value={adminStats.published_courses} />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <Link href={`/organizations/${selectedOrgId}/admin`}>
                <GlowButton variant="primary">
                  <Settings className="w-4 h-4 mr-2" />
                  Organization Admin Panel
                </GlowButton>
              </Link>
            </div>

            {/* Top Courses */}
            {topCourses.length > 0 ? (
              <GlowCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Top Performing Courses</h3>
                  <div className="space-y-4">
                    {topCourses.map(course => (
                      <div key={course.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-white">{course.title}</p>
                          <p className="text-sm text-gray-400">{course.students} students</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span className="text-white">{course.rating.toFixed(1)}</span>
                          </div>
                          <p className="text-sm text-gray-400">{course.completion}% completion</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlowCard>
            ) : (
              <GlowCard>
                <div className="p-12 text-center">
                  <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Courses Yet</h3>
                  <p className="text-gray-400 mb-6">Create your first course to get started</p>
                  <Link href="/courses/create">
                    <GlowButton variant="primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Course
                    </GlowButton>
                  </Link>
                </div>
              </GlowCard>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}