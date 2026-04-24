// frontend/app/(main)/teacher/courses/[id]/classes/page.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Calendar,
  Users,
  Clock,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
  PlayCircle,
  Settings,
  Copy,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Class {
  id: number;
  courseId: number;
  name: string;
  startDate: Date;
  endDate: Date;
  maxStudents: number;
  enrolledStudents: number;
  status: "upcoming" | "ongoing" | "completed";
  instructor: string;
  schedule: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
}

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Mock classes data
const mockClasses: Class[] = [
  {
    id: 1,
    courseId: 1,
    name: "September 2024 Cohort",
    startDate: new Date("2024-09-01"),
    endDate: new Date("2024-12-15"),
    maxStudents: 50,
    enrolledStudents: 32,
    status: "upcoming",
    instructor: "John Doe",
    schedule: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "11:00" },
      { dayOfWeek: 3, startTime: "09:00", endTime: "11:00" },
    ],
  },
  {
    id: 2,
    courseId: 1,
    name: "January 2025 Cohort",
    startDate: new Date("2025-01-10"),
    endDate: new Date("2025-04-20"),
    maxStudents: 60,
    enrolledStudents: 45,
    status: "ongoing",
    instructor: "Jane Smith",
    schedule: [
      { dayOfWeek: 2, startTime: "14:00", endTime: "16:00" },
      { dayOfWeek: 4, startTime: "14:00", endTime: "16:00" },
    ],
  },
  {
    id: 3,
    courseId: 1,
    name: "March 2025 Cohort",
    startDate: new Date("2025-03-01"),
    endDate: new Date("2025-06-15"),
    maxStudents: 55,
    enrolledStudents: 55,
    status: "completed",
    instructor: "John Doe",
    schedule: [
      { dayOfWeek: 0, startTime: "18:00", endTime: "20:00" },
      { dayOfWeek: 2, startTime: "18:00", endTime: "20:00" },
    ],
  },
];

export default function ClassesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id;

  const [classes, setClasses] = useState<Class[]>(mockClasses);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge className="bg-blue-600/80 text-blue-200">Upcoming</Badge>;
      case "ongoing":
        return (
          <Badge className="bg-green-600/80 text-green-200">In Progress</Badge>
        );
      case "completed":
        return <Badge className="bg-gray-600/80 text-gray-200">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getScheduleDisplay = (schedule: Class["schedule"]) => {
    return schedule
      .map((s) => `${daysOfWeek[s.dayOfWeek]} ${s.startTime}-${s.endTime}`)
      .join(", ");
  };

  const handleDeleteClass = (classId: number) => {
    if (confirm("Are you sure you want to delete this class?")) {
      setClasses(classes.filter((c) => c.id !== classId));
      toast.success("Class deleted successfully");
    }
  };

  const handleDuplicateClass = (classToDuplicate: Class) => {
    const newClass: Class = {
      ...classToDuplicate,
      id: Math.max(...classes.map((c) => c.id), 0) + 1,
      name: `${classToDuplicate.name} (Copy)`,
      status: "upcoming",
      enrolledStudents: 0,
    };
    setClasses([...classes, newClass]);
    toast.success("Class duplicated successfully");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/teacher/courses/${courseId}/edit`}
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Course
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
                Classes / Batches
              </h1>
              <p className="text-gray-400 mt-2">
                Manage different cohorts and sessions of this course
              </p>
            </div>
            <GlowButton
              onClick={() => router.push(`/teacher/courses/${courseId}/classes/create`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Class
            </GlowButton>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <p className="text-sm text-purple-300">
            💡 Classes allow you to run multiple cohorts of the same course with
            different start dates, schedules, and student groups. Create a
            separate class for each batch of students.
          </p>
        </div>

        {/* Classes Grid */}
        {classes.length === 0 ? (
          <GlowCard>
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">No Classes Yet</h3>
              <p className="text-gray-400 text-sm mb-4">
                Create your first class to start managing cohorts
              </p>
              <GlowButton
                onClick={() =>
                  router.push(`/teacher/courses/${courseId}/classes/create`)
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Class
              </GlowButton>
            </div>
          </GlowCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {classes.map((classItem) => (
              <GlowCard key={classItem.id}>
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold text-white">
                          {classItem.name}
                        </h3>
                        {getStatusBadge(classItem.status)}
                      </div>
                      <p className="text-sm text-gray-400">
                        Instructor: {classItem.instructor}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDuplicateClass(classItem)}
                        className="p-1 text-gray-400 hover:text-purple-400 transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClass(classItem.id)}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-300">
                        {classItem.startDate.toLocaleDateString()} -{" "}
                        {classItem.endDate.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-300">
                        {getScheduleDisplay(classItem.schedule)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-300">
                        {classItem.enrolledStudents} / {classItem.maxStudents}{" "}
                        students enrolled
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            (classItem.enrolledStudents / classItem.maxStudents) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <GlowButton
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        router.push(
                          `/teacher/courses/${courseId}/classes/${classItem.id}/manage`
                        )
                      }
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Manage Students
                    </GlowButton>
                    <GlowButton
                      size="sm"
                      variant="primary"
                      className="flex-1"
                      onClick={() =>
                        router.push(
                          `/teacher/courses/${courseId}/classes/${classItem.id}/progress`
                        )
                      }
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Progress
                    </GlowButton>
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}