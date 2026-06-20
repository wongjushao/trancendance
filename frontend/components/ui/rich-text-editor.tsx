// components/ui/rich-text-editor.tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Quote,
  Heading1,
  Heading2,
  Link as LinkIcon,
  Undo,
  Redo,
} from "lucide-react";
import { useEffect, useState } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  return (
    <div className="border-b border-gray-700 p-2 flex flex-wrap gap-1 bg-gray-800/30 sticky top-0 z-10">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
          editor.isActive("bold") ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
        }`}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
          editor.isActive("italic") ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
        }`}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
          editor.isActive("bulletList") ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
        }`}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
          editor.isActive("orderedList") ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
        }`}
        title="Numbered List"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
          editor.isActive("codeBlock") ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
        }`}
        title="Code Block"
      >
        <Code className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
          editor.isActive("blockquote") ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
        }`}
        title="Quote"
      >
        <Quote className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-gray-700 mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
          editor.isActive("heading", { level: 1 }) ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
        }`}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
          editor.isActive("heading", { level: 2 }) ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
        }`}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-gray-700 mx-1" />
      <button
        onClick={() => {
          const url = window.prompt("Enter URL:");
          if (url) {
            try {
              new URL(url);
              editor.chain().focus().setLink({ href: url }).run();
            } catch {
              alert("Please enter a valid URL (including http:// or https://)");
            }
          }
        }}
        className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
          editor.isActive("link") ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
        }`}
        title="Add Link"
      >
        <LinkIcon className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-gray-700 mx-1" />
      <button
        onClick={() => editor.chain().focus().undo().run()}
        className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
        title="Undo"
      >
        <Undo className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
        title="Redo"
      >
        <Redo className="w-4 h-4" />
      </button>
    </div>
  );
};

export function RichTextEditor({ value, onChange, placeholder, className = "" }: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure StarterKit to NOT include link since we're adding it separately
        link: false,  // ← This is the key fix - disable link in StarterKit
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Image,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `prose prose-invert prose-sm max-w-none focus:outline-none min-h-[200px] p-4 ${className}`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  });

  // Update editor content when value changes from outside
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [editor, value]);

  // Don't render anything during SSR
  if (!mounted) {
    return (
      <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800/30 min-h-[200px] flex items-center justify-center">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800/30">
      <MenuBar editor={editor} />
      <div className="relative">
        <EditorContent editor={editor} />
        {placeholder && editor?.isEmpty && (
          <div className="absolute top-4 left-4 text-gray-500 text-sm pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}