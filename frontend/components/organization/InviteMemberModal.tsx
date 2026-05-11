// frontend/components/organization/InviteMemberModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Send, AlertCircle, Users, GraduationCap, Crown } from 'lucide-react';
import { GlowButton } from '@/components/lms/GlowButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Organization, OrganizationRole } from '@/types/organizations';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { enqueueMockInvitationFromBackend } from '@/lib/mock-email';
import { toast } from 'sonner';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization;
  invitedByName: string;
  currentUserRole: 'admin' | 'sub_admin' | 'teacher';
}

export function InviteMemberModal({ 
  isOpen, 
  onClose, 
  organization, 
  invitedByName: _invitedByName,
  currentUserRole 
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<OrganizationRole>('student');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Debug: Log when modal opens/closes
  useEffect(() => {
    // console.log('[InviteMemberModal] isOpen changed:', isOpen);
    if (isOpen) {
      // console.log('[InviteMemberModal] Modal opened with organization:', organization?.name);
    }
  }, [isOpen, organization]);

  // Determine which roles can be invited based on inviter's role
  const getAvailableRoles = (): { role: OrganizationRole; label: string; icon: React.ReactNode; description: string }[] => {
    const roles = [
      { role: 'student' as const, label: 'Student', icon: <Users className="w-4 h-4" />, description: 'Can view and join courses, submit assignments' },
      { role: 'teacher' as const, label: 'Teacher', icon: <GraduationCap className="w-4 h-4" />, description: 'Can create courses, manage assignments, invite students' },
    ];
    
    // Only admins can invite sub_admins
    if (currentUserRole === 'admin') {
      roles.push({ 
        role: 'sub_admin' as const, 
        label: 'Sub-Administrator', 
        icon: <Crown className="w-4 h-4" />, 
        description: 'Can manage organization, members, and approve requests (cannot demote primary admin)' 
      });
    }
    
    return roles;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) return;

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error('Your session expired. Please sign in again.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`/api/org-service/orgs/${organization.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          role: selectedRole,
          personal_message: message.trim() ? message.trim() : undefined,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        mock_email?: { to: string; subject: string; body: string; link: string };
      };

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : `Invite failed (${response.status})`);
      }

      if (payload.mock_email) {
        enqueueMockInvitationFromBackend(payload.mock_email);
      }

      toast.success(
        `Invitation sent to ${email} as ${getAvailableRoles().find((r) => r.role === selectedRole)?.label}`
      );

      setEmail('');
      setMessage('');
      setSelectedRole('student');
      onClose();
    } catch (error) {
      console.error('[InviteMemberModal] Error sending invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    // console.log('[InviteMemberModal] Modal not open, returning null');
    return null;
  }

  const availableRoles = getAvailableRoles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative max-w-md w-full bg-gray-900 rounded-xl border border-purple-500/30 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Invite Member</h2>
              <p className="text-sm text-gray-400">Send an invitation to join {organization.name}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Email Field */}
          <div>
            <Label htmlFor="email" className="text-white mb-2 block">
              Email Address <span className="text-red-400">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={() => validateEmail(email)}
              className={emailError ? 'border-red-500' : ''}
            />
            {emailError && (
              <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {emailError}
              </p>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <Label className="text-white mb-2 block">
              Assign Role <span className="text-red-400">*</span>
            </Label>
            <div className="space-y-2">
              {availableRoles.map((role) => (
                <label
                  key={role.role}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedRole === role.role
                      ? 'bg-purple-500/20 border border-purple-500/50'
                      : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.role}
                    checked={selectedRole === role.role}
                    onChange={() => setSelectedRole(role.role)}
                    className="mt-1 text-purple-500 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400">{role.icon}</span>
                      <span className="font-medium text-white">{role.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{role.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Personal Message (Optional) */}
          <div>
            <Label htmlFor="message" className="text-white mb-2 block">
              Personal Message (Optional)
            </Label>
            <textarea
              id="message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal note to the invitation..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-xs text-blue-300">
              The invited user will receive an email with instructions to join. 
              If they are not already a member, they will be added to the organization upon acceptance.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <GlowButton
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </GlowButton>
            <GlowButton
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="flex-1"
            >
              {!isSubmitting && <Send className="w-4 h-4 mr-2" />}
              Send Invitation
            </GlowButton>
          </div>
        </form>
      </div>
    </div>
  );
}