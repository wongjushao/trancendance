"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Briefcase,
  Calendar,
  Check,
  Code,
  FileText,
  Github,
  Globe,
  GraduationCap,
  Instagram,
  Languages,
  Link as LinkIcon,
  Loader2,
  MapPin,
  MessageCircle,
  Sparkles,
  Clock,
  TrendingUp,
  Twitter,
  User,
  UserPlus,
  Linkedin,
} from "lucide-react";
import { toast } from "sonner";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { useChat } from "@/contexts/ChatContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface Education {
  id: number;
  institution_name: string;
  degree: string | null;
  field_of_study: string | null;
  start_year: number | null;
  end_year: number | null;
  is_current: boolean;
  description: string | null;
}

interface UserSkill {
  id: number;
  name: string;
  level: number | null;
  years: number | null;
}

interface PublicProfile {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  birthday: string | null;
  avatar_url: string | null;
  bio: string | null;
  timezone: string | null;
  language: string | null;
  interests: string[] | null;
  social_links: Record<string, string | null> | null;
  created_at: string | null;
  department: string | null;
  years_of_experience: number | string | null;
  professional_summary: string | null;
  skills: UserSkill[];
  educations: Education[];
}

type FriendStatus = "unknown" | "none" | "self" | "pending_sent" | "pending_received" | "accepted" | "rejected";

const socialConfig = [
  { key: "github", label: "GitHub", icon: Github, buildUrl: (value: string) => value.startsWith("http") ? value : `https://github.com/${value}` },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, buildUrl: (value: string) => value.startsWith("http") ? value : `https://linkedin.com/in/${value}` },
  { key: "twitter", label: "Twitter", icon: Twitter, buildUrl: (value: string) => value.startsWith("http") ? value : `https://twitter.com/${value}` },
  { key: "instagram", label: "Instagram", icon: Instagram, buildUrl: (value: string) => value.startsWith("http") ? value : `https://instagram.com/${value}` },
  { key: "website", label: "Website", icon: Globe, buildUrl: (value: string) => value.startsWith("http") ? value : `https://${value}` },
];

function fullName(profile: PublicProfile) {
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return name || profile.username || "Learner";
}

function initials(profile: PublicProfile) {
  const nameParts = [profile.first_name, profile.last_name].filter(Boolean);
  if (nameParts.length > 0) {
    return nameParts.map((part) => part?.[0]).join("").slice(0, 2).toUpperCase();
  }
  return (profile.username?.[0] || "U").toUpperCase();
}

function formatJoinedDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { refreshRooms, selectRoom } = useChat();
  const identifier = useMemo(() => {
    const value = Array.isArray(params.identifier) ? params.identifier[0] : params.identifier;
    return decodeURIComponent(value || "");
  }, [params.identifier]);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("unknown");
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setNotFound(false);

      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          router.push(`/login?redirect=/profile/${encodeURIComponent(identifier)}`);
          return;
        }
        setAccessToken(session.access_token);

        const response = await fetch(`/api/auth-service/profile/public/${encodeURIComponent(identifier)}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.status === 404) {
          setNotFound(true);
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load profile");
        }

        const data = await response.json();
        setProfile({
          ...data,
          skills: data.skills || [],
          educations: data.educations || [],
        });

        const statusResponse = await fetch(`/api/auth-service/friends/status/${data.id}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setFriendStatus((statusData.status || "none") as FriendStatus);
        } else {
          setFriendStatus("none");
        }
      } catch (error) {
        console.error("Error loading public profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    if (identifier) {
      loadProfile();
    }
  }, [identifier, router]);

  const handleAddFriend = async () => {
    if (!profile || !accessToken || friendStatus === "self" || friendStatus === "accepted" || friendStatus === "pending_sent") {
      return;
    }

    setFriendActionLoading(true);
    try {
      const response = await fetch(`/api/auth-service/friends/request/${profile.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send friend request");
      }

      setFriendStatus((data.status || "pending_sent") as FriendStatus);
      if (data.room_id) {
        localStorage.setItem("last_room_id", String(data.room_id));
        const updatedRooms = await refreshRooms();
        const room = updatedRooms.find((item) => item.id === Number(data.room_id));
        if (room) {
          selectRoom(room);
        }
      }
      toast.success(data.status === "accepted" ? "Friend request accepted" : "Friend request sent in messages");
      router.push("/messages");
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send friend request");
    } finally {
      setFriendActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="mx-auto max-w-3xl">
        <GlowCard>
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
              <User className="h-8 w-8 text-purple-300" />
            </div>
            <h1 className="text-2xl font-semibold text-white">Profile not found</h1>
            <p className="mt-2 text-sm text-gray-400">We could not find a profile for {identifier}.</p>
            <GlowButton className="mt-6" variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </GlowButton>
          </div>
        </GlowCard>
      </div>
    );
  }

  const name = fullName(profile);
  const joinedDate = formatJoinedDate(profile.created_at);
  const socialLinks = socialConfig
    .map((item) => {
      const value = profile.social_links?.[item.key]?.trim();
      return value ? { ...item, value, href: item.buildUrl(value) } : null;
    })
    .filter(Boolean) as Array<(typeof socialConfig)[number] & { value: string; href: string }>;
  const friendButton = (() => {
    if (friendStatus === "self") {
      return { label: "Your Profile", icon: User, disabled: true };
    }
    if (friendStatus === "accepted") {
      return { label: "Friends", icon: Check, disabled: true };
    }
    if (friendStatus === "pending_sent") {
      return { label: "Request Sent", icon: Clock, disabled: true };
    }
    if (friendStatus === "pending_received") {
      return { label: "Respond in Messages", icon: MessageCircle, disabled: true };
    }
    if (friendStatus === "rejected") {
      return { label: "Request Rejected", icon: Clock, disabled: true };
    }
    return { label: "Add Friend", icon: UserPlus, disabled: false };
  })();
  const FriendButtonIcon = friendButton.icon;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#12121A] shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.35),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.22),_transparent_30%)]" />
        <div className="relative px-6 py-8 md:px-10 md:py-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="h-28 w-28 rounded-3xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 p-1 shadow-xl shadow-purple-500/25">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[1.35rem] bg-gray-950">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={`${name} avatar`} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-white">{initials(profile)}</span>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Public Profile
                </div>
                <h1 className="text-3xl font-bold text-white md:text-5xl">{name}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-300">
                  {profile.username && <span>@{profile.username}</span>}
                  {profile.job_title && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4 text-purple-300" />
                      {profile.job_title}
                    </span>
                  )}
                  {profile.department && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-blue-300" />
                      {profile.department}
                    </span>
                  )}
                  {joinedDate && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-pink-300" />
                      Joined {joinedDate}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <GlowButton
                onClick={handleAddFriend}
                variant={friendButton.disabled ? "secondary" : "primary"}
                disabled={friendButton.disabled || friendActionLoading}
              >
                {friendActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FriendButtonIcon className="h-4 w-4" />
                )}
                {friendButton.label}
              </GlowButton>
              <GlowButton onClick={() => router.push("/messages")} variant="outline">
                <MessageCircle className="h-4 w-4" />
                Message
              </GlowButton>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-4">
          <GlowCard>
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Snapshot</h2>
                <p className="mt-1 text-sm text-gray-400">Quick details about {name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/[0.03] p-4">
                  <Code className="mb-3 h-5 w-5 text-purple-300" />
                  <p className="text-2xl font-bold text-white">{profile.skills.length}</p>
                  <p className="text-xs text-gray-400">Skills</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] p-4">
                  <GraduationCap className="mb-3 h-5 w-5 text-blue-300" />
                  <p className="text-2xl font-bold text-white">{profile.educations.length}</p>
                  <p className="text-xs text-gray-400">Education</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] p-4">
                  <Award className="mb-3 h-5 w-5 text-green-300" />
                  <p className="text-2xl font-bold text-white">{profile.interests?.length || 0}</p>
                  <p className="text-xs text-gray-400">Interests</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] p-4">
                  <LinkIcon className="mb-3 h-5 w-5 text-pink-300" />
                  <p className="text-2xl font-bold text-white">{socialLinks.length}</p>
                  <p className="text-xs text-gray-400">Links</p>
                </div>
              </div>
            </div>
          </GlowCard>

          <GlowCard>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Details</h2>
              <div className="space-y-3 text-sm">
                {profile.years_of_experience && (
                  <div className="flex items-center gap-3 text-gray-300">
                    <TrendingUp className="h-4 w-4 text-purple-300" />
                    <span>{profile.years_of_experience} years of experience</span>
                  </div>
                )}
                {profile.language && (
                  <div className="flex items-center gap-3 text-gray-300">
                    <Languages className="h-4 w-4 text-blue-300" />
                    <span>{profile.language}</span>
                  </div>
                )}
                {profile.timezone && (
                  <div className="flex items-center gap-3 text-gray-300">
                    <Globe className="h-4 w-4 text-green-300" />
                    <span>{profile.timezone}</span>
                  </div>
                )}
                {!profile.years_of_experience && !profile.language && !profile.timezone && (
                  <p className="text-gray-400">No extra details shared yet.</p>
                )}
              </div>
            </div>
          </GlowCard>

          {socialLinks.length > 0 && (
            <GlowCard>
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Connect</h2>
                <div className="flex flex-wrap gap-2">
                  {socialLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <a
                        key={link.key}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-300 transition-colors hover:border-purple-400/40 hover:text-white"
                      >
                        <Icon className="h-4 w-4" />
                        {link.label}
                      </a>
                    );
                  })}
                </div>
              </div>
            </GlowCard>
          )}
        </div>

        <div className="space-y-6 xl:col-span-8">
          {(profile.bio || profile.professional_summary) && (
            <GlowCard>
              <div className="space-y-5">
                {profile.bio && (
                  <div>
                    <h2 className="mb-3 text-xl font-semibold text-white">About</h2>
                    <p className="whitespace-pre-wrap break-words leading-relaxed text-gray-300">{profile.bio}</p>
                  </div>
                )}
                {profile.professional_summary && (
                  <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-purple-200">
                      <FileText className="h-4 w-4" />
                      Professional Summary
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-300">
                      {profile.professional_summary}
                    </p>
                  </div>
                )}
              </div>
            </GlowCard>
          )}

          <GlowCard>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Skills</h2>
                  <p className="mt-1 text-sm text-gray-400">Professional skills and expertise</p>
                </div>
                <Code className="h-5 w-5 text-purple-300" />
              </div>
              {profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill.id}
                      className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-sm text-purple-200"
                    >
                      {skill.name}
                      {skill.level ? <span className="ml-2 text-xs text-purple-300/80">Lv.{skill.level}</span> : null}
                      {skill.years ? <span className="ml-2 text-xs text-purple-300/70">{skill.years}y</span> : null}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No skills shared yet.</p>
              )}
            </div>
          </GlowCard>

          <GlowCard>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Education</h2>
                  <p className="mt-1 text-sm text-gray-400">Academic background and qualifications</p>
                </div>
                <GraduationCap className="h-5 w-5 text-blue-300" />
              </div>
              {profile.educations.length > 0 ? (
                <div className="space-y-3">
                  {profile.educations.map((education) => (
                    <div key={education.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <h3 className="font-semibold text-white">{education.institution_name}</h3>
                      <p className="mt-1 text-sm text-gray-300">
                        {[education.degree, education.field_of_study].filter(Boolean).join(" in ")}
                      </p>
                      {(education.start_year || education.end_year || education.is_current) && (
                        <p className="mt-2 text-xs text-gray-500">
                          {education.start_year || "Start"} - {education.is_current ? "Present" : education.end_year || "Present"}
                        </p>
                      )}
                      {education.description && (
                        <p className="mt-3 text-sm leading-relaxed text-gray-400">{education.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No education shared yet.</p>
              )}
            </div>
          </GlowCard>

          {profile.interests && profile.interests.length > 0 && (
            <GlowCard>
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Interests</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1.5 text-sm text-pink-200"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </GlowCard>
          )}
        </div>
      </div>
    </div>
  );
}
