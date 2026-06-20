// frontend/app/(main)/organizations/join/confirm/page.tsx

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Building2, CheckCircle, Users, BookOpen, Crown, GraduationCap, Award } from 'lucide-react';
import { GlowCard } from '@/components/lms/Cards';
import { GlowButton } from '@/components/lms/GlowButton';

function JoinConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [organization, setOrganization] = useState<{
    id: number;
    name: string;
    role: string;
    courseName?: string;
  } | null>(null);

  useEffect(() => {
    // Get data from URL params
    const orgId = searchParams.get('orgId');
    const orgName = searchParams.get('orgName');
    const role = searchParams.get('role');
    const courseName = searchParams.get('courseName');

    if (orgId && orgName && role) {
      setOrganization({
        id: parseInt(orgId),
        name: orgName,
        role: role,
        courseName: courseName || undefined,
      });
    }
  }, [searchParams]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
      case 'sub_admin':
        return <Crown className="w-12 h-12 text-yellow-400" />;
      case 'teacher':
        return <GraduationCap className="w-12 h-12 text-blue-400" />;
      default:
        return <Users className="w-12 h-12 text-green-400" />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'sub_admin':
        return 'Sub-Administrator';
      case 'teacher':
        return 'Teacher';
      default:
        return 'Student';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
      case 'sub_admin':
        return 'You can manage organization settings, members, and approve join requests.';
      case 'teacher':
        return 'You can create courses, manage assignments, and invite students.';
      default:
        return 'You can enroll in courses, submit assignments, and track your progress.';
    }
  };

  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4 flex items-center justify-center">
        <GlowCard className="p-8 text-center max-w-md">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full mx-auto mb-4" />
            <div className="h-6 bg-gray-700 rounded w-48 mx-auto mb-3" />
            <div className="h-4 bg-gray-700 rounded w-64 mx-auto" />
          </div>
        </GlowCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <GlowCard className="p-8 text-center">
          {/* Success Animation */}
          <div className="relative mb-6">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border-4 border-green-500/30 rounded-full animate-ping" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            Successfully Joined!
          </h1>
          <p className="text-gray-300 mb-6">
            You are now a member of <strong className="text-purple-400">{organization.name}</strong>
          </p>

          {/* Role Card */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-center mb-4">
              {getRoleIcon(organization.role)}
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {getRoleName(organization.role)}
            </h3>
            <p className="text-gray-300 text-sm">
              {getRoleDescription(organization.role)}
            </p>
          </div>

          {/* Course Info (if from course invite) */}
          {organization.courseName && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <div className="text-left">
                  <p className="text-sm text-gray-400">You have been enrolled in:</p>
                  <p className="text-white font-semibold">{organization.courseName}</p>
                </div>
              </div>
            </div>
          )}

          {/* What you can do next */}
          <div className="text-left mb-8">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              What you can do next:
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              {organization.role === 'student' && (
                <>
                  <li>• Browse and enroll in courses offered by {organization.name}</li>
                  <li>• Track your learning progress and achievements</li>
                  <li>• Submit assignments and receive feedback from teachers</li>
                  <li>• Connect with other students in the organization</li>
                </>
              )}
              {(organization.role === 'teacher') && (
                <>
                  <li>• Create and manage your own courses</li>
                  <li>• Invite students to join your courses</li>
                  <li>• Grade assignments and provide feedback</li>
                  <li>• Track student performance and course analytics</li>
                </>
              )}
              {(organization.role === 'admin' || organization.role === 'sub_admin') && (
                <>
                  <li>• Manage organization members and their roles</li>
                  <li>• Approve or reject join requests</li>
                  <li>• Send invitations to new members</li>
                  <li>• Edit organization details and settings</li>
                  <li>• Oversee all courses and activities</li>
                </>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <GlowButton
              variant="primary"
              onClick={() => router.push('/dashboard')}
            >
              Go to Dashboard
            </GlowButton>
            <GlowButton
              variant="outline"
              onClick={() => router.push(`/organizations/${organization.id}`)}
            >
              View Organization
            </GlowButton>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}

export default function JoinConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <JoinConfirmContent />
    </Suspense>
  );
}