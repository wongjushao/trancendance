// frontend/components/organization/InviteMemberModal.tsx
"use client";

import { useState } from "react";
import { Mail, X, Send } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Organization } from "@/lib/role";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
}

export function InviteMemberModal({ isOpen, onClose, organization }: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"student" | "teacher" | "admin">("student");
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setStatus(null);

    // Mock sending invitation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log("[Invite] Sending invitation:", {
      email,
      role,
      organizationId: organization.id,
      organizationName: organization.name,
    });
    
    setStatus({ type: "success", message: `Invitation sent to ${email}` });
    setEmail("");
    setTimeout(() => {
      onClose();
    }, 1500);
    
    setIsSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[#16161F] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Invite Member</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#A0A0B5]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
              Email Address
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="bg-[#12121A] border-white/10 text-white rounded-xl"
              required
            />
            <p className="text-xs text-[#6B6B80] mt-1">
              They'll receive an email with instructions to join {organization.name}
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
              Role to Assign
            </Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full bg-[#12121A] border border-white/10 text-white rounded-xl h-12 px-4 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all outline-none [color-scheme:dark]"
            >
              <option value="student">Student - Can view and take courses</option>
              <option value="teacher">Teacher - Can create and manage courses</option>
              <option value="admin">Admin - Can manage organization</option>
            </select>
          </div>

          {status && (
            <div className={`p-3 rounded-xl text-sm ${
              status.type === "success"
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}>
              {status.message}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <GlowButton
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </GlowButton>
            <GlowButton
              type="submit"
              variant="primary"
              isLoading={isSending}
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Invite
            </GlowButton>
          </div>
        </form>
      </div>
    </div>
  );
}