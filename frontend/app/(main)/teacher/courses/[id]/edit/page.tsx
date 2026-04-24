// frontend/app/(main)/teacher/courses/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Video,
  FileText,
  FileQuestion,
  ClipboardList,
  MoreVertical,
  Save,
  Eye,
  X,
  Clock,
  Upload,
  Link as LinkIcon,
  Settings,
  Users,
  BarChart3,
  Copy,
  MoveUp,
  MoveDown,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  FolderOpen,  // ← ADD THIS
  Layers,      // ← ADD THIS (if used)
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Assignment {
  id: number;
  title: string;
  description: string;
  dueDate: Date;
  points: number;
}

interface Lesson {
  id: number;
  title: string;
  content_type: "video" | "text" | "quiz" | "assignment";
  content_url?: string;
  content_json?: any;
  duration: string;
  orderIndex: number;
  isPublished: boolean;
  assignment?: Assignment;
}

interface Module {
  id: number;
  title: string;
  orderIndex: number;
  lessons: Lesson[];
}

interface Course {
  id: number;
  title: string;
  description: string;
  status: "draft" | "published";
}

// Mock data
const mockCourse: Course = {
  id: 1,
  title: "Advanced React Patterns",
  description: "Master advanced React patterns and best practices",
  status: "draft",
};

const mockModules: Module[] = [
  {
    id: 1,
    title: "Getting Started",
    orderIndex: 1,
    lessons: [
      {
        id: 1,
        title: "Welcome to the Course",
        content_type: "video",
        content_url: "https://example.com/video1",
        duration: "05:30",
        orderIndex: 1,
        isPublished: true,
      },
      {
        id: 2,
        title: "Course Overview",
        content_type: "text",
        duration: "10:00",
        orderIndex: 2,
        isPublished: true,
      },
    ],
  },
  {
    id: 2,
    title: "Core Concepts",
    orderIndex: 2,
    lessons: [
      {
        id: 3,
        title: "Understanding Compound Components",
        content_type: "video",
        duration: "15:00",
        orderIndex: 1,
        isPublished: true,
      },
      {
        id: 4,
        title: "Building a Toggle Component",
        content_type: "video",
        duration: "30:00",
        orderIndex: 2,
        isPublished: false,
        assignment: {
          id: 1,
          title: "Toggle Component Exercise",
          description: "Build a reusable toggle component with compound component pattern",
          dueDate: new Date("2024-04-30"),
          points: 100,
        },
      },
      {
        id: 5,
        title: "Quiz: Compound Components",
        content_type: "quiz",
        duration: "15:00",
        orderIndex: 3,
        isPublished: false,
      },
    ],
  },
  {
    id: 3,
    title: "Advanced Patterns",
    orderIndex: 3,
    lessons: [],
  },
];

const contentTypes = [
  { value: "video", label: "Video Lesson", icon: Video, color: "blue" },
  { value: "text", label: "Text Lesson", icon: FileText, color: "green" },
  { value: "quiz", label: "Quiz", icon: FileQuestion, color: "purple" },
  { value: "assignment", label: "Assignment", icon: ClipboardList, color: "orange" },
];

export default function CourseEditPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id;

  const [course, setCourse] = useState<Course>(mockCourse);
  const [modules, setModules] = useState<Module[]>(mockModules);
  const [expandedModules, setExpandedModules] = useState<number[]>([1, 2]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [isEditingModule, setIsEditingModule] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("curriculum");

  // Form states
  const [moduleTitle, setModuleTitle] = useState("");
  const [lessonForm, setLessonForm] = useState<Partial<Lesson>>({
    title: "",
    content_type: "video",
    content_url: "",
    duration: "",
    isPublished: false,
  });
  const [assignmentForm, setAssignmentForm] = useState<Partial<Assignment>>({
    title: "",
    description: "",
    points: 100,
    dueDate: new Date(),
  });

  const toggleModule = (moduleId: number) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const getContentTypeIcon = (type: string) => {
    const ct = contentTypes.find((t) => t.value === type);
    if (!ct) return <FileText className="w-4 h-4" />;
    const Icon = ct.icon;
    return <Icon className="w-4 h-4" />;
  };

  const getContentTypeColor = (type: string) => {
    const ct = contentTypes.find((t) => t.value === type);
    return ct?.color || "gray";
  };

  // Module CRUD
  const openAddModuleModal = () => {
    setIsEditingModule(false);
    setModuleTitle("");
    setIsModuleModalOpen(true);
  };

  const openEditModuleModal = (module: Module) => {
    setIsEditingModule(true);
    setSelectedModule(module);
    setModuleTitle(module.title);
    setIsModuleModalOpen(true);
  };

  const saveModule = () => {
    if (!moduleTitle.trim()) {
      toast.error("Module title is required");
      return;
    }

    if (isEditingModule && selectedModule) {
      // Update existing module
      setModules(
        modules.map((m) =>
          m.id === selectedModule.id ? { ...m, title: moduleTitle } : m
        )
      );
      toast.success("Module updated successfully");
    } else {
      // Add new module
      const newModule: Module = {
        id: Math.max(...modules.map((m) => m.id), 0) + 1,
        title: moduleTitle,
        orderIndex: modules.length + 1,
        lessons: [],
      };
      setModules([...modules, newModule]);
      toast.success("Module created successfully");
    }

    setIsModuleModalOpen(false);
    setModuleTitle("");
    setSelectedModule(null);
  };

  const deleteModule = (moduleId: number) => {
    if (confirm("Are you sure you want to delete this module? All lessons will be deleted.")) {
      setModules(modules.filter((m) => m.id !== moduleId));
      toast.success("Module deleted");
    }
  };

  // Lesson CRUD
  const openAddLessonModal = (module: Module) => {
    setIsEditingLesson(false);
    setSelectedModule(module);
    setLessonForm({
      title: "",
      content_type: "video",
      content_url: "",
      duration: "",
      isPublished: false,
    });
    setIsLessonModalOpen(true);
  };

  const openEditLessonModal = (module: Module, lesson: Lesson) => {
    setIsEditingLesson(true);
    setSelectedModule(module);
    setSelectedLesson(lesson);
    setLessonForm({
      title: lesson.title,
      content_type: lesson.content_type,
      content_url: lesson.content_url || "",
      duration: lesson.duration,
      isPublished: lesson.isPublished,
    });
    setIsLessonModalOpen(true);
  };

  const saveLesson = () => {
    if (!lessonForm.title?.trim()) {
      toast.error("Lesson title is required");
      return;
    }

    if (!selectedModule) return;

    if (isEditingLesson && selectedLesson) {
      // Update existing lesson
      setModules(
        modules.map((m) =>
          m.id === selectedModule.id
            ? {
                ...m,
                lessons: m.lessons.map((l) =>
                  l.id === selectedLesson.id
                    ? {
                        ...l,
                        title: lessonForm.title!,
                        content_type: lessonForm.content_type!,
                        content_url: lessonForm.content_url,
                        duration: lessonForm.duration || "00:00",
                        isPublished: lessonForm.isPublished || false,
                      }
                    : l
                ),
              }
            : m
        )
      );
      toast.success("Lesson updated successfully");
    } else {
      // Add new lesson
      const newLesson: Lesson = {
        id: Math.max(...modules.flatMap((m) => m.lessons.map((l) => l.id)), 0) + 1,
        title: lessonForm.title!,
        content_type: lessonForm.content_type!,
        content_url: lessonForm.content_url,
        duration: lessonForm.duration || "00:00",
        orderIndex: selectedModule.lessons.length + 1,
        isPublished: lessonForm.isPublished || false,
      };
      setModules(
        modules.map((m) =>
          m.id === selectedModule.id
            ? { ...m, lessons: [...m.lessons, newLesson] }
            : m
        )
      );
      toast.success("Lesson created successfully");
    }

    setIsLessonModalOpen(false);
    setSelectedModule(null);
    setSelectedLesson(null);
    setLessonForm({
      title: "",
      content_type: "video",
      content_url: "",
      duration: "",
      isPublished: false,
    });
  };

  const deleteLesson = (moduleId: number, lessonId: number) => {
    if (confirm("Are you sure you want to delete this lesson?")) {
      setModules(
        modules.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }
            : m
        )
      );
      toast.success("Lesson deleted");
    }
  };

  // Assignment CRUD
  const openAssignmentModal = (module: Module, lesson: Lesson) => {
    setSelectedModule(module);
    setSelectedLesson(lesson);
    setAssignmentForm({
      title: lesson.assignment?.title || "",
      description: lesson.assignment?.description || "",
      points: lesson.assignment?.points || 100,
      dueDate: lesson.assignment?.dueDate || new Date(),
    });
    setIsAssignmentModalOpen(true);
  };

  const saveAssignment = () => {
    if (!selectedModule || !selectedLesson) return;

    if (!assignmentForm.title?.trim()) {
      toast.error("Assignment title is required");
      return;
    }

    const newAssignment: Assignment = {
      id: selectedLesson.assignment?.id || Math.floor(Math.random() * 1000),
      title: assignmentForm.title!,
      description: assignmentForm.description || "",
      dueDate: assignmentForm.dueDate || new Date(),
      points: assignmentForm.points || 100,
    };

    setModules(
      modules.map((m) =>
        m.id === selectedModule.id
          ? {
              ...m,
              lessons: m.lessons.map((l) =>
                l.id === selectedLesson.id ? { ...l, assignment: newAssignment } : l
              ),
            }
          : m
      )
    );

    toast.success("Assignment saved successfully");
    setIsAssignmentModalOpen(false);
  };

  const deleteAssignment = (moduleId: number, lessonId: number) => {
    if (confirm("Are you sure you want to remove the assignment from this lesson?")) {
      setModules(
        modules.map((m) =>
          m.id === moduleId
            ? {
                ...m,
                lessons: m.lessons.map((l) =>
                  l.id === lessonId ? { ...l, assignment: undefined } : l
                ),
              }
            : m
        )
      );
      toast.success("Assignment removed");
    }
  };

  // Reorder functions
  const moveModuleUp = (index: number) => {
    if (index === 0) return;
    const newModules = [...modules];
    [newModules[index - 1], newModules[index]] = [newModules[index], newModules[index - 1]];
    newModules.forEach((m, idx) => (m.orderIndex = idx + 1));
    setModules(newModules);
    toast.success("Module reordered");
  };

  const moveModuleDown = (index: number) => {
    if (index === modules.length - 1) return;
    const newModules = [...modules];
    [newModules[index + 1], newModules[index]] = [newModules[index], newModules[index + 1]];
    newModules.forEach((m, idx) => (m.orderIndex = idx + 1));
    setModules(newModules);
    toast.success("Module reordered");
  };

  const moveLessonUp = (moduleIndex: number, lessonIndex: number) => {
    if (lessonIndex === 0) return;
    const newModules = [...modules];
    const lessons = newModules[moduleIndex].lessons;
    [lessons[lessonIndex - 1], lessons[lessonIndex]] = [lessons[lessonIndex], lessons[lessonIndex - 1]];
    lessons.forEach((l, idx) => (l.orderIndex = idx + 1));
    setModules(newModules);
    toast.success("Lesson reordered");
  };

  const moveLessonDown = (moduleIndex: number, lessonIndex: number) => {
    const module = modules[moduleIndex];
    if (lessonIndex === module.lessons.length - 1) return;
    const newModules = [...modules];
    const lessons = newModules[moduleIndex].lessons;
    [lessons[lessonIndex + 1], lessons[lessonIndex]] = [lessons[lessonIndex], lessons[lessonIndex + 1]];
    lessons.forEach((l, idx) => (l.orderIndex = idx + 1));
    setModules(newModules);
    toast.success("Lesson reordered");
  };

  const publishCourse = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setCourse({ ...course, status: "published" });
    toast.success("Course published successfully!");
    setIsLoading(false);
  };

  const saveDraft = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Course saved as draft");
    setIsLoading(false);
  };

  const getTotalLessons = () => {
    return modules.reduce((acc, m) => acc + m.lessons.length, 0);
  };

  const getPublishedLessons = () => {
    return modules.reduce(
      (acc, m) => acc + m.lessons.filter((l) => l.isPublished).length,
      0
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/teacher"
                className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
                  {course.title}
                </h1>
                <Badge
                  className={
                    course.status === "published"
                      ? "bg-green-600/80"
                      : "bg-yellow-600/80"
                  }
                >
                  {course.status === "published" ? "Published" : "Draft"}
                </Badge>
              </div>
              <p className="text-gray-400 mt-2">{course.description}</p>
            </div>
            <div className="flex gap-3">
              <GlowButton
                variant="outline"
                onClick={saveDraft}
                isLoading={isLoading}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </GlowButton>
              {course.status !== "published" && (
                <GlowButton variant="primary" onClick={publishCourse} isLoading={isLoading}>
                  <Eye className="w-4 h-4 mr-2" />
                  Publish Course
                </GlowButton>
              )}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <FolderOpen className="w-4 h-4" />
              <span className="text-sm">Total Modules</span>
            </div>
            <p className="text-2xl font-bold text-white">{modules.length}</p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Video className="w-4 h-4" />
              <span className="text-sm">Total Lessons</span>
            </div>
            <p className="text-2xl font-bold text-white">{getTotalLessons()}</p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Published</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {getPublishedLessons()} / {getTotalLessons()}
            </p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <ClipboardList className="w-4 h-4" />
              <span className="text-sm">Assignments</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {modules.reduce((acc, m) => acc + m.lessons.filter((l) => l.assignment).length, 0)}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Course Info */}
          <div className="lg:col-span-1">
            <GlowCard>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Course Settings
                </h3>
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveTab("curriculum")}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-3 ${
                      activeTab === "curriculum"
                        ? "bg-purple-600/20 text-purple-400"
                        : "text-gray-400 hover:bg-gray-800/50"
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Curriculum</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("settings")}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-3 ${
                      activeTab === "settings"
                        ? "bg-purple-600/20 text-purple-400"
                        : "text-gray-400 hover:bg-gray-800/50"
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Course Settings</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("analytics")}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-3 ${
                      activeTab === "analytics"
                        ? "bg-purple-600/20 text-purple-400"
                        : "text-gray-400 hover:bg-gray-800/50"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Analytics</span>
                  </button>
                  <button
                    onClick={() => router.push(`/teacher/courses/${courseId}/classes`)}
                    className="w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-3 text-gray-400 hover:bg-gray-800/50"
                  >
                    <Users className="w-4 h-4" />
                    <span>Classes</span>
                  </button>
                </nav>
              </div>
            </GlowCard>

            <GlowCard className="mt-6">
              <div className="p-5">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Quick Tips
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-purple-400 mt-0.5" />
                    <p className="text-sm text-gray-400">
                      Break your course into digestible modules of 3-5 lessons each
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-purple-400 mt-0.5" />
                    <p className="text-sm text-gray-400">
                      Add assignments to reinforce key concepts
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-purple-400 mt-0.5" />
                    <p className="text-sm text-gray-400">
                      Preview your course before publishing
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>
          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-3">
            <GlowCard>
              <div className="p-6">
                {/* Curriculum Tab */}
                {activeTab === "curriculum" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-xl font-semibold text-white">
                          Course Curriculum
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                          Organize your course into modules and lessons
                        </p>
                      </div>
                      <GlowButton onClick={openAddModuleModal}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Module
                      </GlowButton>
                    </div>

                    {/* Modules List */}
                    <div className="space-y-4">
                      {modules.map((module, moduleIdx) => (
                        <div
                          key={module.id}
                          className="border border-gray-800 rounded-lg overflow-hidden"
                        >
                          {/* Module Header */}
                          <div className="bg-gray-800/50 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleModule(module.id)}
                                className="text-gray-400 hover:text-white"
                              >
                                {expandedModules.includes(module.id) ? (
                                  <ChevronDown className="w-5 h-5" />
                                ) : (
                                  <ChevronRight className="w-5 h-5" />
                                )}
                              </button>
                              <GripVertical className="w-4 h-4 text-gray-500 cursor-move" />
                              <h3 className="text-white font-medium">
                                Module {module.orderIndex}: {module.title}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {module.lessons.length} lessons
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => moveModuleUp(moduleIdx)}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                title="Move Up"
                              >
                                <MoveUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => moveModuleDown(moduleIdx)}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                title="Move Down"
                              >
                                <MoveDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEditModuleModal(module)}
                                className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteModule(module.id)}
                                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Module Lessons */}
                          {expandedModules.includes(module.id) && (
                            <div className="p-4 space-y-3">
                              {module.lessons.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                  <p>No lessons yet</p>
                                  <GlowButton
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={() => openAddLessonModal(module)}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add First Lesson
                                  </GlowButton>
                                </div>
                              ) : (
                                <>
                                  {module.lessons.map((lesson, lessonIdx) => (
                                    <div
                                      key={lesson.id}
                                      className="bg-gray-800/30 rounded-lg p-3 flex items-center justify-between group"
                                    >
                                      <div className="flex items-center gap-3 flex-1">
                                        <GripVertical className="w-4 h-4 text-gray-500 cursor-move" />
                                        <div
                                          className={`p-1.5 rounded bg-${getContentTypeColor(
                                            lesson.content_type
                                          )}-500/20`}
                                        >
                                          {getContentTypeIcon(lesson.content_type)}
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <p className="text-white font-medium">
                                              {lesson.title}
                                            </p>
                                            {lesson.isPublished ? (
                                              <Badge className="bg-green-600/20 text-green-400 text-xs">
                                                Published
                                              </Badge>
                                            ) : (
                                              <Badge className="bg-yellow-600/20 text-yellow-400 text-xs">
                                                Draft
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-gray-500 capitalize">
                                              {lesson.content_type}
                                            </span>
                                            {lesson.duration && (
                                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {lesson.duration}
                                              </span>
                                            )}
                                            {lesson.assignment && (
                                              <span className="text-xs text-purple-400 flex items-center gap-1">
                                                <ClipboardList className="w-3 h-3" />
                                                Assignment: {lesson.assignment.points} pts
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => moveLessonUp(moduleIdx, lessonIdx)}
                                          className="p-1 text-gray-400 hover:text-white"
                                          disabled={lessonIdx === 0}
                                        >
                                          <MoveUp className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => moveLessonDown(moduleIdx, lessonIdx)}
                                          className="p-1 text-gray-400 hover:text-white"
                                          disabled={lessonIdx === module.lessons.length - 1}
                                        >
                                          <MoveDown className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => openEditLessonModal(module, lesson)}
                                          className="p-1 text-gray-400 hover:text-blue-400"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </button>
                                        {lesson.content_type === "assignment" ||
                                        lesson.assignment ? (
                                          <button
                                            onClick={() => openAssignmentModal(module, lesson)}
                                            className="p-1 text-gray-400 hover:text-purple-400"
                                          >
                                            <ClipboardList className="w-3 h-3" />
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => openAssignmentModal(module, lesson)}
                                            className="p-1 text-gray-400 hover:text-green-400"
                                          >
                                            <Plus className="w-3 h-3" />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => deleteLesson(module.id, lesson.id)}
                                          className="p-1 text-gray-400 hover:text-red-400"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  <GlowButton
                                    variant="outline"
                                    size="sm"
                                    fullWidth
                                    onClick={() => openAddLessonModal(module)}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add Lesson
                                  </GlowButton>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === "settings" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white">
                      Course Settings
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-white mb-2 block">
                          Course Title
                        </Label>
                        <Input
                          value={course.title}
                          onChange={(e) =>
                            setCourse({ ...course, title: e.target.value })
                          }
                          className="bg-gray-800/50 border-gray-700 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white mb-2 block">
                          Course Description
                        </Label>
                        <Textarea
                          rows={4}
                          value={course.description}
                          onChange={(e) =>
                            setCourse({ ...course, description: e.target.value })
                          }
                          className="bg-gray-800/50 border-gray-700 text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Analytics Tab */}
                {activeTab === "analytics" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white">
                      Course Analytics
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold text-white">0</p>
                        <p className="text-sm text-gray-400">Total Enrollments</p>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold text-white">0%</p>
                        <p className="text-sm text-gray-400">Completion Rate</p>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold text-white">0.0</p>
                        <p className="text-sm text-gray-400">Average Rating</p>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold text-white">0</p>
                        <p className="text-sm text-gray-400">Student Reviews</p>
                      </div>
                    </div>
                    <div className="text-center text-gray-500 py-8">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Analytics will appear once students enroll</p>
                    </div>
                  </div>
                )}
              </div>
            </GlowCard>
          </div>
        </div>
      </div>

      {/* Add/Edit Module Modal */}
      <Dialog open={isModuleModalOpen} onOpenChange={setIsModuleModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              {isEditingModule ? "Edit Module" : "Add New Module"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white mb-2 block">Module Title</Label>
              <Input
                placeholder="e.g., Introduction, Core Concepts, Advanced Topics"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                className="bg-gray-800/50 border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <GlowButton variant="outline" onClick={() => setIsModuleModalOpen(false)}>
              Cancel
            </GlowButton>
            <GlowButton variant="primary" onClick={saveModule}>
              {isEditingModule ? "Save Changes" : "Create Module"}
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Lesson Modal */}
      <Dialog open={isLessonModalOpen} onOpenChange={setIsLessonModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {isEditingLesson ? "Edit Lesson" : "Add New Lesson"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white mb-2 block">Lesson Title</Label>
              <Input
                placeholder="e.g., Introduction to React"
                value={lessonForm.title}
                onChange={(e) =>
                  setLessonForm({ ...lessonForm, title: e.target.value })
                }
                className="bg-gray-800/50 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white mb-2 block">Content Type</Label>
              <Select
                value={lessonForm.content_type}
                onValueChange={(value: any) =>
                  setLessonForm({ ...lessonForm, content_type: value })
                }
              >
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        {getContentTypeIcon(type.value)}
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {lessonForm.content_type === "video" && (
              <div>
                <Label className="text-white mb-2 block">Video URL</Label>
                <Input
                  placeholder="https://example.com/video.mp4"
                  value={lessonForm.content_url}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, content_url: e.target.value })
                  }
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
            )}
            <div>
              <Label className="text-white mb-2 block">Duration (MM:SS)</Label>
              <Input
                placeholder="15:30"
                value={lessonForm.duration}
                onChange={(e) =>
                  setLessonForm({ ...lessonForm, duration: e.target.value })
                }
                className="bg-gray-800/50 border-gray-700 text-white w-32"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-white">Publish Immediately</Label>
              <Switch
                checked={lessonForm.isPublished}
                onCheckedChange={(checked) =>
                  setLessonForm({ ...lessonForm, isPublished: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <GlowButton variant="outline" onClick={() => setIsLessonModalOpen(false)}>
              Cancel
            </GlowButton>
            <GlowButton variant="primary" onClick={saveLesson}>
              {isEditingLesson ? "Save Changes" : "Create Lesson"}
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Modal */}
      <Dialog open={isAssignmentModalOpen} onOpenChange={setIsAssignmentModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedLesson?.assignment ? "Edit Assignment" : "Add Assignment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white mb-2 block">Assignment Title</Label>
              <Input
                placeholder="e.g., Component Exercise"
                value={assignmentForm.title}
                onChange={(e) =>
                  setAssignmentForm({ ...assignmentForm, title: e.target.value })
                }
                className="bg-gray-800/50 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white mb-2 block">Description</Label>
              <Textarea
                rows={4}
                placeholder="Describe what students need to do..."
                value={assignmentForm.description}
                onChange={(e) =>
                  setAssignmentForm({ ...assignmentForm, description: e.target.value })
                }
                className="bg-gray-800/50 border-gray-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Due Date</Label>
                <Input
                  type="date"
                  value={
                    assignmentForm.dueDate
                      ? new Date(assignmentForm.dueDate).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      dueDate: new Date(e.target.value),
                    })
                  }
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white mb-2 block">Points</Label>
                <Input
                  type="number"
                  min={0}
                  max={1000}
                  value={assignmentForm.points}
                  onChange={(e) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      points: parseInt(e.target.value),
                    })
                  }
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            {selectedLesson?.assignment && (
              <GlowButton
                variant="outline"
                onClick={() => {
                  if (selectedModule && selectedLesson) {
                    deleteAssignment(selectedModule.id, selectedLesson.id);
                    setIsAssignmentModalOpen(false);
                  }
                }}
                className="mr-auto text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Assignment
              </GlowButton>
            )}
            <GlowButton variant="outline" onClick={() => setIsAssignmentModalOpen(false)}>
              Cancel
            </GlowButton>
            <GlowButton variant="primary" onClick={saveAssignment}>
              Save Assignment
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}