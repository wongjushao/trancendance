// frontend/app/(main)/courses/[id]/edit/page.tsx
"use client";

import { FileUpload } from "@/components/ui/file-upload";

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
  Settings,
  Users,
  BarChart3,
  GripVertical,
  AlertCircle,
  FolderOpen,
  Layers,
  Rocket,
  Archive,
  Upload,
  Loader2,
  X,
  Save,
  Globe,
  Lock,
  Building2,
  Calendar,
  Clock,
  MessageSquare,
  Award,
  GraduationCap,
  CheckCircle,
  HelpCircle,
  Copy,
  Eye,
  Download,
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
  DialogDescription
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import {
  getCourseWithDetails,
  updateCourse,
  addModule,
  updateModule,
  deleteModule,
  addClass,
  updateClass,
  deleteClass,
  addLesson,
  updateLesson,
  deleteLesson,
  addAssignment,
  updateAssignment,
  deleteAssignment,
  addCourseClass,
  updateCourseClass,
  deleteCourseClass,
  addClassSchedule,
  updateClassSchedule,
  deleteClassSchedule,
  publishCourse,
  unpublishCourse,
  archiveCourse,
  CourseWithDetails,
  ModuleWithClasses,
  ClassWithLessons,
  LessonWithAssignments,
  CourseClassWithDetails,
} from "@/lib/supabase/courses";
import CourseBasicForm from "@/components/course/CourseBasicForm";

// Drag and drop imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

/** Same-day class block: DB requires end_time > start_time (no overnight rows). */
function isValidClassScheduleTimeRange(startTime: string, endTime: string): boolean {
  const toSeconds = (t: string) => {
    const [h = 0, m = 0, s = 0] = t.split(":").map((p) => parseInt(p, 10));
    return h * 3600 + m * 60 + s;
  };
  return toSeconds(endTime) > toSeconds(startTime);
}

// Sortable Components
function SortableModuleItem({ module, index, onEdit, onDelete, onToggleExpand, isExpanded, children }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border border-slate-700 rounded-lg overflow-hidden">
      <div className="bg-slate-800/50 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-5 h-5 text-gray-400" />
          </div>
          <button onClick={() => onToggleExpand(module.id)} className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="font-semibold text-white">{module.title}</span>
          </button>
        </div>
        <div className="flex gap-2">
          <GlowButton size="sm" variant="secondary" onClick={() => onEdit(module)}>
            <Edit className="w-4 h-4" />
          </GlowButton>
          <GlowButton size="sm" variant="ghost" onClick={() => onDelete(module.id)}>
            <Trash2 className="w-4 h-4" />
          </GlowButton>
        </div>
      </div>
      {isExpanded && <div className="p-4">{children}</div>}
    </div>
  );
}

function SortableClassItem({ classItem, index, moduleId, onEdit, onDelete, onToggleExpand, isExpanded, children }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: classItem.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border border-slate-700/50 rounded-lg">
      <div className="bg-slate-800/30 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
          <button onClick={() => onToggleExpand(classItem.id)} className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span className="text-white">{classItem.title}</span>
          </button>
        </div>
        <div className="flex gap-2">
          <GlowButton size="sm" variant="secondary" onClick={() => onEdit(classItem, moduleId)}>
            <Edit className="w-3 h-3" />
          </GlowButton>
          <GlowButton size="sm" variant="ghost" onClick={() => onDelete(classItem.id, moduleId)}>
            <Trash2 className="w-3 h-3" />
          </GlowButton>
        </div>
      </div>
      {isExpanded && <div className="p-3">{children}</div>}
    </div>
  );
}

function SortableLessonItem({ lesson, index, classId, moduleId, onEdit, onDelete, onAddAssignment }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getContentIcon = () => {
    switch (lesson.content_type) {
      case "video": return <Video className="w-4 h-4 text-blue-400" />;
      case "text": return <FileText className="w-4 h-4 text-green-400" />;
      case "quiz": return <FileQuestion className="w-4 h-4 text-yellow-400" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Debug: Log assignments data
  // console.log(`Lesson "${lesson.title}" (ID: ${lesson.id}) - Assignments:`, lesson.assignments);
  
  // Safe check for assignments - ensure it's an array
  const assignments = Array.isArray(lesson.assignments) ? lesson.assignments : [];
  const hasAssignments = assignments.length > 0;

  return (
    <div ref={setNodeRef} style={style} className="bg-slate-900/50 rounded-lg p-3">
      <div className="flex items-start gap-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-1">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {getContentIcon()}
            <span className="text-white font-medium">{lesson.title}</span>
            {lesson.is_free_preview && (
              <Badge variant="secondary" className="text-xs">Free Preview</Badge>
            )}
            {hasAssignments && (
              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400">
                {assignments.length} Assignment{assignments.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Assignment Management */}
          <div className="mt-2 space-y-2">
            {/* List existing assignments */}
            {hasAssignments && assignments.map((assignment: any) => (
              <div key={assignment.id} className="flex items-center justify-between bg-slate-800/30 rounded-lg p-2 border border-slate-700/50">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <ClipboardList className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span className="text-gray-200 text-sm truncate">{assignment.title}</span>
                  <span className="text-gray-500 text-xs flex-shrink-0">({assignment.points || 0} pts)</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddAssignment(lesson, classId, moduleId, assignment);
                    }}
                    className="p-1.5 rounded-md hover:bg-purple-500/20 transition-all duration-200"
                    title="Edit assignment"
                  >
                    <Edit className="w-3.5 h-3.5 text-blue-400 hover:text-blue-300" />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm(`Delete assignment "${assignment.title}"? This action cannot be undone.`)) {
                        try {
                          const { deleteAssignment } = await import("@/lib/supabase/courses");
                          await deleteAssignment(assignment.id);
                          toast.success("Assignment deleted");
                          // Call loadCourse through the onAddAssignment callback with a special flag
                          // Or better, call the loadCourse function directly if available
                          if (window.location.pathname) {
                            // Just refresh the data by calling the parent's loadCourse
                            // Since we can't access it directly, we'll use a custom event
                            window.dispatchEvent(new CustomEvent('refreshAssignments'));
                          }
                        } catch (error) {
                          console.error("Error deleting assignment:", error);
                          toast.error("Failed to delete assignment");
                        }
                      }
                    }}
                    className="p-1.5 rounded-md hover:bg-red-500/20 transition-all duration-200"
                    title="Delete assignment"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-300" />
                  </button>
                </div>
              </div>
            ))}
            
            {/* Add new assignment button */}
            <button
              onClick={() => onAddAssignment(lesson, classId, moduleId)}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 mt-1"
            >
              <Plus className="w-3 h-3" />
              {hasAssignments ? "Add Another Assignment" : "Add Assignment"}
            </button>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <GlowButton size="sm" variant="secondary" onClick={() => onEdit(lesson, classId, moduleId)}>
            <Edit className="w-3 h-3" />
          </GlowButton>
          <GlowButton size="sm" variant="ghost" onClick={() => onDelete(lesson.id, classId, moduleId)}>
            <Trash2 className="w-3 h-3" />
          </GlowButton>
        </div>
      </div>
    </div>
  );
}

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState<CourseWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [expandedClasses, setExpandedClasses] = useState<Set<number>>(new Set());
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Modal states
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [offeringModalOpen, setOfferingModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [deleteModuleModalOpen, setDeleteModuleModalOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<{ id: number; title: string } | null>(null);
  const [deleteClassModalOpen, setDeleteClassModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<{ id: number; title: string; moduleId: number } | null>(null);
  const [deleteLessonModalOpen, setDeleteLessonModalOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<{ id: number; title: string; classId: number; moduleId: number } | null>(null);

  // Edit states
  const [editingModule, setEditingModule] = useState<ModuleWithClasses | null>(null);
  const [editingClass, setEditingClass] = useState<{ class: ClassWithLessons; moduleId: number } | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ lesson: LessonWithAssignments; classId: number; moduleId: number } | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<{ assignment: any; lessonId: number } | null>(null);
  const [editingOffering, setEditingOffering] = useState<CourseClassWithDetails | null>(null);
  
  // Form states
  const [moduleForm, setModuleForm] = useState({ title: "" });
  const [classForm, setClassForm] = useState({ title: "" });
  const [lessonForm, setLessonForm] = useState({
    title: "",
    content_type: "video" as "video" | "text" | "quiz",
    content_url: "",
    content_json: null as any,
    duration_seconds: 0,
    is_free_preview: false,
    notes: "",
    resources: [] as Array<{ url: string; name: string; type: string; size: number }>,
  });
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    due_at: "",
    points: 100,
  });
  const [offeringForm, setOfferingForm] = useState<{
    name: string;
    description: string;
    instructor_id: string | null;
    start_date: string;
    end_date: string;
    max_students: number;
    status: "upcoming" | "ongoing" | "completed" | "cancelled";
  }>({
    name: "",
    description: "",
    instructor_id: null,
    start_date: "",
    end_date: "",
    max_students: 30,
    status: "upcoming" as "upcoming" | "ongoing" | "completed" | "cancelled",
  });
  const [scheduleForm, setScheduleForm] = useState({
    day_of_week: 1,
    start_time: "09:00",
    end_time: "11:00",
  });
  const [selectedOfferingId, setSelectedOfferingId] = useState<number | null>(null);
  
  // Add these with your other modal states
  const [editScheduleModalOpen, setEditScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<{ id: number; offeringId: number; day_of_week: number; start_time: string; end_time: string } | null>(null);
  const [editScheduleForm, setEditScheduleForm] = useState({
    day_of_week: 0,
    start_time: "",
    end_time: "",
  });

  // Helper functions for backend API calls
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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
      // Add this to debug pointer events
      onActivation: ({ event }) => {
        // console.log("Pointer activated:", event.target);
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  

  // Fetch user's organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const data = await apiRequest('/api/org-service/organizations/memberships');
        const orgs = data.organizations || [];
        setOrganizations(orgs);
        if (orgs.length > 0) {
          setSelectedOrgId(orgs[0].id);
        }
      } catch (error) {
        console.error("Error fetching organizations:", error);
      }
    };
    
    fetchOrganizations();
  }, []);

  // Get current user ID via backend
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const userProfile = await apiRequest('/api/auth-service/profile');
        if (userProfile) {
          // console.log("Current user ID:", userProfile.id);
          setCurrentUserId(userProfile.id);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    getCurrentUser();
  }, []);
  
  // Load course data via backend API
  const loadCourse = async () => {
    try {
      setLoading(true);
      
      // Fetch course with modules and classes
      const data = await apiRequest(`/api/org-service/courses/${courseId}/detail`);
      
      // Fetch assignments separately
      let assignmentsByLesson: Record<number, any[]> = {};
      try {
        const assignmentsData = await apiRequest(`/api/org-service/courses/${courseId}/assignments`);
        const allAssignments = assignmentsData.assignments || [];
        
        // Group assignments by lesson_id
        assignmentsByLesson = {};
        allAssignments.forEach((assignment: any) => {
          const lessonId = assignment.lesson_id;
          if (!assignmentsByLesson[lessonId]) {
            assignmentsByLesson[lessonId] = [];
          }
          assignmentsByLesson[lessonId].push(assignment);
        });
        
        // console.log("Fetched assignments:", allAssignments.length);
        // console.log("Assignments by lesson:", assignmentsByLesson);
      } catch (err) {
        console.warn("Could not fetch assignments:", err);
        // Continue without assignments if this fails
      }
      
      // Process the data to ensure assignments are properly structured
      const processedModules = (data.modules || []).map((module: any) => ({
        ...module,
        classes: (module.classes || []).map((classItem: any) => ({
          ...classItem,
          lessons: (classItem.lessons || []).map((lesson: any) => ({
            ...lesson,
            // Get assignments from our fetched data
            assignments: assignmentsByLesson[lesson.id] || []
          }))
        }))
      }));
      
      // Log to verify assignments
      if (processedModules) {
        processedModules.forEach((module: any) => {
          module.classes.forEach((classItem: any) => {
            classItem.lessons.forEach((lesson: any) => {
              // console.log(`Lesson "${lesson.title}" (ID: ${lesson.id}) has ${lesson.assignments?.length || 0} assignments`);
            });
          });
        });
      }
      
      setCourse({
        ...data.course,
        modules: processedModules,
        course_classes: data.course_classes || [],
      });
      
      // Auto-expand first module
      if (processedModules && processedModules.length > 0) {
        setExpandedModules(new Set([processedModules[0].id]));
      }
    } catch (error) {
      console.error("Error loading course:", error);
      toast.error("Failed to load course");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleRefresh = () => {
      loadCourse();
    };
    window.addEventListener('refreshAssignments', handleRefresh);
    return () => {
      window.removeEventListener('refreshAssignments', handleRefresh);
    };
  }, [loadCourse]);

  const refreshAssignments = async () => {
    // console.log("Refreshing assignments...");
    await loadCourse();
  };
    
  useEffect(() => {
    if (courseId) {
      loadCourse();
    }
  }, [courseId]);
  
  // Toggle expand/collapse
  const toggleModule = (moduleId: number) => {
    const newSet = new Set(expandedModules);
    if (newSet.has(moduleId)) {
      newSet.delete(moduleId);
    } else {
      newSet.add(moduleId);
    }
    setExpandedModules(newSet);
  };
  
  const toggleClass = (classId: number) => {
    const newSet = new Set(expandedClasses);
    if (newSet.has(classId)) {
      newSet.delete(classId);
    } else {
      newSet.add(classId);
    }
    setExpandedClasses(newSet);
  };
  
  // Drag and drop handlers
  const handleDragEndModules = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!course?.modules) return;
    if (active.id !== over?.id) {
      const oldIndex = course.modules.findIndex((m) => m.id === active.id);
      const newIndex = course.modules.findIndex((m) => m.id === over?.id);
      const newModules = arrayMove(course.modules, oldIndex, newIndex);
      
      // Update UI immediately for smooth visual feedback
      setCourse({ ...course, modules: newModules });
      
      try {
        // Send batch update to backend
        const updates = newModules.map((module, index) => ({
          id: module.id,
          order_index: index,
        }));
        
        await apiRequest('/api/org-service/modules/reorder', {
          method: 'POST',
          body: JSON.stringify({ updates }),
        });
        
        toast.success("Module order updated");
      } catch (error) {
        console.error("Error updating module order:", error);
        toast.error("Failed to update module order. Please try again.");
        await loadCourse();
      }
    }
  };

  // Replace the existing handleDragEndClasses with this:
  const handleDragEndClasses = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!course?.modules) return;
    if (!over) return;
    
    const activeId = active.id as number;
    const overId = over.id as number;
    
    if (activeId === overId) return;
    
    // Find source class and its parent module
    let sourceModuleId: number | null = null;
    let sourceClass: any = null;
    let sourceClassIndex: number = -1;
    
    for (const module of course.modules) {
      const foundIndex = module.classes.findIndex(c => c.id === activeId);
      if (foundIndex !== -1) {
        sourceModuleId = module.id;
        sourceClass = module.classes[foundIndex];
        sourceClassIndex = foundIndex;
        break;
      }
    }
    
    if (!sourceModuleId || !sourceClass) return;
    
    // Find target location
    let targetModuleId: number | null = null;
    let targetClassIndex: number = -1;
    
    // Check if over is a class
    for (const module of course.modules) {
      const foundIndex = module.classes.findIndex(c => c.id === overId);
      if (foundIndex !== -1) {
        targetModuleId = module.id;
        targetClassIndex = foundIndex;
        break;
      }
    }
    
    // If over is a module, append to end
    if (targetModuleId === null) {
      const targetModule = course.modules.find(m => m.id === overId);
      if (targetModule) {
        targetModuleId = targetModule.id;
        targetClassIndex = targetModule.classes.length;
      }
    }
    
    if (targetModuleId === null) return;
    
    // Create updated modules structure
    let updatedModules = [...course.modules];
    
    const sourceModuleIndex = updatedModules.findIndex(m => m.id === sourceModuleId);
    const [removedClass] = updatedModules[sourceModuleIndex].classes.splice(sourceClassIndex, 1);
    
    const targetModuleIndex = updatedModules.findIndex(m => m.id === targetModuleId);
    const insertIndex = targetClassIndex === -1 ? updatedModules[targetModuleIndex].classes.length : targetClassIndex;
    updatedModules[targetModuleIndex].classes.splice(insertIndex, 0, removedClass);
    
    // Update UI immediately
    setCourse({ ...course, modules: updatedModules });
    
    try {
      // Collect all classes that need updates
      const allUpdates: { id: number; module_id: number; order_index: number }[] = [];
      
      // Update source module classes
      if (updatedModules[sourceModuleIndex].classes.length > 0) {
        for (let i = 0; i < updatedModules[sourceModuleIndex].classes.length; i++) {
          allUpdates.push({
            id: updatedModules[sourceModuleIndex].classes[i].id,
            module_id: sourceModuleId,
            order_index: i,
          });
        }
      }
      
      // Update target module classes
      for (let i = 0; i < updatedModules[targetModuleIndex].classes.length; i++) {
        allUpdates.push({
          id: updatedModules[targetModuleIndex].classes[i].id,
          module_id: targetModuleId,
          order_index: i,
        });
      }
      
      await apiRequest('/api/org-service/classes/reorder', {
        method: 'POST',
        body: JSON.stringify({ updates: allUpdates }),
      });
      
      toast.success(sourceModuleId === targetModuleId ? "Class order updated" : "Class moved to new module");
    } catch (error) {
      console.error("Error updating class order:", error);
      toast.error("Failed to update class order. Please try again.");
      await loadCourse();
    }
  };

const getDayName = (day: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day] || 'Unknown';
};

  // Replace the existing handleDragEndLessons with this:
  const handleDragEndLessons = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!course?.modules) return;
    if (!over) return;
    
    const activeId = active.id as number;
    const overId = over.id as number;
    
    if (activeId === overId) return;
    
    // Find source lesson, its class, and its module
    let sourceModuleId: number | null = null;
    let sourceClassId: number | null = null;
    let sourceLesson: any = null;
    let sourceLessonIndex: number = -1;
    
    for (const module of course.modules) {
      for (const classItem of module.classes) {
        const foundIndex = classItem.lessons.findIndex(l => l.id === activeId);
        if (foundIndex !== -1) {
          sourceModuleId = module.id;
          sourceClassId = classItem.id;
          sourceLesson = classItem.lessons[foundIndex];
          sourceLessonIndex = foundIndex;
          break;
        }
      }
      if (sourceClassId) break;
    }
    
    if (!sourceModuleId || !sourceClassId || !sourceLesson) return;
    
    // Find target location
    let targetClassId: number | null = null;
    let targetLessonIndex: number = -1;
    
    // Check if over is a lesson
    for (const module of course.modules) {
      for (const classItem of module.classes) {
        const foundIndex = classItem.lessons.findIndex(l => l.id === overId);
        if (foundIndex !== -1) {
          targetClassId = classItem.id;
          targetLessonIndex = foundIndex;
          break;
        }
      }
      if (targetClassId) break;
    }
    
    // If over is a class, append to end
    if (targetClassId === null) {
      for (const module of course.modules) {
        const foundClass = module.classes.find(c => c.id === overId);
        if (foundClass) {
          targetClassId = foundClass.id;
          targetLessonIndex = foundClass.lessons.length;
          break;
        }
      }
    }
    
    if (targetClassId === null) return;
    
    // Create updated structure
    let updatedModules = [...course.modules];
    
    const sourceModuleIndex = updatedModules.findIndex(m => m.id === sourceModuleId);
    const sourceClassIndex = updatedModules[sourceModuleIndex].classes.findIndex(c => c.id === sourceClassId);
    const [removedLesson] = updatedModules[sourceModuleIndex].classes[sourceClassIndex].lessons.splice(sourceLessonIndex, 1);
    
    let targetModuleIndex = -1;
    let targetClassIndex = -1;
    
    for (let mIdx = 0; mIdx < updatedModules.length; mIdx++) {
      const cIdx = updatedModules[mIdx].classes.findIndex(c => c.id === targetClassId);
      if (cIdx !== -1) {
        targetModuleIndex = mIdx;
        targetClassIndex = cIdx;
        break;
      }
    }
    
    if (targetModuleIndex === -1) return;
    
    const insertIndex = targetLessonIndex === -1 
      ? updatedModules[targetModuleIndex].classes[targetClassIndex].lessons.length 
      : targetLessonIndex;
    updatedModules[targetModuleIndex].classes[targetClassIndex].lessons.splice(insertIndex, 0, removedLesson);
    
    // Update UI immediately
    setCourse({ ...course, modules: updatedModules });
    
    try {
      // Collect all lessons that need updates
      const allUpdates: { id: number; class_id: number; order_index: number }[] = [];
      
      // Update source class lessons
      if (updatedModules[sourceModuleIndex].classes[sourceClassIndex].lessons.length > 0) {
        for (let i = 0; i < updatedModules[sourceModuleIndex].classes[sourceClassIndex].lessons.length; i++) {
          allUpdates.push({
            id: updatedModules[sourceModuleIndex].classes[sourceClassIndex].lessons[i].id,
            class_id: sourceClassId,
            order_index: i,
          });
        }
      }
      
      // Update target class lessons
      for (let i = 0; i < updatedModules[targetModuleIndex].classes[targetClassIndex].lessons.length; i++) {
        allUpdates.push({
          id: updatedModules[targetModuleIndex].classes[targetClassIndex].lessons[i].id,
          class_id: targetClassId,
          order_index: i,
        });
      }
      
      await apiRequest('/api/org-service/lessons/reorder', {
        method: 'POST',
        body: JSON.stringify({ updates: allUpdates }),
      });
      
      toast.success(sourceClassId === targetClassId ? "Lesson order updated" : "Lesson moved to new class");
    } catch (error) {
      console.error("Error updating lesson order:", error);
      toast.error("Failed to update lesson order. Please try again.");
      await loadCourse();
    }
  };

  // Module CRUD
  const openAddModuleModal = () => {
    setEditingModule(null);
    setModuleForm({ title: "" });
    setModuleModalOpen(true);
  };
  
  const openEditModuleModal = (module: ModuleWithClasses) => {
    setEditingModule(module);
    setModuleForm({ title: module.title });
    setModuleModalOpen(true);
  };
  
  const saveModule = async () => {
    if (!moduleForm.title.trim()) {
      toast.error("Please enter a module title");
      return;
    }
    
    try {
      if (editingModule) {
        await apiRequest(`/api/org-service/modules/${editingModule.id}`, {
          method: 'PUT',
          body: JSON.stringify({ title: moduleForm.title }),
        });
      } else {
        // ✅ Fix: Get the current maximum order_index and add 1
        const existingModules = course?.modules || [];
        const maxOrderIndex = existingModules.length > 0 
          ? Math.max(...existingModules.map(m => m.order_index ?? 0))
          : -1;
        const newOrderIndex = maxOrderIndex + 1;
        
        await apiRequest('/api/org-service/modules', {
          method: 'POST',
          body: JSON.stringify({
            course_id: courseId,
            title: moduleForm.title,
            order_index: newOrderIndex,
          }),
        });
      }
      
      // Refresh course data after save
      await loadCourse();
      setModuleModalOpen(false);
      toast.success(editingModule ? "Module updated" : "Module added");
      
    } catch (error: any) {
      console.error("Error saving module:", error);
      toast.error(error.message || "Failed to save module");
    }
  };

  // Add this function to perform the actual deletion
  const confirmDeleteModule = async () => {
    if (!moduleToDelete) return;
    
    try {
      await deleteModule(moduleToDelete.id);
      
      // Get the updated modules after deletion
      const updatedModules = course!.modules?.filter(m => m.id !== moduleToDelete.id) || [];
      
      // Reorder the remaining modules
      const reorderedModules = updatedModules.map((module, index) => ({
        id: module.id,
        order_index: index,
      }));
      
      // Send batch update to backend to reorder modules
      if (reorderedModules.length > 0) {
        await apiRequest('/api/org-service/modules/reorder', {
          method: 'POST',
          body: JSON.stringify({ updates: reorderedModules }),
        });
      }
      
      // Update local state
      setCourse({
        ...course!,
        modules: updatedModules.map((m, idx) => ({ ...m, order_index: idx }))
      });
      
      toast.success(`Module "${moduleToDelete.title}" deleted`);
      setDeleteModuleModalOpen(false);
      setModuleToDelete(null);
      
      // Refresh course data to ensure consistency
      await loadCourse();
    } catch (error) {
      console.error("Error deleting module:", error);
      toast.error("Failed to delete module");
    }
  };

  // Replace the existing deleteModule function (around line 350)
  const promptDeleteModule = (moduleId: number, moduleTitle: string) => {
    setModuleToDelete({ id: moduleId, title: moduleTitle });
    setDeleteModuleModalOpen(true);
  };
  
  // Class CRUD
  const openAddClassModal = (moduleId: number) => {
    setEditingClass(null);
    setClassForm({ title: "" });
    setEditingClass({ class: {} as any, moduleId });
    setClassModalOpen(true);
  };
  
  const openEditClassModal = (classItem: ClassWithLessons, moduleId: number) => {
    setEditingClass({ class: classItem, moduleId });
    setClassForm({ title: classItem.title });
    setClassModalOpen(true);
  };
  
  const promptDeleteClass = (classId: number, moduleId: number, classTitle: string) => {
    setClassToDelete({ id: classId, title: classTitle, moduleId });
    setDeleteClassModalOpen(true);
  };
  


  // Lesson CRUD
  // REPLACE the existing openAddLessonModal with this:
  const openAddLessonModal = (classId: number, moduleId: number) => {
    setEditingLesson(null);
    setLessonForm({
      title: "",
      content_type: "video",
      content_url: "",
      content_json: null,
      duration_seconds: 0,
      is_free_preview: false,
      notes: "",
      resources: [], // ADD THIS LINE
    });
    setEditingLesson({ lesson: {} as any, classId, moduleId });
    setLessonModalOpen(true);
  };
  
  // REPLACE the existing openEditLessonModal with this:
  const openEditLessonModal = (lesson: LessonWithAssignments, classId: number, moduleId: number) => {
    console.log("Opening edit for lesson:", lesson);
    
    let notes = "";
    let resources: Array<{ url: string; name: string; type: string; size: number }> = [];
    let contentJson = null;
    let textContent = "";
    let quizData = null;
    
    // Check if lesson has content_json
    if (lesson.content_json && typeof lesson.content_json === "object" && !Array.isArray(lesson.content_json)) {
      const parsedContent = lesson.content_json as Record<string, unknown>;
      console.log("Lesson has content_json:", parsedContent);
      
      if (lesson.content_type === "video") {
        notes = (parsedContent.notes as string) || "";
        resources = (parsedContent.resources as typeof resources) || [];
        contentJson = parsedContent;
      } else if (lesson.content_type === "text") {
        textContent = (parsedContent.content as string) || "";
        resources = (parsedContent.resources as typeof resources) || [];
        contentJson = textContent;
      } else if (lesson.content_type === "quiz") {
        quizData = parsedContent;
        resources = (parsedContent.resources as typeof resources) || [];
        contentJson = parsedContent;
      }
    } else {
      console.log("No content_json found for lesson");
    }
    
    setEditingLesson({ lesson, classId, moduleId });
    setLessonForm({
      title: lesson.title,
      content_type: lesson.content_type as any,
      content_url: lesson.content_url || "",
      content_json: contentJson,
      duration_seconds: lesson.duration_seconds || 0,
      is_free_preview: lesson.is_free_preview || false,
      notes: notes,
      resources: resources,
    });
    setLessonModalOpen(true);
  };
    
  const saveClass = async () => {
    if (!classForm.title.trim() || !editingClass) {
      toast.error("Please enter a class title");
      return;
    }
    
    try {
      if (editingClass.class.id) {
        await updateClass(editingClass.class.id, { title: classForm.title });
        
        const updatedModules = course?.modules?.map(m =>
          m.id === editingClass.moduleId
            ? {
                ...m,
                classes: m.classes.map(c =>
                  c.id === editingClass.class.id ? { ...c, title: classForm.title } : c
                )
              }
            : m
        );
        setCourse({ ...course!, modules: updatedModules });
        toast.success("Class updated");
      } else {
        // ✅ Fix: Get the current maximum order_index and add 1
        const currentClasses = course?.modules?.find(m => m.id === editingClass.moduleId)?.classes || [];
        const maxOrderIndex = currentClasses.length > 0 
          ? Math.max(...currentClasses.map(c => c.order_index ?? 0))
          : -1;
        const newOrderIndex = maxOrderIndex + 1;
        
        const newClass = await addClass(editingClass.moduleId, {
          title: classForm.title,
          order_index: newOrderIndex,
        });
        
        const updatedModules = course?.modules?.map(m =>
          m.id === editingClass.moduleId
            ? { ...m, classes: [...m.classes, { ...newClass, lessons: [] }] }
            : m
        );
        setCourse({ ...course!, modules: updatedModules });
        toast.success("Class added");
      }
      setClassModalOpen(false);
    } catch (error) {
      console.error("Error saving class:", error);
      toast.error("Failed to save class");
    }
  };

  const saveLesson = async () => {
    if (!lessonForm.title.trim() || !editingLesson) {
      toast.error("Please enter a lesson title");
      return;
    }
    
    try {
      const lessonData: any = {
        title: lessonForm.title,
        content_type: lessonForm.content_type,
        is_free_preview: lessonForm.is_free_preview,
        duration_seconds: lessonForm.duration_seconds || 0,
      };
      
      // Handle different content types
      if (lessonForm.content_type === "video") {
        lessonData.content_url = lessonForm.content_url;
        lessonData.content_json = {
          notes: lessonForm.notes || "",
          video_url: lessonForm.content_url,
          resources: lessonForm.resources || [],
        };
      } else if (lessonForm.content_type === "text") {
        lessonData.content_json = {
          content: lessonForm.content_json || "",
          resources: lessonForm.resources || [],
        };
        lessonData.content_url = null;
      } else if (lessonForm.content_type === "quiz") {
        lessonData.content_json = {
          ...lessonForm.content_json,
          resources: lessonForm.resources || [],
        };
        lessonData.content_url = null;
      }
      
      // Validate video URL if needed
      if (lessonForm.content_type === "video" && !lessonForm.content_url) {
        toast.error("Please add a video URL for video lessons");
        return;
      }
      
      if (editingLesson.lesson.id) {
        // Update existing lesson
        await apiRequest(`/api/org-service/lessons/${editingLesson.lesson.id}`, {
          method: 'PUT',
          body: JSON.stringify(lessonData),
        });
        toast.success("Lesson updated successfully");
      } else {
        // Create new lesson
        const currentLessons = course?.modules
          ?.find(m => m.id === editingLesson.moduleId)
          ?.classes.find(c => c.id === editingLesson.classId)?.lessons || [];
        const maxOrderIndex = currentLessons.length > 0 
          ? Math.max(...currentLessons.map(l => l.order_index ?? 0))
          : -1;
        const newOrderIndex = maxOrderIndex + 1;
        
        await apiRequest('/api/org-service/lessons', {
          method: 'POST',
          body: JSON.stringify({
            class_id: editingLesson.classId,
            ...lessonData,
            order_index: newOrderIndex,
          }),
        });
        toast.success("Lesson created successfully");
      }
      
      // Refresh course data
      await loadCourse();
      setLessonModalOpen(false);
      
    } catch (error: any) {
      console.error("Error saving lesson:", error);
      toast.error(error.message || "Failed to save lesson");
    }
  };

  const promptDeleteLesson = (lessonId: number, classId: number, moduleId: number, lessonTitle: string) => {
    setLessonToDelete({ id: lessonId, title: lessonTitle, classId, moduleId });
    setDeleteLessonModalOpen(true);
  };

  const confirmDeleteClass = async () => {
    if (!classToDelete) return;
    
    try {
      await deleteClass(classToDelete.id);
      
      // Find the module and reorder its classes
      const updatedModules = course?.modules?.map(module => {
        if (module.id === classToDelete.moduleId) {
          const updatedClasses = module.classes.filter(c => c.id !== classToDelete.id);
          // Reorder the remaining classes
          const reorderedClasses = updatedClasses.map((c, idx) => ({ ...c, order_index: idx }));
          return { ...module, classes: reorderedClasses };
        }
        return module;
      }) || [];
      
      setCourse({ ...course!, modules: updatedModules });
      toast.success(`Class "${classToDelete.title}" deleted`);
      setDeleteClassModalOpen(false);
      setClassToDelete(null);
      
      // Refresh to ensure consistency
      await loadCourse();
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error("Failed to delete class");
    }
  };

  const confirmDeleteLesson = async () => {
    if (!lessonToDelete) return;
    
    try {
      await deleteLesson(lessonToDelete.id);
      
      // Find the class and reorder its lessons
      const updatedModules = course?.modules?.map(module => {
        if (module.id === lessonToDelete.moduleId) {
          const updatedClasses = module.classes.map(classItem => {
            if (classItem.id === lessonToDelete.classId) {
              const updatedLessons = classItem.lessons.filter(l => l.id !== lessonToDelete.id);
              // Reorder the remaining lessons
              const reorderedLessons = updatedLessons.map((l, idx) => ({ ...l, order_index: idx }));
              return { ...classItem, lessons: reorderedLessons };
            }
            return classItem;
          });
          return { ...module, classes: updatedClasses };
        }
        return module;
      }) || [];
      
      setCourse({ ...course!, modules: updatedModules });
      toast.success(`Lesson "${lessonToDelete.title}" deleted`);
      setDeleteLessonModalOpen(false);
      setLessonToDelete(null);
      
      // Refresh to ensure consistency
      await loadCourse();
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast.error("Failed to delete lesson");
    }
  };
  
  // Assignment CRUD - FULLY FIXED with null checks
  const openAssignmentModal = (lesson: LessonWithAssignments, classId: number, moduleId: number, existingAssignment?: any) => {
    // console.log("=== OPEN ASSIGNMENT MODAL ===");
    // console.log("Lesson ID:", lesson.id);
    // console.log("Lesson title:", lesson.title);
    // console.log("Existing assignment:", existingAssignment);
    // console.log("All assignments for this lesson:", lesson.assignments);
    
    // Ensure assignments is an array
    const assignments = lesson.assignments || [];
    // console.log(`Found ${assignments.length} assignments for this lesson`);
    
    if (existingAssignment) {
      // Edit existing assignment
      setEditingAssignment({ 
        assignment: existingAssignment, 
        lessonId: lesson.id
      });
      setAssignmentForm({
        title: existingAssignment.title || "",
        description: existingAssignment.description || "",
        due_at: existingAssignment.due_at ? existingAssignment.due_at.split('T')[0] : "",
        points: existingAssignment.points || 100,
      });
    } else {
      // Create new assignment
      setEditingAssignment({ 
        assignment: null, 
        lessonId: lesson.id
      });
      setAssignmentForm({
        title: "",
        description: "",
        due_at: "",
        points: 100,
      });
    }
    setAssignmentModalOpen(true);
  };

  const saveAssignment = async () => {
    // console.log("=== SAVE ASSIGNMENT START ===");
    // console.log("Editing Assignment:", editingAssignment);
    // console.log("Assignment Form:", assignmentForm);
    
    if (!assignmentForm.title.trim()) {
      toast.error("Please enter an assignment title");
      return;
    }
    
    if (assignmentForm.points < 0) {
      toast.error("Points cannot be negative");
      return;
    }
    
    try {
      // Check if we're editing an existing assignment
      if (editingAssignment?.assignment && editingAssignment.assignment.id) {
        // UPDATE existing assignment
        // console.log("Updating assignment ID:", editingAssignment.assignment.id);
        
        await updateAssignment(editingAssignment.assignment.id, {
          title: assignmentForm.title,
          description: assignmentForm.description,
          due_at: assignmentForm.due_at || null,
          points: assignmentForm.points,
        });
        
        toast.success("Assignment updated successfully");
        
      } 
      // Check if we're creating a new assignment
      else if (editingAssignment?.lessonId) {
        // CREATE new assignment
        // console.log("Creating new assignment for lesson ID:", editingAssignment.lessonId);
        
        // Format due date if provided
        let dueAt = null;
        if (assignmentForm.due_at) {
          dueAt = new Date(assignmentForm.due_at).toISOString();
        }
        
        const assignmentData = {
          course_id: courseId,
          title: assignmentForm.title,
          description: assignmentForm.description,
          due_at: dueAt,
          points: assignmentForm.points,
        };
        
        // console.log("Sending assignment data:", assignmentData);
        
        await addAssignment(editingAssignment.lessonId, assignmentData);
        
        toast.success("Assignment added successfully");
      } 
      else {
        console.error("Invalid state - no assignment ID or lesson ID", editingAssignment);
        toast.error("Cannot save assignment: Invalid state");
        return;
      }
      
      // Close modal
      setAssignmentModalOpen(false);
      
      // Reset form
      setEditingAssignment(null);
      setAssignmentForm({
        title: "",
        description: "",
        due_at: "",
        points: 100,
      });
      
      // Force a complete reload of course data
      // console.log("Reloading course data to show new assignment...");
      await loadCourse();
      // console.log("Course reload complete");
      
    } catch (error: any) {
      console.error("ERROR in saveAssignment:", error);
      toast.error(`Failed to save assignment: ${error.message || "Please try again"}`);
    }
  };
  
  const handleDeleteAssignment = async (assignmentId: number) => {
    // console.log("=== HANDLE DELETE ASSIGNMENT ===");
    // console.log("Assignment ID to delete:", assignmentId);
    
    if (!assignmentId) {
      console.error("No assignment ID provided");
      toast.error("Cannot delete assignment: No ID provided");
      return;
    }
    
    // Use a confirm dialog that returns a Promise
    const confirmed = window.confirm("Are you sure you want to delete this assignment? This action cannot be undone.");
    
    if (!confirmed) {
      // console.log("Deletion cancelled by user");
      return;
    }
    
    try {
      // console.log("Calling deleteAssignment API for ID:", assignmentId);
      
      // Call the imported deleteAssignment function from supabase
      await deleteAssignment(assignmentId);
      
      // console.log("Delete API successful");
      toast.success("Assignment deleted successfully");
      
      // Close the modal first
      setAssignmentModalOpen(false);
      
      // Clear the editing state
      setEditingAssignment(null);
      setAssignmentForm({
        title: "",
        description: "",
        due_at: "",
        points: 100,
      });
      
      // Then reload the course data to refresh the UI
      await loadCourse();
      
      // console.log("Course reloaded after deletion");
      
    } catch (error) {
      console.error("Error deleting assignment:", error);
      const message = error instanceof Error ? error.message : "Please try again";
      toast.error(`Failed to delete assignment: ${message}`);
    }
  };

  // Course Offering (Course Class) CRUD
  const openAddOfferingModal = () => {
    setEditingOffering(null);
    setOfferingForm({
      name: "",
      description: "",
      instructor_id: null,
      start_date: "",
      end_date: "",
      max_students: 30,
      status: "upcoming",
    });
    setOfferingModalOpen(true);
  };
  
  const openEditOfferingModal = (offering: CourseClassWithDetails) => {
    setEditingOffering(offering);
    setOfferingForm({
      name: offering.name,
      description: offering.description || "",
      instructor_id: offering.instructor_id || null,
      start_date: offering.start_date || "",
      end_date: offering.end_date || "",
      max_students: offering.max_students || 30,
      status: offering.status as any,
    });
    setOfferingModalOpen(true);
  };
  
  const saveOffering = async () => {
    // Validate name
    if (!offeringForm.name.trim()) {
      toast.error("Please enter an offering name");
      return;
    }
    
    // Validate current user
    if (!currentUserId) {
      toast.error("Unable to identify current user. Please refresh and try again.");
      return;
    }
    
    try {
      const offeringData = {
        name: offeringForm.name.trim(),
        description: offeringForm.description?.trim() || null,
        instructor_id: currentUserId,  // Auto-set from logged-in user
        start_date: offeringForm.start_date || null,
        end_date: offeringForm.end_date || null,
        max_students: offeringForm.max_students || null,
        status: offeringForm.status,
      };
      
      // console.log("offeringData being sent:", offeringData);
      // console.log("Course ID:", courseId);
      
      let response;
      if (editingOffering) {
        // Update existing offering
        response = await apiRequest(`/api/org-service/course-classes/${editingOffering.id}`, {
          method: 'PUT',
          body: JSON.stringify(offeringData),
        });
        toast.success("Offering updated successfully");
      } else {
        // Create new offering - the backend expects course_id in the body
        response = await apiRequest(`/api/org-service/course-classes`, {
          method: 'POST',
          body: JSON.stringify({
            course_id: courseId,
            ...offeringData
          }),
        });
        toast.success("Offering added successfully");
      }
      
      // console.log("API response:", response);
      
      // Refresh course data
      await loadCourse();
      setOfferingModalOpen(false);
      
      // Reset form
      setOfferingForm({
        name: "",
        description: "",
        instructor_id: null,
        start_date: "",
        end_date: "",
        max_students: 30,
        status: "upcoming",
      });
      
    } catch (error: any) {
      console.error("Error saving offering:", error);
      toast.error(`Failed to save offering: ${error.message || "Please try again"}`);
    }
  };

  const deleteOffering = async (offeringId: number) => {
    if (confirm("Are you sure you want to delete this offering? This will remove all enrollments and schedules.")) {
      try {
        await deleteCourseClass(offeringId);
        await loadCourse();
        toast.success("Offering deleted");
      } catch (error) {
        toast.error("Failed to delete offering");
      }
    }
  };
  
  // Schedule CRUD
  // Open Add Schedule Modal
  const openAddScheduleModal = (offeringId: number) => {
    if (!offeringId) {
      toast.error("Invalid offering selected");
      return;
    }
    setSelectedOfferingId(offeringId);
    setScheduleForm({
      day_of_week: 0,
      start_time: "",
      end_time: "",
    });
    setScheduleModalOpen(true);
  };

  // Add Schedule Function
  const addSchedule = async () => {
    if (!selectedOfferingId) {
      toast.error("No offering selected");
      return;
    }

    if (!scheduleForm.day_of_week && scheduleForm.day_of_week !== 0) {
      toast.error("Please select a day of week");
      return;
    }
    if (!scheduleForm.start_time) {
      toast.error("Please enter start time");
      return;
    }
    if (!scheduleForm.end_time) {
      toast.error("Please enter end time");
      return;
    }
    if (!isValidClassScheduleTimeRange(scheduleForm.start_time, scheduleForm.end_time)) {
      toast.error(
        "End time must be after start time on the same day. If the class ends after midnight, split it into two schedules."
      );
      return;
    }

    try {
      await addClassSchedule(selectedOfferingId, {
        day_of_week: scheduleForm.day_of_week,
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
      });
      
      toast.success("Schedule added successfully");
      setScheduleModalOpen(false);
      setSelectedOfferingId(null);
      setScheduleForm({
        day_of_week: 0,
        start_time: "",
        end_time: "",
      });
      
      // Reload course data to show the new schedule
      await loadCourse();
    } catch (error: unknown) {
      console.error("Error adding schedule:", error);
      const err = error as { code?: string; message?: string };
      if (err?.code === "23514" || err?.message?.includes("ck_class_schedules_time_range")) {
        toast.error(
          "End time must be after start time on the same day. Check that end time is not earlier than start (e.g. 11:11 AM → 12:12 PM, not 12:12 AM)."
        );
      } else {
        toast.error(err?.message || "Failed to add schedule");
      }
    }
  };

  // Open Edit Schedule Modal
  const openEditScheduleModal = (schedule: any, offeringId: number) => {
    setEditingSchedule({
      id: schedule.id,
      offeringId: offeringId,
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
    });
    setEditScheduleForm({
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
    });
    setEditScheduleModalOpen(true);
  };

  // Update Schedule Function
  const updateSchedule = async () => {
    if (!editingSchedule) {
      toast.error("No schedule selected");
      return;
    }

    if (!editScheduleForm.day_of_week && editScheduleForm.day_of_week !== 0) {
      toast.error("Please select a day of week");
      return;
    }
    if (!editScheduleForm.start_time) {
      toast.error("Please enter start time");
      return;
    }
    if (!editScheduleForm.end_time) {
      toast.error("Please enter end time");
      return;
    }
    if (!isValidClassScheduleTimeRange(editScheduleForm.start_time, editScheduleForm.end_time)) {
      toast.error(
        "End time must be after start time on the same day. If the class ends after midnight, split it into two schedules."
      );
      return;
    }

    try {
      await updateClassSchedule(editingSchedule.id, {
        day_of_week: editScheduleForm.day_of_week,
        start_time: editScheduleForm.start_time,
        end_time: editScheduleForm.end_time,
      });
      
      toast.success("Schedule updated successfully");
      setEditScheduleModalOpen(false);
      setEditingSchedule(null);
      setEditScheduleForm({
        day_of_week: 0,
        start_time: "",
        end_time: "",
      });
      
      // Reload course data to show the updated schedule
      await loadCourse();
    } catch (error: unknown) {
      console.error("Error updating schedule:", error);
      const err = error as { code?: string; message?: string };
      if (err?.code === "23514" || err?.message?.includes("ck_class_schedules_time_range")) {
        toast.error(
          "End time must be after start time on the same day. Check that end time is not earlier than start (e.g. 11:11 AM → 12:12 PM, not 12:12 AM)."
        );
      } else {
        toast.error(err?.message || "Failed to update schedule");
      }
    }
  };

  // Delete Schedule Function
  const deleteSchedule = async (scheduleId: number, scheduleDay: string) => {
    if (confirm(`Are you sure you want to delete the schedule for ${scheduleDay}? This action cannot be undone.`)) {
      try {
        await deleteClassSchedule(scheduleId);
        toast.success("Schedule deleted successfully");
        
        // Reload course data to remove the schedule
        await loadCourse();
      } catch (error) {
        console.error("Error deleting schedule:", error);
        toast.error("Failed to delete schedule");
      }
    }
  };

  // Publish/Archive actions
  const handlePublish = async () => {
    try {
      await publishCourse(courseId);
      await loadCourse();
      toast.success("Course published!");
      setPublishConfirmOpen(false);
    } catch (error) {
      toast.error("Failed to publish course");
    }
  };
  
  const handleUnpublish = async () => {
    try {
      await unpublishCourse(courseId);
      await loadCourse();
      toast.success("Course unpublished");
    } catch (error) {
      toast.error("Failed to unpublish course");
    }
  };
  
  const handleArchive = async () => {
    if (confirm("Are you sure you want to archive this course?")) {
      try {
        await archiveCourse(courseId);
        await loadCourse();
        toast.success("Course archived");
      } catch (error) {
        toast.error("Failed to archive course");
      }
    }
  };
  
  const handleMoveToOrganization = async (orgId: number) => {
    try {
      await apiRequest(`/api/org-service/courses/${courseId}`, {
        method: 'PUT',
        body: JSON.stringify({ organization_id: orgId }),
      });
      await loadCourse();
      setSelectedOrgId(orgId);
      toast.success("Course moved to new organization");
    } catch (error) {
      console.error("Error moving course:", error);
      toast.error("Failed to move course");
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
              <p className="text-gray-400 mb-6">The course you're looking for doesn't exist or you don't have access.</p>
              <GlowButton onClick={() => router.push("/courses")}>
                Back to Courses
              </GlowButton>
            </div>
          </GlowCard>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href="/courses">
              <GlowButton variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </GlowButton>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">{course.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={
                  course.status === "published" ? "bg-green-500/20 text-green-300" :
                  course.status === "draft" ? "bg-yellow-500/20 text-yellow-300" :
                  "bg-gray-500/20 text-gray-300"
                }>
                  {course.status?.toUpperCase()}
                </Badge>
                {organizations.length > 1 && (
                  <Select value={selectedOrgId?.toString()} onValueChange={(v) => handleMoveToOrganization(parseInt(v))}>
                    <SelectTrigger className="w-48 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map(org => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            {course.status !== "published" && (
              <GlowButton variant="primary" onClick={() => setPublishConfirmOpen(true)}>
                <Rocket className="w-4 h-4 mr-2" />
                Publish
              </GlowButton>
            )}
            {course.status === "published" && (
              <GlowButton variant="secondary" onClick={handleUnpublish}>
                <Eye className="w-4 h-4 mr-2" />
                Unpublish
              </GlowButton>
            )}
            {course.status !== "archived" && (
              <GlowButton variant="ghost" onClick={handleArchive}>
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </GlowButton>
            )}
          </div>
        </div>
        
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700 flex-wrap h-auto">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="offerings">Offerings</TabsTrigger>
          </TabsList>
          
          {/* Basic Info Tab - Using the shared component */}
          <TabsContent value="basic">
            <GlowCard>
              <div className="p-6">
                <CourseBasicForm 
                  mode="edit"
                  initialData={{
                    id: course.id,
                    title: course.title,
                    description: course.description,
                    level: course.level,
                    category: course.category,
                    visibility: course.visibility as any,
                    thumbnail: course.thumbnail,
                    learning_objectives: course.learning_objectives as string[] || [],
                    prerequisites: course.prerequisites as string[] || [],
                    tags: course.tags as string[] || [],
                    organization_id: course.organization_id,
                    organization_name: organizations.find(o => o.id === course.organization_id)?.name,
                  }}
                  onSuccess={loadCourse}
                />
              </div>
            </GlowCard>
          </TabsContent>
          
          {/* Curriculum Tab */}
          <TabsContent value="curriculum">
            <GlowCard>
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Course Curriculum</h3>
                    <p className="text-sm text-gray-400">Drag to reorder modules, classes, and lessons</p>
                  </div>
                  <GlowButton onClick={openAddModuleModal}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Module
                  </GlowButton>
                </div>
                
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEndModules}
                >
                  <SortableContext
                    items={course.modules?.map(m => m.id) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {course.modules?.map((module, moduleIndex) => (
                        <SortableModuleItem
                          key={module.id}
                          module={module}
                          index={moduleIndex}
                          onEdit={openEditModuleModal}
                          onDelete={() => promptDeleteModule(module.id, module.title)}
                          onToggleExpand={toggleModule}
                          isExpanded={expandedModules.has(module.id)}
                        >
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="text-sm font-medium text-gray-400">Classes</h4>
                              <GlowButton
                                size="sm"
                                variant="secondary"
                                onClick={() => openAddClassModal(module.id)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Class
                              </GlowButton>
                            </div>
                            
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleDragEndClasses}
                            >
                              <SortableContext
                                items={module.classes.map(c => c.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2">
                                  {module.classes.map((classItem, classIndex) => (
                                    <SortableClassItem
                                      key={classItem.id}
                                      classItem={classItem}
                                      index={classIndex}
                                      moduleId={module.id}
                                      onEdit={openEditClassModal}
                                      onDelete={() => promptDeleteClass(classItem.id, module.id, classItem.title)}
                                      onToggleExpand={toggleClass}
                                      isExpanded={expandedClasses.has(classItem.id)}
                                    >
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                          <h5 className="text-sm font-medium text-gray-400">Lessons</h5>
                                          <GlowButton
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => openAddLessonModal(classItem.id, module.id)}
                                          >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Add Lesson
                                          </GlowButton>
                                        </div>
                                        
                                        <DndContext
                                          sensors={sensors}
                                          collisionDetection={closestCenter}
                                          onDragEnd={handleDragEndLessons}
                                        >
                                          <SortableContext
                                            items={classItem.lessons.map(l => l.id)}
                                            strategy={verticalListSortingStrategy}
                                          >
                                            <div className="space-y-2">
                                              {classItem.lessons.map((lesson, lessonIndex) => (
                                                <SortableLessonItem
                                                  key={lesson.id}
                                                  lesson={lesson}
                                                  index={lessonIndex}
                                                  classId={classItem.id}
                                                  moduleId={module.id}
                                                  onEdit={openEditLessonModal}
                                                  onDelete={() => promptDeleteLesson(lesson.id, classItem.id, module.id, lesson.title)}
                                                  onAddAssignment={openAssignmentModal}
                                                />
                                              ))}
                                            </div>
                                          </SortableContext>
                                        </DndContext>
                                        
                                        {classItem.lessons.length === 0 && (
                                          <div className="text-center py-4 text-gray-500 text-sm">
                                            No lessons yet. Click "Add Lesson" to get started.
                                          </div>
                                        )}
                                      </div>
                                    </SortableClassItem>
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                            
                            {module.classes.length === 0 && (
                              <div className="text-center py-8 text-gray-500">
                                No classes yet. Click "Add Class" to create your first class.
                              </div>
                            )}
                          </div>
                        </SortableModuleItem>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                
                {course.modules?.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No modules yet. Click "Add Module" to start building your course.</p>
                  </div>
                )}
              </div>
            </GlowCard>
          </TabsContent>
          
          {/* Offerings Tab */}
          {/* Offerings Tab - NOW CONSISTENT with Basic Info and Curriculum tabs */}
          <TabsContent value="offerings">
            <GlowCard>
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Course Offerings</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Manage different sessions/classes for this course
                    </p>
                  </div>
                  <GlowButton onClick={openAddOfferingModal}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Offering
                  </GlowButton>
                </div>

                {course?.course_classes && course.course_classes.length > 0 ? (
                  <div className="space-y-4">
                    {course.course_classes.map((offering) => (
                      <div key={offering.id} className="border border-slate-700 rounded-lg p-5 bg-slate-800/20">
                        {/* offering content - same as before, just remove GlowCard wrapper */}
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-white text-lg">{offering.name}</h4>
                              <Badge className={`
                                ${offering.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                  offering.status === 'ongoing' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                  offering.status === 'completed' ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' :
                                  'bg-red-500/20 text-red-400 border-red-500/30'}
                              `}>
                                {offering.status}
                              </Badge>
                            </div>
                            {offering.description && (
                              <p className="text-sm text-gray-400 mb-3">{offering.description}</p>
                            )}
                            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                              {offering.start_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>Starts: {new Date(offering.start_date).toLocaleDateString()}</span>
                                </div>
                              )}
                              {offering.end_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>Ends: {new Date(offering.end_date).toLocaleDateString()}</span>
                                </div>
                              )}
                              {offering.max_students && (
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  <span>Max: {offering.max_students} students</span>
                                </div>
                              )}
                            </div>

                            {/* Display Schedules */}
                            {offering.schedules && offering.schedules.length > 0 && (
                              <div className="mt-3">
                                <div className="flex items-center gap-2 mb-3">
                                  <Clock className="w-4 h-4 text-purple-400" />
                                  <span className="text-sm font-medium text-gray-300">Schedule:</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                  {offering.schedules.map((schedule) => (
                                    <div 
                                      key={schedule.id} 
                                      className="group flex items-center gap-2 transition-all duration-200"
                                    >
                                      <div className="flex-1 flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/50 group-hover:border-purple-500/30 group-hover:bg-slate-800/50 transition-all duration-200">
                                        <div className="flex items-center gap-3">
                                          <div className="w-2 h-2 rounded-full bg-purple-400/60 group-hover:bg-purple-400 transition-colors duration-200" />
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-200 min-w-[90px]">
                                              {getDayName(schedule.day_of_week)}
                                            </span>
                                            <span className="text-sm text-gray-300">
                                              {schedule.start_time} - {schedule.end_time}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
                                          <button
                                            onClick={() => openEditScheduleModal(schedule, offering.id)}
                                            className="p-1.5 rounded-md hover:bg-purple-500/20 transition-all duration-200"
                                            title="Edit schedule"
                                          >
                                            <Edit className="w-3.5 h-3.5 text-gray-400 hover:text-purple-400 transition-colors" />
                                          </button>
                                          <button
                                            onClick={() => deleteSchedule(schedule.id, getDayName(schedule.day_of_week))}
                                            className="p-1.5 rounded-md hover:bg-red-500/20 transition-all duration-200"
                                            title="Delete schedule"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-400 transition-colors" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <GlowButton
                              size="sm"
                              variant="outline"
                              onClick={() => openAddScheduleModal(offering.id)}
                            >
                              <Clock className="w-4 h-4 mr-2" />
                              Add Schedule
                            </GlowButton>
                            <GlowButton
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/courses/${courseId}/offerings/${offering.id}/students`)}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Manage Students
                            </GlowButton>
                            <GlowButton
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${offering.name}"?`)) {
                                  deleteOffering(offering.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </GlowButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <h4 className="text-lg font-semibold text-white mb-2">No Offerings Yet</h4>
                    <p className="text-gray-400 mb-4">
                      Create your first course offering to start enrolling students.
                    </p>
                  </div>
                )}
              </div>
            </GlowCard>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Modals */}
      
      {/* Module Modal */}
      <Dialog open={moduleModalOpen} onOpenChange={setModuleModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingModule ? "Edit Module" : "Add Module"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingModule 
                ? "Update the module title for this course" 
                : "Create a new module to organize your course content"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Module Title</Label>
              <Input
                value={moduleForm.title}
                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                placeholder="e.g., Introduction to Programming"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <GlowButton variant="ghost" onClick={() => setModuleModalOpen(false)}>Cancel</GlowButton>
            <GlowButton onClick={saveModule}>Save</GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Class Modal */}
      <Dialog open={classModalOpen} onOpenChange={setClassModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingClass?.class.id ? "Edit Class" : "Add Class"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingClass?.class.id 
                ? "Update the class title" 
                : "Add a new class to organize your lessons"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Class Title</Label>
              <Input
                value={classForm.title}
                onChange={(e) => setClassForm({ ...classForm, title: e.target.value })}
                placeholder="e.g., Getting Started"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <GlowButton variant="ghost" onClick={() => setClassModalOpen(false)}>Cancel</GlowButton>
            <GlowButton onClick={saveClass}>Save</GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Lesson Modal - Complete replacement */}
      <Dialog open={lessonModalOpen} onOpenChange={setLessonModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingLesson?.lesson.id ? "Edit Lesson" : "Add Lesson"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingLesson?.lesson.id 
                ? "Modify the lesson content, video, or quiz" 
                : "Create a new lesson for your students"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Lesson Title</Label>
                <Input
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  placeholder="Enter lesson title"
                  className="mt-2"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Content Type</Label>
                  <Select
                    value={lessonForm.content_type}
                    onValueChange={(value: any) => {
                      setLessonForm({ 
                        ...lessonForm, 
                        content_type: value,
                        content_url: "",
                        content_json: null,
                        notes: "",
                      });
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          <span>Video Lesson</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="text">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span>Text Lesson</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="quiz">
                        <div className="flex items-center gap-2">
                          <FileQuestion className="w-4 h-4" />
                          <span>Quiz / Assessment</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Estimated Duration (seconds)</Label>
                  <Input
                    type="number"
                    value={lessonForm.duration_seconds}
                    onChange={(e) => setLessonForm({ ...lessonForm, duration_seconds: parseInt(e.target.value) || 0 })}
                    placeholder="e.g., 600 for 10 minutes"
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Help students know how long this lesson takes
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Switch
                  checked={lessonForm.is_free_preview}
                  onCheckedChange={(checked) => setLessonForm({ ...lessonForm, is_free_preview: checked })}
                />
                <Label>Free Preview (available to non-enrolled users)</Label>
              </div>
            </div>

            {/* VIDEO LESSON CONTENT */}
            {lessonForm.content_type === "video" && (
              <div className="space-y-6 border-t border-slate-700 pt-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Video Source</Label>
                    <Tabs defaultValue="url" className="mt-2">
                      <TabsList className="bg-slate-800/50">
                        <TabsTrigger value="url">Video URL</TabsTrigger>
                        <TabsTrigger value="upload">Upload Video</TabsTrigger>
                      </TabsList>
                      <TabsContent value="url" className="mt-3">
                        <Input
                          value={lessonForm.content_url}
                          onChange={(e) => setLessonForm({ ...lessonForm, content_url: e.target.value })}
                          placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/... or direct MP4 URL"
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Supported: YouTube, Vimeo, or direct video file URLs
                        </p>
                      </TabsContent>
                      <TabsContent value="upload" className="mt-3">
                        <FileUpload
                          bucket="course-videos"
                          folder={`courses/${courseId}/videos`}
                          accept="video/mp4,video/webm,video/quicktime"
                          maxFiles={1}
                          maxSizeMB={500}
                          onUploadComplete={(files) => {
                            if (files[0]) {
                              setLessonForm({ ...lessonForm, content_url: files[0].url });
                            }
                          }}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  {/* Video Preview */}
                  {lessonForm.content_url && (
                    <div className="bg-slate-900 rounded-lg overflow-hidden">
                      <div className="aspect-video bg-black flex items-center justify-center">
                        {lessonForm.content_url.includes("youtube.com") || lessonForm.content_url.includes("youtu.be") ? (
                          (() => {
                            const videoId = lessonForm.content_url.split("v=")[1]?.split("&")[0] || 
                                            lessonForm.content_url.split("youtu.be/")[1]?.split("?")[0];
                            return videoId ? (
                              <iframe
                                src={`https://www.youtube.com/embed/${videoId}`}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title="Video preview"
                              />
                            ) : (
                              <div className="text-gray-400">Unable to preview video</div>
                            );
                          })()
                        ) : (
                          <video
                            src={lessonForm.content_url}
                            controls
                            className="max-w-full max-h-full"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Lesson Notes - Rich Text Editor for Video Lessons */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Lesson Notes / Transcript</Label>
                  <p className="text-xs text-gray-400 mb-2">
                    Add notes, key takeaways, or a transcript for students to reference
                  </p>
                  <RichTextEditor
                    value={lessonForm.notes || ""}
                    onChange={(html) => setLessonForm({ ...lessonForm, notes: html })}
                    placeholder="Add lesson notes, key points, or transcript here..."
                  />
                </div>

                {/* Additional Resources (add this) */}
                <div className="space-y-4 border-t border-slate-700 pt-4">
                  <Label className="text-base font-semibold">Additional Resources</Label>
                  <p className="text-xs text-gray-400 mb-3">
                    Upload supplementary materials for students (PDFs, presentations, worksheets, etc.)
                  </p>
                  <FileUpload
                    bucket="course-resources"
                    folder={`courses/${courseId}/lessons/${editingLesson?.lesson.id || 'new'}`}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.mp3,.jpg,.png"
                    maxFiles={10}
                    maxSizeMB={50}
                    existingFiles={lessonForm.resources}
                    onUploadComplete={(files) => setLessonForm({ ...lessonForm, resources: files })}
                  />
                </div>

              </div>
            )}
            
            {/* TEXT LESSON CONTENT */}
            {lessonForm.content_type === "text" && (
              <div className="space-y-4 border-t border-slate-700 pt-4">
                <div>
                  <Label className="text-base font-semibold">Lesson Content</Label>
                  <p className="text-xs text-gray-400 mb-2">
                    Write your lesson content using the rich text editor. You can format text, add images, links, and more.
                  </p>
                  <div className="mt-2">
                    <RichTextEditor
                      value={lessonForm.content_json || ""}
                      onChange={(html) => setLessonForm({ ...lessonForm, content_json: html })}
                      placeholder="Write your lesson content here..."
                    />
                  </div>
                </div>

                {/* ADD THIS - Additional Resources for Text Lessons */}
                <div className="space-y-4 border-t border-slate-700 pt-4">
                  <Label className="text-base font-semibold">Additional Resources</Label>
                  <p className="text-xs text-gray-400 mb-3">
                    Upload supplementary materials for students (PDFs, presentations, worksheets, etc.)
                  </p>
                  <FileUpload
                    bucket="course-resources"
                    folder={`courses/${courseId}/lessons/${editingLesson?.lesson.id || 'new'}`}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.mp3,.jpg,.png"
                    maxFiles={10}
                    maxSizeMB={50}
                    existingFiles={lessonForm.resources}
                    onUploadComplete={(files) => setLessonForm({ ...lessonForm, resources: files })}
                  />
                </div>
              </div>
            )}
            
            {/* QUIZ LESSON CONTENT - REPLACE THE ENTIRE SECTION */}
            {lessonForm.content_type === "quiz" && (
              <div className="space-y-4 border-t border-slate-700 pt-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">Quiz Configuration</h4>
                  <p className="text-sm text-gray-300">
                    Create quizzes to assess student understanding. You can add multiple choice questions, 
                    single choice, and true/false questions. Quiz results will be tracked in student progress.
                  </p>
                </div>
                
                {/* Quiz Builder UI with fixes */}
                {(() => {
                  const quizData = lessonForm.content_json || { questions: [], passing_score: 70, time_limit_minutes: null };
                  const questions = quizData.questions || [];
                  
                  const addQuestion = () => {
                    const newQuestions = [...questions, {
                      id: Date.now().toString(),
                      text: "",
                      type: "single_choice",
                      options: ["", ""],
                      correct_answer: "",
                      points: 10
                    }];
                    setLessonForm({ 
                      ...lessonForm, 
                      content_json: { ...quizData, questions: newQuestions }
                    });
                  };
                  
                  const updateQuestion = (index: number, field: string, value: any) => {
                    const updatedQuestions = [...questions];
                    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
                    // Reset correct_answer when changing type to avoid mismatches
                    if (field === 'type') {
                      updatedQuestions[index].correct_answer = "";
                      if (value === 'true_false') {
                        updatedQuestions[index].options = [];
                      } else if (value === 'multiple_choice' && (!updatedQuestions[index].options || updatedQuestions[index].options.length < 2)) {
                        updatedQuestions[index].options = ["", ""];
                      } else if (value === 'single_choice' && (!updatedQuestions[index].options || updatedQuestions[index].options.length < 2)) {
                        updatedQuestions[index].options = ["", ""];
                      }
                    }
                    setLessonForm({ 
                      ...lessonForm, 
                      content_json: { ...quizData, questions: updatedQuestions }
                    });
                  };
                  
                  const deleteQuestion = (index: number) => {
                    const updatedQuestions = questions.filter((_: any, i: number) => i !== index);
                    setLessonForm({ 
                      ...lessonForm, 
                      content_json: { ...quizData, questions: updatedQuestions }
                    });
                  };
                  
                  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
                    const updatedQuestions = [...questions];
                    const options = [...(updatedQuestions[questionIndex].options || [])];
                    options[optionIndex] = value;
                    updatedQuestions[questionIndex].options = options;
                    setLessonForm({ 
                      ...lessonForm, 
                      content_json: { ...quizData, questions: updatedQuestions }
                    });
                  };
                  
                  const addOption = (questionIndex: number) => {
                    const updatedQuestions = [...questions];
                    const options = [...(updatedQuestions[questionIndex].options || [])];
                    options.push("");
                    updatedQuestions[questionIndex].options = options;
                    setLessonForm({ 
                      ...lessonForm, 
                      content_json: { ...quizData, questions: updatedQuestions }
                    });
                  };
                  
                  const deleteOption = (questionIndex: number, optionIndex: number) => {
                    const updatedQuestions = [...questions];
                    const options = [...(updatedQuestions[questionIndex].options || [])];
                    options.splice(optionIndex, 1);
                    updatedQuestions[questionIndex].options = options;
                    // If the deleted option was the correct answer, clear it
                    if (updatedQuestions[questionIndex].correct_answer === options[optionIndex]) {
                      updatedQuestions[questionIndex].correct_answer = "";
                    }
                    setLessonForm({ 
                      ...lessonForm, 
                      content_json: { ...quizData, questions: updatedQuestions }
                    });
                  };
                  
                  const handleCorrectAnswerChange = (questionIndex: number, value: string | string[]) => {
                    const updatedQuestions = [...questions];
                    updatedQuestions[questionIndex].correct_answer = value;
                    setLessonForm({ 
                      ...lessonForm, 
                      content_json: { ...quizData, questions: updatedQuestions }
                    });
                  };
                  
                  return (
                    <div className="space-y-4">
                      {/* Quiz Settings */}
                      <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/30 rounded-lg">
                        <div>
                          <Label>Passing Score (%)</Label>
                          <Input
                            type="number"
                            value={quizData.passing_score || 70}
                            onChange={(e) => setLessonForm({ 
                              ...lessonForm, 
                              content_json: { ...quizData, passing_score: parseInt(e.target.value) || 70 }
                            })}
                            className="mt-1"
                            min="0"
                            max="100"
                          />
                        </div>
                        <div>
                          <Label>Time Limit (minutes)</Label>
                          <Input
                            type="number"
                            value={quizData.time_limit_minutes || ""}
                            onChange={(e) => setLessonForm({ 
                              ...lessonForm, 
                              content_json: { ...quizData, time_limit_minutes: e.target.value ? parseInt(e.target.value) : null }
                            })}
                            className="mt-1"
                            placeholder="No limit"
                            min="1"
                          />
                        </div>
                      </div>
                      
                      {/* Questions List */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-base font-semibold">Questions</Label>
                          <GlowButton size="sm" onClick={addQuestion}>
                            <Plus className="w-3 h-3 mr-1" />
                            Add Question
                          </GlowButton>
                        </div>
                        
                        {questions.length === 0 && (
                          <div className="text-center py-8 text-gray-400 border border-dashed border-slate-700 rounded-lg">
                            <FileQuestion className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No questions yet. Click "Add Question" to get started.</p>
                          </div>
                        )}
                        
                        {questions.map((q: any, idx: number) => (
                          <div key={q.id} className="border border-slate-700 rounded-lg p-4 bg-slate-800/20">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="text-white font-medium">Question {idx + 1}</h4>
                              <button
                                onClick={() => deleteQuestion(idx)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <Label>Question Text</Label>
                                <Input
                                  value={q.text}
                                  onChange={(e) => updateQuestion(idx, "text", e.target.value)}
                                  placeholder="Enter your question here..."
                                  className="mt-1"
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label>Question Type</Label>
                                  <Select
                                    value={q.type}
                                    onValueChange={(value) => updateQuestion(idx, "type", value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="single_choice">
                                        <div className="flex items-center gap-2">
                                          <div className="w-4 h-4 rounded-full border border-gray-400" />
                                          <span>Single Choice (Radio)</span>
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="multiple_choice">
                                        <div className="flex items-center gap-2">
                                          <div className="w-4 h-4 border border-gray-400 rounded" />
                                          <span>Multiple Choice (Checkbox)</span>
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="true_false">
                                        <div className="flex items-center gap-2">
                                          <span>T / F</span>
                                          <span>True / False</span>
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Points</Label>
                                  <Input
                                    type="number"
                                    value={q.points || 10}
                                    onChange={(e) => updateQuestion(idx, "points", parseInt(e.target.value) || 0)}
                                    className="mt-1"
                                    min="1"
                                  />
                                </div>
                              </div>
                              
                              {/* Options for single choice */}
                              {q.type === "single_choice" && (
                                <div className="space-y-2">
                                  <Label>Options (Select one)</Label>
                                  {q.options && q.options.map((opt: string, optIdx: number) => (
                                    <div key={optIdx} className="flex gap-2 items-center">
                                      <input
                                        type="radio"
                                        name={`question_${idx}`}
                                        checked={q.correct_answer === opt}
                                        onChange={() => handleCorrectAnswerChange(idx, opt)}
                                        className="w-4 h-4"
                                      />
                                      <Input
                                        value={opt}
                                        onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                                        placeholder={`Option ${optIdx + 1}`}
                                        className="flex-1"
                                      />
                                      <button
                                        onClick={() => deleteOption(idx, optIdx)}
                                        className="p-1 rounded hover:bg-red-500/20"
                                        disabled={q.options.length <= 2}
                                      >
                                        <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-400" />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => addOption(idx)}
                                    className="text-xs text-purple-400 hover:text-purple-300"
                                  >
                                    + Add Option
                                  </button>
                                </div>
                              )}
                              
                              {/* Options for multiple choice */}
                              {q.type === "multiple_choice" && (
                                <div className="space-y-2">
                                  <Label>Options (Select multiple - store as comma-separated)</Label>
                                  <p className="text-xs text-gray-400 mb-1">
                                    For multiple correct answers, separate with commas (e.g., "opt1,opt2")
                                  </p>
                                  {q.options && q.options.map((opt: string, optIdx: number) => (
                                    <div key={optIdx} className="flex gap-2 items-center">
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4"
                                        checked={q.correct_answer?.split(",").includes(opt)}
                                        onChange={(e) => {
                                          let newCorrect = q.correct_answer ? q.correct_answer.split(",") : [];
                                          if (e.target.checked) {
                                            newCorrect.push(opt);
                                          } else {
                                            newCorrect = newCorrect.filter((c: string) => c !== opt);
                                          }
                                          handleCorrectAnswerChange(idx, newCorrect.join(","));
                                        }}
                                      />
                                      <Input
                                        value={opt}
                                        onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                                        placeholder={`Option ${optIdx + 1}`}
                                        className="flex-1"
                                      />
                                      <button
                                        onClick={() => deleteOption(idx, optIdx)}
                                        className="p-1 rounded hover:bg-red-500/20"
                                        disabled={q.options.length <= 2}
                                      >
                                        <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-400" />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => addOption(idx)}
                                    className="text-xs text-purple-400 hover:text-purple-300"
                                  >
                                    + Add Option
                                  </button>
                                  {q.correct_answer && q.correct_answer.split(",").filter((c: string) => c).length > 1 && (
                                    <p className="text-xs text-green-400 mt-1">
                                      ✓ Multiple correct answers selected
                                    </p>
                                  )}
                                </div>
                              )}
                              
                              {/* True/False options */}
                              {q.type === "true_false" && (
                                <div className="space-y-2">
                                  <Label>Correct Answer</Label>
                                  <div className="flex gap-4">
                                    <label className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={`tf_${idx}`}
                                        checked={q.correct_answer === "true"}
                                        onChange={() => handleCorrectAnswerChange(idx, "true")}
                                        className="w-4 h-4"
                                      />
                                      True
                                    </label>
                                    <label className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={`tf_${idx}`}
                                        checked={q.correct_answer === "false"}
                                        onChange={() => handleCorrectAnswerChange(idx, "false")}
                                        className="w-4 h-4"
                                      />
                                      False
                                    </label>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Additional Resources for Quiz Lessons */}
                <div className="space-y-4 border-t border-slate-700 pt-4">
                  <Label className="text-base font-semibold">Additional Resources</Label>
                  <p className="text-xs text-gray-400 mb-3">
                    Upload supplementary materials for students (reference sheets, study guides, etc.)
                  </p>
                  <FileUpload
                    bucket="course-resources"
                    folder={`courses/${courseId}/lessons/${editingLesson?.lesson.id || 'new'}`}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.mp3,.jpg,.png"
                    maxFiles={10}
                    maxSizeMB={50}
                    existingFiles={lessonForm.resources}
                    onUploadComplete={(files) => setLessonForm({ ...lessonForm, resources: files })}
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-6">
            <GlowButton variant="ghost" onClick={() => setLessonModalOpen(false)}>
              Cancel
            </GlowButton>
            <GlowButton onClick={saveLesson}>
              {editingLesson?.lesson.id ? "Save Changes" : "Create Lesson"}
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
            
      {/* Assignment Modal */}
      {/* Assignment Modal - Update the description field */}
      <Dialog open={assignmentModalOpen} onOpenChange={(open) => {
        if (!open) {
          setEditingAssignment(null);
          setAssignmentForm({
            title: "",
            description: "",
            due_at: "",
            points: 100,
          });
        }
        setAssignmentModalOpen(open);
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {(editingAssignment && editingAssignment.assignment && editingAssignment.assignment.id) ? "Edit Assignment" : "Add Assignment"}
            </DialogTitle>
            <DialogDescription>
              {editingAssignment?.assignment?.id 
                ? "Edit the assignment details below" 
                : "Create a new assignment for this lesson"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Assignment Title</Label>
              <Input
                value={assignmentForm.title}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                placeholder="Assignment title"
                className="mt-2"
              />
            </div>
            
            {/* REPLACE the existing description Textarea with this */}
            <div>
              <Label>Description / Instructions</Label>
              <p className="text-xs text-gray-400 mb-2">
                Provide detailed instructions for students. You can format text, add links, images, etc.
              </p>
              <div className="mt-2">
                <RichTextEditor
                  value={assignmentForm.description}
                  onChange={(html) => setAssignmentForm({ ...assignmentForm, description: html })}
                  placeholder="Describe the assignment, provide instructions, rubric, etc..."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Points</Label>
                <Input
                  type="number"
                  value={assignmentForm.points}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, points: parseInt(e.target.value) || 0 })}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>Due Date</Label>
                <Input
                  type="datetime-local"
                  value={assignmentForm.due_at}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, due_at: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            {(editingAssignment && editingAssignment.assignment && editingAssignment.assignment.id) && (
              <GlowButton
                variant="ghost"
                className="text-red-400"
                onClick={async () => {
                  if (editingAssignment && editingAssignment.assignment && editingAssignment.assignment.id) {
                    const btn = document.activeElement as HTMLButtonElement;
                    if (btn) btn.disabled = true;
                    await handleDeleteAssignment(editingAssignment.assignment.id);
                    if (btn) btn.disabled = false;
                  }
                }}
              >
                Delete
              </GlowButton>
            )}
            <GlowButton variant="ghost" onClick={() => {
              setAssignmentModalOpen(false);
              setEditingAssignment(null);
              setAssignmentForm({
                title: "",
                description: "",
                due_at: "",
                points: 100,
              });
            }}>Cancel</GlowButton>
            <GlowButton onClick={saveAssignment}>Save</GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Offering Modal */}
      <Dialog open={offeringModalOpen} onOpenChange={setOfferingModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingOffering ? "Edit Offering" : "Add Offering"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingOffering 
                ? "Update the course offering details" 
                : "Create a new course offering (session/cohort)"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Offering Name *</Label>
              <Input
                value={offeringForm.name}
                onChange={(e) => setOfferingForm({ ...offeringForm, name: e.target.value })}
                placeholder="e.g., Spring 2025 Cohort"
                className="mt-2"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={offeringForm.description}
                onChange={(e) => setOfferingForm({ ...offeringForm, description: e.target.value })}
                placeholder="Describe this offering"
                rows={2}
                className="mt-2"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={offeringForm.start_date}
                  onChange={(e) => setOfferingForm({ ...offeringForm, start_date: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={offeringForm.end_date}
                  onChange={(e) => setOfferingForm({ ...offeringForm, end_date: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Students</Label>
                <Input
                  type="number"
                  value={offeringForm.max_students}
                  onChange={(e) => setOfferingForm({ ...offeringForm, max_students: parseInt(e.target.value) || 0 })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={offeringForm.status}
                  onValueChange={(value: any) => setOfferingForm({ ...offeringForm, status: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <GlowButton variant="ghost" onClick={() => setOfferingModalOpen(false)}>Cancel</GlowButton>
            <GlowButton onClick={saveOffering}>Save</GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Schedule</DialogTitle>
            <DialogDescription>
              Add a new schedule time for this offering. End time must be later than start time the same day (24-hour
              clock in the picker).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select
                value={scheduleForm.day_of_week.toString()}
                onValueChange={(value) => setScheduleForm(prev => ({ ...prev, day_of_week: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={scheduleForm.start_time}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, start_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={scheduleForm.end_time}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, end_time: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <GlowButton variant="outline" onClick={() => {
              setScheduleModalOpen(false);
              setSelectedOfferingId(null);
              setScheduleForm({
                day_of_week: 0,
                start_time: "",
                end_time: "",
              });
            }}>
              Cancel
            </GlowButton>
            <GlowButton onClick={addSchedule}>
              Add Schedule
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Modal */}
      <Dialog open={editScheduleModalOpen} onOpenChange={setEditScheduleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>
              Update the schedule time for this offering. End time must be later than start time the same day.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select
                value={editScheduleForm.day_of_week.toString()}
                onValueChange={(value) => setEditScheduleForm(prev => ({ ...prev, day_of_week: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={editScheduleForm.start_time}
                onChange={(e) => setEditScheduleForm(prev => ({ ...prev, start_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={editScheduleForm.end_time}
                onChange={(e) => setEditScheduleForm(prev => ({ ...prev, end_time: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <GlowButton variant="outline" onClick={() => {
              setEditScheduleModalOpen(false);
              setEditingSchedule(null);
              setEditScheduleForm({
                day_of_week: 0,
                start_time: "",
                end_time: "",
              });
            }}>
              Cancel
            </GlowButton>
            <GlowButton onClick={updateSchedule}>
              Update Schedule
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Module Confirmation Modal */}
      <Dialog open={deleteModuleModalOpen} onOpenChange={setDeleteModuleModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Delete Module?</DialogTitle>
            <DialogDescription className="text-gray-400">
              This action cannot be undone. This will permanently delete the module and all its contents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to delete <span className="font-semibold text-white">{moduleToDelete?.title}</span>?
            </p>
            <p className="text-sm text-red-400">
              ⚠️ This will also delete all classes, lessons, and assignments inside this module. This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-3">
            <GlowButton variant="ghost" onClick={() => setDeleteModuleModalOpen(false)}>
              Cancel
            </GlowButton>
            <GlowButton variant="primary" onClick={confirmDeleteModule} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Module
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Class Confirmation Modal */}
      <Dialog open={deleteClassModalOpen} onOpenChange={setDeleteClassModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Delete Class?</DialogTitle>
            <DialogDescription className="text-gray-400">
              This action cannot be undone. This will permanently delete the class and all its lessons.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to delete <span className="font-semibold text-white">{classToDelete?.title}</span>?
            </p>
            <p className="text-sm text-red-400">
              ⚠️ This will also delete all lessons and assignments inside this class. This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-3">
            <GlowButton variant="ghost" onClick={() => setDeleteClassModalOpen(false)}>
              Cancel
            </GlowButton>
            <GlowButton variant="primary" onClick={confirmDeleteClass} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Class
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Lesson Confirmation Modal */}
      <Dialog open={deleteLessonModalOpen} onOpenChange={setDeleteLessonModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Delete Lesson?</DialogTitle>
            <DialogDescription className="text-gray-400">
              This action cannot be undone. This will permanently delete the lesson and any attached assignments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to delete <span className="font-semibold text-white">{lessonToDelete?.title}</span>?
            </p>
            <p className="text-sm text-red-400">
              ⚠️ This will also delete any assignments attached to this lesson. This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-3">
            <GlowButton variant="ghost" onClick={() => setDeleteLessonModalOpen(false)}>
              Cancel
            </GlowButton>
            <GlowButton variant="primary" onClick={confirmDeleteLesson} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Lesson
            </GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
            
      {/* Publish Confirmation */}
      <Dialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Publish Course</DialogTitle>
            <DialogDescription className="text-gray-400">
              Publishing will make this course available to students.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              Publishing will make this course available to students.
            </p>
            
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                <p className="text-sm text-gray-300">
                  Once published, students can enroll. You can unpublish anytime from the settings tab.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <GlowButton variant="ghost" onClick={() => setPublishConfirmOpen(false)}>Cancel</GlowButton>
            <GlowButton variant="primary" onClick={handlePublish}>Publish Course</GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}