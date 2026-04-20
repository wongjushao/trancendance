// frontend/components/teacher/InviteStudentModal.tsx

'use client';

import { useState } from 'react';
import { X, Mail, Send, AlertCircle, BookOpen, UserPlus } from 'lucide-react';
import { GlowButton } from '@/components/lms/GlowButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createCourseInvite } from '@/lib/invites';
import { toast } from 'sonner';

interface Course {
  id: number;
  title: string;
  organization_id: number;
  organization_name: string;
}

interface InviteStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  invitedByName: string;
}

export function InviteStudentModal({ isOpen, onClose, courses, invitedByName }: InviteStudentModalProps) {
  const [email, setEmail] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(courses[0]?.id || null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');

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
    if (!selectedCourseId) {
      toast.error('Please select a course');
      return;
    }
    
    const selectedCourse = courses.find(c => c.id === selectedCourseId);
    if (!selectedCourse) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create course invitation
    const invitation = createCourseInvite(
      email,
      selectedCourse.organization_id,
      selectedCourse.id,
      selectedCourse.title,
      'current-user-id',
      invitedByName
    );
    
    toast.success(`Course invitation sent to ${email} for ${selectedCourse.title}`);
    
    // Reset form
    setEmail('');
    setMessage('');
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

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
              <UserPlus className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Invite Student</h2>
              <p className="text-sm text-gray-400">Send a course invitation to a student</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Email Field */}
          <div>
            <Label htmlFor="email" className="text-white mb-2 block">
              Student Email <span className="text-red-400">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="student@example.com"
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

          {/* Course Selection */}
          <div>
            <Label className="text-white mb-2 block">
              Select Course <span className="text-red-400">*</span>
            </Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {courses.map((course) => (
                <label
                  key={course.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedCourseId === course.id
                      ? 'bg-purple-500/20 border border-purple-500/50'
                      : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="course"
                    value={course.id}
                    checked={selectedCourseId === course.id}
                    onChange={() => setSelectedCourseId(course.id)}
                    className="text-purple-500 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-purple-400" />
                      <span className="font-medium text-white">{course.title}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{course.organization_name}</p>
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
              The student will be automatically added to the organization as a student (if not already a member)
              and enrolled in the selected course upon accepting the invitation.
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