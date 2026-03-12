import EmailPasswordForm from "./components/EmailPasswordForm"
import GoogleAuthButton from "./components/GoogleAuthButton";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to dashboard if session exists
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#02050b] text-slate-100 selection:bg-emerald-500/30">
      {/* Navigation */}
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-black text-xl">E</div>
          <span className="text-2xl font-bold tracking-tighter text-white">Educatorio</span>
        </div>
        <div className="hidden gap-8 text-sm font-medium text-slate-400 md:flex">
          <a href="#" className="hover:text-white transition">Courses</a>
          <a href="#" className="hover:text-white transition">Programs</a>
          <a href="#" className="hover:text-white transition">For Business</a>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-6 py-12">
        <div className="grid gap-16 lg:grid-cols-[1.2fr_400px] items-center">
          
          {/* Left Side: Branding */}
          <section className="space-y-10">
            <div className="space-y-6">
              <h1 className="text-6xl font-extrabold tracking-tight text-white lg:text-8xl leading-[0.9]">
                Learn without <br />
                <span className="text-emerald-400">limits.</span>
              </h1>
              <p className="max-w-[500px] text-xl leading-relaxed text-slate-400">
                Start, switch, or advance your career with more than 7,000 courses, Professional Certificates, and degrees from world-class universities and companies.
              </p>
            </div>

            <div className="flex gap-10 border-t border-white/10 pt-10">
              <div>
                <p className="text-3xl font-bold text-white">7k+</p>
                <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">Courses</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">120+</p>
                <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">Partners</p>
              </div>
            </div>
          </section>

          {/* Right Side: Authentication */}
          <div className="relative">
            {/* Ambient background glow */}
            <div className="absolute -inset-10 bg-emerald-500/10 blur-[100px] rounded-full opacity-40" />
            
            <div className="relative space-y-6">
              <EmailPasswordForm user={null} />
              
              <div className="relative text-center">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10"></span>
                </div>
                <span className="relative bg-[#02050b] px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Secure Social Login
                </span>
              </div>

              <GoogleAuthButton />
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-12 text-center text-[11px] font-medium uppercase tracking-widest text-slate-700">
        &copy; {new Date().getFullYear()} Educatorio
      </footer>
    </div>
  );
}