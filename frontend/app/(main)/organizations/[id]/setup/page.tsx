// frontend/app/(main)/organizations/[id]/setup/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  Users,
  BookOpen,
  CheckCircle,
  Loader2,
  ArrowRight,
  Shield,
  Globe,
  Mail,
  UserPlus,
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useRole } from "@/components/providers/RoleProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { toast } from "sonner";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  optional?: boolean;
}

// Helper to get auth token
const getAuthToken = async () => {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

// Helper to get current user info from backend
const getCurrentUser = async () => {
  const token = await getAuthToken();
  if (!token) return null;
  
  try {
    const response = await fetch('/api/auth-service/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
};

export default function OrganizationSetupPage() {
  const params = useParams();
  const router = useRouter();
  const { roleData, refreshRole } = useRole();
  const orgId = parseInt(params.id as string);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [setupComplete, setSetupComplete] = useState(false);
  const [organization, setOrganization] = useState<{
    id: number;
    name: string;
    description: string | null;
    slug: string | null;
  } | null>(null);

  // Form state
  const [orgSettings, setOrgSettings] = useState({
    description: "",
    slug: "",
  });

  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteRole, setInviteRole] = useState<"teacher" | "sub_admin">("teacher");

  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: "basic",
      title: "Organization Details",
      description: "Set up your organization's public profile",
      completed: false,
    },
    {
      id: "team",
      title: "Invite Team Members",
      description: "Invite teachers and sub-admins to help manage",
      completed: false,
      optional: true,
    },
    {
      id: "complete",
      title: "Complete Setup",
      description: "Finish setup and start using your organization",
      completed: false,
    },
  ]);

  // Check if user is admin and if setup is needed
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        setLoading(true);
        
        // Get current user from backend API
        const user = await getCurrentUser();
        
        if (!user) {
          router.push("/login");
          return;
        }

        // Check if user is admin using backend role endpoint
        const token = await getAuthToken();
        if (!token) {
          router.push("/login");
          return;
        }

        // Get user's role in this organization
        const roleResponse = await fetch(`/api/org-service/orgs/${orgId}/members/${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!roleResponse.ok) {
          toast.error("You don't have access to this organization");
          router.push(`/organizations/${orgId}`);
          return;
        }

        const memberData = await roleResponse.json();
        const isAdmin = memberData.member_role === "admin" || memberData.member_role === "sub_admin";

        if (!isAdmin) {
          toast.error("You don't have permission to set up this organization");
          router.push(`/organizations/${orgId}`);
          return;
        }

        // Get organization setup status
        const setupResponse = await fetch(`/api/org-service/orgs/${orgId}/setup-status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!setupResponse.ok) {
          throw new Error("Failed to fetch setup status");
        }

        const data = await setupResponse.json();

        if (data.is_setup_complete) {
          // Already set up, redirect to organization page
          router.push(`/organizations/${orgId}`);
          return;
        }

        // Fetch organization details
        const orgResponse = await fetch(`/api/org-service/orgs/${orgId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          setOrganization(orgData);
          setOrgSettings({
            description: orgData.description || "",
            slug: orgData.slug || "",
          });
        }

        setSetupComplete(false);
      } catch (error) {
        console.error("Error checking setup status:", error);
        toast.error("Failed to load setup information");
      } finally {
        setLoading(false);
      }
    };

    if (orgId) {
      checkSetupStatus();
    }
  }, [orgId, roleData, router]);

  const handleNextStep = async () => {
    if (currentStep === 0) {
      // Save organization details
      await saveOrganizationDetails();
    } else if (currentStep === steps.length - 1) {
      // Complete setup
      await completeSetup();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveOrganizationDetails = async () => {
    setSaving(true);
    try {
      const token = await getAuthToken();

      if (!token) {
        toast.error("Session expired. Please log in again.");
        router.push("/login");
        return;
      }

      // Update organization via backend API
      const response = await fetch(`/api/org-service/orgs/${orgId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: orgSettings.description || null,
          slug: orgSettings.slug || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update organization");
      }

      toast.success("Organization details saved");
      
      setSteps(prev => prev.map((step, idx) =>
        idx === 0 ? { ...step, completed: true } : step
      ));
      
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error("Error saving organization details:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save organization details");
    } finally {
      setSaving(false);
    }
  };

  const sendInvites = async () => {
    if (!inviteEmails.trim()) {
      // Skip if no emails
      setSteps(prev => prev.map((step, idx) =>
        idx === 1 ? { ...step, completed: true } : step
      ));
      setCurrentStep(currentStep + 1);
      return;
    }

    setSaving(true);
    
    const emails = inviteEmails.split(/[\n,]+/).map(e => e.trim()).filter(e => e && e.includes('@'));

    if (emails.length === 0) {
      toast.error("No valid email addresses found");
      setSaving(false);
      return;
    }

    try {
      const token = await getAuthToken();

      if (!token) {
        toast.error("Session expired. Please log in again.");
        router.push("/login");
        return;
      }

      let successCount = 0;
      let failCount = 0;
      const failedEmails: string[] = [];

      for (const email of emails) {
        try {
          const response = await fetch(`/api/org-service/orgs/${orgId}/invite`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              email,
              role: inviteRole,
              personal_message: `You've been invited to join ${organization?.name} as a ${inviteRole}.`,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            const error = await response.json();
            console.error(`Failed to invite ${email}:`, error);
            failCount++;
            failedEmails.push(email);
          }
        } catch (err) {
          console.error(`Error inviting ${email}:`, err);
          failCount++;
          failedEmails.push(email);
        }
      }

      if (successCount > 0) {
        toast.success(`Invited ${successCount} member${successCount !== 1 ? "s" : ""}`);
      }
      if (failCount > 0) {
        toast.warning(`Failed to invite ${failCount} member${failCount !== 1 ? "s" : ""}: ${failedEmails.join(", ")}`);
      }

      setSteps(prev => prev.map((step, idx) =>
        idx === 1 ? { ...step, completed: true } : step
      ));
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error("Error sending invites:", error);
      toast.error("Failed to send invitations");
    } finally {
      setSaving(false);
    }
  };

  const completeSetup = async () => {
    setSaving(true);
    try {
      const token = await getAuthToken();

      if (!token) {
        toast.error("Session expired. Please log in again.");
        router.push("/login");
        return;
      }

      const response = await fetch(`/api/org-service/orgs/${orgId}/setup-status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_setup_complete: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to complete setup");
      }

      toast.success("Organization setup complete!");
      
      setSteps(prev => prev.map((step, idx) =>
        idx === 2 ? { ...step, completed: true } : step
      ));
      
      setSetupComplete(true);
      
      // Refresh role data to update user's permissions
      await refreshRole();
      
      // Redirect after short delay
      setTimeout(() => {
        router.push(`/organizations/${orgId}`);
      }, 1500);
    } catch (error) {
      console.error("Error completing setup:", error);
      toast.error(error instanceof Error ? error.message : "Failed to complete setup");
    } finally {
      setSaving(false);
    }
  };

  const handleStepAction = async () => {
    if (currentStep === 1) {
      await sendInvites();
    } else {
      await handleNextStep();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (setupComplete) {
    return (
      <div className="max-w-2xl mx-auto">
        <GlowCard className="p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Setup Complete!</h1>
          <p className="text-gray-400 mb-6">
            Your organization is now ready to use.
          </p>
          <GlowButton onClick={() => router.push(`/organizations/${orgId}`)}>
            Go to Organization
            <ArrowRight className="w-4 h-4 ml-2" />
          </GlowButton>
        </GlowCard>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Set up {organization?.name}
        </h1>
        <p className="text-gray-400">
          Complete these steps to start using your organization
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex-1">
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                    ${idx === currentStep
                      ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30 ring-4 ring-purple-500/20"
                      : step.completed
                      ? "bg-green-500 text-white"
                      : "bg-gray-800 text-gray-500"
                  }`}
                >
                  {step.completed ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-0.5 bg-gray-800 mx-2">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-violet-600 transition-all"
                      style={{ width: step.completed ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
              <div className="mt-2">
                <p className="text-sm font-medium text-white">{step.title}</p>
                <p className="text-xs text-gray-500 hidden sm:block">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <GlowCard>
        <div className="p-6">
          {/* Step 0: Organization Details */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="slug">Organization URL Slug</Label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-500 text-sm">/organizations/</span>
                  <Input
                    id="slug"
                    value={orgSettings.slug}
                    onChange={(e) => setOrgSettings({ ...orgSettings, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    placeholder="your-org-name"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Used in URLs to identify your organization
                </p>
              </div>

              <div>
                <Label htmlFor="description">Organization Description</Label>
                <Textarea
                  id="description"
                  value={orgSettings.description}
                  onChange={(e) => setOrgSettings({ ...orgSettings, description: e.target.value })}
                  placeholder="Tell members what your organization is about..."
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-400 font-medium">Public Profile</p>
                    <p className="text-xs text-gray-300 mt-1">
                      Your organization's name and description will be visible to members.
                      The slug determines your organization's URL.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Invite Team Members */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <Label>Invite Team Members (Optional)</Label>
                <p className="text-sm text-gray-400 mt-1">
                  Invite teachers and sub-admins to help manage your organization
                </p>
                <Textarea
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  placeholder="Enter email addresses, one per line or comma-separated:&#10;teacher1@example.com&#10;teacher2@example.com"
                  rows={5}
                  className="mt-3 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Invited users will receive an email with instructions to join.
                </p>
              </div>

              <div>
                <Label>Default Role for Invited Members</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setInviteRole("teacher")}
                    className={`p-4 rounded-xl border transition-all text-left ${
                      inviteRole === "teacher"
                        ? "bg-purple-500/10 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                        : "bg-gray-800/30 border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="font-medium text-white">Teacher</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Can create courses, manage students, and grade assignments
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteRole("sub_admin")}
                    className={`p-4 rounded-xl border transition-all text-left ${
                      inviteRole === "sub_admin"
                        ? "bg-purple-500/10 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                        : "bg-gray-800/30 border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span className="font-medium text-white">Sub-Admin</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Can manage members, approve requests, and invite others
                    </p>
                  </button>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-yellow-400 font-medium">Invitations</p>
                    <p className="text-xs text-gray-300 mt-1">
                      Invited users will receive an email with instructions to join.
                      You can always invite more members later from the organization settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Complete */}
          {currentStep === 2 && (
            <div className="space-y-6 text-center py-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Ready to Launch!</h3>
                <p className="text-gray-400">
                  Your organization is almost ready. Click "Complete Setup" to finish and
                  start managing your organization.
                </p>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-left">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-green-400 font-medium">What's next?</p>
                    <ul className="text-xs text-gray-300 mt-2 space-y-1">
                      <li>• Create courses and learning content</li>
                      <li>• Invite more students and teachers</li>
                      <li>• Track organization analytics and progress</li>
                      <li>• Manage member roles and permissions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-4 mt-8 pt-6 border-t border-gray-800">
            <GlowButton
              variant="ghost"
              onClick={handlePrevStep}
              disabled={currentStep === 0}
            >
              Back
            </GlowButton>
            <GlowButton
              variant="primary"
              onClick={handleStepAction}
              isLoading={saving}
            >
              {currentStep === steps.length - 1 ? "Complete Setup" : "Continue"}
              {currentStep !== steps.length - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
            </GlowButton>
          </div>
        </div>
      </GlowCard>
    </div>
  );
}