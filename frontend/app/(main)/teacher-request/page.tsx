// frontend/app/(main)/teacher-request/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Building2, Clock, Users, AlertCircle, CheckCircle } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { useRole } from "@/components/providers/RoleProvider";

export default function TeacherRequestPage() {
  const router = useRouter();
  const { roleData } = useRole();

  // Only pending teacher users should access this page
  if (roleData.role !== "pending_teacher") {
    router.push("/dashboard");
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Teacher Request Status</h1>
        <p className="text-[#A0A0B5]">
          Your request to become a teacher is pending approval from the organization admin.
        </p>
      </div>

      {/* Request Status Card */}
      <GlowCard>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-yellow-500/20">
            <Clock className="w-6 h-6 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white mb-2">Pending Approval</h2>
            <p className="text-[#A0A0B5] mb-4">
              Your request to become a teacher at <span className="text-purple-400 font-medium">{roleData.pendingOrganizationName || "your selected organization"}</span> is awaiting review.
            </p>
            <div className="p-4 bg-[#12121A] rounded-xl border border-white/5">
              <p className="text-sm text-[#A0A0B5]">
                <span className="font-semibold text-white">What happens next?</span><br />
                1. The organization admin will review your request<br />
                2. You'll receive an email notification when a decision is made<br />
                3. Once approved, you'll have full teacher privileges<br />
                4. Until then, you have student access to all courses
              </p>
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Organization Details */}
      <GlowCard>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-purple-400" />
          Organization Details
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-[#A0A0B5]">Organization</span>
            <span className="text-white font-medium">{roleData.pendingOrganizationName || "Not specified"}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-[#A0A0B5]">Requested Role</span>
            <span className="text-purple-400 font-medium">Teacher</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-[#A0A0B5]">Current Access</span>
            <span className="text-green-400 font-medium">Student</span>
          </div>
        </div>
      </GlowCard>

      {/* Actions */}
      <div className="flex gap-4">
        <GlowButton
          variant="outline"
          onClick={() => router.push("/dashboard")}
        >
          Back to Dashboard
        </GlowButton>
        <GlowButton
          variant="secondary"
          onClick={() => router.push("/organizations")}
        >
          Browse Organizations
        </GlowButton>
      </div>

      {/* Info Message */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-400">
            <p className="font-medium mb-1">Need assistance?</p>
            <p>If you haven't received a response within 7 days, please contact the organization admin directly or reach out to our support team.</p>
          </div>
        </div>
      </div>
    </div>
  );
}