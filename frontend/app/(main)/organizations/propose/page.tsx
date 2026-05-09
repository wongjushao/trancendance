// frontend/app/(main)/organizations/propose/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Globe, AlertCircle, CheckCircle, Send } from 'lucide-react';
import { GlowCard } from '@/components/lms/Cards';
import { GlowButton } from '@/components/lms/GlowButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { toast } from 'sonner';

export default function ProposeOrganizationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedOrgName, setSubmittedOrgName] = useState('');
  const [submittedAdminEmail, setSubmittedAdminEmail] = useState('');
  /** When SMTP did not send, backend may return this only if the logged-in user is the admin email. */
  const [fallbackVerificationUrl, setFallbackVerificationUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    adminEmail: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = 'Admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      newErrors.adminEmail = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('You must be logged in to propose an organization');
        router.push('/login');
        return;
      }
      
      // Call the backend API
      const response = await fetch('/api/org-service/orgs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          admin_email: formData.adminEmail.trim(),
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create verification request');
      }
      
      // Store submitted info for display
      setSubmittedOrgName(formData.name.trim());
      setSubmittedAdminEmail(formData.adminEmail.trim());
      const emailSent = data.email_sent !== false;
      const fallbackUrl =
        typeof data.verification_url === 'string' && data.verification_url ? data.verification_url : null;
      setFallbackVerificationUrl(!emailSent && fallbackUrl ? fallbackUrl : null);

      if (emailSent) {
        toast.success('Verification request submitted! Check the admin email for verification link.');
      } else if (fallbackUrl) {
        toast.success('Request saved. Email was not sent — use the button below to verify as the admin.');
      } else {
        toast.success('Verification request submitted. Configure SMTP to receive the verification email.');
      }
      setIsSubmitted(true);
      
    } catch (error: any) {
      console.error('Error submitting proposal:', error);
      toast.error(error.message || 'Failed to submit proposal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <GlowCard className="p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Verification Request Sent!</h1>
            <p className="text-gray-300 mb-6">
              Your request to create <strong>{submittedOrgName}</strong> has been submitted.
            </p>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-white mb-2">What happens next?</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                {fallbackVerificationUrl ? (
                  <>
                    <li className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-amber-400 mt-0.5" />
                      <span>
                        We could not send email (SMTP misconfigured or delivery failed). Because you are
                        requesting as <strong>{submittedAdminEmail}</strong>, you can verify directly.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-purple-400 mt-0.5" />
                      <span>Click &quot;Continue verification&quot; to open the verification step.</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-purple-400 mt-0.5" />
                      <span>
                        We&apos;ve sent a verification email to <strong>{submittedAdminEmail}</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-purple-400 mt-0.5" />
                      <span>The admin must click the verification link in the email</span>
                    </li>
                  </>
                )}
                <li className="flex items-start gap-2">
                  <Globe className="w-4 h-4 text-purple-400 mt-0.5" />
                  <span>After verification, the organization will be created immediately</span>
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-4 justify-center">
              {fallbackVerificationUrl && (
                <GlowButton
                  variant="primary"
                  onClick={() => {
                    try {
                      const u = new URL(fallbackVerificationUrl);
                      router.push(`${u.pathname}${u.search}`);
                    } catch {
                      router.push(fallbackVerificationUrl);
                    }
                  }}
                >
                  Continue verification
                </GlowButton>
              )}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <GlowCard className="p-6 md:p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Propose New Organization</h1>
            <p className="text-gray-400 mt-2">
              Don't see your organization? Propose it and we'll verify and set it up.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Name */}
            <div>
              <Label htmlFor="name" className="text-white mb-2 block">
                Organization Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g., 42 Kuala Lumpur, Tech Academy"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.name}
                </p>
              )}
            </div>

            {/* Admin Email */}
            <div>
              <Label htmlFor="adminEmail" className="text-white mb-2 block">
                Admin Email Address <span className="text-red-400">*</span>
              </Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@organization.com"
                value={formData.adminEmail}
                onChange={(e) => handleChange('adminEmail', e.target.value)}
                className={errors.adminEmail ? 'border-red-500' : ''}
              />
              {errors.adminEmail && (
                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.adminEmail}
                </p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                We'll send a verification email to this address. The admin will need to verify ownership.
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h3 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Important Information
              </h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• The admin email must belong to the actual organization admin</li>
                <li>• We will send a verification link to this email</li>
                <li>• Once verified, the organization will be created immediately</li>
                <li>• You will be added as a member with appropriate role</li>
              </ul>
            </div>

            {/* Submit Button */}
            <GlowButton
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isSubmitting}
              className="py-3"
            >
              {!isSubmitting && <Send className="w-4 h-4 mr-2" />}
              Submit Proposal
            </GlowButton>
          </form>
        </GlowCard>
      </div>
    </div>
  );
}