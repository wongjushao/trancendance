// frontend/app/(main)/organizations/verify/page.tsx

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Building2, CheckCircle, AlertCircle, Loader2, Mail, LogOut, ArrowLeft } from 'lucide-react';
import { GlowCard } from '@/components/lms/Cards';
import { GlowButton } from '@/components/lms/GlowButton';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { setUserRoleData } from '@/lib/role';
import { toast } from 'sonner';

function VerifyOrganizationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'generic' | 'email_mismatch' | 'expired' | 'already_verified' | 'not_pending' | 'no_token' | 'not_logged_in'>('generic');
  const [organization, setOrganization] = useState<{ id: number; name: string } | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [invitedAdminEmail, setInvitedAdminEmail] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No verification token provided');
      setErrorType('no_token');
      setVerifying(false);
      return;
    }

    const verifyOrganization = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        // Get current user email if logged in
        if (session?.user?.email) {
          setCurrentUserEmail(session.user.email);
        }
        
        if (!session) {
          // Store token for after login
          sessionStorage.setItem('pending_verification_token', token);
          setError('Please log in to verify your organization');
          setErrorType('not_logged_in');
          setVerifying(false);
          return;
        }
        
        // Make the verification request
        const response = await fetch('/api/org-service/orgs/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token }),
        });
        
        const data = await response.json();
        
        // Handle different error cases
        if (!response.ok) {
          // Email mismatch (403) - user logged in with wrong email
          if (response.status === 403) {
            setErrorType('email_mismatch');
            setError(data.error || 'This verification link is for a different email address.');
            setInvitedAdminEmail(data.expected_email || null);
            setVerifying(false);
            return;
          }
          
          // Already verified (409)
          if (response.status === 409) {
            setErrorType('already_verified');
            setError(data.error || 'This organization has already been verified.');
            setVerifying(false);
            return;
          }
          
          // Not pending (409 with different message)
          if (response.status === 409 && data.error?.toLowerCase().includes('pending')) {
            setErrorType('not_pending');
            setError(data.error || 'This verification request is no longer pending.');
            setVerifying(false);
            return;
          }
          
          // Expired token (400)
          if (response.status === 400 && data.error?.toLowerCase().includes('expired')) {
            setErrorType('expired');
            setError(data.error || 'This verification link has expired.');
            setVerifying(false);
            return;
          }
          
          throw new Error(data.error || 'Verification failed');
        }
        
        // Success - organization created/verified
        // Update user role data to admin
        setUserRoleData({
          role: 'admin',
          organizationId: data.organization.id,
          organizationName: data.organization.name,
          pendingRole: null,
          pendingOrganizationId: null,
          pendingOrganizationName: null,
        });
        
        setOrganization(data.organization);
        setSuccess(true);
        toast.success(`Organization "${data.organization.name}" verified successfully! You are now an admin.`);
        
        // Clear any stored token
        sessionStorage.removeItem('pending_verification_token');
        
      } catch (err: any) {
        console.error('Verification error:', err);
        setError(err.message || 'Failed to verify organization');
      } finally {
        setVerifying(false);
      }
    };
    
    verifyOrganization();
  }, [token, router]);

  const handleSignOutAndRetry = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    sessionStorage.setItem('pending_verification_token', token || '');
    router.push(`/login?redirect=/organizations/verify?token=${token}`);
  };

  const handleLoginWithDifferentAccount = () => {
    sessionStorage.setItem('pending_verification_token', token || '');
    router.push('/login');
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Verifying your organization...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (errorType === 'not_logged_in') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
        <div className="max-w-md mx-auto">
          <GlowCard className="p-8 text-center">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Login Required</h1>
            <p className="text-gray-300 mb-4">
              Please log in to verify your organization.
            </p>
            <div className="flex gap-4 justify-center">
              <GlowButton variant="primary" onClick={handleLoginWithDifferentAccount}>
                Log In
              </GlowButton>
              <GlowButton variant="outline" onClick={() => router.push('/')}>
                Go Home
              </GlowButton>
            </div>
          </GlowCard>
        </div>
      </div>
    );
  }

  // Email Mismatch Error - User logged in with wrong account
  if (errorType === 'email_mismatch') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
        <div className="max-w-md mx-auto">
          <GlowCard className="p-8 text-center">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Wrong Account</h1>
            <p className="text-gray-300 mb-4">
              This verification link was sent to: <strong className="text-purple-400">{invitedAdminEmail || 'an admin email'}</strong>
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-400">
                You are currently logged in as: <strong>{currentUserEmail || 'Unknown'}</strong>
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Please log out and sign in with the email address that received the invitation.
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <GlowButton 
                variant="primary" 
                onClick={handleSignOutAndRetry}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out & Log In
              </GlowButton>
              <GlowButton variant="outline" onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </GlowButton>
            </div>
          </GlowCard>
        </div>
      </div>
    );
  }

  // Not Pending (already processed)
  if (errorType === 'not_pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
        <div className="max-w-md mx-auto">
          <GlowCard className="p-8 text-center">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Already Processed</h1>
            <p className="text-gray-300 mb-4">
              This verification request has already been processed.
            </p>
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400">
                The organization has already been verified. You can access it from your dashboard.
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <GlowButton variant="primary" onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </GlowButton>
              <GlowButton variant="outline" onClick={() => router.push('/organizations')}>
                View Organizations
              </GlowButton>
            </div>
          </GlowCard>
        </div>
      </div>
    );
  }

  // Expired Token Error
  if (errorType === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
        <div className="max-w-md mx-auto">
          <GlowCard className="p-8 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Verification Link Expired</h1>
            <p className="text-gray-300 mb-4">
              This verification link has expired (it was only valid for 24 hours).
            </p>
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400">
                Please request a new verification link from the organization admin.
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <GlowButton variant="primary" onClick={() => router.push('/organizations/propose')}>
                Request New Verification
              </GlowButton>
              <GlowButton variant="outline" onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </GlowButton>
            </div>
          </GlowCard>
        </div>
      </div>
    );
  }

  // Already Verified Error
  if (errorType === 'already_verified') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
        <div className="max-w-md mx-auto">
          <GlowCard className="p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Already Verified</h1>
            <p className="text-gray-300 mb-4">
              This organization has already been verified.
            </p>
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400">
                The verification link has already been used. You can access your organization from the dashboard.
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <GlowButton variant="primary" onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </GlowButton>
              <GlowButton variant="outline" onClick={() => router.push('/organizations')}>
                View Organizations
              </GlowButton>
            </div>
          </GlowCard>
        </div>
      </div>
    );
  }

  // Generic Error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
        <div className="max-w-md mx-auto">
          <GlowCard className="p-8 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Verification Failed</h1>
            <p className="text-gray-300 mb-6">{error}</p>
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400">
                Please contact support if this issue persists.
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <GlowButton variant="primary" onClick={() => router.push('/organizations/propose')}>
                Request New Verification
              </GlowButton>
              <GlowButton variant="outline" onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </GlowButton>
            </div>
          </GlowCard>
        </div>
      </div>
    );
  }

  // Success State
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
      <div className="max-w-md mx-auto">
        <GlowCard className="p-8 text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Organization Verified!</h1>
          <p className="text-gray-300 mb-4">
            Your organization <strong className="text-purple-400">{organization?.name}</strong> has been successfully verified.
          </p>
          <p className="text-gray-400 text-sm mb-6">
            You are now an administrator of this organization. You can now:
          </p>
          <ul className="text-left text-sm text-gray-300 mb-6 space-y-2">
            <li>• Manage organization members and roles</li>
            <li>• Create and manage courses</li>
            <li>• Invite students and teachers</li>
            <li>• View organization analytics</li>
          </ul>
          <div className="flex gap-4 justify-center">
            <GlowButton variant="primary" onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </GlowButton>
            <GlowButton variant="outline" onClick={() => organization && router.push(`/organizations/${organization.id}/admin`)}>
              Manage Organization
            </GlowButton>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}

export default function VerifyOrganizationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    }>
      <VerifyOrganizationContent />
    </Suspense>
  );
}