"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import EmailPasswordForm from "./components/EmailPasswordForm";
import GoogleAuthButton from "./components/GoogleAuthButton";
import { 
  CheckCircle2, Building2, GraduationCap, Users, ArrowRight, 
  PlayCircle, Star, Globe, ShieldCheck, Zap, BarChart3, ShieldEllipsis 
} from "lucide-react";

export default function LandingPage() {
  const [viewMode, setViewMode] = useState<"consumer" | "organization">("consumer");
  const authRef = useRef<HTMLDivElement>(null);
  const [isPulsing, setIsPulsing] = useState(false);
  const [authFormKey, setAuthFormKey] = useState(0); // Used to force-reset auth form

  // LISTEN FOR NAVBAR EVENTS
  useEffect(() => {
    const handleFocus = () => {
      authRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 2000);
    };

    const handleReset = () => {
      setViewMode("consumer");
      setAuthFormKey(prev => prev + 1); // Triggers re-render of form components
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("trigger-auth-focus", handleFocus);
    window.addEventListener("reset-landing-page", handleReset);
    
    return () => {
      window.removeEventListener("trigger-auth-focus", handleFocus);
      window.removeEventListener("reset-landing-page", handleReset);
    };
  }, []);

  const consumerCourses = [
    { title: "Google Data Analytics", partner: "Google", students: "1.2M", rating: "4.8", color: "from-blue-500" },
    { title: "AI for Everyone", partner: "DeepLearning.AI", students: "800k", rating: "4.9", color: "from-purple-500" },
    { title: "Financial Markets", partner: "Yale University", students: "500k", rating: "4.7", color: "from-emerald-500" },
    { title: "Python for Everybody", partner: "Uni. of Michigan", students: "2.5M", rating: "4.9", color: "from-yellow-500" },
  ];

  const orgCourses = [
    { title: "Strategic Leadership", partner: "Dartmouth", students: "40k", rating: "4.9", color: "from-indigo-600" },
    { title: "Change Management", partner: "IBM", students: "15k", rating: "4.8", color: "from-slate-600" },
    { title: "Cloud Security Architecture", partner: "Microsoft", students: "90k", rating: "4.7", color: "from-cyan-600" },
    { title: "Supply Chain Operations", partner: "Rutgers", students: "30k", rating: "4.8", color: "from-orange-600" },
  ];

  const displayCourses = viewMode === "consumer" ? consumerCourses : orgCourses;

  return (
    <div className={`flex min-h-screen flex-col transition-colors duration-700 ${viewMode === 'organization' ? 'bg-[#050b14]' : 'bg-[#02050b]'} text-slate-100 selection:bg-emerald-500/30`}>
      
      <main className="flex-1">
        {/* 1. Hero Section */}
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex flex-col items-center mb-16">
             <div className="inline-flex items-center rounded-2xl bg-white/5 p-1 border border-white/10 shadow-inner">
              <button 
                onClick={() => setViewMode("consumer")}
                className={`px-8 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${viewMode === "consumer" ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:text-white"}`}
              >
                Individual
              </button>
              <button 
                onClick={() => setViewMode("organization")}
                className={`px-8 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${viewMode === "organization" ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:text-white"}`}
              >
                Organization
              </button>
            </div>
          </div>

          <div className="grid gap-16 lg:grid-cols-[1.2fr_400px] items-center">
            <div className="space-y-10">
              <div className="space-y-6">
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${viewMode === 'organization' ? 'border-blue-500/20 bg-blue-500/10 text-blue-400' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'}`}>
                   {viewMode === "consumer" ? "Unlock Your Potential" : "Enterprise Grade Learning"}
                </div>
                <h1 className="text-6xl font-extrabold tracking-tight text-white lg:text-8xl leading-[0.9]">
                  {viewMode === "consumer" ? (
                    <>Learn without <span className="text-emerald-400 text-glow">limits.</span></>
                  ) : (
                    <>Scale your <span className="text-emerald-400 text-glow">intelligence.</span></>
                  )}
                </h1>
                <p className="max-w-[550px] text-xl leading-relaxed text-slate-400">
                  {viewMode === "consumer" 
                    ? "Start, switch, or advance your career with more than 7,000 courses from world-class universities and companies."
                    : "Empower your team with a centralized learning operating system. Automated onboarding, skill gap analysis, and custom reporting."}
                </p>
                {viewMode === 'organization' && (
                  <div className="flex gap-6 pt-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-300"><BarChart3 className="text-emerald-500" size={18}/> Skill Analytics</div>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-300"><ShieldEllipsis className="text-emerald-500" size={18}/> SSO Integration</div>
                  </div>
                )}
              </div>

              <div className="flex gap-10 border-t border-white/10 pt-10">
                <div className="flex items-center gap-4">
                  <GraduationCap className="text-emerald-500" size={32} />
                  <div><p className="text-xl font-bold text-white">7k+</p><p className="text-[10px] uppercase tracking-widest text-slate-500">Courses</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <Building2 className="text-emerald-500" size={32} />
                  <div><p className="text-xl font-bold text-white">120+</p><p className="text-[10px] uppercase tracking-widest text-slate-500">Partners</p></div>
                </div>
              </div>
            </div>

            {/* Auth Card with key to allow reset */}
            <div ref={authRef} key={authFormKey} className="relative">
              <div className={`absolute -inset-10 blur-[100px] rounded-full transition-all duration-1000 ${isPulsing ? 'bg-emerald-500/40 scale-110' : viewMode === 'organization' ? 'bg-blue-500/20' : 'bg-emerald-500/10'}`} />
              <div className={`relative space-y-6 rounded-[32px] border bg-slate-900/40 p-8 backdrop-blur-xl transition-all duration-500 ${isPulsing ? 'border-emerald-500 scale-[1.03] shadow-[0_0_50px_rgba(16,185,129,0.2)]' : 'border-white/10'}`}>
                <EmailPasswordForm user={null} />
                <div className="relative text-center">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
                  <span className="relative bg-[#0d141f] px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Secure Access</span>
                </div>
                <GoogleAuthButton />
              </div>
            </div>
          </div>
        </section>

        {/* 2. Partner Logos */}
        <section className="border-y border-white/5 bg-white/[0.02] py-12">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <p className="mb-10 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600">Collaborating with Leaders</p>
            <div className="flex flex-wrap justify-center gap-12 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
              {['Google', 'Stanford', 'IBM', 'Meta', 'Yale', 'Microsoft'].map(logo => (
                <span key={logo} className="text-2xl font-black italic text-slate-400 tracking-tighter">{logo}</span>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Featured Courses Grid - ENHANCED HOVER EFFECTS */}
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="text-4xl font-bold text-white tracking-tight mb-4">
                {viewMode === "consumer" ? "Most Popular Certificates" : "Top Training Programs"}
              </h2>
              <p className="text-slate-400">
                {viewMode === "consumer" ? "Explore our top-rated career credentials." : "Recommended for enterprise development."}
              </p>
            </div>
            <Link href="/courses" className="flex items-center gap-2 text-emerald-400 font-bold hover:gap-3 transition-all group">
              Explore Catalog <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayCourses.map((course, i) => (
              <Link 
                href={`/courses/${course.title.toLowerCase().replace(/ /g, '-')}`} 
                key={i} 
                className="group relative rounded-[24px] border border-white/5 bg-white/5 p-4 hover:border-emerald-500/50 hover:bg-white/10 hover:scale-[1.03] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer block"
              >
                <div className={`aspect-video rounded-xl bg-gradient-to-br ${course.color} to-black opacity-80 mb-4 flex items-center justify-center relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  <PlayCircle size={40} className="text-white opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
                </div>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">{course.partner}</p>
                <h3 className="font-bold text-white mb-4 line-clamp-2 h-12 leading-tight group-hover:text-emerald-400 transition-colors">{course.title}</h3>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold border-t border-white/5 pt-4">
                  <span className="flex items-center gap-1 text-yellow-500"><Star size={12} fill="currentColor" /> {course.rating}</span>
                  <span>{course.students} students</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. Why Educatorio Section */}
        <section className="bg-emerald-500/5 py-24 border-y border-emerald-500/10">
          <div className="mx-auto max-w-7xl px-6 grid md:grid-cols-3 gap-12">
            {[
              { icon: Globe, title: "Global Recognition", desc: "Certificates recognized by top Fortune 500 companies." },
              { icon: Zap, title: "Accelerated Learning", desc: "Finish courses at your own pace with modular content." },
              { icon: ShieldCheck, title: "Verified Skills", desc: "Anti-cheat exams and project-based assessments." }
            ].map((feature, i) => (
              <div key={i} className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-black">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Pricing Section */}
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 tracking-tight">Transparent Pricing</h2>
            <p className="text-slate-400">Choose the path that fits your goals.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* Free Starter Card - Full Clickable */}
            <Link href="/pricing/free" className="group block">
              <div className="h-full p-8 rounded-[32px] bg-white/5 border border-white/10 group-hover:border-emerald-500/50 group-hover:bg-white/[0.08] group-hover:scale-[1.02] group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] transition-all duration-300 relative overflow-hidden">
                <h3 className="text-xl font-bold mb-2">Free Starter</h3>
                <p className="text-4xl font-black mb-6">$0<span className="text-sm font-normal text-slate-500">/mo</span></p>
                <ul className="space-y-4 mb-8 text-sm text-slate-400">
                  <li className="flex gap-2"><CheckCircle2 size={18} className="text-emerald-500" /> Audit 5,000+ courses</li>
                  <li className="flex gap-2"><CheckCircle2 size={18} className="text-emerald-500" /> Community Forums</li>
                </ul>
                <div className="w-full text-center py-4 rounded-xl border border-white/10 font-bold group-hover:bg-white group-hover:text-black transition-all duration-300">
                  Get Started
                </div>
              </div>
            </Link>

            {/* Educatorio Plus Card - Full Clickable */}
            <Link href="/pricing/plus" className="group block">
              <div className={`h-full p-8 rounded-[32px] text-black shadow-2xl relative overflow-hidden transition-all duration-300 group-hover:scale-[1.05] group-hover:shadow-[0_30px_60px_rgba(16,185,129,0.3)] ${viewMode === 'organization' ? 'bg-blue-500 shadow-blue-500/20' : 'bg-emerald-500 shadow-emerald-500/20'}`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                  <Users size={120} />
                </div>
                <h3 className="text-xl font-bold mb-2">Educatorio Plus</h3>
                <p className="text-4xl font-black mb-6">$49<span className="text-sm font-normal opacity-60">/mo</span></p>
                <ul className="space-y-4 mb-8 text-sm font-bold">
                  <li className="flex gap-2"><CheckCircle2 size={18} /> Unlimited Professional Certs</li>
                  <li className="flex gap-2"><CheckCircle2 size={18} /> Job matching assistance</li>
                </ul>
                <div className="w-full text-center py-4 rounded-xl bg-black text-white font-bold transition-all group-hover:shadow-2xl group-hover:px-10">
                  Try Free for 7 Days
                </div>
              </div>
            </Link>

          </div>
        </section>

        {/* 6. FAQs */}
        <section className="mx-auto max-w-4xl px-6 py-24 border-t border-white/5">
          <h2 className="text-3xl font-bold text-center mb-12 tracking-tight">Common Questions</h2>
          <div className="space-y-4">
            {[
              { q: "Can I earn a certificate for free?", a: "Most courses can be audited for free, but certificates are part of our Plus subscription or one-time payments." },
              { q: "How does organization billing work?", a: "We offer per-seat licensing for teams starting at 5 members. Contact our sales team for custom enterprise quotes." }
            ].map((item, i) => (
              <details key={i} className="group p-6 rounded-2xl bg-white/5 border border-white/5 cursor-pointer">
                <summary className="font-bold text-white flex justify-between items-center list-none outline-none">
                  {item.q}
                  <ArrowRight size={18} className="group-open:rotate-90 transition-transform text-emerald-400" />
                </summary>
                <p className="text-sm text-slate-400 mt-4 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-black/40 px-6 py-12">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-emerald-500 flex items-center justify-center font-black text-black text-xs">E</div>
            <span className="text-lg font-bold tracking-tighter text-white">Educatorio</span>
          </div>
          <div className="flex gap-8 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">
            <Link href="/privacy" className="hover:text-emerald-400 transition">Privacy</Link>
            <Link href="/terms" className="hover:text-emerald-400 transition">Terms</Link>
            <Link href="/contact" className="hover:text-emerald-400 transition">Contact</Link>
          </div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-slate-700">
            &copy; {new Date().getFullYear()} Educatorio Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}