// frontend/components/course/CourseBasicForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Globe,
  Lock,
  Users,
  AlertCircle,
  Upload,
  X,
  Plus,
  Trash2,
  Building2,
  ArrowRight,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

// Note: Database schema has these columns on courses table:
// - id, title, description, visibility, status, thumbnail, level, category
// - learning_objectives (JSONB), prerequisites (JSONB), tags (JSONB)
// - organization_id, created_by, created_at

interface CourseBasicFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: number;
    title: string;
    description: string | null;
    level: string;
    category: string;
    visibility: "public" | "org" | "private";
    thumbnail: string | null;
    learning_objectives: string[];
    prerequisites: string[];
    tags: string[];
    organization_id: number;
    organization_name?: string;
  };
  organizationId?: number;
  organizationName?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CourseBasicForm({ 
  mode, 
  initialData, 
  organizationId, 
  organizationName,
  onSuccess,
  onCancel 
}: CourseBasicFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCourseId, setCreatedCourseId] = useState<number | null>(null);
  
  // Form state
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [level, setLevel] = useState(initialData?.level || "intermediate");
  const [category, setCategory] = useState(initialData?.category || "Development");
  const [visibility, setVisibility] = useState<"public" | "org" | "private">(
    initialData?.visibility || "private"
  );
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(initialData?.thumbnail || "");
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState(initialData?.thumbnail || "");
  
  // Arrays
  const [learningObjectives, setLearningObjectives] = useState<string[]>(
    initialData?.learning_objectives?.filter(obj => obj && obj.trim()) || []
  );
  const [prerequisites, setPrerequisites] = useState<string[]>(
    initialData?.prerequisites?.filter(pre => pre && pre.trim()) || []
  );
  const [tags, setTags] = useState<string[]>(
    initialData?.tags?.filter(tag => tag && tag.trim()) || []
  );
  const [newObjective, setNewObjective] = useState("");
  const [newPrerequisite, setNewPrerequisite] = useState("");
  const [newTag, setNewTag] = useState("");

  // Helper functions

  const addObjective = () => {
    const trimmed = newObjective.trim();
    if (trimmed && !learningObjectives.includes(trimmed)) {
      setLearningObjectives(prev => [...prev, trimmed]);
      setNewObjective("");
    }
  };

  const addPrerequisite = () => {
    const trimmed = newPrerequisite.trim();
    if (trimmed && !prerequisites.includes(trimmed)) {
      setPrerequisites(prev => [...prev, trimmed]);
      setNewPrerequisite("");
    }
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
      setNewTag("");
    }
  };

  const removeObjective = (indexToRemove: number) => {
    setLearningObjectives(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const removePrerequisite = (indexToRemove: number) => {
    setPrerequisites(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnail(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeThumbnail = () => {
    setThumbnail(null);
    setThumbnailPreview("");
    setExistingThumbnailUrl("");
  };

  const handleSaveAndContinue = async () => {
    if (!title.trim()) {
      toast.error("Please enter a course title");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      let thumbnailUrl = existingThumbnailUrl;

      // Upload new thumbnail if selected
      if (thumbnail) {
        const fileName = `${Date.now()}_${thumbnail.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('course-thumbnails')
          .upload(fileName, thumbnail);
        
        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('course-thumbnails')
            .getPublicUrl(fileName);
          thumbnailUrl = publicUrl;
        }
      }

      if (mode === "create") {
        // Direct Supabase insert for course creation
        const { data: newCourse, error: insertError } = await supabase
          .from('courses')
          .insert({
            title: title.trim(),
            description: description.trim() || null,
            level,
            category,
            visibility,
            learning_objectives: learningObjectives,
            prerequisites,
            tags,
            thumbnail: thumbnailUrl,
            organization_id: organizationId!,
            created_by: user.id,
            status: 'draft'
          })
          .select()
          .single();

        if (insertError) throw insertError;

        toast.success("Course created successfully!");
        
        // Redirect to edit page
        router.push(`/courses/${newCourse.id}/edit`);
        
      } else if (mode === "edit" && initialData) {
        // Update existing course
        const { error: updateError } = await supabase
          .from('courses')
          .update({
            title: title.trim(),
            description: description.trim() || null,
            level,
            category,
            visibility,
            learning_objectives: learningObjectives,
            prerequisites,
            tags,
            thumbnail: thumbnailUrl,
          })
          .eq('id', initialData.id);

        if (updateError) throw updateError;

        toast.success("Course updated successfully!");
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error("Error saving course:", error);
      toast.error("Failed to save course. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayOrganizationName = mode === "create" ? organizationName : initialData?.organization_name;

  return (
    <div className="space-y-6">
      {/* Course Title */}
      <div>
        <Label htmlFor="title">Course Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Advanced TypeScript Mastery"
          className="mt-1"
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what students will learn..."
          rows={4}
          className="mt-1"
        />
      </div>

      {/* Organization (read-only) */}
      <div>
        <Label>Organization</Label>
        <div className="mt-1 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-400" />
            <span className="text-white">{displayOrganizationName || "Loading..."}</span>
          </div>
        </div>
      </div>

      {/* Course Settings Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="level">Level</Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Development, Design, Business"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="visibility">Visibility</Label>
          <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Public - Anyone can enroll
                </div>
              </SelectItem>
              <SelectItem value="org">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Organization - Only org members
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Private - Invite only
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Thumbnail */}
      <div>
        <Label>Course Thumbnail</Label>
        <div className="mt-1">
          <label className="cursor-pointer">
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center hover:border-purple-500 transition-colors">
              {thumbnailPreview ? (
                <div className="relative">
                  <img src={thumbnailPreview} alt="Thumbnail preview" className="max-h-48 mx-auto rounded" />
                  <button
                    onClick={removeThumbnail}
                    className="absolute top-2 right-2 p-1 bg-red-500 rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-400">Click to upload thumbnail image</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleThumbnailUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Learning Objectives */}
      <div>
        <Label>Learning Objectives</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={newObjective}
            onChange={(e) => setNewObjective(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, addObjective)}
            placeholder="Add a learning objective..."
            className="flex-1"
          />
          <GlowButton type="button" size="sm" onClick={addObjective}>
            <Plus className="w-4 h-4" />
          </GlowButton>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {learningObjectives.map((obj, idx) => (
            <Badge key={idx} variant="secondary" className="gap-1 pr-1">
              {obj}
              <button
                type="button"
                onClick={() => removeObjective(idx)}
                className="ml-1 rounded-full hover:bg-gray-600 p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Prerequisites */}
      <div>
        <Label>Prerequisites</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={newPrerequisite}
            onChange={(e) => setNewPrerequisite(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, addPrerequisite)}
            placeholder="Add a prerequisite..."
            className="flex-1"
          />
          <GlowButton type="button" size="sm" onClick={addPrerequisite}>
            <Plus className="w-4 h-4" />
          </GlowButton>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {prerequisites.map((pre, idx) => (
            <Badge key={idx} variant="secondary" className="gap-1 pr-1">
              {pre}
              <button
                type="button"
                onClick={() => removePrerequisite(idx)}
                className="ml-1 rounded-full hover:bg-gray-600 p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <Label>Tags</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, addTag)}
            placeholder="Add a tag..."
            className="flex-1"
          />
          <GlowButton type="button" size="sm" onClick={addTag}>
            <Plus className="w-4 h-4" />
          </GlowButton>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag, idx) => (
            <Badge key={idx} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 rounded-full hover:bg-gray-600 p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Action Buttons - Save and Continue only for create mode */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
        {onCancel && mode === "edit" && (
          <GlowButton variant="outline" onClick={onCancel}>
            Cancel
          </GlowButton>
        )}
        {mode === "edit" && onSuccess && (
          <GlowButton onClick={handleSaveAndContinue} isLoading={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </GlowButton>
        )}
        {mode === "create" && (
          <GlowButton onClick={handleSaveAndContinue} isLoading={isSubmitting}>
            <ArrowRight className="w-4 h-4 mr-2" />
            Save and Continue to Edit Course
          </GlowButton>
        )}
      </div>

      {/* Info Box for create mode */}
      {mode === "create" && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-300 font-medium">What's next?</p>
              <p className="text-xs text-blue-200/70 mt-1">
                After saving, you'll be redirected to the course edit page where you can add modules, 
                classes, lessons, assignments, and manage course offerings.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}