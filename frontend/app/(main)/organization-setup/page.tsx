// frontend/app/(main)/organization-setup/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, Mail, MapPin, Globe, Phone, FileText, 
  AlertCircle, CheckCircle, Loader2, Users, Briefcase,
  Calendar, Link as LinkIcon, Award, Shield, TrendingUp,
  Plus, X, Save, ArrowRight, ArrowLeft, Edit, Trash2,
  Clock, Eye, ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRole } from "@/components/providers/RoleProvider";
import { createOrgCreationRequest, getOrgCreationRequests, cancelOrgCreationRequest, OrganizationCreationRequest } from "@/lib/role-requests";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";
import {
  validateOrganizationName,
  validateDomain,
  validatePhoneNumber,
  validateUrl,
} from "@/lib/validation";

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

const INDUSTRY_OPTIONS = [
  "Education",
  "Technology",
  "Healthcare",
  "Finance",
  "Retail",
  "Manufacturing",
  "Consulting",
  "Non-profit",
  "Government",
  "Other"
];

const SIZE_OPTIONS = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees"
];

const COUNTRY_OPTIONS = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "Singapore",
  "Malaysia",
  "Other"
];

export default function OrganizationSetupPage() {
  const router = useRouter();
  const { roleData, refreshRole } = useRole();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});
  const [pendingRequests, setPendingRequests] = useState<OrganizationCreationRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

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

  // Load pending requests
  const loadPendingRequests = () => {
    const allRequests = getOrgCreationRequests();
    const userRequests = allRequests.filter(req => req.status === 'pending');
    setPendingRequests(userRequests);
  };

  // Check if user has permission to access this page
  useEffect(() => {
    const checkAccess = async () => {
      setIsLoading(true);
      
      await refreshRole();
      
      // Allow access for pending_org_admin and org_admin (to view their requests)
      if (roleData.role !== 'pending_org_admin' && roleData.role !== 'org_admin') {
        toast.error("You don't have permission to access this page");
        router.push('/dashboard');
        return;
      }
      
      loadPendingRequests();
      setIsLoading(false);
    };
    
    checkAccess();
  }, [roleData.role, router, refreshRole]);

  // Pre-fill user email if available
  useEffect(() => {
    const loadUserEmail = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setFormData(prev => ({ ...prev, email: user.email || "" }));
      }
    };
    loadUserEmail();
  }, []);

  // Validation functions
  const validateField = (field: keyof OrganizationFormData, value: string): string | undefined => {
    switch (field) {
      case "name":
        return validateOrganizationName(value).error;
      case "domain":
        return value ? validateDomain(value).error : undefined;
      case "phone":
        return value ? validatePhoneNumber(value).error : undefined;
      case "website":
        return value ? validateUrl(value, "Website").error : undefined;
      case "email":
        if (!value) return "Contact email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return "Please enter a valid email address";
        }
        return undefined;
      default:
        return undefined;
    }
  };

  const handleBlur = (field: keyof OrganizationFormData) => {
    setFieldTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setFieldErrors(prev => ({ ...prev, [field]: error || "" }));
  };

  const handleChange = (field: keyof OrganizationFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = "Organization name is required";
    } else {
      const nameError = validateOrganizationName(formData.name).error;
      if (nameError) errors.name = nameError;
    }
    
    if (!formData.email.trim()) {
      errors.email = "Contact email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    
    if (!formData.industry) {
      errors.industry = "Please select an industry";
    }
    
    if (!formData.size) {
      errors.size = "Please select organization size";
    }
    
    if (formData.domain) {
      const domainError = validateDomain(formData.domain).error;
      if (domainError) errors.domain = domainError;
    }
    
    if (formData.phone) {
      const phoneError = validatePhoneNumber(formData.phone).error;
      if (phoneError) errors.phone = phoneError;
    }
    
    if (formData.website) {
      const urlError = validateUrl(formData.website, "Website").error;
      if (urlError) errors.website = urlError;
    }
    
    setFieldErrors(errors);
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setFieldTouched(allTouched);
    
    return Object.keys(errors).length === 0;
  };

  const getFieldError = (field: string) => {
    return fieldTouched[field] && fieldErrors[field];
  };

  const getInputClassName = (field: string) => {
    const hasError = getFieldError(field);
    return `w-full bg-[#12121A] border rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
      hasError ? 'border-red-500' : 'border-white/10'
    }`;
  };

  const resetForm = () => {
    setFormData({
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
    setFieldErrors({});
    setFieldTouched({});
    setEditingRequestId(null);
  };

  const loadRequestForEditing = (request: OrganizationCreationRequest) => {
    setFormData({
      name: request.organizationName,
      description: request.description || "",
      email: request.userEmail,
      domain: request.organizationDomain || "",
      phone: "",
      address: "",
      city: "",
      country: "",
      website: "",
      industry: "",
      size: "",
    });
    setEditingRequestId(request.id);
    setShowForm(true);
    setExpandedRequestId(null);
  };

  const handleCancelRequest = async (requestId: string) => {
    if (confirm("Are you sure you want to cancel this organization creation request?")) {
      const cancelled = cancelOrgCreationRequest(requestId);
      if (cancelled) {
        toast.success("Organization request cancelled");
        loadPendingRequests();
        if (editingRequestId === requestId) {
          resetForm();
          setShowForm(false);
        }
      } else {
        toast.error("Failed to cancel request");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!validateForm()) {
      toast.error("Please fix the errors above");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not found. Please log in again.");
      }
      
      const displayName = `${user.user_metadata?.full_name || ''}`.trim() || user.email?.split('@')[0] || 'User';
      
      if (editingRequestId) {
        // Cancel old request first
        cancelOrgCreationRequest(editingRequestId);
      }
      
      // Create new organization creation request
      const request = createOrgCreationRequest(
        user.id,
        displayName,
        formData.email,
        formData.name,
        formData.domain,
        formData.description
      );
      
      console.log('[OrganizationSetup] Created organization request:', request);
      
      toast.success(`Organization request "${formData.name}" submitted for admin review`);
      
      // Reset form and refresh list
      resetForm();
      setShowForm(false);
      loadPendingRequests();
      
    } catch (error) {
      console.error('[OrganizationSetup] Error:', error);
      setSubmitError(error instanceof Error ? error.message : "Failed to submit organization request");
      toast.error("Failed to submit organization request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"><Clock className="w-3 h-3" /> Pending Review</span>;
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/10 text-green-400 border border-green-500/20"><CheckCircle className="w-3 h-3" /> Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/10 text-red-400 border border-red-500/20"><AlertCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] relative overflow-hidden">
      <div className="absolute top-20 -left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
            <Building2 className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Organization Management</h1>
          <p className="text-[#A0A0B5]">
            Submit requests to create or manage organizations. Each request is reviewed separately.
          </p>
        </div>

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <GlowCard className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Your Pending Requests ({pendingRequests.length})
              </h2>
              {!showForm && (
                <GlowButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Request
                </GlowButton>
              )}
            </div>
            
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="border border-white/10 rounded-xl bg-[#12121A]/50 overflow-hidden"
                >
                  <div 
                    className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedRequestId(expandedRequestId === request.id ? null : request.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <h3 className="text-white font-semibold">{request.organizationName}</h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-[#A0A0B5]">
                          Submitted on {new Date(request.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                loadRequestForEditing(request);
                              }}
                              className="p-2 text-[#6B6B80] hover:text-purple-400 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelRequest(request.id);
                              }}
                              className="p-2 text-[#6B6B80] hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {expandedRequestId === request.id ? (
                          <ChevronUp className="w-5 h-5 text-[#6B6B80]" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-[#6B6B80]" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {expandedRequestId === request.id && (
                    <div className="px-4 pb-4 pt-2 border-t border-white/5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {request.organizationDomain && (
                          <div>
                            <span className="text-[#6B6B80]">Domain:</span>
                            <p className="text-white">{request.organizationDomain}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-[#6B6B80]">Contact Email:</span>
                          <p className="text-white">{request.userEmail}</p>
                        </div>
                        {request.description && (
                          <div className="md:col-span-2">
                            <span className="text-[#6B6B80]">Description:</span>
                            <p className="text-white text-sm mt-1">{request.description}</p>
                          </div>
                        )}
                        {request.status === 'rejected' && request.verificationNote && (
                          <div className="md:col-span-2 p-3 bg-red-500/10 rounded-lg">
                            <span className="text-red-400 text-sm">Rejection reason:</span>
                            <p className="text-red-300 text-sm mt-1">{request.verificationNote}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </GlowCard>
        )}

        {/* Creation Form - Conditionally Shown */}
        {(showForm || pendingRequests.length === 0) && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <GlowCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-400" />
                  {editingRequestId ? "Edit Organization Request" : "Create New Organization Request"}
                </h2>
                {pendingRequests.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                    }}
                    className="text-[#6B6B80] hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Basic Information */}
                <div>
                  <Label className="text-[#A0A0B5] mb-2 block">
                    Organization Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={handleChange("name")}
                    onBlur={() => handleBlur("name")}
                    placeholder="e.g., Acme Corporation"
                    className={getInputClassName("name")}
                  />
                  {getFieldError("name") && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-[#A0A0B5] mb-2 block">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={handleChange("description")}
                    placeholder="Tell us about your organization's mission, vision, and goals..."
                    rows={4}
                    className={getInputClassName("description")}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#A0A0B5] mb-2 block">
                      Industry <span className="text-red-400">*</span>
                    </Label>
                    <select
                      value={formData.industry}
                      onChange={handleChange("industry")}
                      onBlur={() => handleBlur("industry")}
                      className={getInputClassName("industry")}
                    >
                      <option value="">Select industry</option>
                      {INDUSTRY_OPTIONS.map(industry => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                    {getFieldError("industry") && (
                      <p className="text-red-400 text-xs mt-1">{fieldErrors.industry}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-[#A0A0B5] mb-2 block">
                      Organization Size <span className="text-red-400">*</span>
                    </Label>
                    <select
                      value={formData.size}
                      onChange={handleChange("size")}
                      onBlur={() => handleBlur("size")}
                      className={getInputClassName("size")}
                    >
                      <option value="">Select size</option>
                      {SIZE_OPTIONS.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                    {getFieldError("size") && (
                      <p className="text-red-400 text-xs mt-1">{fieldErrors.size}</p>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#A0A0B5] mb-2 block">
                      Contact Email <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={handleChange("email")}
                        onBlur={() => handleBlur("email")}
                        placeholder="contact@organization.com"
                        className={`${getInputClassName("email")} pl-10`}
                      />
                    </div>
                    {getFieldError("email") && (
                      <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-[#A0A0B5] mb-2 block">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange("phone")}
                        onBlur={() => handleBlur("phone")}
                        placeholder="+1 (555) 123-4567"
                        className={`${getInputClassName("phone")} pl-10`}
                      />
                    </div>
                    {getFieldError("phone") && (
                      <p className="text-red-400 text-xs mt-1">{fieldErrors.phone}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#A0A0B5] mb-2 block">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                      <Input
                        type="url"
                        value={formData.website}
                        onChange={handleChange("website")}
                        onBlur={() => handleBlur("website")}
                        placeholder="https://www.example.com"
                        className={`${getInputClassName("website")} pl-10`}
                      />
                    </div>
                    {getFieldError("website") && (
                      <p className="text-red-400 text-xs mt-1">{fieldErrors.website}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-[#A0A0B5] mb-2 block">Domain (for email auto-detection)</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B80]" />
                      <Input
                        type="text"
                        value={formData.domain}
                        onChange={handleChange("domain")}
                        onBlur={() => handleBlur("domain")}
                        placeholder="example.com"
                        className={`${getInputClassName("domain")} pl-10`}
                      />
                    </div>
                    <p className="text-xs text-[#6B6B80] mt-1">
                      Used to automatically detect and add users with @{formData.domain || "yourdomain"} email addresses
                    </p>
                    {getFieldError("domain") && (
                      <p className="text-red-400 text-xs mt-1">{fieldErrors.domain}</p>
                    )}
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <Label className="text-[#A0A0B5] mb-2 block">Street Address</Label>
                  <Input
                    type="text"
                    value={formData.address}
                    onChange={handleChange("address")}
                    placeholder="123 Business St"
                    className={getInputClassName("address")}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#A0A0B5] mb-2 block">City</Label>
                    <Input
                      type="text"
                      value={formData.city}
                      onChange={handleChange("city")}
                      placeholder="San Francisco"
                      className={getInputClassName("city")}
                    />
                  </div>

                  <div>
                    <Label className="text-[#A0A0B5] mb-2 block">Country</Label>
                    <select
                      value={formData.country}
                      onChange={handleChange("country")}
                      className={getInputClassName("country")}
                    >
                      <option value="">Select country</option>
                      {COUNTRY_OPTIONS.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* Submit Status */}
            {submitError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{submitError}</p>
              </div>
            )}

            <div className="flex gap-4">
              <GlowButton
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  if (pendingRequests.length > 0) {
                    setShowForm(false);
                  }
                }}
                className="flex-1"
              >
                Cancel
              </GlowButton>
              <GlowButton
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Submitting..." : editingRequestId ? "Update Request" : "Submit Request"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </GlowButton>
            </div>
          </form>
        )}

        {pendingRequests.length === 0 && !showForm && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-[#6B6B80] mx-auto mb-4" />
            <p className="text-white mb-2">No organization requests yet</p>
            <p className="text-[#A0A0B5] text-sm mb-6">
              Create a request to become an admin of an organization
            </p>
            <GlowButton onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Organization Request
            </GlowButton>
          </div>
        )}

        <p className="text-center text-xs text-[#6B6B80] mt-8">
          Each request is reviewed separately. You can submit multiple requests for different organizations.
        </p>
      </div>
    </div>
  );
}