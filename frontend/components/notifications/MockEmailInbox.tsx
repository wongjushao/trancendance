// frontend/components/notifications/MockEmailInbox.tsx
"use client";

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

  useEffect(() => {
    if (isOpen) {
      loadEmails();
    }
  }, [isOpen]);

  const loadEmails = () => {
    setEmails(getMockEmails());
  };

  const handleMarkRead = (id: string) => {
    markEmailAsRead(id);
    loadEmails();
  };

  const handleClearAll = () => {
    if (confirm("Clear all mock emails?")) {
      clearMockEmails();
      loadEmails();
      setSelectedEmail(null);
    }
  };

  if (!isOpen) return null;

  const unreadCount = emails.filter(e => !e.read).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div 
        className="bg-[#16161F] border border-white/10 rounded-2xl w-full max-w-4xl h-[600px] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">Mock Email Inbox (Development)</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearAll}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-red-400 text-sm"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#A0A0B5]" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Email List */}
          <div className="w-1/3 border-r border-white/10 overflow-y-auto">
            {emails.length === 0 ? (
              <div className="text-center py-8 text-[#A0A0B5]">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No mock emails yet</p>
                <p className="text-xs mt-1">Send invitations to see them here</p>
              </div>
            ) : (
              emails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => {
                    setSelectedEmail(email);
                    if (!email.read) handleMarkRead(email.id);
                  }}
                  className={`w-full p-3 text-left border-b border-white/5 hover:bg-white/5 transition-colors ${
                    selectedEmail?.id === email.id ? 'bg-white/10' : ''
                  } ${!email.read ? 'border-l-4 border-l-purple-500' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-sm truncate ${!email.read ? 'text-white font-medium' : 'text-[#A0A0B5]'}`}>
                      {email.subject}
                    </p>
                    <p className="text-[10px] text-[#6B6B80]">
                      {new Date(email.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <p className="text-xs text-[#6B6B80] truncate">To: {email.to}</p>
                </button>
              ))
            )}
          </div>

          {/* Email Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedEmail ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{selectedEmail.subject}</h3>
                  {selectedEmail.link && (
                    <a
                      href={selectedEmail.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Link
                    </a>
                  )}
                </div>
                <div className="text-sm text-[#A0A0B5] whitespace-pre-wrap">
                  {selectedEmail.body}
                </div>
                <div className="pt-4 text-xs text-[#6B6B80] border-t border-white/5">
                  Sent to: {selectedEmail.to}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-[#A0A0B5]">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select an email to read</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}