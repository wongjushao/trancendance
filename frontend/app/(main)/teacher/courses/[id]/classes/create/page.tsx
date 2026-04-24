"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Users,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ClassFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  maxStudents: number;
  instructorNotes: string;
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

export default function CreateClassPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id;

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<ClassFormData>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    maxStudents: 50,
    instructorNotes: "",
    schedule: [],
  });

  const [newSchedule, setNewSchedule] = useState({
    dayOfWeek: 0,
    startTime: "09:00",
    endTime: "11:00",
  });

  const addSchedule = () => {
    setFormData({
      ...formData,
      schedule: [...formData.schedule, newSchedule],
    });
    setNewSchedule({
      dayOfWeek: 0,
      startTime: "09:00",
      endTime: "11:00",
    });
  };

  const removeSchedule = (index: number) => {
    setFormData({
      ...formData,
      schedule: formData.schedule.filter((_, i) => i !== index),
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Class name is required";
    }
    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }
    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    }
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        newErrors.endDate = "End date must be after start date";
      }
    }
    if (formData.schedule.length === 0) {
      newErrors.schedule = "At least one schedule is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors above");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log("Creating class:", {
      courseId,
      ...formData,
    });

    toast.success("Class created successfully!");
    router.push(`/teacher/courses/${courseId}/classes`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={`/teacher/courses/${courseId}/classes`}
          className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Classes
        </Link>

        <GlowCard>
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white">Create New Class</h1>
              <p className="text-gray-400 mt-1">
                Create a new cohort/batch for your course
              </p>
            </div>

            <div className="space-y-6">
              {/* Class Name */}
              <div>
                <Label className="text-white mb-2 block">
                  Class Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  placeholder="e.g., September 2024 Cohort, Morning Batch"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className={`bg-gray-800/50 border-gray-700 text-white ${
                    errors.name ? "border-red-500" : ""
                  }`}
                />
                {errors.name && (
                  <p className="text-red-400 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <Label className="text-white mb-2 block">Description</Label>
                <Textarea
                  placeholder="Describe this class/batch..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white mb-2 block">
                    Start Date <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className={`bg-gray-800/50 border-gray-700 text-white ${
                      errors.startDate ? "border-red-500" : ""
                    }`}
                  />
                  {errors.startDate && (
                    <p className="text-red-400 text-sm mt-1">{errors.startDate}</p>
                  )}
                </div>
                <div>
                  <Label className="text-white mb-2 block">
                    End Date <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className={`bg-gray-800/50 border-gray-700 text-white ${
                      errors.endDate ? "border-red-500" : ""
                    }`}
                  />
                  {errors.endDate && (
                    <p className="text-red-400 text-sm mt-1">{errors.endDate}</p>
                  )}
                </div>
              </div>

              {/* Max Students */}
              <div>
                <Label className="text-white mb-2 block">Maximum Students</Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={formData.maxStudents}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxStudents: parseInt(e.target.value),
                    })
                  }
                  className="bg-gray-800/50 border-gray-700 text-white w-48"
                />
              </div>

              {/* Schedule */}
              <div>
                <Label className="text-white mb-2 block">
                  Class Schedule <span className="text-red-400">*</span>
                </Label>
                <div className="space-y-3">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Label className="text-gray-400 text-sm">Day</Label>
                      <select
                        value={newSchedule.dayOfWeek}
                        onChange={(e) =>
                          setNewSchedule({
                            ...newSchedule,
                            dayOfWeek: parseInt(e.target.value),
                          })
                        }
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                      >
                        {daysOfWeek.map((day, idx) => (
                          <option key={idx} value={idx}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-gray-400 text-sm">Start Time</Label>
                      <Input
                        type="time"
                        value={newSchedule.startTime}
                        onChange={(e) =>
                          setNewSchedule({
                            ...newSchedule,
                            startTime: e.target.value,
                          })
                        }
                        className="bg-gray-800/50 border-gray-700 text-white"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-gray-400 text-sm">End Time</Label>
                      <Input
                        type="time"
                        value={newSchedule.endTime}
                        onChange={(e) =>
                          setNewSchedule({
                            ...newSchedule,
                            endTime: e.target.value,
                          })
                        }
                        className="bg-gray-800/50 border-gray-700 text-white"
                      />
                    </div>
                    <GlowButton size="sm" onClick={addSchedule}>
                      <Plus className="w-4 h-4" />
                    </GlowButton>
                  </div>

                  {/* Schedule List */}
                  <div className="space-y-2 mt-3">
                    {formData.schedule.map((schedule, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Calendar className="w-4 h-4 text-purple-400" />
                          <span className="text-gray-300">
                            {daysOfWeek[schedule.dayOfWeek]}
                          </span>
                          <Clock className="w-4 h-4 text-purple-400 ml-2" />
                          <span className="text-gray-300">
                            {schedule.startTime} - {schedule.endTime}
                          </span>
                        </div>
                        <button
                          onClick={() => removeSchedule(idx)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {errors.schedule && (
                    <p className="text-red-400 text-sm mt-1">{errors.schedule}</p>
                  )}
                </div>
              </div>

              {/* Instructor Notes */}
              <div>
                <Label className="text-white mb-2 block">
                  Instructor Notes (Private)
                </Label>
                <Textarea
                  placeholder="Notes only visible to instructors..."
                  rows={3}
                  value={formData.instructorNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, instructorNotes: e.target.value })
                  }
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-300">
                    Classes allow you to run multiple cohorts of the same course
                    with different start dates and schedules. Students will be
                    able to see their class-specific deadlines and progress.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <GlowButton
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </GlowButton>
                <GlowButton
                  variant="primary"
                  onClick={handleSubmit}
                  isLoading={isLoading}
                >
                  Create Class
                </GlowButton>
              </div>
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}