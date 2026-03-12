import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  BookOpen, Clock, Trophy, PlayCircle, ChevronRight, LayoutDashboard, 
  Settings, Flame, Search, Sparkles, Users, Star, ArrowUpRight, TrendingUp,
  UserCircle, LogOut
} from "lucide-react";
import SignOutButton from "../components/SignOutButton";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  // Your existing data
  const activeCourses = [
    { title: "Google Data Analytics", progress: 65, instructor: "Google", lastAccessed: "2 hours ago", color: "from-blue-500" },
    { title: "AI for Everyone", progress: 12, instructor: "Andrew Ng", lastAccessed: "Yesterday", color: "from-purple-500" },
  ];

  // New Recommended Data
  const recommended = [
    { title: "Python for Data Science", partner: "IBM", students: "1.2M", rating: "4.8", trend: "+24%", color: "from-emerald-500" },
    { title: "Advanced React Patterns", partner: "Meta", students: "800k", rating: "4.9", trend: "+12%", color: "from-cyan-500" },
  ];

  return (
    <div className="flex min-h-screen bg-[#02050b] text-slate-100">
      
      {/* 1. SIDEBAR - Responsive */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/5 bg-black/20 p-6 sticky top-0 h-screen">
        <div className="space-y-8">
          <div className="space-y-2">
            <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Menu</p>
            <nav className="space-y-1">
              <Link href="/dashboard" className="flex items-center gap-3 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]">
                <LayoutDashboard size={18} /> Dashboard
              </Link>
              <Link href="/dashboard/courses" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-400 hover:bg-white/5 hover:text-white transition">
                <BookOpen size={18} /> My Learning
              </Link>
              <Link href="/dashboard/certificates" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-400 hover:bg-white/5 hover:text-white transition">
                <Trophy size={18} /> Certificates
              </Link>
            </nav>
          </div>
          
          <div className="space-y-2">
            <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Account</p>
            <nav className="space-y-1">
              {/* Dropdown Style Links */}
              <Link href="/settings" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-400 hover:bg-white/5 hover:text-white transition">
                <Settings size={18} /> Settings
              </Link>
              <div className="px-2 pt-2 border-t border-white/5 mt-2">
                <SignOutButton />
              </div>
            </nav>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT */}
      <main className="flex-1 px-6 py-10 lg:px-12 overflow-y-auto">
        <div className="mx-auto max-w-6xl">
          
          {/* Header Section (Existing with Search) */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
                Welcome back, <span className="text-emerald-400">{profile?.username || "Learner"}</span>!
              </h1>
              <p className="text-slate-400 flex items-center gap-2">
                You're on a <span className="text-white font-bold">5 day</span> learning streak. 
                <Flame size={16} className="text-orange-500" />
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search courses..." 
                  className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-all w-full md:w-64"
                />
              </div>
              <Link href="/courses" className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2 text-sm font-bold text-black hover:scale-105 transition-all shadow-lg shadow-emerald-500/20">
                Explore
              </Link>
            </div>
          </header>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left/Middle Column */}
            <div className="lg:col-span-2 space-y-12">
              
              {/* Existing Stats Grid */}
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "In Progress", value: "2", icon: Clock, color: "text-blue-400" },
                  { label: "Completed", value: "12", icon: Trophy, color: "text-yellow-400" },
                  { label: "Hours spent", value: "48h", icon: PlayCircle, color: "text-emerald-400" },
                ].map((stat, i) => (
                  <div key={i} className="p-5 rounded-[20px] bg-white/5 border border-white/10 relative overflow-hidden group">
                    <stat.icon className={`absolute -right-2 -bottom-2 opacity-10 ${stat.color}`} size={60} />
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">{stat.label}</p>
                    <p className="text-2xl font-black text-white">{stat.value}</p>
                  </div>
                ))}
              </section>

              {/* Existing Active Courses Section */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Continue Learning</h2>
                  <Link href="/dashboard/my-learning" className="text-sm font-bold text-emerald-400 hover:underline">View all</Link>
                </div>
                <div className="grid gap-4">
                  {activeCourses.map((course, i) => (
                    <Link 
                      href={`/learn/${course.title.toLowerCase().replace(/ /g, '-')}`} 
                      key={i}
                      className="group flex flex-col md:flex-row items-center gap-6 p-5 rounded-[24px] bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-white/[0.08] transition-all"
                    >
                      <div className={`h-16 w-full md:w-24 rounded-xl bg-gradient-to-br ${course.color} to-black flex-shrink-0 flex items-center justify-center`}>
                        <PlayCircle className="text-white opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                      <div className="flex-1 w-full">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{course.title}</h3>
                          <span className="text-[11px] text-slate-500 font-bold">{course.lastAccessed}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${course.progress}%` }} />
                          </div>
                          <span className="text-xs font-bold text-white">{course.progress}%</span>
                        </div>
                      </div>
                      <ChevronRight size={20} className="hidden md:block text-slate-600 group-hover:text-emerald-400 transition-all" />
                    </Link>
                  ))}
                </div>
              </section>

              {/* NEW: Recommended Courses Section */}
              <section>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Sparkles className="text-emerald-400" size={20} /> Picked for You
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {recommended.map((course, i) => (
                    <div key={i} className="group p-5 rounded-[24px] bg-white/5 border border-white/5 hover:border-emerald-500/20 hover:bg-white/[0.08] transition-all relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{course.partner}</p>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <TrendingUp size={12} /> {course.trend}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm mb-4 line-clamp-1">{course.title}</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                           <span className="flex items-center gap-1 text-yellow-500"><Star size={12} fill="currentColor" /> {course.rating}</span>
                           <span>{course.students} students</span>
                        </div>
                        <button className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-all">
                          <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column: Social & Roadmap */}
            <div className="space-y-8">
              {/* Skill Roadmap Feature */}
              <section className="p-6 rounded-[24px] bg-gradient-to-b from-white/5 to-transparent border border-white/10">
                <h3 className="text-sm font-bold mb-6 text-white uppercase tracking-tighter">Your Skill Path</h3>
                <div className="relative space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-black text-black">1</div>
                    <p className="text-xs font-bold text-white">Foundations</p>
                    <p className="text-[10px] text-emerald-500 font-bold uppercase">Done</p>
                  </div>
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-[10px] font-black text-emerald-500">2</div>
                    <p className="text-xs font-bold text-white">Advanced Analysis</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Active</p>
                  </div>
                </div>
              </section>

              {/* Social Proof Feature */}
              <section className="p-6 rounded-[24px] bg-white/5 border border-white/10">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-white"><Users size={16} className="text-blue-400" /> Community</h3>
                <p className="text-xs text-slate-400 mb-4 font-medium">1.2k others are studying Data Science right now.</p>
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-[#02050b] bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                  <div className="h-8 w-8 rounded-full border-2 border-[#02050b] bg-white/10 flex items-center justify-center text-[10px] font-bold">+24</div>
                </div>
              </section>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}