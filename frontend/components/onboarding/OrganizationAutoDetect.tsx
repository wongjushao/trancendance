// frontend/components/onboarding/OrganizationAutoDetect.tsx
"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle, AlertCircle } from "lucide-react";
import { Organization } from "@/lib/role";
import { extractDomainFromEmail, findOrganizationByDomain } from "@/lib/domain-utils";

interface OrganizationAutoDetectProps {
  email: string;
  organizations: Organization[];
  onOrganizationDetected: (org: Organization | null) => void;
}

export function OrganizationAutoDetect({ 
  email, 
  organizations, 
  onOrganizationDetected 
}: OrganizationAutoDetectProps) {
  const [detectedOrg, setDetectedOrg] = useState<Organization | null>(null);
  const [status, setStatus] = useState<'checking' | 'found' | 'not-found'>('checking');

  useEffect(() => {
    if (!email) {
      setStatus('checking');
      setDetectedOrg(null);
      onOrganizationDetected(null);
      return;
    }

    const domain = extractDomainFromEmail(email);
    if (!domain) {
      setStatus('not-found');
      setDetectedOrg(null);
      onOrganizationDetected(null);
      return;
    }

    const org = findOrganizationByDomain(domain, organizations);
    
    if (org) {
      setDetectedOrg(org);
      setStatus('found');
      onOrganizationDetected(org);
    } else {
      setDetectedOrg(null);
      setStatus('not-found');
      onOrganizationDetected(null);
    }
  }, [email, organizations, onOrganizationDetected]);

  if (status === 'checking' || !email) {
    return null;
  }

  if (status === 'found' && detectedOrg) {
    return (
      <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-white font-medium mb-1">
              Organization Detected!
            </p>
            <p className="text-sm text-[#A0A0B5]">
              Your email domain ({detectedOrg.domain}) is associated with{' '}
              <span className="text-green-400 font-medium">{detectedOrg.name}</span>.
              You'll automatically join this organization as a student.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-[#6B6B80]">
              <Building2 className="w-3 h-3" />
              <span>{detectedOrg.memberCount.toLocaleString()} members</span>
              <span>•</span>
              <span>{detectedOrg.verified ? '✓ Verified' : 'Unverified'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-white font-medium mb-1">
            No Organization Detected
          </p>
          <p className="text-sm text-[#A0A0B5]">
            Your email domain isn't associated with any organization.
            You can select one below or join an organization later from your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}