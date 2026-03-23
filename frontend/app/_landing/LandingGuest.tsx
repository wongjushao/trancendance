"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2, Building2, GraduationCap, Users, ArrowRight,
  PlayCircle, Star, Globe, ShieldCheck, Zap, BarChart3,
  ShieldEllipsis, BookOpen, TrendingUp, Award, ChevronRight,
} from "lucide-react";

export default function LandingGuest() {
  const [viewMode, setViewMode] = useState<"consumer" | "organization">("consumer");

  const consumerCourses = [
    { title: "Google Data Analytics",  partner: "Google",          students: "1.2M", rating: "4.8", color: "from-blue-500" },
    { title: "AI for Everyone",        partner: "DeepLearning.AI", students: "800k", rating: "4.9", color: "from-purple-500" },
    { title: "Financial Markets",      partner: "Yale University",  students: "500k", rating: "4.7", color: "from-emerald-500" },
    { title: "Python for Everybody",   partner: "Uni. of Michigan", students: "2.5M", rating: "4.9", color: "from-yellow-500" },
  ];

  const orgCourses = [
    { title: "Strategic Leadership",       partner: "Dartmouth", students: "40k", rating: "4.9", color: "from-indigo-600" },
    { title: "Change Management",          partner: "IBM",       students: "15k", rating: "4.8", color: "from-slate-600" },
    { title: "Cloud Security Architecture",partner: "Microsoft", students: "90k", rating: "4.7", color: "from-cyan-600" },
    { title: "Supply Chain Operations",    partner: "Rutgers",   students: "30k", rating: "4.8", color: "from-orange-600" },
  ];

  const displayCourses = viewMode === "consumer" ? consumerCourses : orgCourses;

  const categories = [
    { icon: BookOpen,   label: "Data Science", count: "425 courses" },
    { icon: TrendingUp, label: "Business",      count: "310 courses" },
    { icon: Zap,        label: "Technology",    count: "680 courses" },
    { icon: Award,      label: "Personal Dev.", count: "215 courses" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0B0F] text-slate-100 selection:bg-purple-500/30">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0B0B0F]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-purple-500/30">
              E
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Educatorio</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#A0A0B5]">
            <Link href="/courses"       className="hover:text-white transition-colors">Explore</Link>
            <Link href="/organizations" className="hover:text-white transition-colors">For Business</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login"    className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-[#A0A0B5] hover:text-white border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all">
              Log In
            </Link>
            <Link href="/register" className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02]">
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── 1. HERO ── */}
        <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-24 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[120px] pointer-events-none" />

          {/* Toggle */}
          <div className="flex justify-center mb-16">
            <div className="inline-flex items-center rounded-2xl bg-white/5 p-1 border border-white/10">
              {(["consumer", "organization"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-8 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${
                    viewMode === mode
                      ? "bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/20"
                      : "text-[#A0A0B5] hover:text-white"
                  }`}
                >
                  {mode === "consumer" ? "Individual" : "Organization"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-16 lg:grid-cols-[1.2fr_1fr] items-center">
            {/* Left copy */}
            <div className="space-y-10">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">
                  {viewMode === "consumer" ? "Unlock Your Potential" : "Enterprise Grade Learning"}
                </div>
                <h1 className="text-6xl font-extrabold tracking-tight text-white lg:text-8xl leading-[0.9]">
                  {viewMode === "consumer" ? (
                    <>Learn without{" "}<span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">limits.</span></>
                  ) : (
                    <>Scale your{" "}<span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">intelligence.</span></>
                  )}
                </h1>
                <p className="max-w-[550px] text-xl leading-relaxed text-[#A0A0B5]">
                  {viewMode === "consumer"
                    ? "Start, switch, or advance your career with more than 7,000 courses from world-class universities and companies."
                    : "Empower your team with a centralized learning operating system. Automated onboarding, skill gap analysis, and custom reporting."}
                </p>
                {viewMode === "organization" && (
                  <div className="flex gap-6 pt-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-300"><BarChart3 className="text-purple-400" size={18} /> Skill Analytics</div>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-300"><ShieldEllipsis className="text-purple-400" size={18} /> SSO Integration</div>
                  </div>
                )}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 shadow-xl shadow-purple-500/25 transition-all hover:scale-[1.02] group">
                  Get Started Free <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/login" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-[#A0A0B5] hover:text-white border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all">
                  Log In <ChevronRight size={16} />
                </Link>
              </div>

              {/* Stats */}
              <div className="flex gap-10 border-t border-white/10 pt-10">
                {[
                  { icon: GraduationCap, value: "7k+",  label: "Courses" },
                  { icon: Building2,     value: "120+", label: "Partners" },
                  { icon: Users,         value: "15M+", label: "Learners" },
                ].map(({ icon: Icon, value, label }) => (
                  <div key={label} className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <Icon className="text-purple-400" size={24} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-white">{value}</p>
                      <p className="text-[10px] uppercase tracking-widest text-[#6B6B80]">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right sign-up card */}
            <div className="relative">
              <div className="absolute -inset-10 blur-[100px] rounded-full bg-purple-600/15 pointer-events-none" />
              <div className="relative rounded-[32px] border border-white/10 bg-[#16161F]/80 p-8 backdrop-blur-xl shadow-2xl shadow-purple-500/10">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">Start learning today</h2>
                  <p className="text-[#A0A0B5] text-sm">Join millions of learners worldwide</p>
                </div>
                <div className="space-y-3 mb-8">
                  {[
                    "Access 7,000+ world-class courses",
                    "Earn recognized certificates",
                    "Learn at your own pace",
                    "Cancel anytime",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 text-sm text-[#A0A0B5]">
                      <CheckCircle2 size={16} className="text-purple-400 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <Link href="/register" className="flex w-full items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] group">
                    Create Free Account <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link href="/login" className="flex w-full items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-[#A0A0B5] border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/5 hover:text-white transition-all">
                    Already have an account? Log In
                  </Link>
                </div>
                <p className="text-center text-[10px] text-[#6B6B80] mt-5 uppercase tracking-widest font-bold">
                  🔒 Secure &amp; Free to start
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. PARTNER LOGOS ── */}
        <section className="border-y border-white/5 bg-white/[0.02] py-12">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <p className="mb-10 text-[10px] font-bold uppercase tracking-[0.3em] text-[#6B6B80]">Collaborating with World Leaders</p>
            <div className="flex flex-wrap justify-center gap-12 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
              {["Google", "Stanford", "IBM", "Meta", "Yale", "Microsoft"].map((logo) => (
                <span key={logo} className="text-2xl font-black italic text-[#A0A0B5] tracking-tighter">{logo}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. CATEGORIES ── */}
        <section className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-3">Browse Top Categories</h2>
          <p className="text-[#A0A0B5] mb-10">Explore subjects in demand by today&apos;s employers.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map(({ icon: Icon, label, count }) => (
              <Link href="/courses" key={label} className="group flex items-center gap-4 p-5 rounded-2xl border border-white/5 bg-[#16161F] hover:border-purple-500/40 hover:bg-purple-500/5 hover:scale-[1.02] transition-all duration-200">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                  <Icon size={20} className="text-purple-400" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{label}</p>
                  <p className="text-[11px] text-[#6B6B80]">{count}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 4. FEATURED COURSES ── */}
        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="text-4xl font-bold text-white tracking-tight mb-4">
                {viewMode === "consumer" ? "Most Popular Certificates" : "Top Training Programs"}
              </h2>
              <p className="text-[#A0A0B5]">
                {viewMode === "consumer" ? "Explore our top-rated career credentials." : "Recommended for enterprise development."}
              </p>
            </div>
            <Link href="/courses" className="flex items-center gap-2 text-purple-400 font-bold hover:gap-3 transition-all group">
              Explore Catalog <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayCourses.map((course, i) => (
              <Link href={`/courses/${course.title.toLowerCase().replace(/ /g, "-")}`} key={i}
                className="group relative rounded-[24px] border border-white/5 bg-[#16161F] p-4 hover:border-purple-500/40 hover:bg-[#1C1C28] hover:scale-[1.03] hover:shadow-[0_20px_50px_rgba(106,92,255,0.15)] transition-all duration-300 block"
              >
                <div className={`aspect-video rounded-xl bg-gradient-to-br ${course.color} to-black opacity-80 mb-4 flex items-center justify-center relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  <PlayCircle size={40} className="text-white opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
                </div>
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">{course.partner}</p>
                <h3 className="font-bold text-white mb-4 line-clamp-2 h-12 leading-tight group-hover:text-purple-300 transition-colors">{course.title}</h3>
                <div className="flex items-center justify-between text-[11px] text-[#6B6B80] font-bold border-t border-white/5 pt-4">
                  <span className="flex items-center gap-1 text-yellow-500"><Star size={12} fill="currentColor" /> {course.rating}</span>
                  <span>{course.students} students</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 5. WHY EDUCATORIO ── */}
        <section className="bg-purple-500/5 py-24 border-y border-purple-500/10">
          <div className="mx-auto max-w-7xl px-6 grid md:grid-cols-3 gap-12">
            {[
              { icon: Globe,       title: "Global Recognition",   desc: "Certificates recognized by top Fortune 500 companies worldwide." },
              { icon: Zap,         title: "Accelerated Learning", desc: "Finish courses at your own pace with modular, bite-sized content." },
              { icon: ShieldCheck, title: "Verified Skills",      desc: "Anti-cheat exams and project-based assessments ensure real mastery." },
            ].map((f, i) => (
              <div key={i} className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                  <f.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-white">{f.title}</h3>
                <p className="text-[#A0A0B5] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. PRICING ── */}
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Transparent Pricing</h2>
            <p className="text-[#A0A0B5]">Choose the path that fits your goals.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="h-full p-8 rounded-[32px] bg-[#16161F] border border-white/10 hover:border-purple-500/40 hover:scale-[1.02] transition-all duration-300">
              <h3 className="text-xl font-bold text-white mb-2">Free Starter</h3>
              <p className="text-4xl font-black text-white mb-6">$0<span className="text-sm font-normal text-[#6B6B80]">/mo</span></p>
              <ul className="space-y-4 mb-8 text-sm text-[#A0A0B5]">
                <li className="flex gap-2"><CheckCircle2 size={18} className="text-purple-400 shrink-0" /> Audit 5,000+ courses</li>
                <li className="flex gap-2"><CheckCircle2 size={18} className="text-purple-400 shrink-0" /> Community Forums</li>
              </ul>
              <Link href="/register" className="w-full flex items-center justify-center py-4 rounded-xl border border-white/10 font-bold text-white hover:bg-purple-500/10 hover:border-purple-500/40 transition-all">Get Started</Link>
            </div>
            <div className="h-full p-8 rounded-[32px] bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-2xl shadow-purple-500/25 hover:scale-[1.05] transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Users size={120} /></div>
              <h3 className="text-xl font-bold mb-2">Educatorio Plus</h3>
              <p className="text-4xl font-black mb-6">$49<span className="text-sm font-normal opacity-60">/mo</span></p>
              <ul className="space-y-4 mb-8 text-sm font-semibold">
                <li className="flex gap-2"><CheckCircle2 size={18} className="shrink-0" /> Unlimited Professional Certs</li>
                <li className="flex gap-2"><CheckCircle2 size={18} className="shrink-0" /> Job matching assistance</li>
              </ul>
              <Link href="/register" className="w-full flex items-center justify-center py-4 rounded-xl bg-[#0B0B0F] text-white font-bold hover:bg-[#16161F] transition-all">Try Free for 7 Days</Link>
            </div>
          </div>
        </section>

        {/* ── 7. FAQs ── */}
        <section className="mx-auto max-w-4xl px-6 py-24 border-t border-white/5">
          <h2 className="text-3xl font-bold text-center text-white mb-12 tracking-tight">Common Questions</h2>
          <div className="space-y-4">
            {[
              { q: "Can I earn a certificate for free?",       a: "Most courses can be audited for free, but certificates are part of our Plus subscription or one-time payments." },
              { q: "How does organization billing work?",      a: "We offer per-seat licensing for teams starting at 5 members. Contact our sales team for custom enterprise quotes." },
              { q: "Is there a mobile app?",                   a: "Yes! Educatorio is available on iOS and Android, so you can learn on the go at your own pace." },
            ].map((item, i) => (
              <details key={i} className="group p-6 rounded-2xl bg-[#16161F] border border-white/5 hover:border-purple-500/20 cursor-pointer transition-colors">
                <summary className="font-bold text-white flex justify-between items-center list-none outline-none">
                  {item.q}
                  <ArrowRight size={18} className="group-open:rotate-90 transition-transform text-purple-400 shrink-0 ml-4" />
                </summary>
                <p className="text-sm text-[#A0A0B5] mt-4 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── 8. FINAL CTA ── */}
        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="relative rounded-[32px] bg-gradient-to-br from-purple-500/20 to-violet-600/10 border border-purple-500/20 p-12 text-center overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative">
              <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Ready to advance your career?</h2>
              <p className="text-[#A0A0B5] mb-8 max-w-xl mx-auto text-lg">Join over 15 million learners. Access thousands of courses and start earning certificates today.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register" className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 shadow-xl shadow-purple-500/30 transition-all hover:scale-[1.02] group">
                  Create Free Account <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/login" className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-2xl text-base font-semibold text-[#A0A0B5] hover:text-white border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all">
                  Log In
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 bg-black/40 px-6 py-12">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center font-black text-white text-xs">E</div>
            <span className="text-lg font-bold tracking-tight text-white">Educatorio</span>
          </div>
          <div className="flex gap-8 text-[11px] font-bold uppercase tracking-[0.25em] text-[#6B6B80]">
            <Link href="/privacy" className="hover:text-purple-400 transition">Privacy</Link>
            <Link href="/terms"   className="hover:text-purple-400 transition">Terms</Link>
            <Link href="/contact" className="hover:text-purple-400 transition">Contact</Link>
          </div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-[#6B6B80]">
            &copy; {new Date().getFullYear()} Educatorio Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}
