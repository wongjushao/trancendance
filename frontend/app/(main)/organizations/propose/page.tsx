// frontend/app/(main)/organizations/propose/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Globe, FileText, AlertCircle, CheckCircle, Send } from 'lucide-react';
import { GlowCard } from '@/components/lms/Cards';
import { GlowButton } from '@/components/lms/GlowButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createOrganizationProposal } from '@/lib/organizations';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { toast } from 'sonner';

export default function ProposeOrganizationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    adminEmail: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }
    
    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = 'Admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      newErrors.adminEmail = 'Please enter a valid email address';
    }
    
    if (formData.domain && !/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/.test(formData.domain)) {
      newErrors.domain = 'Please enter a valid domain (e.g., example.com)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Get current user (mock for now)
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      createOrganizationProposal(
        user.id,
        user.email?.split('@')[0] || 'User',
        {
          name: formData.name,
          adminEmail: formData.adminEmail,
          domain: formData.domain || undefined,
          description: formData.description || undefined,
        }
      );
    }
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    toast.success('Proposal submitted! We will verify the admin email and contact you.');
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
            <h1 className="text-2xl font-bold text-white mb-3">Proposal Submitted!</h1>
            <p className="text-gray-300 mb-6">
              Your request to create <strong>{formData.name}</strong> has been submitted.
            </p>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-white mb-2">What happens next?</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-purple-400 mt-0.5" />
                  <span>We will send a verification email to <strong>{formData.adminEmail}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-purple-400 mt-0.5" />
                  <span>The admin must verify their email and complete registration</span>
                </li>
                <li className="flex items-start gap-2">
                  <Globe className="w-4 h-4 text-purple-400 mt-0.5" />
                  <span>Our team will review all information before approving the organization</span>
                </li>
              </ul>
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
                <li>• We will verify the email before sending an invitation</li>
                <li>• The admin will need to complete registration and provide organization details</li>
                <li>• You will be added as a sub-admin once the organization is created</li>
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