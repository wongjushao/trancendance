"use client";

import { useState, useEffect } from "react";
import { 
  MessageSquare, X, Maximize2, Send, 
  ChevronLeft, Search, User, CheckCheck,
  Plus, Users, GraduationCap, MessageCircle,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

export default function MessagingBubble({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(true);
  
  // View states: list -> create -> chat
  const [view, setView] = useState<"list" | "chat" | "create">("list");
  const [activeChat, setActiveChat] = useState<any>(null);

  const chats = [
    { id: 1, name: "Dr. Angela Yu", role: "Instructor", lastMsg: "Did you check the new Python resources?", time: "12:30", unread: 1, online: true, avatar: "Y", type: "person" },
    { id: 2, name: "React Basics Group", role: "Community", lastMsg: "Sarah: The useEffect hook is tricky!", time: "Yesterday", unread: 0, online: false, avatar: "R", type: "group" },
  ];

  useEffect(() => {
    const handleToggle = (e: any) => setIsVisible(e.detail);
    window.addEventListener("toggle-chat-visibility", handleToggle);
    return () => window.removeEventListener("toggle-chat-visibility", handleToggle);
  }, []);

  if (!user || !isVisible) return null;

  const handleSelectChat = (chat: any) => {
    setActiveChat(chat);
    setView("chat");
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end">
      
      {isOpen && (
        <div className="mb-4 flex h-[550px] w-[380px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f18] shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          
          {/* DYNAMIC HEADER */}
          <div className="flex items-center justify-between bg-emerald-500 p-4 text-black">
            <div className="flex items-center gap-3">
              {view !== "list" && (
                <button onClick={() => setView(view === "chat" ? "list" : "list")} className="p-1 hover:bg-black/10 rounded-lg transition">
                  <ChevronLeft size={20} />
                </button>
              )}
              <h2 className="font-black uppercase tracking-tighter text-lg">
                {view === "list" && "Messages"}
                {view === "create" && "New Chat"}
                {view === "chat" && activeChat?.name}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/messages" className="p-1 hover:bg-black/10 rounded-lg transition">
                <Maximize2 size={16} />
              </Link>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-black/10 rounded-lg transition">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* VIEW 1: CONVERSATION LIST */}
          {view === "list" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" placeholder="Search..." className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs outline-none focus:border-emerald-500/50 transition-all text-white" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {chats.map((chat) => (
                  <button key={chat.id} onClick={() => handleSelectChat(chat)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all border-b border-white/[0.03]">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-500">{chat.avatar}</div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-xs font-bold text-white truncate">{chat.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{chat.lastMsg}</p>
                    </div>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setView("create")}
                className="m-4 flex items-center justify-center gap-2 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-black text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all uppercase tracking-widest"
              >
                <Plus size={16} /> New Conversation
              </button>
            </div>
          )}

          {/* VIEW 2: CREATE NEW CHAT (The Feature You Asked For) */}
          {view === "create" && (
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4">Select Chat Type</p>
              
              {/* Option 1: Direct Message */}
              <button className="w-full group flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/50 hover:bg-white/[0.08] transition-all">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400"><User size={20} /></div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-white">Direct Message</p>
                  <p className="text-[10px] text-slate-500">Chat 1-on-1 with a peer or tutor</p>
                </div>
                <ArrowRight size={16} className="text-slate-700 group-hover:text-emerald-400 transition-colors" />
              </button>

              {/* Option 2: Private Study Group */}
              <button className="w-full group flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/50 hover:bg-white/[0.08] transition-all">
                <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400"><Users size={20} /></div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-white">Study Group</p>
                  <p className="text-[10px] text-slate-500">Invite specific classmates to a group</p>
                </div>
                <ArrowRight size={16} className="text-slate-700 group-hover:text-emerald-400 transition-colors" />
              </button>

              {/* Option 3: Course-wide Channel */}
              <button className="w-full group flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/50 hover:bg-white/[0.08] transition-all">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400"><GraduationCap size={20} /></div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-white">Course Members</p>
                  <p className="text-[10px] text-slate-500">Broadcast to everyone in your course</p>
                </div>
                <ArrowRight size={16} className="text-slate-700 group-hover:text-emerald-400 transition-colors" />
              </button>
            </div>
          )}

          {/* VIEW 3: ACTIVE CHAT (Existing Logic) */}
          {view === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
                <div className="flex flex-col items-start">
                  <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-white/5 p-3 text-sm text-slate-300 border border-white/5">
                    {activeChat?.lastMsg}
                  </div>
                  <span className="mt-1 text-[10px] text-slate-500 font-bold ml-1">{activeChat?.time}</span>
                </div>
              </div>
              <div className="border-t border-white/5 bg-black/40 p-4">
                <div className="relative flex items-center gap-2">
                  <input type="text" placeholder="Write a message..." className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm outline-none focus:border-emerald-500/50 transition-all text-white" />
                  <button className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center text-black hover:scale-105 transition"><Send size={16} /></button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* FLOATING BUTTON (Keep your existing perfect logic) */}
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          setHasNewMessage(false);
          if (!isOpen) setView("list");
        }}
        className={`group relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${isOpen ? 'bg-white text-black rotate-90' : 'bg-emerald-500 text-black'}`}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        {!isOpen && hasNewMessage && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white border-2 border-[#02050b] animate-bounce">1</span>
        )}
      </button>
    </div>
  );
}