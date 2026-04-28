"use client";

import { useState, useEffect } from "react";
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
  Loader2,
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
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useRole } from "@/components/providers/RoleProvider";

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

export default function CreateCoursePage() {
  const router = useRouter();
  const { roleData } = useRole();
  const [loading, setLoading] = useState(false);
  const [fetchingOrg, setFetchingOrg] = useState(true);
  const [formData, setFormData] = useState<CourseFormData>({
    title: "",
    description: "",
    category: "",
    level: "beginner",
    visibility: "public",
    thumbnail: null,
    thumbnailPreview: "",
    objectives: [""],
    prerequisites: [""],
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [organizationId, setOrganizationId] = useState<number | null>(null);

  useEffect(() => {
    // Fetch organization directly from Supabase instead of relying on roleData
    fetchUserOrganization();
  }, []);

  const fetchUserOrganization = async () => {
    setFetchingOrg(true);
    try {
      const supabase = getSupabaseBrowserClient();
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("No user found");
        setFetchingOrg(false);
        return;
      }
      
      // Query organization_members to get user's organization
      const { data: memberships, error: membershipError } = await supabase
        .from("organization_members")
        .select(`
          organization_id,
          organizations (
            id,
            name
          )
        `)
        .eq("user_id", user.id)
        .limit(1);
      
      if (membershipError) {
        console.error("Error fetching organization:", membershipError);
        setFetchingOrg(false);
        return;
      }
      
      if (memberships && memberships.length > 0) {
        const orgId = memberships[0].organization_id;
        setOrganizationId(orgId);
        console.log("Found organization ID:", orgId);
      } else {
        console.log("No organization found for user");
        toast.error("You need to be part of an organization to create courses");
      }
      
    } catch (error) {
      console.error("Error in fetchUserOrganization:", error);
    } finally {
      setFetchingOrg(false);
    }
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      const preview = URL.createObjectURL(file);
      setFormData({ ...formData, thumbnail: file, thumbnailPreview: preview });
    }
  };

  const addObjective = () => {
    setFormData({ ...formData, objectives: [...formData.objectives, ""] });
  };

  const removeObjective = (index: number) => {
    const newObjectives = formData.objectives.filter((_, i) => i !== index);
    setFormData({ ...formData, objectives: newObjectives });
  };

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...formData.objectives];
    newObjectives[index] = value;
    setFormData({ ...formData, objectives: newObjectives });
  };

  const addPrerequisite = () => {
    setFormData({ ...formData, prerequisites: [...formData.prerequisites, ""] });
  };

  const removePrerequisite = (index: number) => {
    const newPrerequisites = formData.prerequisites.filter((_, i) => i !== index);
    setFormData({ ...formData, prerequisites: newPrerequisites });
  };

  const updatePrerequisite = (index: number, value: string) => {
    const newPrerequisites = [...formData.prerequisites];
    newPrerequisites[index] = value;
    setFormData({ ...formData, prerequisites: newPrerequisites });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast.error("Please enter a course title");
      return false;
    }
    if (!formData.description.trim()) {
      toast.error("Please enter a course description");
      return false;
    }
    if (!formData.category) {
      toast.error("Please select a category");
      return false;
    }
    if (!organizationId) {
      toast.error("You must be part of an organization to create a course");
      return false;
    }
    return true;
  };

  const handleSubmit = async (status: "draft" | "published") => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const supabase = getSupabaseBrowserClient();
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("You must be logged in to create a course");
        return;
      }

      // Create course
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert({
          title: formData.title,
          description: formData.description,
          organization_id: organizationId,
          visibility: formData.visibility,
          created_by: user.id,
        })
        .select()
        .single();

      if (courseError) {
        console.error("Course creation error:", courseError);
        throw courseError;
      }

      // Upload thumbnail if exists
      let thumbnailUrl = null;
      if (formData.thumbnail) {
        const fileName = `${course.id}/${Date.now()}_${formData.thumbnail.name}`;
        const { error: uploadError } = await supabase.storage
          .from("course-thumbnails")
          .upload(fileName, formData.thumbnail);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from("course-thumbnails")
            .getPublicUrl(fileName);
          thumbnailUrl = publicUrl;
          
          // Update course with thumbnail
          // await supabase
          //   .from("courses")
          //   .update({ thumbnail: thumbnailUrl })
          //   .eq("id", course.id);
        }
      }

      // Add instructor as course member
      await supabase
        .from("course_members")
        .insert({
          course_id: course.id,
          user_id: user.id,
          role: "instructor",
          status: "active",
        });

      toast.success(`Course ${status === "published" ? "published" : "saved as draft"} successfully!`);
      
      // Redirect to course edit page to add modules and lessons
      router.push(`/courses/${course.id}/edit`);
      
    } catch (error: any) {
      console.error("Error creating course:", error);
      toast.error(error.message || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while fetching organization
  if (fetchingOrg) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-purple-700/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-40 w-80 h-80 bg-blue-700/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <Link
          href="/courses"
          className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </Link>
        <div className="flex gap-3">
          <GlowButton
            variant="outline"
            onClick={() => handleSubmit("draft")}
            isLoading={loading}
          >
            <Save className="w-4 h-4 mr-2" />
            Save as Draft
          </GlowButton>
          <GlowButton
            onClick={() => handleSubmit("published")}
            isLoading={loading}
          >
            <Eye className="w-4 h-4 mr-2" />
            Publish Course
          </GlowButton>
        </div>
      </div>

      {/* Show error if no organization */}
      {!organizationId && (
        <GlowCard glowColor="purple" className="mb-6">
          <div className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-white mb-1">No Organization Found</h4>
                <p className="text-sm text-gray-400">
                  You need to be part of an organization to create courses. 
                  Please contact an administrator to add you to an organization.
                </p>
              </div>
            </div>
          </div>
        </GlowCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form - Same as before */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <GlowCard>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>
              
              {/* Title */}
              <div className="mb-4">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Advanced React Development"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="What will students learn in this course?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="mt-1"
                />
              </div>

              {/* Category and Level */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Select a category</option>
                    <option value="Web Development">Web Development</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Mobile Development">Mobile Development</option>
                    <option value="Cloud Computing">Cloud Computing</option>
                    <option value="DevOps">DevOps</option>
                    <option value="Design">Design</option>
                    <option value="Business">Business</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="level">Level</Label>
                  <select
                    id="level"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Thumbnail */}
              <div className="mb-4">
                <Label>Course Thumbnail</Label>
                <div className="mt-1">
                  {formData.thumbnailPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={formData.thumbnailPreview}
                        alt="Thumbnail preview"
                        className="w-48 h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setFormData({ ...formData, thumbnail: null, thumbnailPreview: "" })}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-400">Click to upload thumbnail</p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Learning Objectives */}
          <GlowCard>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Learning Objectives</h2>
              {formData.objectives.map((objective, index) => (
                <div key={index} className="flex gap-2 mb-3">
                  <Input
                    placeholder={`Objective ${index + 1}`}
                    value={objective}
                    onChange={(e) => updateObjective(index, e.target.value)}
                    className="flex-1"
                  />
                  {formData.objectives.length > 1 && (
                    <GlowButton
                      variant="ghost"
                      size="sm"
                      onClick={() => removeObjective(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </GlowButton>
                  )}
                </div>
              ))}
              <GlowButton
                variant="outline"
                size="sm"
                onClick={addObjective}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Objective
              </GlowButton>
            </div>
          </GlowCard>

          {/* Prerequisites */}
          <GlowCard>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Prerequisites</h2>
              {formData.prerequisites.map((prerequisite, index) => (
                <div key={index} className="flex gap-2 mb-3">
                  <Input
                    placeholder={`Prerequisite ${index + 1}`}
                    value={prerequisite}
                    onChange={(e) => updatePrerequisite(index, e.target.value)}
                    className="flex-1"
                  />
                  {formData.prerequisites.length > 1 && (
                    <GlowButton
                      variant="ghost"
                      size="sm"
                      onClick={() => removePrerequisite(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </GlowButton>
                  )}
                </div>
              ))}
              <GlowButton
                variant="outline"
                size="sm"
                onClick={addPrerequisite}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Prerequisite
              </GlowButton>
            </div>
          </GlowCard>

          {/* Tags */}
          <GlowCard>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Tags</h2>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Add tags (e.g., React, JavaScript)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <GlowButton variant="outline" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </GlowButton>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} className="bg-purple-500/20 text-purple-400 px-3 py-1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-2 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </GlowCard>
        </div>

        {/* Sidebar - Preview & Settings */}
        <div className="space-y-6">
          {/* Course Preview */}
          <GlowCard>
            <div className="p-6">
              <h3 className="font-semibold text-white mb-3">Course Preview</h3>
              <div className="bg-gray-800/50 rounded-lg overflow-hidden">
                {formData.thumbnailPreview ? (
                  <img
                    src={formData.thumbnailPreview}
                    alt="Course thumbnail"
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-gray-500" />
                  </div>
                )}
                <div className="p-4">
                  <h4 className="font-semibold text-white mb-1 line-clamp-1">
                    {formData.title || "Course Title"}
                  </h4>
                  <p className="text-sm text-gray-400 line-clamp-2">
                    {formData.description || "Course description will appear here..."}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge className="bg-purple-500/20 text-purple-400">
                      {formData.level}
                    </Badge>
                    {formData.visibility === "public" && (
                      <Globe className="w-3 h-3 text-gray-400" />
                    )}
                    {formData.visibility === "private" && (
                      <Lock className="w-3 h-3 text-gray-400" />
                    )}
                    {formData.visibility === "org" && (
                      <Users className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Visibility Settings */}
          <GlowCard>
            <div className="p-6">
              <h3 className="font-semibold text-white mb-3">Visibility</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={formData.visibility === "public"}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div className="flex-1">
                    <p className="text-white text-sm">Public</p>
                    <p className="text-xs text-gray-400">Anyone can view and enroll</p>
                  </div>
                  <Globe className="w-4 h-4 text-gray-400" />
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="org"
                    checked={formData.visibility === "org"}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div className="flex-1">
                    <p className="text-white text-sm">Organization Only</p>
                    <p className="text-xs text-gray-400">Only organization members can view</p>
                  </div>
                  <Users className="w-4 h-4 text-gray-400" />
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={formData.visibility === "private"}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div className="flex-1">
                    <p className="text-white text-sm">Private</p>
                    <p className="text-xs text-gray-400">Only invited students can view</p>
                  </div>
                  <Lock className="w-4 h-4 text-gray-400" />
                </label>
              </div>
            </div>
          </GlowCard>

          {/* Help Card */}
          <GlowCard glowColor="purple">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white mb-1">Next Steps</h4>
                  <p className="text-sm text-gray-400">
                    After creating the course, you'll be taken to the course editor where you can add modules, lessons, and assignments.
                  </p>
                </div>
              </div>
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}