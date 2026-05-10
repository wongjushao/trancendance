// components/ui/file-upload.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, FileText, Image, File, Loader2, Trash2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";

interface UploadedFile {
  url: string;
  name: string;
  type: string;
  size: number;
}

interface FileUploadProps {
  onUploadComplete: (files: UploadedFile[]) => void;
  onRemove?: (index: number) => void;
  existingFiles?: UploadedFile[];
  bucket: string;
  folder?: string;
  accept?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  multiple?: boolean;
}

export function FileUpload({
  onUploadComplete,
  onRemove,
  existingFiles = [],
  bucket,
  folder = "",
  accept = "*/*",
  maxFiles = 10,
  maxSizeMB = 50,
  multiple = true,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track if we've already synced to avoid loops
  const [isSynced, setIsSynced] = useState(false);

  // Sync with existingFiles prop when it changes - FIXED
  useEffect(() => {
    // Deep comparison to avoid unnecessary updates
    const hasChanged = existingFiles.length !== files.length || 
      existingFiles.some((file, index) => 
        file.url !== files[index]?.url || 
        file.name !== files[index]?.name
      );
    
    if (hasChanged && !isSynced) {
      setFiles(existingFiles);
      setIsSynced(true);
    } else if (!hasChanged && isSynced) {
      setIsSynced(false);
    }
  }, [existingFiles, files, isSynced]);

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("You must be logged in to upload files");
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Add progress for this file
    setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        onUploadProgress: (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          setUploadProgress(prev => ({ ...prev, [file.name]: percent }));
        },
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      toast.error(`Failed to upload ${file.name}`);
      // Remove progress for failed file
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[file.name];
        return newProgress;
      });
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      name: file.name,
      type: file.type,
      size: file.size,
    };
  };

  const processFiles = async (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    
    if (files.length + fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const oversizedFiles = fileArray.filter(f => f.size > maxSizeMB * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error(`Files must be less than ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    const uploadedFiles: UploadedFile[] = [];

    for (const file of fileArray) {
      const result = await uploadFile(file);
      if (result) {
        uploadedFiles.push(result);
      }
    }

    // Clear all progress after uploads complete
    setUploadProgress({});
    
    const newFiles = [...files, ...uploadedFiles];
    setFiles(newFiles);
    onUploadComplete(newFiles);
    setUploading(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
    }
  };

  // Drag & Drop Handlers - FIXED: removed files from dependencies
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      await processFiles(droppedFiles);
    }
  }, []); // ✅ Removed 'files' dependency - processFiles will use current state

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onUploadComplete(newFiles);
    if (onRemove) onRemove(index);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="w-4 h-4" />;
    if (type === "application/pdf") return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center 
          transition-all duration-200 cursor-pointer
          ${isDragOver 
            ? 'border-purple-500 bg-purple-500/10' 
            : 'border-slate-700 hover:border-purple-500/50 bg-slate-800/20 hover:bg-slate-800/30'
          }
          ${uploading ? 'opacity-50 cursor-wait' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-sm text-gray-400">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-gray-400" />
            <p className="text-sm text-gray-400">
              {isDragOver ? "Drop files here" : "Click or drag files to upload"}
            </p>
            <p className="text-xs text-gray-500">
              Max {maxFiles} files, up to {maxSizeMB}MB each
            </p>
          </div>
        )}
      </div>

      {/* Upload Progress - Only show for files currently being uploaded */}
      {uploading && Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-300">Uploading files...</p>
          {Object.entries(uploadProgress).map(([name, progress]) => (
            <div key={name} className="bg-slate-800/30 rounded-lg p-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span className="truncate max-w-[200px]">{name}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1">
                <div
                  className="bg-purple-500 h-1 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File List - Show successfully uploaded files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-300">Uploaded files:</p>
          {files.map((file, index) => (
            <div
              key={`${file.url}-${index}`}
              className="flex items-center justify-between bg-slate-800/30 rounded-lg p-2 border border-slate-700"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getFileIcon(file.type)}
                <span className="text-sm text-gray-300 truncate">{file.name}</span>
                <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="p-1 rounded hover:bg-red-500/20 transition-colors"
                type="button"
              >
                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}