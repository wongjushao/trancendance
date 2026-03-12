"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Search, Bell, Globe, Moon, User, ChevronDown, 
  Settings, CreditCard, Award, HelpCircle, BookOpen, Sparkles,
  MessageSquare, MessageCircleOff // NEW: Messaging Icons
} from "lucide-react";
import SignOutButton from "./SignOutButton";

export default function Navbar({ user }: { user: any }) {
  const pathname = usePathname();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // NEW: State for messaging visibility
  const [isMessagingEnabled, setIsMessagingEnabled] = useState(true);

  if (pathname === "/onboarding") return null;

  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const handleAuthTrigger = () => {
    setActiveDropdown(null);
    window.dispatchEvent(new Event("trigger-auth-focus"));
  };

  const handleLogoClick = () => {
    window.dispatchEvent(new Event("reset-landing-page"));
  };

  // NEW: Toggle messaging event
  const toggleMessaging = () => {
    const newState = !isMessagingEnabled;
    setIsMessagingEnabled(newState);
    // Custom event so the floating bubble knows when to hide/show
    window.dispatchEvent(new CustomEvent("toggle-chat-visibility", { detail: newState }));
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#02050b]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        
        {/* Left: Brand & Explore */}
        <div className="flex items-center gap-8">
          <Link 
            href={user ? "/dashboard" : "/"} 
            onClick={handleLogoClick}
            className="flex items-center gap-2 group"
          >
            <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-black text-lg transition-transform group-hover:scale-110">E</div>
            <span className="text-xl font-bold tracking-tighter text-white">Educatorio</span>
          </Link>
          
          <div className="relative">
            <button 
              onClick={() => toggleDropdown('explore')}
              className="hidden items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 transition md:flex"
            >
              Explore <ChevronDown size={16} className={`transition-transform ${activeDropdown === 'explore' ? 'rotate-180' : ''}`} />
            </button>

            {activeDropdown === 'explore' && (
              <div className="absolute top-12 left-0 w-64 rounded-2xl border border-white/10 bg-[#0a0f18] p-4 shadow-2xl ring-1 ring-emerald-500/20">
                <p className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">Popular Subjects</p>
                <div className="space-y-1">
                  {['Data Science', 'Business', 'Computer Science', 'Personal Development'].map((item) => (
                    <Link key={item} href={`/courses?category=${item.toLowerCase()}`} className="flex items-center gap-3 p-2 text-sm text-slate-300 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition">
                      <BookOpen size={14} /> {item}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md px-8 hidden lg:block">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="What do you want to learn?" 
              className="w-full rounded-2xl border border-white/5 bg-black/20 py-2.5 pl-12 pr-4 text-sm text-white outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/my-learning" className="hidden text-sm font-medium text-slate-400 hover:text-white transition xl:block mr-4">
            My Learning
          </Link>
          
          <div className="flex items-center gap-1 border-r border-white/10 pr-4 mr-1">
            {/* NEW: Chat Toggle Button (Only if logged in) */}
            {user && (
              <button 
                onClick={toggleMessaging} 
                className={`p-2 transition ${isMessagingEnabled ? 'text-emerald-500' : 'text-slate-500'}`}
                title={isMessagingEnabled ? "Disable Chat Bubble" : "Enable Chat Bubble"}
              >
                {isMessagingEnabled ? <MessageSquare size={20} /> : <MessageCircleOff size={20} />}
              </button>
            )}

            <div className="relative">
              <button onClick={() => toggleDropdown('lang')} className="p-2 text-slate-400 hover:text-emerald-400 transition" title="Change Language">
                <Globe size={20} />
              </button>
              {activeDropdown === 'lang' && (
                <div className="absolute top-10 right-0 w-40 rounded-xl border border-white/10 bg-[#0a0f18] p-2 shadow-xl">
                  {['English (EN)', 'Bahasa Melayu (BM)', '中文 (CN)'].map((lang) => (
                    <button key={lang} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/5 rounded-lg">{lang}</button>
                  ))}
                </div>
              )}
            </div>

            <button className="p-2 text-slate-400 hover:text-emerald-400 transition" title="Toggle Theme">
              <Moon size={20} />
            </button>

            <div className="relative">
              <button onClick={() => toggleDropdown('notif')} className="relative p-2 text-slate-400 hover:text-emerald-400 transition">
                <Bell size={20} />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 border-2 border-[#02050b]" />
              </button>
              {activeDropdown === 'notif' && (
                <div className="absolute top-10 right-0 w-80 rounded-2xl border border-white/10 bg-[#0a0f18] p-4 shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                    <p className="font-bold text-sm">Notifications</p>
                    <button className="text-[10px] text-emerald-500 hover:underline">Mark all read</button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-3 p-2 bg-white/5 rounded-xl border border-white/5">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500"><Sparkles size={16}/></div>
                      <div>
                        <p className="text-xs font-bold">New Course for You!</p>
                        <p className="text-[10px] text-slate-500 text-pretty">Based on your interest in React...</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative pl-2">
            <button 
              onClick={() => toggleDropdown('profile')}
              className="h-9 w-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-black transition-colors overflow-hidden"
            >
              <User size={20} />
            </button>

            {activeDropdown === 'profile' && (
              <div className="absolute top-12 right-0 w-64 rounded-2xl border border-white/10 bg-[#0a0f18] shadow-2xl overflow-hidden py-2">
                {!user ? (
                  <div className="p-4 space-y-3">
                    <button onClick={handleAuthTrigger} className="block w-full text-center py-2.5 bg-emerald-500 text-black font-bold rounded-xl text-sm transition hover:scale-[1.02]">Sign In</button>
                    <button onClick={handleAuthTrigger} className="block w-full text-center py-2.5 border border-white/10 text-white font-bold rounded-xl text-sm hover:bg-white/5 transition">Create Account</button>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <div className="px-4 py-3 border-b border-white/5 mb-2">
                      <p className="text-sm font-bold text-white truncate">{user.email}</p>
                      <p className="text-[10px] text-emerald-500 font-black uppercase">Standard Member</p>
                    </div>
                    <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition"><User size={16}/> Profile</Link>
                    <Link href="/purchases" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition"><CreditCard size={16}/> My Purchases</Link>
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition"><Settings size={16}/> Settings</Link>
                    <div className="border-t border-white/5 mt-2 pt-1">
                      <SignOutButton />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}