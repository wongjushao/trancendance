// frontend/app/(main)/organization-setup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, MapPin, Globe, Phone, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRole } from "@/components/providers/RoleProvider";

interface OrganizationFormData {
  name: string;
  description: string;
  email: string;
  domain: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  website: string;
  industry: string;
  size: string;
}

const INDUSTRIES = [
  "Technology",
  "Education",
  "Healthcare",
  "Finance",
  "Manufacturing",
  "Retail",
  "Consulting",
  "Government",
  "Non-profit",
  "Other",
];

const SIZES = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees",
];

export default function OrganizationSetupPage() {
  const router = useRouter();
  const { roleData } = useRole();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: "",
    description: "",
    email: "",
    domain: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    website: "",
    industry: "",
    size: "",
  });

  // Only pending admin users should access this page
  if (roleData.role !== "pending_admin") {
    router.push("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    // Validate required fields
    if (!formData.name.trim()) {
      setSubmitStatus({ type: "error", message: "Organization name is required" });
      setIsSubmitting(false);
      return;
    }
    if (!formData.email.trim()) {
      setSubmitStatus({ type: "error", message: "Organization email is required" });
      setIsSubmitting(false);
      return;
    }
    if (!formData.domain.trim()) {
      setSubmitStatus({ type: "error", message: "Organization domain is required" });
      setIsSubmitting(false);
      return;
    }

    // Mock submission - in production, this would call the backend
    console.log("[Organization Setup] Submitting:", formData);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock success
    setSubmitStatus({
      type: "success",
      message: "Organization registration submitted! We've sent a verification email to the organization's domain. Once verified, you'll be granted admin access."
    });
    
    setIsSubmitting(false);
  };

  const setField = (field: keyof OrganizationFormData) => 
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFormData(prev => ({ ...prev, [field]: e.target.value }));
      setSubmitStatus(null);
    };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Create Your Organization</h1>
        <p className="text-[#A0A0B5]">
          You've requested to become an admin. Complete the form below to register your organization.
          We'll verify your details and notify you via email once approved.
        </p>
        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <p className="text-sm text-yellow-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Pending Verification: You currently have student access until your organization is verified.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <GlowCard>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            Basic Information
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                Organization Name <span className="text-red-400">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={setField("name")}
                placeholder="e.g., Tech University, Acme Corp"
                className="bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                required
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Description</Label>
              <Textarea
                value={formData.description}
                onChange={setField("description")}
                placeholder="Tell us about your organization..."
                rows={3}
                className="bg-[#12121A] border-white/10 text-white rounded-xl resize-none"
              />
            </div>
          </div>
        </GlowCard>

        {/* Contact Information */}
        <GlowCard>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-400" />
            Contact Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                Organization Email <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={setField("email")}
                  placeholder="contact@organization.com"
                  className="pl-10 bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                  required
                />
              </div>
              <p className="text-xs text-[#6B6B80] mt-1">
                We'll send verification email to this address
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">
                Organization Domain <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                <Input
                  value={formData.domain}
                  onChange={setField("domain")}
                  placeholder="organization.com"
                  className="pl-10 bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                  required
                />
              </div>
              <p className="text-xs text-[#6B6B80] mt-1">
                Users with @{formData.domain || "domain"} emails will auto-join your organization
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={setField("phone")}
                  placeholder="+1 234 567 8900"
                  className="pl-10 bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                <Input
                  type="url"
                  value={formData.website}
                  onChange={setField("website")}
                  placeholder="https://organization.com"
                  className="pl-10 bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                />
              </div>
            </div>
          </div>
        </GlowCard>

        {/* Address */}
        <GlowCard>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-400" />
            Address
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Street Address</Label>
              <Input
                value={formData.address}
                onChange={setField("address")}
                placeholder="123 Main Street"
                className="bg-[#12121A] border-white/10 text-white rounded-xl h-12"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">City</Label>
                <Input
                  value={formData.city}
                  onChange={setField("city")}
                  placeholder="San Francisco"
                  className="bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Country</Label>
                <Input
                  value={formData.country}
                  onChange={setField("country")}
                  placeholder="United States"
                  className="bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                />
              </div>
            </div>
          </div>
        </GlowCard>

        {/* Additional Information */}
        <GlowCard>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            Additional Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Industry</Label>
              <select
                value={formData.industry}
                onChange={setField("industry")}
                className="w-full bg-[#12121A] border border-white/10 text-white rounded-xl h-12 px-4 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all outline-none appearance-none cursor-pointer [color-scheme:dark]"
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-sm font-medium text-[#A0A0B5] mb-2 block">Organization Size</Label>
              <select
                value={formData.size}
                onChange={setField("size")}
                className="w-full bg-[#12121A] border border-white/10 text-white rounded-xl h-12 px-4 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all outline-none appearance-none cursor-pointer [color-scheme:dark]"
              >
                <option value="">Select size</option>
                {SIZES.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>
        </GlowCard>

        {/* Submit Status */}
        {submitStatus && (
          <div className={`p-4 rounded-xl border ${
            submitStatus.type === "success"
              ? "border-green-500/20 bg-green-500/10 text-green-400"
              : "border-red-500/20 bg-red-500/10 text-red-400"
          }`}>
            <div className="flex items-center gap-2">
              {submitStatus.type === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <p>{submitStatus.message}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <GlowButton
            type="button"
            variant="ghost"
            onClick={() => router.push("/dashboard")}
          >
            Cancel
          </GlowButton>
          <GlowButton
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
          >
            Submit for Verification
          </GlowButton>
        </div>
      </form>
    </div>
  );
}