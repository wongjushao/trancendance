// frontend/components/dev/EmailSimulator.tsx
'use client';

import { useState, useEffect } from "react";
import { Mail, MailOpen } from "lucide-react";
import { MockEmailInbox } from "@/components/notifications/MockEmailInbox";
import { getMockEmails } from "@/lib/mock-email";

export function EmailSimulator() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const checkUnread = () => {
      const emails = getMockEmails();
      const unread = emails.filter(e => !e.read).length;
      setUnreadCount(unread);
    };

    checkUnread();
    const interval = setInterval(checkUnread, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white shadow-lg hover:bg-blue-700 transition-all relative"
        aria-label="Email simulator"
      >
        {unreadCount > 0 ? (
          <>
            <MailOpen className="h-4 w-4" />
            <span>Mock Inbox ({unreadCount})</span>
          </>
        ) : (
          <>
            <Mail className="h-4 w-4" />
            <span>Mock Inbox</span>
          </>
        )}
      </button>

      {isOpen && (
        <MockEmailInbox isOpen={isOpen} onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}