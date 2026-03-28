// frontend/app/(auth)/accept-invite/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Building2, UserPlus, CheckCircle, AlertCircle, Loader2, Mail } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { mockOrganizations, setUserRoleData } from "@/lib/role";

interface InvitationData {
  token: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  organizationId: number;
  organizationName: string;
  invitedByName: string;
  expiresAt: Date;
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Mock invitation data - in real app, fetch from backend
  useEffect(() => {
    const loadInvitation = async () => {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if there's a pending invitation in sessionStorage
      const storedInvite = sessionStorage.getItem('pending_invitation');
      if (storedInvite && token === 'session-invite') {
        const parsed = JSON.parse(storedInvite);
        setInvitation({
          ...parsed,
          invitedByName: parsed.invitedByName || 'Organization Admin',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
      } else if (token === 'mock-token-123') {
        setInvitation({
          token,
          email: 'newuser@tech.edu',
          role: 'teacher',
          organizationId: 1,
          organizationName: 'Tech University',
          invitedByName: 'Alice Johnson',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
      } else if (token && token.startsWith('invite-')) {
        // Accept any invite token for testing
        setInvitation({
          token,
          email: 'test@example.com',
          role: 'student',
          organizationId: 1,
          organizationName: 'Tech University',
          invitedByName: 'Organization Admin',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
      } else {
        setError('Invalid or expired invitation link');
      }
      
      setIsLoading(false);
    };
    
    loadInvitation();
  }, [token]);

  // Check if user is logged in
  useEffect(() => {
    const checkUser = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
  }, []);

  const handleAccept = async () => {
    if (!invitation) return;
    
    setIsAccepting(true);
    setError(null);
    
    // If user is not logged in, redirect to signup with invitation data
    if (!user) {
      sessionStorage.setItem('pending_invitation', JSON.stringify({
        token: invitation.token,
        email: invitation.email,
        role: invitation.role,
        organizationId: invitation.organizationId,
        organizationName: invitation.organizationName,
        invitedByName: invitation.invitedByName,
      }));
      router.push('/register');
      return;
    }
    
    // User is logged in, accept invitation directly
    try {
      // In real app, call backend to accept invitation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update user role data
      setUserRoleData({
        role: invitation.role,
        organizationId: invitation.organizationId,
        organizationName: invitation.organizationName,
        pendingRole: null,
        pendingOrganizationId: null,
        pendingOrganizationName: null,
      });
      
      // Clear invitation from session storage
      sessionStorage.removeItem('pending_invitation');
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('Failed to accept invitation. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-[#16161F] border border-white/10 rounded-3xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h1>
          <p className="text-[#A0A0B5] mb-6">{error}</p>
          <GlowButton variant="primary" onClick={() => router.push('/')}>
            Go to Home
          </GlowButton>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const isExpired = new Date() > new Date(invitation.expiresAt);

  return (
    <div className="w-full max-w-md">
      <div className="bg-[#16161F] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">You're Invited!</h1>
          <p className="text-[#A0A0B5]">
            {invitation.invitedByName} has invited you to join
          </p>
        </div>

        {isExpired ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-6">
            <p className="text-red-400 text-sm text-center">
              This invitation has expired. Please ask for a new invitation.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              <div className="p-4 bg-[#12121A] rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Building2 className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-medium">Organization</span>
                </div>
                <p className="text-white">{invitation.organizationName}</p>
              </div>
              
              <div className="p-4 bg-[#12121A] rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <UserPlus className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-medium">Role</span>
                </div>
                <p className="text-white capitalize">{invitation.role}</p>
              </div>
              
              <div className="p-4 bg-[#12121A] rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Mail className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-medium">Email</span>
                </div>
                <p className="text-white">{invitation.email}</p>
              </div>
            </div>

            {user && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl mb-6">
                <p className="text-green-400 text-sm text-center">
                  You're logged in as {user.email}. Accepting this invitation will add you to the organization.
                </p>
              </div>
            )}

            <GlowButton
              variant="primary"
              fullWidth
              onClick={handleAccept}
              isLoading={isAccepting}
            >
              {user ? 'Accept Invitation' : 'Create Account & Accept'}
            </GlowButton>
          </>
        )}

        <p className="text-center text-[#6B6B80] text-xs mt-6">
          This invitation expires on {new Date(invitation.expiresAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}