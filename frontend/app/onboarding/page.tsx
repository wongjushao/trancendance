"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    username: "",
    phone_number: "",
    birthday: "",
    invited_by: "",
    bio: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: "EN",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // --- BYPASS HANDLER ---
  const handleSkip = () => {
    router.push("/dashboard");
  };

  // --- SIGN OUT HANDLER ---
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error("Session not found. Please log in again.");

      const response = await fetch("/api/auth-service/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...formData,
          invited_by: formData.invited_by.trim() === "" ? null : formData.invited_by, 
        }),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to save profile.");
      } else if (!response.ok) {
        throw new Error(`Server returned error ${response.status}. Check backend logs.`);
      }

      router.refresh();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#02050b] text-white flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      
      <div className="relative w-full max-w-2xl bg-slate-900/40 border border-white/10 backdrop-blur-xl rounded-[32px] p-8 md:p-12 shadow-2xl">
        <header className="mb-10 flex justify-between items-start">
          <div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-black text-xl mb-4">E</div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Complete your profile</h1>
            <p className="text-slate-400 mt-2">Just a few more details to set up your account.</p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <button 
              onClick={handleSignOut}
              className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
            >
              Sign Out
            </button>
            <button 
              onClick={handleSkip}
              className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70 hover:text-emerald-400 transition-colors"
            >
              Skip to Dashboard →
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Username</label>
              <input required name="username" className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3.5 text-sm focus:border-emerald-500/50 outline-none transition" value={formData.username} onChange={handleChange} placeholder="username" />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Phone Number</label>
              <input required name="phone_number" className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3.5 text-sm focus:border-emerald-500/50 outline-none transition" value={formData.phone_number} onChange={handleChange} placeholder="+1 234..." />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Birthday</label>
              <input required name="birthday" type="date" className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3.5 text-sm focus:border-emerald-500/50 outline-none transition [color-scheme:dark]" value={formData.birthday} onChange={handleChange} />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Language</label>
              <select name="language" className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3.5 text-sm focus:border-emerald-500/50 outline-none appearance-none transition" value={formData.language} onChange={handleChange}>
                <option value="EN">English</option>
                <option value="CN">Chinese</option>
                <option value="BM">Malay</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Referral UUID (Optional)</label>
            <input name="invited_by" className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3.5 text-sm focus:border-emerald-500/50 outline-none transition" value={formData.invited_by} onChange={handleChange} placeholder="00000000-0000-0000-0000-000000000000" />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Bio</label>
            <textarea name="bio" rows={3} className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3.5 text-sm focus:border-emerald-500/50 outline-none transition" value={formData.bio} onChange={handleChange} placeholder="Tell us about yourself..." />
          </div>

          {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>}

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-emerald-500 py-4 text-sm font-bold text-black transition-all hover:bg-emerald-400 disabled:opacity-50">
            {loading ? "Creating Profile..." : "Complete Setup"}
          </button>
        </form>
      </div>
    </div>
  );
}