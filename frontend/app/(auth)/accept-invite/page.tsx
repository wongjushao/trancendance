"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Building2, UserPlus, AlertCircle, Loader2, Mail } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { setUserRoleData } from "@/lib/role";
import {
  acceptInvitation,
  acceptOrganizationMemberInvitationOnBackend,
  fetchOrganizationMemberInvitationFromBackend,
  getInvitationByToken,
} from "@/lib/invites";
import {
  clearPendingOrgInvitation,
  writePendingOrgInvitation,
} from "@/lib/org-invitation-pending";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

interface InvitationData {
  token: string;
  email: string;
  role: 'student' | 'teacher' | 'admin' | 'sub_admin';
  organizationId: number;
  organizationName: string;
  invitedByName: string;
  expiresAt: Date;
  inviteSource: 'backend' | 'local';
  personalMessage?: string | null;
}

const getAuthToken = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

const getCurrentUser = async () => {
  const token = await getAuthToken();
  if (!token) return null;
  
  try {
    const response = await fetch('/api/auth-service/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setError('No invitation token provided');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const backendResult = await fetchOrganizationMemberInvitationFromBackend(token);
      if (backendResult.ok) {
        const d = backendResult.data;
        const expiresAt = new Date(d.expires_at);
        if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
          setError('This invitation has expired');
          setIsLoading(false);
          return;
        }
        const orgName = d.organization_name || 'Unknown organization';
        setInvitation({
          token,
          email: normalizeEmail(d.email),
          role: d.member_role as InvitationData['role'],
          organizationId: d.organization_id,
          organizationName: orgName,
          invitedByName: d.invited_by_name || 'Someone',
          expiresAt,
          inviteSource: 'backend',
          personalMessage: d.personal_message ?? null,
        });
        setIsLoading(false);
        return;
      }

      const invite = getInvitationByToken(token);
      if (!invite) {
        setError(backendResult.message || 'Invitation not found or has expired');
        setIsLoading(false);
        return;
      }

      if (invite.status !== 'pending') {
        setError(`This invitation is already ${invite.status}`);
        setIsLoading(false);
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        setError('This invitation has expired');
        setIsLoading(false);
        return;
      }

      setInvitation({
        token: invite.token,
        email: normalizeEmail(invite.email),
        role: invite.role as InvitationData['role'],
        organizationId: invite.organization_id,
        organizationName: invite.organization_name,
        invitedByName: invite.invited_by_name,
        expiresAt: new Date(invite.expires_at),
        inviteSource: 'local',
      });

      setIsLoading(false);
    };

    loadInvitation();
  }, [token]);

  useEffect(() => {
    if (!authChecked || !invitation || !token || user) return;

    writePendingOrgInvitation({
      token: invitation.token,
      email: invitation.email,
      role: invitation.role,
      organizationId: invitation.organizationId,
      organizationName: invitation.organizationName,
      invitedByName: invitation.invitedByName,
      inviteSource: invitation.inviteSource,
    });
    router.replace(`/register?invite_token=${encodeURIComponent(token)}`);
  }, [authChecked, invitation, token, user, router]);

  // Check if user is logged in using backend API
  useEffect(() => {
    const checkUser = async () => {
      const userData = await getCurrentUser();
      setUser(userData);
      setAuthChecked(true);
    };
    checkUser();
  }, []);

  const handleAccept = async () => {
    if (!invitation || !token) return;
    
    setIsAccepting(true);
    setError(null);
    
    // If user is not logged in, store invitation and redirect to register
    if (!user) {
      writePendingOrgInvitation({
        token: invitation.token,
        email: invitation.email,
        role: invitation.role,
        organizationId: invitation.organizationId,
        organizationName: invitation.organizationName,
        invitedByName: invitation.invitedByName,
        inviteSource: invitation.inviteSource,
      });
      router.replace(`/register?invite_token=${encodeURIComponent(invitation.token)}`);
      setIsAccepting(false);
      return;
    }

    if (normalizeEmail(user.email ?? '') !== invitation.email) {
      setError(`This invitation was sent to ${invitation.email}. Please log in with that email address to accept.`);
      setIsAccepting(false);
      return;
    }

    try {
      if (invitation.inviteSource === 'backend') {
        const accessToken = await getAuthToken();
        if (!accessToken) {
          throw new Error('Your session expired. Please sign in again.');
        }

        const result = await acceptOrganizationMemberInvitationOnBackend(accessToken, token);
        if (!result.ok) {
          throw new Error(result.message);
        }

        setUserRoleData({
          role: invitation.role as unknown as never,
          organizationId: result.organization_id,
          organizationName: result.organization_name,
          pendingRole: null,
          pendingOrganizationId: null,
          pendingOrganizationName: null,
        });
      } else {
        const result = acceptInvitation(token, user.id, user.email);

        if (!result.success) {
          throw new Error(result.message);
        }

        setUserRoleData({
          role: invitation.role as unknown as never,
          organizationId: invitation.organizationId,
          organizationName: invitation.organizationName,
          pendingRole: null,
          pendingOrganizationId: null,
          pendingOrganizationName: null,
        });
      }

      clearPendingOrgInvitation();

      const params = new URLSearchParams();
      params.set('orgId', invitation.organizationId.toString());
      params.set('orgName', invitation.organizationName);
      params.set('role', invitation.role);
      router.push(`/organizations/join/confirm?${params.toString()}`);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
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

  const isExpired = new Date() > invitation.expiresAt;

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

              {invitation.personalMessage ? (
                <div className="p-4 bg-[#12121A] rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Mail className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-medium">Personal note</span>
                  </div>
                  <p className="text-white whitespace-pre-wrap text-sm">{invitation.personalMessage}</p>
                </div>
              ) : null}

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

            {user && normalizeEmail(user.email ?? '') !== invitation.email && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-6">
                <p className="text-yellow-400 text-sm text-center">
                  You're logged in as {user.email}. This invitation was sent to {invitation.email}.
                  Please sign out and log in with the correct email address.
                </p>
                <GlowButton 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 w-full"
                  onClick={handleSignOut}
                >
                  Sign Out and Log In
                </GlowButton>
              </div>
            )}

            {user && normalizeEmail(user.email ?? '') === invitation.email && (
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
              disabled={!!user && normalizeEmail(user.email ?? '') !== invitation.email}
            >
              {!user ? 'Create Account & Accept' : 'Accept Invitation'}
            </GlowButton>
          </>
        )}

        <p className="text-center text-[#6B6B80] text-xs mt-6">
          This invitation expires on {invitation.expiresAt.toLocaleDateString()}
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