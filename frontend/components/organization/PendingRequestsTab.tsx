// frontend/components/organization/PendingRequestsTab.tsx

'use client';

import { useState } from 'react';
import { Users, CheckCircle, XCircle, Clock, Mail, AlertCircle } from 'lucide-react';
import { GlowButton } from '@/components/lms/GlowButton';
import { GlowCard } from '@/components/lms/Cards';
import { JoinRequest, OrganizationRole } from '@/types/organizations';
import { approveJoinRequest, rejectJoinRequest } from '@/lib/organizations';
import { toast } from 'sonner';

interface PendingRequestsTabProps {
  organizationId: number;
  requests: JoinRequest[];
  onRequestProcessed: () => void;
}

export function PendingRequestsTab({ organizationId, requests, onRequestProcessed }: PendingRequestsTabProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (request: JoinRequest) => {
    setProcessingId(request.id);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result = approveJoinRequest(request.id, 'current-admin-id');
    if (result) {
      toast.success(`${request.user_name} has been added as ${request.requested_role}`);
      onRequestProcessed();
    } else {
      toast.error('Failed to approve request');
    }
    
    setProcessingId(null);
  };

  const handleReject = async (request: JoinRequest) => {
    setProcessingId(request.id);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result = rejectJoinRequest(request.id, 'current-admin-id');
    if (result) {
      toast.info(`${request.user_name}'s request has been rejected`);
      onRequestProcessed();
    } else {
      toast.error('Failed to reject request');
    }
    
    setProcessingId(null);
  };

  const getRoleBadgeColor = (role: OrganizationRole) => {
    switch (role) {
      case 'admin':
      case 'sub_admin':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'teacher':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-green-500/20 text-green-400';
    }
  };

  const getRoleDisplayName = (role: OrganizationRole) => {
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

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No Pending Requests</h3>
        <p className="text-gray-400">There are no pending join requests at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <GlowCard key={request.id} className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* User Info */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-400 font-semibold">
                  {request.user_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-white">{request.user_name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-3 h-3 text-gray-500" />
                  <span className="text-sm text-gray-400">{request.user_email}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${getRoleBadgeColor(request.requested_role)}`}>
                    Requested: {getRoleDisplayName(request.requested_role)}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(request.requested_at).toLocaleDateString()}
                  </span>
                </div>
                {request.message && (
                  <div className="mt-2 p-2 bg-gray-800/50 rounded text-sm text-gray-300">
                    <span className="text-gray-400">Message: </span>
                    {request.message}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <GlowButton
                variant="primary"
                size="sm"
                isLoading={processingId === request.id}
                onClick={() => handleApprove(request)}
                className="px-4"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </GlowButton>
              <GlowButton
                variant="outline"
                size="sm"
                isLoading={processingId === request.id}
                onClick={() => handleReject(request)}
                className="px-4 border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </GlowButton>
            </div>
          </div>
        </GlowCard>
      ))}
    </div>
  );
}