// frontend/app/(main)/teacher/courses/create/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ArrowLeft,
  Save,
  Eye,
  Globe,
  Lock,
  Users,
  AlertCircle,
  CheckCircle,
  Upload,
  X,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";

interface CourseFormData {
  title: string;
  description: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  visibility: "public" | "org" | "private";
  thumbnail: File | null;
  thumbnailPreview: string;
  objectives: string[];
  prerequisites: string[];
  tags: string[];
}

const categories = [
  "Development",
  "Design",
  "Business",
  "Marketing",
  "Data Science",
  "AI & Machine Learning",
  "Cloud Computing",
  "Cybersecurity",
];

export default function CreateCoursePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [formData, setFormData] = useState<CourseFormData>({
    title: "",
    description: "",
    category: "",
    level: "beginner",
    visibility: "private",
    thumbnail: null,
    thumbnailPreview: "",
    objectives: [],
    prerequisites: [],
    tags: [],
  });

  const [newObjective, setNewObjective] = useState("");
  const [newPrerequisite, setNewPrerequisite] = useState("");
  const [newTag, setNewTag] = useState("");

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Thumbnail must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      setFormData({
        ...formData,
        thumbnail: file,
        thumbnailPreview: URL.createObjectURL(file),
      });
    }
  };

  const addObjective = () => {
    if (newObjective.trim()) {
      setFormData({
        ...formData,
        objectives: [...formData.objectives, newObjective.trim()],
      });
      setNewObjective("");
    }
  };

  const removeObjective = (index: number) => {
    setFormData({
      ...formData,
      objectives: formData.objectives.filter((_, i) => i !== index),
    });
  };

  const addPrerequisite = () => {
    if (newPrerequisite.trim()) {
      setFormData({
        ...formData,
        prerequisites: [...formData.prerequisites, newPrerequisite.trim()],
      });
      setNewPrerequisite("");
    }
  };

  const removePrerequisite = (index: number) => {
    setFormData({
      ...formData,
      prerequisites: formData.prerequisites.filter((_, i) => i !== index),
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast.error("Course title is required");
      return false;
    }
    if (!formData.description.trim()) {
      toast.error("Course description is required");
      return false;
    }
    if (!formData.category) {
      toast.error("Please select a category");
      return false;
    }
    return true;
  };

  const handleSubmit = async (status: "draft" | "published") => {
    if (!validateForm()) return;

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock course creation
    const newCourse = {
      id: Math.floor(Math.random() * 1000),
      title: formData.title,
      description: formData.description,
      category: formData.category,
      level: formData.level,
      visibility: formData.visibility,
      status: status,
      objectives: formData.objectives,
      prerequisites: formData.prerequisites,
      tags: formData.tags,
      createdAt: new Date(),
    };

    console.log("Course created:", newCourse);

    toast.success(
      status === "published"
        ? "Course published successfully!"
        : "Course saved as draft"
    );

    // Redirect to course management page
    setTimeout(() => {
      router.push(`/teacher/courses/${newCourse.id}/edit`);
    }, 1000);
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
          <Link
            href="/teacher"
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
                Create New Course
              </h1>
              <p className="text-gray-400 mt-2">
                Fill in the details below to create your course
              </p>
            </div>
            <div className="flex gap-3">
              <GlowButton
                variant="outline"
                onClick={() => handleSubmit("draft")}
                isLoading={isLoading}
              >
                <Save className="w-4 h-4 mr-2" />
                Save as Draft
              </GlowButton>
              <GlowButton
                variant="primary"
                onClick={() => handleSubmit("published")}
                isLoading={isLoading}
              >
                <Eye className="w-4 h-4 mr-2" />
                Publish Course
              </GlowButton>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <GlowCard>
              <div className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="content">Course Content</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-6">
                    {/* Title */}
                    <div>
                      <Label htmlFor="title" className="text-white mb-2 block">
                        Course Title <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="title"
                        placeholder="e.g., Advanced React Patterns"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        className="bg-gray-800/50 border-gray-700 text-white"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <Label
                        htmlFor="description"
                        className="text-white mb-2 block"
                      >
                        Course Description <span className="text-red-400">*</span>
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Describe what students will learn..."
                        rows={5}
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        className="bg-gray-800/50 border-gray-700 text-white"
                      />
                    </div>

                    {/* Category and Level */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white mb-2 block">
                          Category <span className="text-red-400">*</span>
                        </Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) =>
                            setFormData({ ...formData, category: value })
                          }
                        >
                          <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-white mb-2 block">Level</Label>
                        <Select
                          value={formData.level}
                          onValueChange={(value: any) =>
                            setFormData({ ...formData, level: value })
                          }
                        >
                          <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">
                              Intermediate
                            </SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Thumbnail */}
                    <div>
                      <Label className="text-white mb-2 block">
                        Course Thumbnail
                      </Label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-700 border-dashed rounded-lg hover:border-purple-500 transition-colors">
                        {formData.thumbnailPreview ? (
                          <div className="relative">
                            <img
                              src={formData.thumbnailPreview}
                              alt="Thumbnail preview"
                              className="max-h-48 rounded-lg"
                            />
                            <button
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  thumbnail: null,
                                  thumbnailPreview: "",
                                })
                              }
                              className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1 text-center">
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-400">
                              <label
                                htmlFor="thumbnail-upload"
                                className="relative cursor-pointer rounded-md font-medium text-purple-400 hover:text-purple-300"
                              >
                                <span>Upload a file</span>
                                <input
                                  id="thumbnail-upload"
                                  name="thumbnail-upload"
                                  type="file"
                                  className="sr-only"
                                  accept="image/*"
                                  onChange={handleThumbnailUpload}
                                />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">
                              PNG, JPG, GIF up to 5MB
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="content" className="space-y-6">
                    {/* Learning Objectives */}
                    <div>
                      <Label className="text-white mb-2 block">
                        Learning Objectives
                      </Label>
                      <p className="text-sm text-gray-400 mb-3">
                        What will students be able to do after completing this
                        course?
                      </p>
                      <div className="flex gap-2 mb-3">
                        <Input
                          placeholder="e.g., Build scalable React applications"
                          value={newObjective}
                          onChange={(e) => setNewObjective(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" && addObjective()
                          }
                          className="bg-gray-800/50 border-gray-700 text-white flex-1"
                        />
                        <GlowButton
                          variant="outline"
                          size="sm"
                          onClick={addObjective}
                        >
                          <Plus className="w-4 h-4" />
                        </GlowButton>
                      </div>
                      <div className="space-y-2">
                        {formData.objectives.map((objective, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              <span className="text-gray-300">{objective}</span>
                            </div>
                            <button
                              onClick={() => removeObjective(index)}
                              className="text-gray-400 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Prerequisites */}
                    <div>
                      <Label className="text-white mb-2 block">
                        Prerequisites
                      </Label>
                      <p className="text-sm text-gray-400 mb-3">
                        What knowledge or skills should students have before
                        taking this course?
                      </p>
                      <div className="flex gap-2 mb-3">
                        <Input
                          placeholder="e.g., Basic JavaScript knowledge"
                          value={newPrerequisite}
                          onChange={(e) => setNewPrerequisite(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" && addPrerequisite()
                          }
                          className="bg-gray-800/50 border-gray-700 text-white flex-1"
                        />
                        <GlowButton
                          variant="outline"
                          size="sm"
                          onClick={addPrerequisite}
                        >
                          <Plus className="w-4 h-4" />
                        </GlowButton>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.prerequisites.map((prereq, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-gray-800 text-gray-300 px-3 py-1"
                          >
                            {prereq}
                            <button
                              onClick={() => removePrerequisite(index)}
                              className="ml-2 hover:text-red-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <Label className="text-white mb-2 block">Tags</Label>
                      <div className="flex gap-2 mb-3">
                        <Input
                          placeholder="e.g., react, frontend, webdev"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && addTag()}
                          className="bg-gray-800/50 border-gray-700 text-white flex-1"
                        />
                        <GlowButton
                          variant="outline"
                          size="sm"
                          onClick={addTag}
                        >
                          <Plus className="w-4 h-4" />
                        </GlowButton>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag) => (
                          <Badge
                            key={tag}
                            className="bg-purple-600/20 text-purple-300 border-purple-600/30 px-3 py-1"
                          >
                            #{tag}
                            <button
                              onClick={() => removeTag(tag)}
                              className="ml-2 hover:text-red-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="settings" className="space-y-6">
                    {/* Visibility */}
                    <div>
                      <Label className="text-white mb-2 block">Visibility</Label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Globe className="w-5 h-5 text-green-400" />
                            <div>
                              <p className="text-white font-medium">Public</p>
                              <p className="text-sm text-gray-400">
                                Anyone can enroll
                              </p>
                            </div>
                          </div>
                          <input
                            type="radio"
                            name="visibility"
                            value="public"
                            checked={formData.visibility === "public"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                visibility: e.target.value as any,
                              })
                            }
                            className="w-4 h-4 text-purple-600"
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-blue-400" />
                            <div>
                              <p className="text-white font-medium">
                                Organization Only
                              </p>
                              <p className="text-sm text-gray-400">
                                Only members of your organization can enroll
                              </p>
                            </div>
                          </div>
                          <input
                            type="radio"
                            name="visibility"
                            value="org"
                            checked={formData.visibility === "org"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                visibility: e.target.value as any,
                              })
                            }
                            className="w-4 h-4 text-purple-600"
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Lock className="w-5 h-5 text-yellow-400" />
                            <div>
                              <p className="text-white font-medium">Private</p>
                              <p className="text-sm text-gray-400">
                                Invitation only
                              </p>
                            </div>
                          </div>
                          <input
                            type="radio"
                            name="visibility"
                            value="private"
                            checked={formData.visibility === "private"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                visibility: e.target.value as any,
                              })
                            }
                            className="w-4 h-4 text-purple-600"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </GlowCard>
          </div>

          {/* Sidebar - Preview */}
          <div>
            <GlowCard>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Course Preview
                </h3>
                <div className="space-y-4">
                  <div className="aspect-video bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    {formData.thumbnailPreview ? (
                      <img
                        src={formData.thumbnailPreview}
                        alt="Course preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <BookOpen className="w-12 h-12 text-white/50" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">
                      {formData.title || "Course Title"}
                    </h4>
                    <p className="text-sm text-gray-400 mt-1">
                      {formData.description || "Course description will appear here"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.category && (
                      <Badge className="bg-purple-600/20 text-purple-300">
                        {formData.category}
                      </Badge>
                    )}
                    <Badge
                      className={
                        formData.level === "beginner"
                          ? "bg-green-600/20 text-green-300"
                          : formData.level === "intermediate"
                          ? "bg-yellow-600/20 text-yellow-300"
                          : "bg-red-600/20 text-red-300"
                      }
                    >
                      {formData.level}
                    </Badge>
                  </div>
                  <div className="pt-4 border-t border-gray-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Status:</span>
                      <Badge variant="outline" className="text-yellow-400">
                        Draft
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* Help Card */}
            <GlowCard className="mt-6">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Need Help?
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Learn how to create engaging courses that students love.
                </p>
                <GlowButton variant="outline" size="sm" fullWidth>
                  View Course Creation Guide
                </GlowButton>
              </div>
            </GlowCard>
          </div>
        </div>
      </div>
    </div>
  );
}