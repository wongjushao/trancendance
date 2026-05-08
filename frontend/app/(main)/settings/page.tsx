// frontend/app/(main)/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { 
  Camera, Mail, Briefcase, Calendar as CalendarIcon, Save, X, 
  Globe, User, Lock, Bell, Shield, CreditCard, Loader2,
  CheckCircle, AlertCircle, Eye, EyeOff, ChevronRight, Sparkles,
  Trash2, LogOut, Monitor, Smartphone, Globe2, Crown,
  HelpCircle, MessageCircle, AlertTriangle, Key, Fingerprint,
  Database, Terminal, Server, Activity, Zap, Volume2, VolumeX,
  BellRing, BellOff, Mail as MailIcon, MessageSquare, AtSign, BookOpen, Trophy,
  Plus, Edit2, GraduationCap, Building2, Code, Palette, Database as DatabaseIcon,
  Cloud, Brain, Shield as ShieldIcon, Heart, Music, Camera as CameraIcon,
  Coffee, Gamepad, Film, Mic, Dumbbell, Target, Award as AwardIcon,
  ExternalLink, ThumbsUp, MessageCircle as MessageCircleIcon, Linkedin, Github, Twitter, Instagram, Link,
  ShieldOff, Clock
} from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { clearUserRoleData } from "@/lib/role";
import { useAvatar } from "@/lib/useAvatar";
import SignOutButton from "@/components/SignOutButton";
import {
  validateUsername,
  validateName,
  validateBio,
  validateBirthday,
  validateLanguage,
  validateJobTitle,
  validatePassword,
  validateConfirmPassword,
} from "@/lib/validation";
import { SkillsSelector, UserSkill } from "@/components/settings/SkillsSelector";
import { MFASetupModal } from '@/components/settings/MFASetupModal';
import { MFADisableModal } from '@/components/settings/MFADisableModal';
import { getMFAStatus } from '@/lib/mfa-api';
import { Textarea } from "@/components/ui/textarea";

// Modal Component for confirmation dialogs
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, danger = false }: any) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg max-w-md w-full mx-4 border border-gray-700">
        <div className="p-6">
          <div className={`w-12 h-12 rounded-full ${danger ? 'bg-red-500/20' : 'bg-yellow-500/20'} flex items-center justify-center mx-auto mb-4`}>
            {danger ? <AlertTriangle className="w-6 h-6 text-red-500" /> : <AlertCircle className="w-6 h-6 text-yellow-500" />}
          </div>
          <h3 className="text-lg font-semibold text-white text-center mb-2">{title}</h3>
          <p className="text-sm text-gray-400 text-center mb-6">{message}</p>
          <div className="flex gap-3">
            <GlowButton variant="outline" onClick={onClose} fullWidth>Cancel</GlowButton>
            <GlowButton onClick={onConfirm} fullWidth className={danger ? 'bg-red-600 hover:bg-red-700' : ''}>Confirm</GlowButton>
          </div>
        </div>
      </div>
    </div>
  );
};

// Contact Support Modal
const ContactSupportModal = ({ isOpen, onClose, onSubmit }: any) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!subject || !message) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setSending(true);
    await onSubmit(subject, message);
    setSending(false);
    if (!sending) {
      onClose();
      setSubject("");
      setMessage("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg max-w-md w-full mx-4 border border-gray-700">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-white">Contact Support</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What's the issue?"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-300">Message</Label>
              <Textarea
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 mt-1"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail..."
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <GlowButton variant="outline" onClick={onClose} fullWidth>Cancel</GlowButton>
            <GlowButton onClick={handleSubmit} isLoading={sending} fullWidth>Send Message</GlowButton>
          </div>
        </div>
      </div>
    </div>
  );
};

function detectTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export default function SettingsPage() {
  const router = useRouter();
  const { avatarUrl, refreshAvatar } = useAvatar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [hasSetPassword, setHasSetPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [profileDataLoaded, setProfileDataLoaded] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<{ enabled: boolean; configured: boolean }>({ enabled: false, configured: false });
  const [showMFASetupModal, setShowMFASetupModal] = useState(false);
  const [showMFADisableModal, setShowMFADisableModal] = useState(false);
  const [loadingMFAStatus, setLoadingMFAStatus] = useState(true);
  const [showMFARequestModal, setShowMFARequestModal] = useState(false);
  const [mfaRequestReason, setMfaRequestReason] = useState("");
  const [isSubmittingMFARequest, setIsSubmittingMFARequest] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  
  // Profile form state
  const [formData, setFormData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    job_title: "",
    bio: "",
    language: "en",
    timezone: detectTimezone(),
    birthday: "",
  });

  //MFA
  // Add fetch function
  const fetchMFAStatus = async () => {
    setLoadingMFAStatus(true);
    try {
      const status = await getMFAStatus();
      setMfaStatus({
        enabled: status.enabled_mfa,
        configured: status.totp_configured,
      });
    } catch (err) {
      console.error('Failed to fetch MFA status:', err);
    } finally {
      setLoadingMFAStatus(false);
    }
  };

  // Add handler for successful enable/disable
  const handleMFAEnabled = () => {
    fetchMFAStatus();
  };

  const handleMFADisabled = () => {
    fetchMFAStatus();
  };

  //Bio
  const [bioCharCount, setBioCharCount] = useState(0);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Danger zone modals
  const [showSignOutDevices, setShowSignOutDevices] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showContactSupport, setShowContactSupport] = useState(false);
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ========== NEW STATE VARIABLES FOR ADDED SECTIONS ==========
  // Professional Info
  const [isEditingProfessional, setIsEditingProfessional] = useState(false);
  const [professionalInfo, setProfessionalInfo] = useState({
    jobTitle: "",
    professionalSummary: "",
    department: "",
    yearsOfExperience: "",
  });

  // Education
  const [isReordering, setIsReordering] = useState(false);
  interface Education {
    id?: string; // For updates/deletes
    profile_id?: string;
    institution_name: string;
    degree: string;
    field_of_study: string;
    start_year: number | null;
    end_year: number | null;
    is_current: boolean;
    description: string;
    order_index: number;
  }

  // Organization deletion state
  interface Organization {
    id: number;
    name: string;
    memberCount?: number;
  }

  interface DeleteCooldown {
    organizationId: number;
    requestedAt: string;
    scheduledDeletionDate: string;
    daysRemaining: number;
  }

  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
  const [selectedOrgForDeletion, setSelectedOrgForDeletion] = useState<Organization | null>(null);
  const [deleteCooldown, setDeleteCooldown] = useState<DeleteCooldown | null>(null);
  const [deletionStep, setDeletionStep] = useState<'select' | 'confirm' | 'cooldown' | 'recovery-request'>('select');
  const [recoveryReason, setRecoveryReason] = useState('');

  const [educationList, setEducationList] = useState<Education[]>([]);
  const [isAddingEducation, setIsAddingEducation] = useState(false);
  const [editingEducation, setEditingEducation] = useState<Education & { index: number } | null>(null);
  const [educationForm, setEducationForm] = useState<Omit<Education, 'order_index' | 'id' | 'profile_id'>>({
    institution_name: "",
    degree: "",
    field_of_study: "",
    start_year: null,
    end_year: null,
    is_current: false,
    description: "",
  });

  // Skills
  const [skills, setSkills] = useState<UserSkill[]>([]);

  // Social Links
  const [socialLinks, setSocialLinks] = useState({
    linkedin: "",
    github: "",
    twitter: "",
    website: "",
  });

  //Saving
  const [isSaving, setIsSaving] = useState(false);

  // ========== END NEW STATE VARIABLES ==========
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchProfile();
        await checkAuthProvider();
        await fetchMFAStatus();
        await fetchNotificationPrefs();
        await loadUserOrganizations();
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const searchParams = useSearchParams();
  const [pendingScrollTarget, setPendingScrollTarget] = useState<string | null>(null);

  const performScroll = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      requestAnimationFrame(() => {
        const elementRect = element.getBoundingClientRect();
        const absoluteElementTop = elementRect.top + window.pageYOffset;
        const offset = 100; // Adjust based on your navbar height
        
        window.scrollTo({
          top: absoluteElementTop - offset,
          behavior: 'smooth'
        });
        
        setPendingScrollTarget(null);
      });
    }
  };

  // Load user's organizations (where they are admin)
  const loadUserOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      // Mock data - replace with actual API call
      const mockOrganizations: Organization[] = [
        { id: 1, name: "Tech University", memberCount: 2847 },
        { id: 2, name: "Design Academy", memberCount: 543 },
      ];
      
      const adminOrgs = mockOrganizations;
      setUserOrganizations(adminOrgs);
      checkPendingDeletions();
    } finally {
      setLoadingOrgs(false);
    }
  };

  // Check for pending deletions
  const checkPendingDeletions = () => {
    const savedDeletions = localStorage.getItem('pending_organization_deletions');
    if (savedDeletions) {
      const deletions = JSON.parse(savedDeletions);
      const now = new Date();
      
      // Find if any pending deletion exists for user's orgs
      for (const org of userOrganizations) {
        const pendingDeletion = deletions.find((d: any) => d.organizationId === org.id);
        if (pendingDeletion) {
          const scheduledDate = new Date(pendingDeletion.scheduledDeletionDate);
          const daysRemaining = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysRemaining > 0) {
            setSelectedOrgForDeletion(org);
            setDeleteCooldown({
              organizationId: org.id,
              requestedAt: pendingDeletion.requestedAt,
              scheduledDeletionDate: pendingDeletion.scheduledDeletionDate,
              daysRemaining: daysRemaining
            });
            setDeletionStep('cooldown');
            break;
          } else if (daysRemaining <= 0) {
            // Deletion should have happened, remove from localStorage
            const updatedDeletions = deletions.filter((d: any) => d.organizationId !== org.id);
            localStorage.setItem('pending_organization_deletions', JSON.stringify(updatedDeletions));
          }
        }
      }
    }
  };

  // Start organization deletion (30-day cooldown)
  const startOrganizationDeletion = () => {
    if (!selectedOrgForDeletion) return;
    
    const now = new Date();
    const scheduledDate = new Date();
    scheduledDate.setDate(now.getDate() + 30);
    
    const cooldownData = {
      organizationId: selectedOrgForDeletion.id,
      requestedAt: now.toISOString(),
      scheduledDeletionDate: scheduledDate.toISOString(),
      daysRemaining: 30
    };
    
    // Save to localStorage
    const existingDeletions = localStorage.getItem('pending_organization_deletions');
    let deletions = existingDeletions ? JSON.parse(existingDeletions) : [];
    
    // Remove any existing deletion for this org
    deletions = deletions.filter((d: any) => d.organizationId !== selectedOrgForDeletion.id);
    deletions.push(cooldownData);
    
    localStorage.setItem('pending_organization_deletions', JSON.stringify(deletions));
    
    setDeleteCooldown({
      ...cooldownData,
      daysRemaining: 30
    });
    setDeletionStep('cooldown');
    
    toast.success(`Deletion scheduled for ${selectedOrgForDeletion.name}. You have 30 days to cancel.`);
    
    // In production, you would also send this to backend
    // await fetch(`/api/org-service/organizations/${selectedOrgForDeletion.id}/schedule-deletion`, {
    //   method: 'POST',
    //   body: JSON.stringify({ scheduledDate: scheduledDate.toISOString() })
    // });
  };

  // Cancel organization deletion
  const cancelOrganizationDeletion = () => {
    if (!selectedOrgForDeletion || !deleteCooldown) return;
    
    if (confirm(`Are you sure you want to cancel the deletion of ${selectedOrgForDeletion.name}?`)) {
      // Remove from localStorage
      const existingDeletions = localStorage.getItem('pending_organization_deletions');
      if (existingDeletions) {
        let deletions = JSON.parse(existingDeletions);
        deletions = deletions.filter((d: any) => d.organizationId !== selectedOrgForDeletion.id);
        localStorage.setItem('pending_organization_deletions', JSON.stringify(deletions));
      }
      
      setDeleteCooldown(null);
      setSelectedOrgForDeletion(null);
      setDeletionStep('select');
      
      toast.success(`Deletion of ${selectedOrgForDeletion.name} has been cancelled.`);
      
      // In production, notify backend
      // await fetch(`/api/org-service/organizations/${selectedOrgForDeletion.id}/cancel-deletion`, {
      //   method: 'POST'
      // });
    }
  };

  // Request recovery from system admin
  const requestRecoveryFromAdmin = async () => {
    if (!selectedOrgForDeletion || !recoveryReason.trim()) {
      toast.error("Please provide a reason for recovery request");
      return;
    }
    
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      // Send recovery request to backend
      const response = await fetch('/api/auth-service/contact-support', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: `Organization Recovery Request: ${selectedOrgForDeletion.name}`,
          message: `Organization ID: ${selectedOrgForDeletion.id}\n\nReason for recovery:\n${recoveryReason}\n\nRequesting cancellation of scheduled deletion.`,
          type: 'org_recovery'
        }),
      });
      
      if (response.ok) {
        toast.success("Recovery request submitted. System admin will review and contact you.");
        setDeletionStep('cooldown');
        setRecoveryReason("");
      } else {
        throw new Error("Failed to submit request");
      }
    } catch (error) {
      console.error("Error submitting recovery request:", error);
      toast.error("Failed to submit recovery request. Please try again.");
    }
  };

  // First effect: Read URL parameter and set active tab and pending scroll target
  useEffect(() => {
    const tab = searchParams.get('tab');
    
    if (!tab) return;
    
    if (tab === 'skills') {
      setActiveTab('profile');
      setPendingScrollTarget('skills-section');
    } 
    else if (tab === 'education') {
      setActiveTab('profile');
      setPendingScrollTarget('education-section');
    }
    else if (tab === 'professional') {
      setActiveTab('profile');
      setPendingScrollTarget('professional-section');
    }
    else if (tab === 'social-links') {
      setActiveTab('profile');
      setPendingScrollTarget('social-links-section');
    }
    else if (tab === 'notifications') {
      setActiveTab('notifications');
      setPendingScrollTarget(null);
    }
    else if (tab === 'security') {
      setActiveTab('security');
      setPendingScrollTarget(null);
    }
    else if (tab === 'danger') {
      setActiveTab('danger');
      setPendingScrollTarget(null);
    }
  }, [searchParams]);

  // Second effect: Scroll when activeTab becomes 'profile' and we have a pending target
  useEffect(() => {
    if (activeTab === 'profile' && pendingScrollTarget && profileDataLoaded) {
      // Small delay to ensure DOM is fully rendered after data loads
      const timer = setTimeout(() => {
        performScroll(pendingScrollTarget);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [activeTab, pendingScrollTarget, profileDataLoaded]);

  const [notificationPrefs, setNotificationPrefs] = useState<{
    email_enabled: boolean;
    push_enabled: boolean;
    assignment_reminders: boolean;
    course_updates: boolean;
    message_notifications: boolean;
    marketing_emails: boolean;
  } | null>(null); // Start as null

  const [loadingPrefs, setLoadingPrefs] = useState(true);

  // Helper to get auth token
  const getAuthToken = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  // Fetch notification preferences from backend
  const fetchNotificationPrefs = async () => {
    setLoadingPrefs(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error('No auth token available');
        setLoadingPrefs(false);
        return;
      }
      
      console.log('Fetching notification prefs...');
      
      const response = await fetch('/api/notification-service/notification', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Fetch response status:', response.status);
      
      if (response.status === 404) {
        console.log('No preferences found, creating defaults');
        const defaultPrefs = {
          email_enabled: true,
          push_enabled: true,
          assignment_reminders: true,
          course_updates: true,
          message_notifications: true,
          marketing_emails: false,
        };
        setNotificationPrefs(defaultPrefs);
        await createDefaultNotificationPrefs(defaultPrefs);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Raw response from server:', data);
      
      // FIX: Extract the nested preferences object
      if (data.preferences) {
        console.log('Setting notification prefs from preferences object:', data.preferences);
        setNotificationPrefs(data.preferences);
      } else {
        // Fallback for backward compatibility
        console.log('Setting notification prefs from root object:', data);
        setNotificationPrefs(data);
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      setNotificationPrefs({
        email_enabled: true,
        push_enabled: true,
        assignment_reminders: true,
        course_updates: true,
        message_notifications: true,
        marketing_emails: false,
      });
    } finally {
      setLoadingPrefs(false);
    }
  };

  // Create default notification preferences
  const createDefaultNotificationPrefs = async (defaultPrefs: {
    email_enabled: boolean;
    push_enabled: boolean;
    assignment_reminders: boolean;
    course_updates: boolean;
    message_notifications: boolean;
    marketing_emails: boolean;
  }) => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      
      // Send each preference as a separate query parameter
      const params = new URLSearchParams();
      params.append('email_enabled', String(defaultPrefs.email_enabled));
      params.append('push_enabled', String(defaultPrefs.push_enabled));
      params.append('assignment_reminders', String(defaultPrefs.assignment_reminders));
      params.append('course_updates', String(defaultPrefs.course_updates));
      params.append('message_notifications', String(defaultPrefs.message_notifications));
      params.append('marketing_emails', String(defaultPrefs.marketing_emails));
      
      const response = await fetch(`/api/notification-service/notification?${params.toString()}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Create default response:', data);
        // FIX: Extract nested preferences
        if (data.preferences) {
          setNotificationPrefs(data.preferences);
        }
      }
    } catch (error) {
      console.error('Error creating default preferences:', error);
    }
  };

  // Save notification preferences to backend
  const saveNotificationPrefs = async (key: keyof Exclude<typeof notificationPrefs, null>, value: boolean) => {
    if (!notificationPrefs) return;
    
    console.log(`saveNotificationPrefs called: key=${key}, value=${value}`);
    
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error('Not authenticated - no token');
        toast.error('Not authenticated');
        return;
      }
      
      // Build URL with query parameter
      const params = new URLSearchParams();
      params.append(key, String(value));
      
      const url = `/api/notification-service/notification?${params.toString()}`;
      console.log('PATCH URL:', url);
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('PATCH response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', response.status, errorText);
        throw new Error(errorText || 'Failed to update notification preferences');
      }
      
      const data = await response.json();
      console.log('PATCH response data:', data);
      
      // FIX: Extract nested preferences from the response
      if (data.preferences) {
        console.log('Setting prefs from preferences object:', data.preferences);
        setNotificationPrefs(data.preferences);
      } else if (data.updated) {
        // Handle the backend's response format with 'updated' field
        console.log('Update successful, refetching to get latest state...');
        await fetchNotificationPrefs();
      } else {
        // Fallback: assume update was successful and update optimistically
        setNotificationPrefs({
          ...notificationPrefs,
          [key]: value,
        });
      }
      
      toast.success(`${key.replace(/_/g, ' ')} updated`);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast.error('Failed to update notification preferences');
      await fetchNotificationPrefs();
    }
  };

  // Handle toggle changes - SIMPLIFIED
  const handleNotificationChange = (key: keyof Exclude<typeof notificationPrefs, null>) => {
    if (!notificationPrefs) return;
    
    const newValue = !notificationPrefs[key];
    console.log(`🔄 Toggle: ${key} from ${notificationPrefs[key]} to ${newValue}`);
    
    // Update UI optimistically
    setNotificationPrefs({
      ...notificationPrefs,
      [key]: newValue,
    });
    
    // Save to backend
    saveNotificationPrefs(key, newValue);
  };

  const checkAuthProvider = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user is from Google
        const isGoogle = user.app_metadata?.provider === 'google' ||
                        user.identities?.some(identity => identity.provider === 'google');
        setIsGoogleUser(!!isGoogle);
        
        // Check if user has password set
        const response = await fetch('/api/auth-service/password-status', {
          headers: {
            'Authorization': `Bearer ${await getAuthToken()}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setHasSetPassword(data.has_password);
        }
      }
    } catch (error) {
      console.error('Error checking auth provider:', error);
    }
  };


  // ✅ CORRECTED: Fetch profile from backend API
  const fetchProfile = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/auth-service/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      
      setFormData({
        username: data.username || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        bio: data.bio || '',
        language: data.language || 'EN',
        timezone: data.timezone || detectTimezone(),
        birthday: data.birthday || '',
        job_title: data.job_title || '',
      });

      setBioCharCount(data.bio?.length || 0);
      
      setProfessionalInfo({
        jobTitle: data.job_title || '', 
        department: data.department || '',
        yearsOfExperience: data.years_of_experience || 0,
        professionalSummary: data.professional_summary || '',
      });
      
      setSocialLinks(data.social_links || {});
      
      // Load education and skills from the same response
      setEducationList(data.educations || []);
      setSkills((data.skills || []).map((s: any) => ({ 
        name: s.name, 
        level: s.level || 1, 
        years: s.years || 0 
      })));
      setProfileDataLoaded(true);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
      setProfileDataLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (JPEG, PNG, GIF, or WEBP)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("You must be logged in to upload an avatar");
        return;
      }

      // Use the backend API endpoint (same as onboarding)
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await fetch('/api/auth-service/upload-avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload avatar');
      }

      const data = await response.json();
      const newAvatarUrl = data.avatar_url;
      
      // Store in localStorage for quick access
      if (newAvatarUrl) {
        localStorage.setItem('avatar_url', newAvatarUrl);
      } else {
        localStorage.removeItem('avatar_url');
      }
      
      // Refresh avatar in the useAvatar hook (this will update the avatarUrl state)
      await refreshAvatar();
      
      // Dispatch events for other components to update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('avatar-updated', { 
          detail: { avatarUrl: newAvatarUrl } 
        }));
        window.dispatchEvent(new CustomEvent('profile-updated'));
      }

      toast.success("Avatar updated successfully");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error(error.message || "Failed to upload avatar");
    }
  };


  // Social Links handlers
  const saveSocialLinks = async () => {
    toast.success('Social links updated locally');
    toast.info('Click "Save All Changes" to persist your changes');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (formData.username && !validateUsername(formData.username).isValid) {
      newErrors.username = validateUsername(formData.username).error;
    }
    if (formData.first_name && !validateName(formData.first_name, "First name").isValid) {
      newErrors.first_name = validateName(formData.first_name, "First name").error;
    }
    if (formData.last_name && !validateName(formData.last_name, "Last name").isValid) {
      newErrors.last_name = validateName(formData.last_name, "Last name").error;
    }
    if (formData.bio && !validateBio(formData.bio).isValid) {
      newErrors.bio = validateBio(formData.bio).error;
    }
    if (formData.birthday && !validateBirthday(formData.birthday).isValid) {
      newErrors.birthday = validateBirthday(formData.birthday).error;
    }
    if (formData.language && !validateLanguage(formData.language).isValid) {
      newErrors.language = validateLanguage(formData.language).error;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ CORRECTED: Update profile via backend API
  const handleSaveProfile = async () => {
    // Validate form
    if (!validateForm()) return;

    setIsSaving(true);
    
    try {
      const token = await getAuthToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const profileData = {
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        bio: formData.bio,
        language: formData.language,
        timezone: formData.timezone,
        birthday: formData.birthday,
        job_title: formData.job_title,
        department: professionalInfo.department,
        years_of_experience: professionalInfo.yearsOfExperience,
        professional_summary: professionalInfo.professionalSummary,
        social_links: socialLinks,
        skills: skills,
        educations: educationList,
      };

      const response = await fetch('/api/auth-service/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to update profile');
      }

      toast.success('Profile updated successfully');
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!isGoogleUser && !currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    
    if (isGoogleUser && hasSetPassword && !currentPassword) {
      toast.error("Please enter your current password");
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      toast.error(passwordValidation.error);
      return;
    }

    const confirmValidation = validateConfirmPassword(newPassword, confirmPassword);
    if (!confirmValidation.isValid) {
      toast.error(confirmValidation.error);
      return;
    }

    setChangingPassword(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      if (isGoogleUser && hasSetPassword && currentPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email!,
          password: currentPassword,
        });
        
        if (signInError) {
          toast.error("Current password is incorrect");
          return;
        }
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      if (!hasSetPassword && isGoogleUser) {
        toast.success("Password has been set successfully! You can now sign in with email and password.");
        setHasSetPassword(true);
        
        await fetch('/api/auth-service/set-password-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ has_password: true }),
        });
      } else {
        toast.success("Password changed successfully!");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOutAllDevices = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      
      toast.success("Signed out from all devices");
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error("Error signing out from all devices:", error);
      toast.error("Failed to sign out from all devices");
    } finally {
      setShowSignOutDevices(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You need to be logged in");
        return;
      }

      const response = await fetch('/api/auth-service/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const raw = await response.text();
        let message = "Failed to delete account";
        try {
          const parsed = JSON.parse(raw);
          message = typeof parsed?.error === "string" ? parsed.error : message;
        } catch {
          if (raw && !raw.trim().startsWith("<")) {
            message = raw.slice(0, 200);
          } else {
            message = `Request failed (${response.status})`;
          }
        }
        throw new Error(message);
      }

      clearUserRoleData();
      await supabase.auth.signOut();

      toast.success("Account deleted successfully");
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1500);
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(error.message || "Failed to delete account");
    } finally {
      setShowDeleteAccount(false);
    }
  };

  const handleContactSupport = async (subject: string, message: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You need to be logged in");
        return;
      }

      const response = await fetch('/api/auth-service/contact-support', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject, message }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send message");
      }

      toast.success("Support ticket created! We'll get back to you within 24 hours.");
    } catch (error: any) {
      console.error("Error sending support message:", error);
      toast.error(error.message || "Failed to send message");
      throw error;
    }
  };

  // ========== NEW HANDLER FUNCTIONS FOR ADDED SECTIONS ==========
  const saveProfessionalInfo = async () => {
    setIsEditingProfessional(false);
    toast.success('Professional info updated locally');
    toast.info('Click "Save All Changes" to persist your changes');
  };

  const saveEducation = async () => {
    if (!educationForm.institution_name) {
      toast.error('Please enter institution name');
      return;
    }

    let updatedList = [...educationList];
    
    if (editingEducation) {
      // Update existing
      const index = editingEducation.index;
      updatedList[index] = {
        ...editingEducation,
        ...educationForm,
        id: editingEducation.id,
      };
    } else {
      // Add new
      const newEducation: Education = {
        ...educationForm,
        order_index: educationList.length,
      };
      updatedList.push(newEducation);
    }
    
    setEducationList(updatedList);
    setIsAddingEducation(false);
    setEditingEducation(null);
    resetEducationForm();
    
    // Note: Education is saved when user clicks "Save All Changes"
    toast.success(editingEducation ? 'Education updated locally' : 'Education added locally');
    toast.info('Click "Save All Changes" to persist your changes');
  };

  // Remove education
  const removeEducation = async (id: string) => {
    const updatedList = educationList.filter(edu => edu.id !== id);
    setEducationList(updatedList);
    toast.success('Education removed locally');
    toast.info('Click "Save All Changes" to persist your changes');
  };

  // Reorder education (drag and drop or up/down buttons)
  const reorderEducation = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === educationList.length - 1)
    ) return;

    const newList = [...educationList];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    
    // Update order_index for all items
    const reorderedList = newList.map((item, idx) => ({ ...item, order_index: idx }));
    setEducationList(reorderedList);
    
    toast.success("Order updated locally");
    toast.info('Click "Save All Changes" to persist your changes');
  };

  // Reset form
  const resetEducationForm = () => {
    setEducationForm({
      institution_name: "",
      degree: "",
      field_of_study: "",
      start_year: null,
      end_year: null,
      is_current: false,
      description: "",
    });
  };

  // Start editing
  const startEditingEducation = (edu: Education, index: number) => {
    setEducationForm({
      institution_name: edu.institution_name,
      degree: edu.degree,
      field_of_study: edu.field_of_study || "",
      start_year: edu.start_year,
      end_year: edu.end_year,
      is_current: edu.is_current,
      description: edu.description || "",
    });
    setEditingEducation({ ...edu, index });
    setIsAddingEducation(true);
  };

  // ========== END NEW HANDLER FUNCTIONS ==========

  const getFieldError = (field: string) => errors[field];
  const getInputClassName = (field: string) => {
    const hasError = getFieldError(field) && touched[field];
    return `w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
      hasError ? 'border-red-500' : 'border-gray-700'
    }`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const getPasswordStrength = () => {
    if (!newPassword) return { strength: 0, label: "", color: "" };
    if (newPassword.length < 6) return { strength: 1, label: "Weak", color: "text-red-400" };
    if (newPassword.length < 8) return { strength: 2, label: "Fair", color: "text-yellow-400" };
    if (/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) && /[0-9]/.test(newPassword)) {
      return { strength: 4, label: "Strong", color: "text-green-400" };
    }
    return { strength: 3, label: "Good", color: "text-blue-400" };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account preferences and security</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="profile" className="space-y-6">
        <TabsList className="bg-gray-800/50 border border-gray-700 w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="w-4 h-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-2">
            <AlertTriangle className="w-4 h-4" /> Danger Zone
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab - WITH ADDED SECTIONS */}
        <TabsContent value="profile" className="space-y-6">
          {/* Profile Information Section - ORIGINAL, UNCHANGED */}
          <GlowCard>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Profile Information</h2>
              
              {/* Profile Picture Section */}
              <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-800">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-white">
                        {formData.first_name?.[0] || formData.username?.[0] || "U"}
                      </span>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-1.5 bg-purple-600 rounded-full cursor-pointer hover:bg-purple-700 transition-colors">
                    <Camera className="w-3 h-3 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                </div>
                <div>
                  <p className="text-white font-medium">Profile Picture</p>
                  <p className="text-sm text-gray-400 mt-1">JPG, GIF or PNG. Max size 5MB.</p>
                </div>
              </div>

              {/* Personal Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">First Name</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="mt-1"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Last Name</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="mt-1"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Username</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="mt-1"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Bio</Label>
                  <Textarea
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 mt-1"
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => {
                      const newBio = e.target.value;
                      if (newBio.length <= 500) {
                        setFormData({ ...formData, bio: newBio });
                        setBioCharCount(newBio.length);
                      } else {
                        toast.error("Bio cannot exceed 500 characters");
                      }
                    }}
                    placeholder="Tell us about yourself..."
                  />
                  <div className="flex justify-end mt-1">
                    <span className={`text-xs ${bioCharCount > 450 ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {bioCharCount}/500 characters
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Birthday</Label>
                    <Input
                      type="date"
                      value={formData.birthday}
                      onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Language</Label>
                    <select
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 mt-1"
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="zh">Chinese</option>
                      <option value="ja">Japanese</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* ========== NEW: Social Links Section ========== */}
          <div id="social-links-section">
            <GlowCard>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Link className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Social Links</h3>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Linkedin className="w-5 h-5 text-blue-400" />
                    <Input
                      value={socialLinks.linkedin}
                      onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                      placeholder="LinkedIn URL (e.g., https://linkedin.com/in/username)"
                      className="flex-1 bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Github className="w-5 h-5 text-gray-400" />
                    <Input
                      value={socialLinks.github}
                      onChange={(e) => setSocialLinks({ ...socialLinks, github: e.target.value })}
                      placeholder="GitHub URL (e.g., https://github.com/username)"
                      className="flex-1 bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Twitter className="w-5 h-5 text-blue-400" />
                    <Input
                      value={socialLinks.twitter}
                      onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                      placeholder="Twitter/X URL"
                      className="flex-1 bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-green-400" />
                    <Input
                      value={socialLinks.website}
                      onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
                      placeholder="Personal Website or Portfolio"
                      className="flex-1 bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">Your social links will be displayed on your public profile</p>
              </div>
            </GlowCard>
          </div>

          {/* Professional Info Section - ORIGINAL, UNCHANGED */}
          <div id="professional-section">
            <GlowCard>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Professional Info</h3>
                  </div>
                  <GlowButton 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditingProfessional(!isEditingProfessional)}
                  >
                    {isEditingProfessional ? <X className="w-4 h-4 mr-1" /> : <Edit2 className="w-4 h-4 mr-1" />}
                    {isEditingProfessional ? "Cancel" : "Edit"}
                  </GlowButton>
                </div>
                
                {isEditingProfessional ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-300 mb-1 block">Job Title</Label>
                      <Input
                        value={professionalInfo.jobTitle}
                        onChange={(e) => setProfessionalInfo({ ...professionalInfo, jobTitle: e.target.value })}
                        placeholder="e.g., Senior Software Engineer"
                        className="bg-gray-800 border-gray-700"
                      />
                    </div>

                    <div>
                      <Label className="text-sm text-gray-300 mb-1 block">Professional Summary</Label>
                      <Textarea
                        value={professionalInfo.professionalSummary}
                        onChange={(e) => setProfessionalInfo({ ...professionalInfo, professionalSummary: e.target.value })}
                        placeholder="e.g., Experienced software engineer with 8+ years of expertise in full-stack development, leading cross-functional teams, and delivering scalable solutions..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={4}
                      />
                    </div>

                    <div>
                      <Label className="text-sm text-gray-300 mb-1 block">Department</Label>
                      <Input
                        value={professionalInfo.department}
                        onChange={(e) => setProfessionalInfo({ ...professionalInfo, department: e.target.value })}
                        placeholder="e.g., Engineering, Product, Design"
                        className="bg-gray-800 border-gray-700"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-300 mb-1 block">Years of Experience</Label>
                      <Input
                        type="number"
                        value={professionalInfo.yearsOfExperience}
                        onChange={(e) => setProfessionalInfo({ ...professionalInfo, yearsOfExperience: e.target.value })}
                        placeholder="e.g., 5"
                        className="bg-gray-800 border-gray-700"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <GlowButton 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsEditingProfessional(false)}
                      >
                        Cancel
                      </GlowButton>
                      <GlowButton 
                        size="sm"
                        onClick={() => {
                          saveProfessionalInfo();
                          setIsEditingProfessional(false);
                        }}
                      >
                        Save
                      </GlowButton>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-800">
                      <span className="text-gray-400">Job Title</span>
                      <span className="text-white">{professionalInfo.jobTitle || "Not specified"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-800">
                      <span className="text-gray-400">Professional Summary</span>
                      <span className="text-white whitespace-pre-wrap">{professionalInfo.professionalSummary || "Not specified"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-800">
                      <span className="text-gray-400">Department</span>
                      <span className="text-white">{professionalInfo.department || "Not specified"}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-400">Experience</span>
                      <span className="text-white">{professionalInfo.yearsOfExperience ? `${professionalInfo.yearsOfExperience} years` : "Not specified"}</span>
                    </div>
                  </div>
                )}
              </div>
            </GlowCard>
          </div>

          {/* Education Section - ORIGINAL, UNCHANGED */}
          <div id="education-section">
            <GlowCard>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Education</h3>
                  </div>
                  <GlowButton 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsAddingEducation(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </GlowButton>
                </div>
                
                <div className="space-y-3">
                  {educationList.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">No education added yet</p>
                  ) : (
                    educationList.map((edu, index) => (
                      <div key={edu.id || index} className="p-3 bg-gray-800/30 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-white font-medium">{edu.degree}{edu.field_of_study && ` in ${edu.field_of_study}`}</p>
                            <p className="text-sm text-gray-400">{edu.institution_name}</p>
                            <p className="text-xs text-gray-500">
                              {edu.start_year && edu.start_year}
                              {edu.end_year && !edu.is_current && ` - ${edu.end_year}`}
                              {edu.is_current && " - Present"}
                            </p>
                            {edu.description && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{edu.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {/* Add Reorder Buttons */}
                            <div className="flex flex-col gap-1 mr-2">
                              {index > 0 && (
                                <button
                                  onClick={() => reorderEducation(index, 'up')}
                                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                                  title="Move up"
                                >
                                  ↑
                                </button>
                              )}
                              {index < educationList.length - 1 && (
                                <button
                                  onClick={() => reorderEducation(index, 'down')}
                                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                                  title="Move down"
                                >
                                  ↓
                                </button>
                              )}
                            </div>
                            {/* Edit and Delete buttons */}
                            <button
                              onClick={() => startEditingEducation(edu, index)}
                              className="p-1 hover:bg-gray-700 rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4 text-gray-400" />
                            </button>
                            <button
                              onClick={() => removeEducation(edu.id!)}
                              className="p-1 hover:bg-gray-700 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add/Edit Education Modal - ORIGINAL, UNCHANGED */}
                {(isAddingEducation || editingEducation !== null) && (
                  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 overflow-y-auto">
                    <div className="bg-gray-900 rounded-lg max-w-2xl w-full mx-4 border border-gray-700 p-6 max-h-[90vh] overflow-y-auto">
                      <h3 className="text-xl font-semibold text-white mb-4">
                        {editingEducation ? "Edit Education" : "Add Education"}
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-gray-300 mb-1 block">Institution Name *</Label>
                          <Input
                            value={educationForm.institution_name}
                            onChange={(e) => setEducationForm({ ...educationForm, institution_name: e.target.value })}
                            placeholder="e.g., Stanford University"
                            className="bg-gray-800 border-gray-700"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-300 mb-1 block">Degree *</Label>
                            <Input
                              value={educationForm.degree}
                              onChange={(e) => setEducationForm({ ...educationForm, degree: e.target.value })}
                              placeholder="e.g., Bachelor of Science"
                              className="bg-gray-800 border-gray-700"
                            />
                          </div>
                          <div>
                            <Label className="text-gray-300 mb-1 block">Field of Study</Label>
                            <Input
                              value={educationForm.field_of_study}
                              onChange={(e) => setEducationForm({ ...educationForm, field_of_study: e.target.value })}
                              placeholder="e.g., Computer Science"
                              className="bg-gray-800 border-gray-700"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-300 mb-1 block">Start Year</Label>
                            <Input
                              type="number"
                              value={educationForm.start_year || ""}
                              onChange={(e) => setEducationForm({ ...educationForm, start_year: e.target.value ? parseInt(e.target.value) : null })}
                              placeholder="e.g., 2020"
                              className="bg-gray-800 border-gray-700"
                            />
                          </div>
                          <div>
                            <Label className="text-gray-300 mb-1 block">End Year</Label>
                            <Input
                              type="number"
                              value={educationForm.end_year || ""}
                              onChange={(e) => setEducationForm({ ...educationForm, end_year: e.target.value ? parseInt(e.target.value) : null })}
                              placeholder="e.g., 2024"
                              disabled={educationForm.is_current}
                              className="bg-gray-800 border-gray-700"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={educationForm.is_current}
                            onCheckedChange={(checked) => {
                              setEducationForm({ 
                                ...educationForm, 
                                is_current: checked,
                                end_year: checked ? null : educationForm.end_year
                              });
                            }}
                          />
                          <Label className="text-gray-300">I currently study here</Label>
                        </div>

                        <div>
                          <Label className="text-gray-300 mb-1 block">Description</Label>
                          <Textarea
                            value={educationForm.description}
                            onChange={(e) => setEducationForm({ ...educationForm, description: e.target.value })}
                            placeholder="Describe your studies, achievements, relevant coursework..."
                            rows={3}
                            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 mt-6">
                        <GlowButton 
                          variant="outline" 
                          onClick={() => {
                            setIsAddingEducation(false);
                            setEditingEducation(null);
                            resetEducationForm();
                          }}
                          fullWidth
                        >
                          Cancel
                        </GlowButton>
                        <GlowButton 
                          onClick={saveEducation}
                          fullWidth
                        >
                          {editingEducation ? "Update" : "Add"}
                        </GlowButton>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </GlowCard>
          </div>

          {/* Top Skills Section - ORIGINAL, UNCHANGED */}
          <div id="skills-section">
            <GlowCard>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Code className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Skills</h3>
                </div>
                <SkillsSelector 
                  value={skills}
                  onChange={setSkills}
                />
              </div>
            </GlowCard>
          </div>

          {/* Save All Changes Button - AT THE BOTTOM */}
          <div className="flex justify-end">
            <GlowButton onClick={handleSaveProfile} isLoading={saving}>
              <Save className="w-4 h-4 mr-2" />
              Save All Changes
            </GlowButton>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          {loadingPrefs ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : notificationPrefs ? (
            <GlowCard>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="w-5 h-5 text-purple-400" />
                  <h2 className="text-xl font-semibold text-white">Notification Preferences</h2>
                </div>
                <p className="text-sm text-gray-400 mb-6">
                  Choose which notifications you want to receive and how you want to receive them.
                </p>

                <div className="space-y-6">
                  {/* Channel Settings - Email Notifications */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <MailIcon className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">Email Notifications</h3>
                        <p className="text-sm text-gray-400">Receive notifications via email</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationPrefs.email_enabled}
                      onCheckedChange={() => handleNotificationChange('email_enabled')}
                    />
                  </div>

                  {/* Channel Settings - Push Notifications */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <BellRing className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">Push Notifications</h3>
                        <p className="text-sm text-gray-400">Receive push notifications in your browser</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationPrefs.push_enabled}
                      onCheckedChange={() => handleNotificationChange('push_enabled')}
                    />
                  </div>

                  {/* Notification Types - Assignment Reminders */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">Assignment Reminders</h3>
                        <p className="text-sm text-gray-400">Get reminders about upcoming assignments and deadlines</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationPrefs.assignment_reminders}
                      onCheckedChange={() => handleNotificationChange('assignment_reminders')}
                    />
                  </div>

                  {/* Notification Types - Course Updates */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">Course Updates</h3>
                        <p className="text-sm text-gray-400">Get notified about new course content and updates</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationPrefs.course_updates}
                      onCheckedChange={() => handleNotificationChange('course_updates')}
                    />
                  </div>

                  {/* Notification Types - Message Notifications */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-pink-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">Message Notifications</h3>
                        <p className="text-sm text-gray-400">Get notified when you receive new messages</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationPrefs.message_notifications}
                      onCheckedChange={() => handleNotificationChange('message_notifications')}
                    />
                  </div>

                  {/* Notification Types - Marketing Emails */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">Marketing Emails</h3>
                        <p className="text-sm text-gray-400">Receive promotional offers and newsletters</p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationPrefs.marketing_emails}
                      onCheckedChange={() => handleNotificationChange('marketing_emails')}
                    />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-800">
                  <p className="text-xs text-gray-500 text-center">
                    Your preferences are saved automatically when you toggle any option.
                  </p>
                </div>
              </div>
            </GlowCard>
          ) : (
            <div className="text-center py-12 text-gray-400">
              Failed to load notification preferences. Please try again later.
            </div>
          )}
        </TabsContent>

        {/* Security Tab - UNCHANGED */}
        <TabsContent value="security" className="space-y-6">
          <GlowCard>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-2">Password Management</h2>
              <p className="text-sm text-gray-400 mb-6">
                {isGoogleUser 
                  ? !hasSetPassword 
                    ? "You signed up with Google. Set a password to also sign in with email and password."
                    : "You have a password set. Change it here if needed."
                  : "Change your password to keep your account secure."}
              </p>

              <div className="space-y-4">
                {(!isGoogleUser || (isGoogleUser && hasSetPassword)) && (
                  <div>
                    <Label className="text-gray-300">Current Password</Label>
                    <div className="relative mt-1">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {isGoogleUser && !hasSetPassword && (
                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <p className="text-sm text-blue-400">
                      ℹ️ You're setting a password for the first time. This will allow you to sign in with email and password in addition to Google Sign-In.
                      Future password changes will require your current password.
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-gray-300">New Password</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${(passwordStrength.strength / 4) * 100}%`,
                              backgroundColor: passwordStrength.strength >= 3 ? '#10b981' : passwordStrength.strength >= 2 ? '#f59e0b' : '#ef4444'
                            }}
                          />
                        </div>
                        <span className={`text-xs ${passwordStrength.color}`}>{passwordStrength.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Use 8+ characters with letters, numbers, and symbols</p>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-gray-300">Confirm New Password</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <GlowButton 
                    onClick={handleChangePassword} 
                    isLoading={changingPassword}
                    disabled={
                      !newPassword || 
                      !confirmPassword || 
                      (!isGoogleUser && !currentPassword) ||
                      (isGoogleUser && hasSetPassword && !currentPassword)
                    }
                  >
                    <Key className="w-4 h-4 mr-2" />
                    {isGoogleUser && !hasSetPassword ? "Set Password" : "Change Password"}
                  </GlowButton>
                </div>
              </div>
            </div>
          </GlowCard>
        </TabsContent>

        {/* Danger Zone Tab - UNCHANGED */}
        <TabsContent value="danger" className="space-y-6">
          <GlowCard>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h2 className="text-xl font-semibold text-white">Danger Zone</h2>
              </div>
              <p className="text-sm text-gray-400 mb-6">Irreversible and destructive actions</p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                  <div>
                    <h3 className="font-semibold text-white">Sign out of all devices</h3>
                    <p className="text-sm text-gray-400 mt-1">This will sign you out from all active sessions</p>
                  </div>
                  <GlowButton 
                    variant="outline" 
                    onClick={() => setShowSignOutDevices(true)}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out All
                  </GlowButton>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                  <div>
                    <h3 className="font-semibold text-white">Delete Account</h3>
                    <p className="text-sm text-gray-400 mt-1">Permanently delete your account and all data</p>
                  </div>
                  <GlowButton 
                    variant="outline" 
                    onClick={() => setShowDeleteAccount(true)}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </GlowButton>
                </div>
                
                {/* MFA Section */}
                <div className="border border-gray-800 rounded-xl overflow-hidden">
                  <div className="p-5 bg-gray-900/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {mfaStatus.enabled ? (
                            <Shield className="w-5 h-5 text-green-400" />
                          ) : (
                            <ShieldOff className="w-5 h-5 text-gray-400" />
                          )}
                          <h4 className="font-semibold text-white">Two-Factor Authentication</h4>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">
                          {mfaStatus.enabled 
                            ? "Your account is protected with two-factor authentication" 
                            : "Add an extra layer of security to your account"}
                        </p>
                        {loadingMFAStatus ? (
                          <div className="animate-pulse h-10 w-32 bg-gray-800 rounded-lg" />
                        ) : mfaStatus.enabled ? (
                          <div className="flex gap-3">
                            <GlowButton
                              variant="secondary"
                              onClick={() => setShowMFADisableModal(true)}
                              className="border-red-500/50 hover:border-red-500"
                            >
                              Disable MFA
                            </GlowButton>
                          </div>
                        ) : (
                          <GlowButton
                            onClick={() => setShowMFASetupModal(true)}
                          >
                            <Smartphone className="w-4 h-4 mr-2" />
                            Enable MFA
                          </GlowButton>
                        )}
                      </div>
                      {mfaStatus.enabled && (
                        <div className="px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30">
                          <span className="text-xs text-green-400 font-medium">ENABLED</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Lost Access Link - Show when MFA is enabled */}
                    {mfaStatus.enabled && (
                      <div className="mt-4 pt-4 border-t border-gray-800">
                        <button
                          onClick={() => {
                            // Open modal to request MFA reset from admin
                            setShowMFARequestModal(true);
                          }}
                          className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-2"
                        >
                          <AlertCircle className="w-4 h-4" />
                          Lost access to your authenticator app? Request admin help
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
                  <div>
                    <h3 className="font-semibold text-white">Contact Support</h3>
                    <p className="text-sm text-gray-400 mt-1">Need help? Contact our support team</p>
                  </div>
                  <GlowButton 
                    variant="outline" 
                    onClick={() => setShowContactSupport(true)}
                    className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact Support
                  </GlowButton>
                </div>
              </div>
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <ConfirmModal
        isOpen={showSignOutDevices}
        onClose={() => setShowSignOutDevices(false)}
        onConfirm={handleSignOutAllDevices}
        title="Sign out of all devices?"
        message="This will sign you out from all browsers and devices. You'll need to sign in again on each device."
        danger={false}
      />

      <ConfirmModal
        isOpen={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onConfirm={handleDeleteAccount}
        title="Delete your account?"
        message="This action cannot be undone. All your data, courses, and certificates will be permanently deleted."
        danger={true}
      />

      <ContactSupportModal
        isOpen={showContactSupport}
        onClose={() => setShowContactSupport(false)}
        onSubmit={handleContactSupport}
      />

      <MFASetupModal
        isOpen={showMFASetupModal}
        onClose={() => setShowMFASetupModal(false)}
        onMFASuccessfullyEnabled={handleMFAEnabled}
      />

      <MFADisableModal
        isOpen={showMFADisableModal}
        onClose={() => setShowMFADisableModal(false)}
        onMFASuccessfullyDisabled={handleMFADisabled}
      />

      {/* Request MFA Reset Modal */}
      {showMFARequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-gray-900 rounded-lg max-w-md w-full border border-yellow-500/30 shadow-2xl">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Request MFA Reset</h3>
                  <p className="text-gray-400 text-sm">Submit a request to system admin</p>
                </div>
              </div>
              <button
                onClick={() => setShowMFARequestModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-sm text-yellow-300">
                  ⚠️ Important: This request will disable your MFA. A system administrator will review your request.
                  You will receive an email notification once your request is processed.
                </p>
              </div>
              <div>
                <Label className="text-gray-300 mb-1 block">Reason for request</Label>
                <Textarea
                  rows={3}
                  value={mfaRequestReason}
                  onChange={(e) => setMfaRequestReason(e.target.value)}
                  placeholder="e.g., Lost phone, factory reset, authenticator app not working, etc."
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-800">
              <GlowButton variant="outline" onClick={() => setShowMFARequestModal(false)} fullWidth>
                Cancel
              </GlowButton>
              <GlowButton 
                onClick={async () => {
                  if (!mfaRequestReason.trim()) {
                    toast.error("Please provide a reason for your request");
                    return;
                  }
                  
                  setIsSubmittingMFARequest(true);
                  try {
                    const supabase = getSupabaseBrowserClient();
                    const { data: { session } } = await supabase.auth.getSession();
                    
                    const response = await fetch('/api/auth-service/mfa/request-reset', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`,
                      },
                      body: JSON.stringify({ reason: mfaRequestReason }),
                    });
                    
                    if (response.ok) {
                      toast.success("Request submitted! Admin will review and contact you.");
                      setShowMFARequestModal(false);
                      setMfaRequestReason("");
                    } else {
                      throw new Error("Failed to submit request");
                    }
                  } catch (error) {
                    toast.error("Failed to submit request. Please try again.");
                  } finally {
                    setIsSubmittingMFARequest(false);
                  }
                }}
                isLoading={isSubmittingMFARequest}
                fullWidth
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Submit Request
              </GlowButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}