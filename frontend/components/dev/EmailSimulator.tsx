// frontend/components/dev/EmailSimulator.tsx
'use client';

import { useState } from "react";
import { Mail } from "lucide-react";
import { MockEmailInbox } from "@/components/notifications/MockEmailInbox";

export function EmailSimulator() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white shadow-lg hover:bg-blue-700 transition-all"
        aria-label="Email simulator"
      >
        <Mail className="h-4 w-4" />
        <span>Mock Inbox</span>
      </button>

      {isOpen && (
        <MockEmailInbox isOpen={isOpen} onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}