import Link from "next/link";
import {
  ArrowRight, BookOpen, LayoutDashboard, GraduationCap,
  FileText, BarChart3, ChevronRight,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import SignOutButton from "@/components/SignOutButton";

interface LandingAuthedProps {
  user: SupabaseUser;
}

/**
 * Landing page variant shown to users who are already signed in.
 * Replaces the marketing page with a personalised welcome-back experience.
 */
export default function LandingAuthed({ user }: LandingAuthedProps) {
  const fullName: string =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "there";

  const email: string = user.email ?? "";

  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const quickLinks = [
    { href: "/dashboard",     icon: LayoutDashboard, label: "Dashboard",    desc: "Your learning overview" },
    { href: "/courses",       icon: BookOpen,        label: "Courses",      desc: "Browse & continue learning" },
    { href: "/assignments",   icon: FileText,        label: "Assignments",  desc: "Pending & upcoming work" },
    { href: "/analytics",     icon: BarChart3,       label: "Analytics",    desc: "Track your progress" },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white selection:bg-purple-500/30">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Minimal nav */}
      <header className="relative z-10 border-b border-white/5 bg-[#0B0B0F]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-purple-500/30">
              E
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Educatorio</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#6B6B80] hidden sm:block truncate max-w-[200px]">{email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 py-20">

        {/* Welcome hero */}
        <div className="flex flex-col items-center text-center mb-16">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 mb-6">
            <span className="text-white font-black text-3xl tracking-tighter">{initials}</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-4">
            Welcome back
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight mb-4">
            Good to see you,{" "}
            <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
              {fullName.split(" ")[0]}
            </span>
            .
          </h1>

          <p className="text-[#A0A0B5] text-lg max-w-lg mb-10">
            Pick up where you left off, or explore something new today.
          </p>

          {/* Primary CTA */}
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 shadow-xl shadow-purple-500/30 transition-all hover:scale-[1.02] group"
          >
            Go to Dashboard
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Quick navigation grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {quickLinks.map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-5 p-6 rounded-2xl border border-white/5 bg-[#16161F] hover:border-purple-500/40 hover:bg-[#1C1C28] hover:scale-[1.02] hover:shadow-[0_10px_40px_rgba(106,92,255,0.1)] transition-all duration-200"
            >
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors shrink-0">
                <Icon size={22} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white group-hover:text-purple-300 transition-colors">{label}</p>
                <p className="text-sm text-[#6B6B80]">{desc}</p>
              </div>
              <ChevronRight size={16} className="text-[#6B6B80] group-hover:text-purple-400 shrink-0 transition-colors" />
            </Link>
          ))}
        </div>

        {/* Continue learning nudge */}
        <div className="rounded-[28px] border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-violet-600/5 p-8 text-center">
          <GraduationCap size={36} className="text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Ready to keep learning?</h2>
          <p className="text-[#A0A0B5] mb-6 max-w-md mx-auto">
            You have courses in progress. Jump back in and keep building your skills.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] group"
          >
            Browse Courses
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black/40 px-6 py-8 mt-8">
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center font-black text-white text-[10px]">E</div>
            <span className="text-sm font-bold tracking-tight text-white">Educatorio</span>
          </div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-[#6B6B80]">
            &copy; {new Date().getFullYear()} Educatorio Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}
