// frontend/components/onboarding/OrganizationAutoDetect.tsx
import { useEffect, useState, useRef } from "react";
import { Building2, CheckCircle, AlertCircle } from "lucide-react";
import { Organization } from "@/lib/role";
import { extractDomainFromEmail, findOrganizationByDomain } from "@/lib/domain-utils";

interface OrganizationAutoDetectProps {
  email: string;
  organizations: Organization[];
  onOrganizationDetected: (org: Organization | null) => void;
  /** When true, keeps "checking" UI until `/check_org` (or similar) has finished loading */
  isLoadingOrganizations?: boolean;
}

export function OrganizationAutoDetect({ 
  email, 
  organizations, 
  onOrganizationDetected,
  isLoadingOrganizations = false,
}: OrganizationAutoDetectProps) {
  const [detectedOrg, setDetectedOrg] = useState<Organization | null>(null);
  const [status, setStatus] = useState<'checking' | 'found' | 'not-found'>('checking');
  const onDetectedRef = useRef(onOrganizationDetected);
  onDetectedRef.current = onOrganizationDetected;

  useEffect(() => {
    // Skip if no email
    if (!email) {
      setStatus('checking');
      setDetectedOrg(null);
      return;
    }

    if (isLoadingOrganizations) {
      setStatus('checking');
      setDetectedOrg(null);
      return;
    }

    // Extract domain from email
    const domain = extractDomainFromEmail(email);
    
    if (!domain) {
      setStatus('not-found');
      setDetectedOrg(null);
      onDetectedRef.current(null);
      return;
    }

    // Find organization by domain
    const org = findOrganizationByDomain(domain, organizations);
    
    if (org) {
      setDetectedOrg(org);
      setStatus('found');
      onDetectedRef.current(org);
    } else {
      setDetectedOrg(null);
      setStatus('not-found');
      onDetectedRef.current(null);
    }
  }, [email, organizations, isLoadingOrganizations]);

  if (!email) {
    return null;
  }

  return (
    <div
      className={`mt-2 p-3 rounded-lg border transition-all duration-300 ${
        status === 'checking'
          ? 'bg-gray-800/30 border-gray-700'
          : status === 'found'
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-yellow-500/10 border-yellow-500/30'
      }`}
    >
      {status === 'checking' && (
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Checking organization from email domain...</span>
        </div>
      )}

      {status === 'found' && detectedOrg && (
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-400">Organization Detected!</p>
            <p className="text-sm text-white mt-1">
              Your email domain matches <span className="font-semibold">{detectedOrg.name}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              You'll be able to join this organization during onboarding.
            </p>
          </div>
          <Building2 className="w-5 h-5 text-green-400 flex-shrink-0" />
        </div>
      )}

      {status === 'not-found' && (
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-400">No Organization Found</p>
            <p className="text-sm text-white mt-1">
              Your email domain doesn't match any existing organization.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              You can create a new organization or skip this step.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}