// frontend/components/notifications/MockEmailInbox.tsx
'use client';

import { useState, useEffect } from "react";
import { Mail, X, Trash2, ExternalLink } from "lucide-react";
import { MockEmail, getMockEmails, markEmailAsRead, clearMockEmails } from "@/lib/mock-email";

interface MockEmailInboxProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MockEmailInbox({ isOpen, onClose }: MockEmailInboxProps) {
  const [emails, setEmails] = useState<MockEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<MockEmail | null>(null);

  const loadEmails = () => {
    setEmails(getMockEmails());
  };

  useEffect(() => {
    if (isOpen) {
      loadEmails();
    }
  }, [isOpen]);

  const handleMarkRead = (id: string) => {
    markEmailAsRead(id);
    loadEmails();
  };

  const handleClearAll = () => {
    clearMockEmails();
    loadEmails();
    setSelectedEmail(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-28 right-4 z-50 w-96 rounded-lg bg-gray-900 shadow-xl border border-gray-700 flex flex-col max-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-blue-400" />
          <h3 className="font-semibold text-white">Mock Email Inbox</h3>
          <span className="text-xs text-gray-400">({emails.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {emails.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Clear all emails"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex h-96">
        {/* Email List */}
        <div className="w-1/2 border-r border-gray-700 overflow-y-auto">
          {emails.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              No emails yet
            </div>
          ) : (
            emails.map((email) => (
              <button
                key={email.id}
                onClick={() => {
                  setSelectedEmail(email);
                  if (!email.read) handleMarkRead(email.id);
                }}
                className={`w-full p-3 text-left hover:bg-gray-800 transition-colors border-b border-gray-700 ${
                  selectedEmail?.id === email.id ? 'bg-gray-800' : ''
                } ${!email.read ? 'border-l-4 border-l-blue-500' : ''}`}
              >
                <div className="font-medium text-white text-sm truncate">
                  {email.subject}
                </div>
                <div className="text-xs text-gray-400 truncate mt-1">
                  To: {email.to}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(email.createdAt).toLocaleTimeString()}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Email Content */}
        <div className="w-1/2 overflow-y-auto p-3">
          {selectedEmail ? (
            <div>
              <div className="mb-3">
                <div className="font-semibold text-white text-sm mb-1">
                  {selectedEmail.subject}
                </div>
                <div className="text-xs text-gray-400">
                  To: {selectedEmail.to}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(selectedEmail.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="text-sm text-gray-300 whitespace-pre-wrap mb-3">
                {selectedEmail.body}
              </div>
              {selectedEmail.link && (
                <a
                  href={selectedEmail.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Follow Link
                </a>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm mt-8">
              Select an email to read
            </div>
          )}
        </div>
      </div>
    </div>
  );
}