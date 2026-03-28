// frontend/components/dev/EmailSimulator.tsx
"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { MockEmailInbox } from "@/components/notifications/MockEmailInbox";

export function EmailSimulator() {
  const [isOpen, setIsOpen] = useState(false);

  const IS_DEV = process.env.NODE_ENV === 'development';

  if (!IS_DEV) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-32 z-50 flex items-center gap-2 px-3 py-2 bg-purple-600/90 backdrop-blur-sm rounded-lg text-white text-sm font-medium shadow-lg hover:bg-purple-500 transition-colors border border-purple-400/30"
      >
        <Mail className="w-4 h-4" />
        <span>Mock Inbox</span>
      </button>
      {isOpen && <MockEmailInbox isOpen={isOpen} onClose={() => setIsOpen(false)} />}
    </>
  );
}