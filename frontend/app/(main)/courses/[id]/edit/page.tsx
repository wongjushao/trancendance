"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  ChevronDown,
  ChevronRight,
  Video,
  FileText,
  FileQuestion,
  ClipboardList,
  Save,
  Eye,
  Settings,
  Users,
  BarChart3,
  MoveUp,
  MoveDown,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  FolderOpen,
  Layers,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface Class {
  id: number;
  title: string;
  module_id: number;
  order_index: number;
}

interface Lesson {
  id: number;
  title: string;
  content_type: string;
  content_url: string | null;
  content_json: any;
  order_index: number;
  class_id: number;
}

interface Module {
  id: number;
  title: string;
  order_index: number;
  course_id: number;
  classes: Class[];
}

interface Course {
  id: number;
  title: string;
  description: string | null;
  visibility: string;
  created_by: string;
}

// Note: assignments table does NOT have a points column in your schema
// Only: id, course_id, lesson_id, title, description, due_at, created_at
interface Assignment {
  id: number;
  title: string;
  description: string | null;
  due_at: string | null;
  lesson_id: number;
  course_id: number;
}

const contentTypes = [
  { value: "video", label: "Video Lesson", icon: Video, color: "blue" },
  { value: "text", label: "Text Lesson", icon: FileText, color: "green" },
  { value: "quiz", label: "Quiz", icon: FileQuestion, color: "purple" },
];

export default function CourseEditPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModules, setExpandedModules] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modal states
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  
  // Edit states
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [selectedModuleForClass, setSelectedModuleForClass] = useState<Module | null>(null);
  const [selectedClassForLesson, setSelectedClassForLesson] = useState<Class | null>(null);
  
  // Form states
  const [moduleTitle, setModuleTitle] = useState("");
  const [classTitle, setClassTitle] = useState("");
  const [lessonForm, setLessonForm] = useState({
    title: "",
    content_type: "video",
    // Video lesson fields
    video_url: "",
    video_notes: "",
    // Text lesson fields
    text_content: "",
    // Quiz lesson fields
    quiz_questions: [] as Array<{
      question: string;
      type: "multiple_choice" | "true_false" | "short_answer";
      options?: string[];
      correct_answer: string | number;
    }>,
  });
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    due_at: "",
  });
  const [activeTab, setActiveTab] = useState("curriculum");

  // Load course data
  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      
      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();
      
      if (courseError) throw courseError;
      setCourse(courseData);
      
      // Fetch modules
      const { data: modulesData, error: modulesError } = await supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });
      
      if (modulesError) throw modulesError;
      
      // For each module, fetch its classes
      const modulesWithClasses = await Promise.all(
        (modulesData || []).map(async (module) => {
          const { data: classesData, error: classesError } = await supabase
            .from("classes")
            .select("*")
            .eq("module_id", module.id)
            .order("order_index", { ascending: true });
          
          if (classesError) throw classesError;
          
          // For each class, fetch its lessons
          const classesWithLessons = await Promise.all(
            (classesData || []).map(async (classItem) => {
              const { data: lessonsData, error: lessonsError } = await supabase
                .from("lessons")
                .select("*")
                .eq("class_id", classItem.id)
                .order("order_index", { ascending: true });
              
              if (lessonsError) throw lessonsError;
              
              // For each lesson, fetch assignment if exists
              const lessonsWithAssignments = await Promise.all(
                (lessonsData || []).map(async (lesson) => {
                  const { data: assignmentData, error: assignmentError } = await supabase
                    .from("assignments")
                    .select("*")
                    .eq("lesson_id", lesson.id)
                    .maybeSingle();
                  
                  if (assignmentError && assignmentError.code !== "PGRST116") throw assignmentError;
                  
                  return { ...lesson, assignment: assignmentData || null };
                })
              );
              
              return { ...classItem, lessons: lessonsWithAssignments };
            })
          );
          
          return { ...module, classes: classesWithLessons };
        })
      );
      
      setModules(modulesWithClasses);
      
      // Auto-expand first module
      if (modulesWithClasses.length > 0 && expandedModules.length === 0) {
        setExpandedModules([modulesWithClasses[0].id]);
      }
      
    } catch (error) {
      console.error("Error fetching course data:", error);
      toast.error("Failed to load course data");
    } finally {
      setLoading(false);
    }
  };

  // Module CRUD
  const openAddModuleModal = () => {
    setEditingModule(null);
    setModuleTitle("");
    setIsModuleModalOpen(true);
  };

  const openEditModuleModal = (module: Module) => {
    setEditingModule(module);
    setModuleTitle(module.title);
    setIsModuleModalOpen(true);
  };

  const saveModule = async () => {
    if (!moduleTitle.trim()) {
      toast.error("Module title is required");
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();

      if (editingModule) {
        const { error } = await supabase
          .from("modules")
          .update({ title: moduleTitle })
          .eq("id", editingModule.id);
        
        if (error) throw error;
        
        setModules(modules.map(m => 
          m.id === editingModule.id ? { ...m, title: moduleTitle } : m
        ));
        toast.success("Module updated");
      } else {
        const newOrderIndex = modules.length;
        const { data, error } = await supabase
          .from("modules")
          .insert({
            title: moduleTitle,
            course_id: courseId,
            order_index: newOrderIndex,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setModules([...modules, { ...data, classes: [] }]);
        toast.success("Module created");
      }
      
      setIsModuleModalOpen(false);
    } catch (error: any) {
      console.error("Error saving module:", error);
      toast.error(error.message || "Failed to save module");
    } finally {
      setSaving(false);
    }
  };

  const deleteModule = async (moduleId: number) => {
    if (!confirm("Are you sure? This will delete all classes and lessons in this module.")) return;
    
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("modules")
        .delete()
        .eq("id", moduleId);
      
      if (error) throw error;
      
      setModules(modules.filter(m => m.id !== moduleId));
      toast.success("Module deleted");
    } catch (error: any) {
      console.error("Error deleting module:", error);
      toast.error(error.message || "Failed to delete module");
    } finally {
      setSaving(false);
    }
  };

  // Class CRUD
  const openAddClassModal = (module: Module) => {
    setSelectedModuleForClass(module);
    setEditingClass(null);
    setClassTitle("");
    setIsClassModalOpen(true);
  };

  const openEditClassModal = (classItem: Class, module: Module) => {
    setSelectedModuleForClass(module);
    setEditingClass(classItem);
    setClassTitle(classItem.title);
    setIsClassModalOpen(true);
  };

  const saveClass = async () => {
    if (!classTitle.trim()) {
      toast.error("Class title is required");
      return;
    }
    if (!selectedModuleForClass) return;

    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();

      if (editingClass) {
        const { error } = await supabase
          .from("classes")
          .update({ title: classTitle })
          .eq("id", editingClass.id);
        
        if (error) throw error;
        
        setModules(modules.map(m =>
          m.id === selectedModuleForClass.id
            ? {
                ...m,
                classes: m.classes.map(c =>
                  c.id === editingClass.id ? { ...c, title: classTitle } : c
                ),
              }
            : m
        ));
        toast.success("Class updated");
      } else {
        const newOrderIndex = selectedModuleForClass.classes.length;
        const { data, error } = await supabase
          .from("classes")
          .insert({
            title: classTitle,
            module_id: selectedModuleForClass.id,
            order_index: newOrderIndex,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setModules(modules.map(m =>
          m.id === selectedModuleForClass.id
            ? { ...m, classes: [...m.classes, { ...data, lessons: [] }] }
            : m
        ));
        toast.success("Class created");
      }
      
      setIsClassModalOpen(false);
    } catch (error: any) {
      console.error("Error saving class:", error);
      toast.error(error.message || "Failed to save class");
    } finally {
      setSaving(false);
    }
  };

  const deleteClass = async (classId: number, moduleId: number) => {
    if (!confirm("Are you sure? This will delete all lessons in this class.")) return;
    
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", classId);
      
      if (error) throw error;
      
      setModules(modules.map(m =>
        m.id === moduleId
          ? { ...m, classes: m.classes.filter(c => c.id !== classId) }
          : m
      ));
      toast.success("Class deleted");
    } catch (error: any) {
      console.error("Error deleting class:", error);
      toast.error(error.message || "Failed to delete class");
    } finally {
      setSaving(false);
    }
  };

  // Lesson CRUD
  const openAddLessonModal = (classItem: Class) => {
    setSelectedClassForLesson(classItem);
    setEditingLesson(null);
    setLessonForm({
      title: "",
      content_type: "video",
      video_url: "",
      video_notes: "",
      text_content: "",
      quiz_questions: [],
    });
    setIsLessonModalOpen(true);
  };

  const openEditLessonModal = async (lesson: Lesson, classItem: Class) => {
    setSelectedClassForLesson(classItem);
    setEditingLesson(lesson);
    
    let video_url = "";
    let video_notes = "";
    let text_content = "";
    let quiz_questions = [];
    
    if (lesson.content_json) {
      if (lesson.content_type === "video") {
        video_url = lesson.content_url || "";
        video_notes = lesson.content_json.notes || "";
      } else if (lesson.content_type === "text") {
        text_content = lesson.content_json.body || "";
      } else if (lesson.content_type === "quiz") {
        quiz_questions = lesson.content_json.questions || [];
      }
    }
    
    setLessonForm({
      title: lesson.title,
      content_type: lesson.content_type,
      video_url,
      video_notes,
      text_content,
      quiz_questions,
    });
    setIsLessonModalOpen(true);
  };

  const saveLesson = async () => {
    if (!lessonForm.title.trim()) {
      toast.error("Lesson title is required");
      return;
    }
    if (!selectedClassForLesson) return;

    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      
      let contentJson = null;
      let contentUrl = null;
      
      if (lessonForm.content_type === "video") {
        contentUrl = lessonForm.video_url;
        contentJson = { notes: lessonForm.video_notes };
      } else if (lessonForm.content_type === "text") {
        contentJson = { body: lessonForm.text_content };
      } else if (lessonForm.content_type === "quiz") {
        contentJson = { questions: lessonForm.quiz_questions };
      }

      if (editingLesson) {
        const { error } = await supabase
          .from("lessons")
          .update({
            title: lessonForm.title,
            content_type: lessonForm.content_type,
            content_url: contentUrl,
            content_json: contentJson,
          })
          .eq("id", editingLesson.id);
        
        if (error) throw error;
        
        // Update local state
        setModules(modules.map(m =>
          m.id === selectedClassForLesson.module_id
            ? {
                ...m,
                classes: m.classes.map(c =>
                  c.id === selectedClassForLesson.id
                    ? {
                        ...c,
                        lessons: c.lessons.map(l =>
                          l.id === editingLesson.id
                            ? { 
                                ...l, 
                                title: lessonForm.title, 
                                content_type: lessonForm.content_type,
                                content_url: contentUrl,
                                content_json: contentJson,
                              }
                            : l
                        ),
                      }
                    : c
                ),
              }
            : m
        ));
        toast.success("Lesson updated");
      } else {
        const newOrderIndex = selectedClassForLesson.lessons?.length || 0;
        const { data, error } = await supabase
          .from("lessons")
          .insert({
            title: lessonForm.title,
            content_type: lessonForm.content_type,
            content_url: contentUrl,
            content_json: contentJson,
            order_index: newOrderIndex,
            class_id: selectedClassForLesson.id,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setModules(modules.map(m =>
          m.id === selectedClassForLesson.module_id
            ? {
                ...m,
                classes: m.classes.map(c =>
                  c.id === selectedClassForLesson.id
                    ? { ...c, lessons: [...(c.lessons || []), { ...data, assignment: null }] }
                    : c
                ),
              }
            : m
        ));
        toast.success("Lesson created");
      }
      
      setIsLessonModalOpen(false);
    } catch (error: any) {
      console.error("Error saving lesson:", error);
      toast.error(error.message || "Failed to save lesson");
    } finally {
      setSaving(false);
    }
  };

  const deleteLesson = async (lessonId: number, classId: number, moduleId: number) => {
    if (!confirm("Are you sure you want to delete this lesson? This will also delete any assignments attached to it.")) return;
    
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      
      // First, delete any assignments linked to this lesson
      const { error: assignmentError } = await supabase
        .from("assignments")
        .delete()
        .eq("lesson_id", lessonId);
      
      if (assignmentError) {
        console.error("Error deleting assignment:", assignmentError);
        // Continue anyway - try to delete the lesson
      }
      
      // Then delete the lesson
      const { error: lessonError } = await supabase
        .from("lessons")
        .delete()
        .eq("id", lessonId);
      
      if (lessonError) throw lessonError;
      
      // Update local state
      setModules(modules.map(m =>
        m.id === moduleId
          ? {
              ...m,
              classes: m.classes.map(c =>
                c.id === classId
                  ? { ...c, lessons: c.lessons.filter(l => l.id !== lessonId) }
                  : c
              ),
            }
          : m
      ));
      toast.success("Lesson deleted successfully");
      
    } catch (error: any) {
      console.error("Error deleting lesson:", error);
      toast.error(error.message || "Failed to delete lesson");
    } finally {
      setSaving(false);
    }
  };

  // Assignment CRUD
  const openAssignmentModal = async (lesson: Lesson) => {
    setEditingLesson(lesson);
    
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("lesson_id", lesson.id)
        .maybeSingle();
      
      if (!error && data) {
        setAssignmentForm({
          title: data.title,
          description: data.description || "",
          due_at: data.due_at || "",
        });
      } else {
        setAssignmentForm({
          title: "",
          description: "",
          due_at: "",
        });
      }
      
      setIsAssignmentModalOpen(true);
    } catch (error) {
      console.error("Error fetching assignment:", error);
      setAssignmentForm({
        title: "",
        description: "",
        due_at: "",
      });
      setIsAssignmentModalOpen(true);
    }
  };

  const saveAssignment = async () => {
    if (!editingLesson) return;
    if (!assignmentForm.title.trim()) {
      toast.error("Assignment title is required");
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      
      // Check if assignment exists
      const { data: existing } = await supabase
        .from("assignments")
        .select("id")
        .eq("lesson_id", editingLesson.id)
        .maybeSingle();
      
      if (existing) {
        // Update existing assignment - NO points column
        const { error } = await supabase
          .from("assignments")
          .update({
            title: assignmentForm.title,
            description: assignmentForm.description,
            due_at: assignmentForm.due_at || null,
          })
          .eq("id", existing.id);
        
        if (error) throw error;
        toast.success("Assignment updated");
      } else {
        // Create new assignment - NO points column
        const { error } = await supabase
          .from("assignments")
          .insert({
            title: assignmentForm.title,
            description: assignmentForm.description,
            due_at: assignmentForm.due_at || null,
            course_id: courseId,
            lesson_id: editingLesson.id,
          });
        
        if (error) throw error;
        toast.success("Assignment created");
      }
      
      setIsAssignmentModalOpen(false);
      await fetchCourseData();
      
    } catch (error: any) {
      console.error("Error saving assignment:", error);
      toast.error(error.message || "Failed to save assignment");
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async (lessonId: number) => {
    if (!confirm("Are you sure you want to remove this assignment?")) return;
    
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("assignments")
        .delete()
        .eq("lesson_id", lessonId);
      
      if (error) throw error;
      
      toast.success("Assignment removed");
      setIsAssignmentModalOpen(false);
      await fetchCourseData();
      
    } catch (error: any) {
      console.error("Error deleting assignment:", error);
      toast.error(error.message || "Failed to delete assignment");
    } finally {
      setSaving(false);
    }
  };

  // Quiz question helpers
  const addQuizQuestion = () => {
    setLessonForm({
      ...lessonForm,
      quiz_questions: [
        ...lessonForm.quiz_questions,
        {
          question: "",
          type: "multiple_choice",
          options: ["", "", "", ""],
          correct_answer: "",  // This can be empty string initially
        },
      ],
    });
  };

  const updateQuizQuestion = (index: number, updates: any) => {
    const updatedQuestions = [...lessonForm.quiz_questions];
    updatedQuestions[index] = { ...updatedQuestions[index], ...updates };
    setLessonForm({ ...lessonForm, quiz_questions: updatedQuestions });
  };

  const removeQuizQuestion = (index: number) => {
    setLessonForm({
      ...lessonForm,
      quiz_questions: lessonForm.quiz_questions.filter((_, i) => i !== index),
    });
  };

  const toggleModule = (moduleId: number) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const getContentTypeIcon = (type: string) => {
    const ct = contentTypes.find(t => t.value === type);
    if (!ct) return <FileText className="w-4 h-4" />;
    const Icon = ct.icon;
    return <Icon className="w-4 h-4" />;
  };

  const getTotalLessons = () => {
    return modules.reduce((acc, m) => acc + m.classes.reduce((acc2, c) => acc2 + (c.lessons?.length || 0), 0), 0);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
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
                href="/courses"
                className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Courses
              </Link>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
                  {course?.title}
                </h1>
                <Badge className="bg-yellow-600/80">Draft</Badge>
              </div>
              <p className="text-gray-400 mt-2">{course?.description}</p>
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
              <Layers className="w-4 h-4" />
              <span className="text-sm">Total Classes</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {modules.reduce((acc, m) => acc + m.classes.length, 0)}
            </p>
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
              <ClipboardList className="w-4 h-4" />
              <span className="text-sm">Assignments</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {modules.reduce((acc, m) => acc + m.classes.reduce((acc2, c) => acc2 + (c.lessons?.filter(l => l.assignment).length || 0), 0), 0)}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <GlowCard>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-white mb-4">Course Settings</h3>
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
                </nav>
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
                        <h2 className="text-xl font-semibold text-white">Course Curriculum</h2>
                        <p className="text-sm text-gray-400 mt-1">
                          Modules contain classes, which contain lessons
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
                        <div key={module.id} className="border border-gray-800 rounded-lg overflow-hidden">
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
                              <h3 className="text-white font-medium">
                                Module {moduleIdx + 1}: {module.title}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {module.classes.length} classes
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
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

                          {expandedModules.includes(module.id) && (
                            <div className="p-4 space-y-3">
                              {module.classes.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                  <p>No classes yet</p>
                                  <GlowButton
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={() => openAddClassModal(module)}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add First Class
                                  </GlowButton>
                                </div>
                              ) : (
                                <>
                                  {module.classes.map((classItem, classIdx) => (
                                    <div key={classItem.id} className="border-l-2 border-purple-500/30 pl-4 ml-4">
                                      <div className="bg-gray-800/30 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <h4 className="text-white font-medium">
                                              Class {classIdx + 1}: {classItem.title}
                                            </h4>
                                            <Badge className="bg-purple-600/20 text-purple-400 text-xs">
                                              {classItem.lessons?.length || 0} lessons
                                            </Badge>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => openEditClassModal(classItem, module)}
                                              className="p-1 text-gray-400 hover:text-blue-400"
                                            >
                                              <Edit className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => deleteClass(classItem.id, module.id)}
                                              className="p-1 text-gray-400 hover:text-red-400"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                        
                                        {/* Lessons within Class */}
                                        <div className="space-y-2 mt-3">
                                          {(classItem.lessons || []).map((lesson) => (
                                            <div key={lesson.id} className="flex items-center justify-between bg-gray-800/50 rounded p-2 group">
                                              <div className="flex items-center gap-2">
                                                {getContentTypeIcon(lesson.content_type)}
                                                <span className="text-sm text-white">{lesson.title}</span>
                                                <span className="text-xs text-gray-500 capitalize">
                                                  {lesson.content_type}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                  onClick={() => openEditLessonModal(lesson, classItem)}
                                                  className="p-1 text-gray-400 hover:text-blue-400"
                                                >
                                                  <Edit className="w-3 h-3" />
                                                </button>
                                                <button
                                                  onClick={() => openAssignmentModal(lesson)}
                                                  className="p-1 text-gray-400 hover:text-green-400"
                                                >
                                                  <ClipboardList className="w-3 h-3" />
                                                </button>
                                                <button
                                                  onClick={() => deleteLesson(lesson.id, classItem.id, module.id)}
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
                                            className="w-full"
                                            onClick={() => openAddLessonModal(classItem)}
                                          >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Add Lesson
                                          </GlowButton>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  <GlowButton
                                    variant="outline"
                                    size="sm"
                                    fullWidth
                                    onClick={() => openAddClassModal(module)}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add Class
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
                    <h2 className="text-xl font-semibold text-white">Course Settings</h2>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-white mb-2 block">Course Title</Label>
                        <Input
                          value={course?.title || ""}
                          onChange={(e) => setCourse({ ...course!, title: e.target.value })}
                          className="bg-gray-800/50 border-gray-700 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white mb-2 block">Course Description</Label>
                        <Textarea
                          rows={4}
                          value={course?.description || ""}
                          onChange={(e) => setCourse({ ...course!, description: e.target.value })}
                          className="bg-gray-800/50 border-gray-700 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white mb-2 block">Visibility</Label>
                        <Select
                          value={course?.visibility || "public"}
                          onValueChange={(value) => setCourse({ ...course!, visibility: value })}
                        >
                          <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Public - Anyone can view</SelectItem>
                            <SelectItem value="org">Organization - Only org members</SelectItem>
                            <SelectItem value="private">Private - Invite only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Analytics Tab */}
                {activeTab === "analytics" && (
                  <div className="space-y-6 text-center py-12">
                    <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Analytics will appear once students enroll in your course</p>
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
              {editingModule ? "Edit Module" : "Add New Module"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white mb-2 block">Module Title</Label>
              <Input
                placeholder="e.g., Introduction, Core Concepts"
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
            <GlowButton onClick={saveModule} isLoading={saving}>
              {editingModule ? "Save Changes" : "Create Module"}
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Class Modal */}
      <Dialog open={isClassModalOpen} onOpenChange={setIsClassModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingClass ? "Edit Class" : "Add New Class"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white mb-2 block">Class Title</Label>
              <Input
                placeholder="e.g., Getting Started, Setup"
                value={classTitle}
                onChange={(e) => setClassTitle(e.target.value)}
                className="bg-gray-800/50 border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <GlowButton variant="outline" onClick={() => setIsClassModalOpen(false)}>
              Cancel
            </GlowButton>
            <GlowButton onClick={saveClass} isLoading={saving}>
              {editingClass ? "Save Changes" : "Create Class"}
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Lesson Modal - With RichTextEditor */}
      <Dialog open={isLessonModalOpen} onOpenChange={setIsLessonModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingLesson ? "Edit Lesson" : "Add New Lesson"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Lesson Title */}
            <div>
              <Label className="text-white mb-2 block">Lesson Title *</Label>
              <Input
                placeholder="e.g., Introduction to React"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white"
              />
            </div>

            {/* Content Type Selection */}
            <div>
              <Label className="text-white mb-2 block">Content Type</Label>
              <Select
                value={lessonForm.content_type}
                onValueChange={(value) => setLessonForm({ ...lessonForm, content_type: value })}
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

            {/* Video Lesson Fields */}
            {lessonForm.content_type === "video" && (
              <>
                <div>
                  <Label className="text-white mb-2 block">Video URL</Label>
                  <Input
                    placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                    value={lessonForm.video_url}
                    onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                    className="bg-gray-800/50 border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supports YouTube, Vimeo, or direct MP4 links
                  </p>
                </div>
                <div>
                  <Label className="text-white mb-2 block">Lesson Notes (Optional)</Label>
                  <RichTextEditor
                    value={lessonForm.video_notes}
                    onChange={(value) => setLessonForm({ ...lessonForm, video_notes: value })}
                    placeholder="Add supplementary notes, resources, transcript, or download links here..."
                  />
                </div>
              </>
            )}

            {/* Text Lesson Fields */}
            {lessonForm.content_type === "text" && (
              <div>
                <Label className="text-white mb-2 block">Lesson Content</Label>
                <RichTextEditor
                  value={lessonForm.text_content}
                  onChange={(value) => setLessonForm({ ...lessonForm, text_content: value })}
                  placeholder="Write your lesson content here... You can add text, images, code blocks, headings, lists, and more."
                />
              </div>
            )}

            {/* Quiz Lesson Fields */}
            {lessonForm.content_type === "quiz" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-white">Quiz Questions</Label>
                  <GlowButton size="sm" variant="outline" onClick={addQuizQuestion}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Question
                  </GlowButton>
                </div>
                
                {lessonForm.quiz_questions.length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-gray-800/30 rounded-lg">
                    <FileQuestion className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No questions yet. Click "Add Question" to get started.</p>
                  </div>
                )}

                {lessonForm.quiz_questions.map((question, qIndex) => (
                  <div key={qIndex} className="bg-gray-800/30 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-white font-medium">Question {qIndex + 1}</h4>
                      <button
                        onClick={() => removeQuizQuestion(qIndex)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <Input
                        placeholder="Question text"
                        value={question.question}
                        onChange={(e) => updateQuizQuestion(qIndex, { question: e.target.value })}
                        className="bg-gray-800/50 border-gray-700 text-white"
                      />
                      
                      <Select
                        value={question.type}
                        onValueChange={(value: any) => updateQuizQuestion(qIndex, { type: value })}
                      >
                        <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                          <SelectItem value="true_false">True/False</SelectItem>
                          <SelectItem value="short_answer">Short Answer</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {question.type === "multiple_choice" && (
                        <div className="space-y-2">
                          <Label className="text-gray-400 text-sm">Answer Options</Label>
                          {question.options?.map((option, oIndex) => (
                            <Input
                              key={oIndex}
                              placeholder={`Option ${oIndex + 1}`}
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...(question.options || [])];
                                newOptions[oIndex] = e.target.value;
                                updateQuizQuestion(qIndex, { options: newOptions });
                              }}
                              className="bg-gray-800/50 border-gray-700 text-white"
                            />
                          ))}
                        </div>
                      )}
                      
                      <div>
                        <Label className="text-gray-400 text-sm">Correct Answer</Label>
                        {question.type === "multiple_choice" && (
                          <Select
                            value={question.correct_answer as string || "placeholder"}
                            onValueChange={(value) => {
                              if (value !== "placeholder") {
                                updateQuizQuestion(qIndex, { correct_answer: value });
                              }
                            }}
                          >
                            <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                              <SelectValue placeholder="Select correct answer" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="placeholder" disabled className="hidden">
                                Select correct answer
                              </SelectItem>
                              {question.options?.map((option, oIndex) => (
                                <SelectItem key={oIndex} value={option || `option_${oIndex}`}>
                                  {option || `Option ${oIndex + 1}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        {question.type === "true_false" && (
                          <Select
                            value={question.correct_answer as string || "placeholder"}
                            onValueChange={(value) => {
                              if (value !== "placeholder") {
                                updateQuizQuestion(qIndex, { correct_answer: value });
                              }
                            }}
                          >
                            <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                              <SelectValue placeholder="Select correct answer" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="placeholder" disabled className="hidden">
                                Select correct answer
                              </SelectItem>
                              <SelectItem value="true">True</SelectItem>
                              <SelectItem value="false">False</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        
                        {question.type === "short_answer" && (
                          <Input
                            placeholder="Correct answer"
                            value={question.correct_answer as string || ""}
                            onChange={(e) => updateQuizQuestion(qIndex, { correct_answer: e.target.value })}
                            className="bg-gray-800/50 border-gray-700 text-white"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <GlowButton variant="outline" onClick={() => setIsLessonModalOpen(false)}>
              Cancel
            </GlowButton>
            <GlowButton onClick={saveLesson} isLoading={saving}>
              {editingLesson ? "Save Changes" : "Create Lesson"}
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Modal - NO points field */}
      <Dialog open={isAssignmentModalOpen} onOpenChange={setIsAssignmentModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white mb-2 block">Assignment Title *</Label>
              <Input
                placeholder="e.g., Component Exercise"
                value={assignmentForm.title}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-white mb-2 block">Description</Label>
              <RichTextEditor
                value={assignmentForm.description}
                onChange={(value) => setAssignmentForm({ ...assignmentForm, description: value })}
                placeholder="Describe the assignment requirements, what students need to submit, grading criteria, etc."
              />
            </div>
            <div>
              <Label className="text-white mb-2 block">Due Date</Label>
              <Input
                type="datetime-local"
                value={assignmentForm.due_at}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, due_at: e.target.value })}
                className="bg-gray-800/50 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for no due date
              </p>
            </div>
          </div>
          <DialogFooter>
            {editingLesson && (
              <GlowButton
                variant="outline"
                onClick={() => deleteAssignment(editingLesson.id)}
                className="mr-auto text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Assignment
              </GlowButton>
            )}
            <GlowButton variant="outline" onClick={() => setIsAssignmentModalOpen(false)}>
              Cancel
            </GlowButton>
            <GlowButton onClick={saveAssignment} isLoading={saving}>
              Save Assignment
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}