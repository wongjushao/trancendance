"use client";

import { useState } from "react";
import { Camera, Mail, MapPin, Link as LinkIcon, Calendar, Edit, Award, CheckCircle } from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// ── Static mock data (replace with real DB queries when ready) ────────────────

const recentActivity = [
  { id: 1, type: "completed",  text: "Completed Advanced React Development", date: "Mar 1, 2026",  icon: CheckCircle },
  { id: 2, type: "enrolled",   text: "Enrolled in Python for Data Science",  date: "Feb 28, 2026", icon: LinkIcon },
  { id: 3, type: "achievement",text: "Earned Course Master badge",            date: "Feb 25, 2026", icon: Award },
  { id: 4, type: "grade",      text: "Scored 95% on UI/UX Case Study",       date: "Feb 20, 2026", icon: Edit },
];

const certificates = [
  { id: 1, course: "Advanced React Development",  issueDate: "Mar 1, 2026",  instructor: "Sarah Johnson" },
  { id: 2, course: "UI/UX Design Fundamentals",   issueDate: "Feb 15, 2026", instructor: "Emily Rodriguez" },
  { id: 3, course: "Backend with Node.js",        issueDate: "Jan 28, 2026", instructor: "Michael Chen" },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProfileClientProps {
  user: SupabaseUser;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfileClient({ user }: ProfileClientProps) {
  // Derive display values from the real Supabase user.
  // All of these can be overwritten by the user in the Settings tab.
  const initialName     = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "";
  const initialEmail    = user.email ?? "";
  const initialLocation = user.user_metadata?.location ?? "";
  const initialWebsite  = user.user_metadata?.website  ?? "";
  const initialBio      = user.user_metadata?.bio      ?? "";

  // Generate initials for the avatar
  const initials = initialName
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || initialEmail[0]?.toUpperCase() || "U";

  // Format the join date from the Supabase created_at timestamp
  const joinDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "Unknown";

  // ── Settings form state ──
  const [settingsForm, setSettingsForm] = useState({
    name:     initialName,
    email:    initialEmail,
    location: initialLocation,
    website:  initialWebsite,
    bio:      initialBio,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: settingsForm.name,
        location:  settingsForm.location,
        website:   settingsForm.website,
        bio:       settingsForm.bio,
      },
    });

    setIsSaving(false);

    if (error) {
      setSaveStatus({ type: "error", message: error.message });
    } else {
      setSaveStatus({ type: "success", message: "Profile updated successfully." });
    }
  };

  return (
    <div className="space-y-8 pb-12">

      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <GlowCard className="overflow-hidden border-white/5 bg-white/[0.02]">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">

            {/* Avatar */}
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 transition-transform duration-500 group-hover:scale-105">
                <span className="text-white font-black text-4xl tracking-tighter">{initials}</span>
              </div>
              <button className="absolute -bottom-2 -right-2 w-11 h-11 bg-[#1A1A24] border border-white/10 text-purple-400 rounded-2xl flex items-center justify-center shadow-xl hover:bg-purple-500 hover:text-white transition-all duration-300">
                <Camera className="w-5 h-5" />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">{settingsForm.name}</h1>
                  <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-[#A0A0B5]">
                    <span className="flex items-center gap-2 text-sm bg-white/5 px-3 py-1 rounded-lg">
                      <Mail className="w-4 h-4 text-purple-400" />
                      {settingsForm.email}
                    </span>
                    {settingsForm.location && (
                      <span className="flex items-center gap-2 text-sm bg-white/5 px-3 py-1 rounded-lg">
                        <MapPin className="w-4 h-4 text-purple-400" />
                        {settingsForm.location}
                      </span>
                    )}
                  </div>
                </div>
                <GlowButton variant="secondary" className="px-6 h-12">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </GlowButton>
              </div>

              {settingsForm.bio && (
                <p className="text-[#A0A0B5] mb-6 leading-relaxed max-w-2xl text-lg">
                  {settingsForm.bio}
                </p>
              )}

              <div className="flex flex-wrap justify-center md:justify-start items-center gap-4">
                <div className="px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-bold uppercase tracking-widest">
                  Student
                </div>
                <span className="text-[#6B6B80] text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Joined {joinDate}
                </span>
              </div>
            </div>
          </div>
        </GlowCard>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard icon={CheckCircle} label="Courses Completed"  value="8" />
        <StatCard icon={LinkIcon}    label="Current Enrollment" value="3" />
        <StatCard icon={Award}       label="Certificates Earned" value="5" />
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="bg-[#12121A] border border-white/5 p-1.5 rounded-2xl mb-8 inline-flex">
          <TabsTrigger value="activity"     className="rounded-xl px-8 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">Activity</TabsTrigger>
          <TabsTrigger value="certificates" className="rounded-xl px-8 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">Certificates</TabsTrigger>
          <TabsTrigger value="settings"     className="rounded-xl px-8 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">Settings</TabsTrigger>
        </TabsList>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-0 outline-none">
          <GlowCard className="border-white/5">
            <h2 className="text-2xl font-bold text-white mb-8 tracking-tight">Recent Learning Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-5 p-5 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.03] transition-all group"
                >
                  <div className="p-3 bg-[#12121A] rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                    <activity.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium group-hover:text-purple-400 transition-colors">{activity.text}</p>
                    <p className="text-[#6B6B80] text-xs font-mono uppercase mt-1">{activity.date}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlowCard>
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="mt-0 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((cert) => (
              <GlowCard key={cert.id} className="group border-white/5 hover:border-purple-500/30 transition-all">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-4 bg-purple-500/10 rounded-2xl">
                    <Award className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-[#6B6B80] text-xs uppercase font-bold tracking-tighter">Verified</p>
                    <p className="text-purple-400 text-xs font-mono">{cert.id.toString().padStart(4, "0")}</p>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-purple-400 transition-colors">{cert.course}</h3>
                <p className="text-[#6B6B80] text-sm mb-6">Instructor: {cert.instructor}</p>
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <span className="text-[#A0A0B5] text-xs">{cert.issueDate}</span>
                  <GlowButton variant="outline" className="text-xs h-9">Download PDF</GlowButton>
                </div>
              </GlowCard>
            ))}
          </div>
        </TabsContent>

        {/* Settings Tab — saves to Supabase user_metadata */}
        <TabsContent value="settings" className="mt-0 outline-none">
          <GlowCard className="border-white/5">
            <h2 className="text-2xl font-bold text-white mb-8 tracking-tight">Public Presence</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#A0A0B5] ml-1">Full Name</label>
                <Input
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  className="h-12 bg-[#12121A] border-white/10 text-white rounded-xl focus:ring-purple-500/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#A0A0B5] ml-1">Email Address</label>
                {/* Email is read-only — changing it requires a Supabase email-change flow */}
                <Input
                  value={settingsForm.email}
                  disabled
                  className="h-12 bg-[#12121A] border-white/10 text-white rounded-xl opacity-60 cursor-not-allowed"
                />
                <p className="text-xs text-[#6B6B80] ml-1">Email changes require re-verification.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#A0A0B5] ml-1">Geographic Location</label>
                <Input
                  value={settingsForm.location}
                  onChange={(e) => setSettingsForm({ ...settingsForm, location: e.target.value })}
                  placeholder="e.g. San Francisco, CA"
                  className="h-12 bg-[#12121A] border-white/10 text-white rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#A0A0B5] ml-1">Personal Website</label>
                <Input
                  value={settingsForm.website}
                  onChange={(e) => setSettingsForm({ ...settingsForm, website: e.target.value })}
                  placeholder="e.g. yoursite.com"
                  className="h-12 bg-[#12121A] border-white/10 text-white rounded-xl"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-[#A0A0B5] ml-1">Professional Bio</label>
                <textarea
                  value={settingsForm.bio}
                  onChange={(e) => setSettingsForm({ ...settingsForm, bio: e.target.value })}
                  rows={4}
                  placeholder="Tell us a bit about yourself..."
                  className="w-full px-5 py-4 bg-[#12121A] border border-white/10 rounded-2xl text-white focus:border-purple-500/50 outline-none transition-all resize-none"
                />
              </div>
            </div>

            {/* Save status message */}
            {saveStatus && (
              <div className={`mt-6 rounded-xl border p-3 text-sm font-medium ${
                saveStatus.type === "success"
                  ? "border-green-500/20 bg-green-500/10 text-green-400"
                  : "border-red-500/20 bg-red-500/10 text-red-400"
              }`}>
                {saveStatus.message}
              </div>
            )}

            <div className="flex gap-4 mt-10">
              <GlowButton
                variant="primary"
                className="px-8 h-12"
                onClick={handleSaveProfile}
                isLoading={isSaving}
              >
                Save Profile
              </GlowButton>
              <GlowButton
                variant="ghost"
                className="px-8 h-12 text-[#6B6B80]"
                onClick={() => {
                  setSettingsForm({
                    name:     initialName,
                    email:    initialEmail,
                    location: initialLocation,
                    website:  initialWebsite,
                    bio:      initialBio,
                  });
                  setSaveStatus(null);
                }}
              >
                Revert Changes
              </GlowButton>
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
