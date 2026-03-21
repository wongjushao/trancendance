"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { User } from "@supabase/supabase-js";
import { useState } from "react";
import { useRouter } from "next/navigation";

type EmailPasswordDemoProps = {
  user: User | null;
};

type Mode = "signup" | "signin";

export default function EmailPasswordDemo({ user }: EmailPasswordDemoProps) {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setStatus(error.message);
      else setStatus("Account created! Please check your email to confirm.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setStatus(error.message);
      else {
        router.push("/dashboard");
        router.refresh(); // Forces server components to re-fetch user state
      }
    }
    setLoading(false);
  }

  return (
    <div className="w-full">
      <form
        className="relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/40 p-8 text-slate-100 backdrop-blur-xl shadow-2xl"
        onSubmit={handleSubmit}
      >
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-2xl font-bold text-white tracking-tight">
            {mode === "signup" ? "Get Started" : "Welcome Back"}
          </h3>
          <div className="flex rounded-full bg-white/5 p-1 text-[10px] font-black uppercase tracking-wider">
            {(["signup", "signin"] as Mode[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                className={`rounded-full px-4 py-1.5 transition-all duration-300 ${
                  mode === option ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-slate-500"
                }`}
              >
                {option === "signup" ? "Join" : "Login"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3.5 text-sm transition focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3.5 text-sm transition focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-8 w-full rounded-xl bg-emerald-500 py-4 text-sm font-bold text-black transition-all hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? "Processing..." : mode === "signup" ? "Create Free Account" : "Sign In to Educatorio"}
        </button>

        {status && (
          <div className={`mt-6 rounded-lg border p-3 text-center text-xs font-medium ${
            status.includes("confirm") 
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" 
              : "border-red-500/20 bg-red-500/10 text-red-400"
          }`}>
            {status}
          </div>
        )}
      </form>
    </div>
  );
}