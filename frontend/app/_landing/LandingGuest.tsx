"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  Building2,
  GraduationCap,
  Users,
  ArrowRight,
  PlayCircle,
  Star,
  Globe,
  ShieldCheck,
  Zap,
  BarChart3,
  ShieldEllipsis,
  BookOpen,
  TrendingUp,
  Award,
  ChevronRight,
  Clock,
  Target,
  Sparkles,
  Briefcase,
  UserCircle,
} from "lucide-react";

export default function LandingGuest() {
  // 🔵 MOCK DATA - Replace with real data from your database later
  const consumerCourses = [
    { 
      title: "Google Data Analytics", 
      partner: "Google", 
      students: "1.2M", 
      rating: "4.8", 
      color: "from-blue-500",
      duration: "6 months",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=338&fit=crop",
    },
    { 
      title: "AI for Everyone", 
      partner: "DeepLearning.AI", 
      students: "800k", 
      rating: "4.9", 
      color: "from-purple-500",
      duration: "3 months",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=338&fit=crop",
    },
    { 
      title: "Financial Markets", 
      partner: "Yale University", 
      students: "500k", 
      rating: "4.7", 
      color: "from-emerald-500",
      duration: "4 months",
      image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=338&fit=crop",
    },
    { 
      title: "Python for Everybody", 
      partner: "Uni. of Michigan", 
      students: "2.5M", 
      rating: "4.9", 
      color: "from-yellow-500",
      duration: "8 months",
      image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600&h=338&fit=crop",
    },
  ];

  // 🔵 MOCK DATA - Replace with real data from your database later
  const orgCourses = [
    { 
      title: "Strategic Leadership", 
      partner: "Dartmouth", 
      students: "40k", 
      rating: "4.9", 
      color: "from-indigo-600",
      duration: "8 weeks",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=338&fit=crop",
    },
    { 
      title: "Change Management", 
      partner: "IBM", 
      students: "15k", 
      rating: "4.8", 
      color: "from-slate-600",
      duration: "6 weeks",
      image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=338&fit=crop",
    },
    { 
      title: "Cloud Security Architecture", 
      partner: "Microsoft", 
      students: "90k", 
      rating: "4.7", 
      color: "from-cyan-600",
      duration: "12 weeks",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=338&fit=crop",
    },
    { 
      title: "Supply Chain Operations", 
      partner: "Rutgers", 
      students: "30k", 
      rating: "4.8", 
      color: "from-orange-600",
      duration: "10 weeks",
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=338&fit=crop",
    },
  ];

  // 🔵 MOCK DATA - Replace with real categories from your database later
  const categories = [
    { icon: BookOpen, label: "Data Science", count: "425 courses" },
    { icon: TrendingUp, label: "Business", count: "310 courses" },
    { icon: Zap, label: "Technology", count: "680 courses" },
    { icon: Award, label: "Personal Dev.", count: "215 courses" },
  ];

  // 🔵 MOCK DATA - Replace with real benefits from your CMS later
  const benefits = [
    { icon: Target, title: "Learn from experts", description: "Industry-leading instructors from top companies" },
    { icon: Clock, title: "Flexible schedule", description: "Learn at your own pace, anytime, anywhere" },
    { icon: Award, title: "Shareable certificates", description: "Earn career credentials recognized worldwide" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#0B0B0F] via-[#0F0F1A] to-[#1A0B2E] text-white">
      
      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0B0B0F]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 transition-all duration-300 group-hover:scale-105 group-hover:shadow-purple-500/50">
                <span className="font-black text-white text-lg">E</span>
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent group-hover:to-white transition-all duration-300">
                Educatorio
              </span>
            </Link>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="relative hidden sm:inline-flex px-5 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white border border-white/10 hover:border-purple-500/40 transition-all duration-300 hover:scale-105 hover:bg-purple-500/5 group overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="absolute inset-0 rounded-xl bg-purple-500/0 group-hover:bg-purple-500/5 transition-all duration-300" />
                <span className="relative flex items-center gap-1">Log In</span>
              </Link>
              
              <Link
                href="/register"
                className="relative inline-flex px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-500 via-pink-500 to-violet-600 shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:shadow-purple-500/50 group overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="absolute -inset-1 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-30 blur-md transition-opacity duration-300 -z-10" />
                <span className="absolute inset-0 rounded-xl bg-purple-500 opacity-0 group-hover:opacity-20 group-hover:animate-ping" />
                <span className="relative flex items-center gap-2">
                  Sign Up
                  <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        
        {/* ── 1. HERO SECTION ── */}
        <section className="relative overflow-hidden">
          {/* Animated Background Blobs */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-pink-600/15 rounded-full blur-[120px] animate-pulse animation-delay-2000" />
          <div className="absolute bottom-0 left-1/2 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] animate-pulse animation-delay-4000" />

          <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-24">
            
            {/* Main Title */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 mb-6">
                <Sparkles size={14} className="text-purple-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                  Trusted by 15M+ learners & 5,000+ companies
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.1] mb-6">
                Learn the{" "}
                <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-violet-500 bg-clip-text text-transparent animate-gradient">
                  skills
                </span>{" "}
                of tomorrow
              </h1>
              <p className="text-xl text-transparent bg-gradient-to-r from-gray-300 to-gray-400 bg-clip-text max-w-2xl mx-auto leading-relaxed">
                Start your journey to career success with expert-led courses from world-class institutions, 
                or empower your team with enterprise-grade learning solutions.
              </p>
            </div>

            {/* TWO COLUMN LAYOUT */}
            <div className="grid lg:grid-cols-2 gap-8">
              
              {/* LEFT COLUMN - Individual */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500 group-hover:scale-105" />
                
                <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent p-8 hover:border-blue-500/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10">
                  
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30">
                      <UserCircle size={28} className="text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">For Individuals</h2>
                      <p className="text-sm text-blue-300/70">Learn at your own pace</p>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {[
                      "Access 7,000+ world-class courses",
                      "Earn recognized certificates",
                      "Learn at your own pace, anywhere",
                      "Cancel subscription anytime",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-gray-300">
                        <CheckCircle2 size={18} className="text-blue-400 shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register"
                    className="flex w-full items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 shadow-lg transition-all hover:scale-105 group"
                  >
                    Start Learning Now
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>

              {/* RIGHT COLUMN - Organization */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500 group-hover:scale-105" />
                
                <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-transparent p-8 hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10">
                  
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
                      <Briefcase size={28} className="text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">For Organizations</h2>
                      <p className="text-sm text-purple-300/70">Empower your team</p>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {[
                      "Skill gap analysis & reporting",
                      "SSO integration & team management",
                      "Custom learning paths",
                      "Dedicated account support",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-gray-300">
                        <CheckCircle2 size={18} className="text-purple-400 shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register"
                    className="flex w-full items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 shadow-lg transition-all hover:scale-105 group"
                  >
                    Get Started
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Trust Stats */}
            <div className="flex flex-wrap justify-center gap-12 mt-16 pt-8 border-t border-white/10">
              {[
                { icon: GraduationCap, value: "7,000+", label: "Courses", color: "text-purple-400" },
                { icon: Building2, value: "250+", label: "Partners", color: "text-blue-400" },
                { icon: Users, value: "15M+", label: "Learners", color: "text-emerald-400" },
                { icon: Globe, value: "190+", label: "Countries", color: "text-amber-400" },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 group-hover:scale-110 transition-transform">
                    <stat.icon size={20} className={stat.color} />
                  </div>
                  <div>
                    <div className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-xs text-gray-500">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 2. PARTNER LOGOS ── */}
        <section className="border-y border-white/5 bg-white/[0.02] py-16">
          <div className="mx-auto max-w-7xl px-6">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400 mb-12">
              Trusted by industry leaders worldwide
            </p>
            
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8">
              <div className="transition-all duration-300 hover:scale-110 cursor-pointer hover:drop-shadow-lg hover:drop-shadow-purple-500/30">
                <div className="flex items-center gap-0 text-2xl font-medium tracking-tight">
                  <span className="text-[#4285F4] drop-shadow-glow-blue">G</span>
                  <span className="text-[#EA4335] drop-shadow-glow-red">o</span>
                  <span className="text-[#FBBC05] drop-shadow-glow-yellow">o</span>
                  <span className="text-[#4285F4] drop-shadow-glow-blue">g</span>
                  <span className="text-[#34A853] drop-shadow-glow-green">l</span>
                  <span className="text-[#EA4335] drop-shadow-glow-red">e</span>
                </div>
              </div>

              <div className="transition-all duration-300 hover:scale-110 cursor-pointer">
                <span className="font-serif text-2xl font-bold text-[#8C1515] tracking-tight hover:drop-shadow-lg hover:drop-shadow-red-500/30">
                  Stanford
                </span>
              </div>

              <div className="transition-all duration-300 hover:scale-110 cursor-pointer">
                <span className="font-sans text-2xl font-black text-[#052FAD] tracking-tighter hover:drop-shadow-lg hover:drop-shadow-blue-500/30">
                  IBM
                </span>
              </div>

              <div className="transition-all duration-300 hover:scale-110 cursor-pointer">
                <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-[#0064E1] to-[#0081FB] bg-clip-text text-transparent hover:drop-shadow-lg hover:drop-shadow-blue-500/30">
                  Meta
                </span>
              </div>

              <div className="transition-all duration-300 hover:scale-110 cursor-pointer">
                <span className="font-serif text-2xl font-bold text-[#00356B] tracking-tight hover:drop-shadow-lg hover:drop-shadow-blue-500/30">
                  Yale
                </span>
              </div>

              <div className="transition-all duration-300 hover:scale-110 cursor-pointer">
                <div className="flex items-center gap-0 text-2xl font-bold tracking-tight">
                  <span className="text-[#F25022] drop-shadow-glow-red">M</span>
                  <span className="text-[#7FBA00] drop-shadow-glow-green">i</span>
                  <span className="text-[#00A4EF] drop-shadow-glow-blue">c</span>
                  <span className="text-[#FFB900] drop-shadow-glow-yellow">r</span>
                  <span className="text-[#F25022] drop-shadow-glow-red">o</span>
                  <span className="text-[#7FBA00] drop-shadow-glow-green">s</span>
                  <span className="text-[#00A4EF] drop-shadow-glow-blue">o</span>
                  <span className="text-[#FFB900] drop-shadow-glow-yellow">f</span>
                  <span className="text-[#F25022] drop-shadow-glow-red">t</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. FEATURED COURSES ── */}
        <section className="mx-auto max-w-7xl px-6 pb-24">
          {/* Individual Courses Section */}
          <div className="mb-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <UserCircle size={24} className="text-purple-400" />
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">
                    Popular for Individuals
                  </h2>
                </div>
                <p className="text-gray-400 border-l-4 border-purple-500 pl-4">Explore our top-rated career credentials</p>
              </div>
              <Link href="/courses" className="flex items-center gap-2 text-purple-400 font-semibold hover:gap-3 transition-all group">
                View more
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {consumerCourses.map((course, i) => (
                <Link
                  href={`/courses/${course.title.toLowerCase().replace(/ /g, "-")}`}
                  key={i}
                  className="group relative rounded-2xl border border-white/10 bg-[#1A1A24] overflow-hidden hover:border-purple-500/40 hover:scale-[1.02] transition-all duration-300"
                >
                  <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
                    <Image
                      src={course.image}
                      alt={course.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-purple-500/90 flex items-center justify-center">
                        <PlayCircle size={28} className="text-white ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">{course.partner}</p>
                    <h3 className="font-bold text-white text-base mb-3 line-clamp-2 group-hover:text-purple-300 transition-colors">{course.title}</h3>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <div className="flex">
                          {[...Array(5)].map((_, idx) => (
                            <Star key={idx} size={14} className={idx < Math.floor(parseFloat(course.rating)) ? "text-yellow-400 fill-yellow-400" : "text-gray-600"} />
                          ))}
                        </div>
                        <span className="text-gray-400 text-xs ml-1">{course.rating}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                        <Users size={12} />
                        <span>{course.students}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{course.duration}</span>
                      </div>
                      <span className="text-purple-400 font-semibold">Enroll Now →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Organization Courses Section */}
          <div>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase size={24} className="text-purple-400" />
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">
                    Top for Organizations
                  </h2>
                </div>
                <p className="text-gray-400 border-l-4 border-purple-500 pl-4">Recommended for enterprise development</p>
              </div>
              <Link href="/organizations" className="flex items-center gap-2 text-purple-400 font-semibold hover:gap-3 transition-all group">
                View more
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {orgCourses.map((course, i) => (
                <Link
                  href={`/courses/${course.title.toLowerCase().replace(/ /g, "-")}`}
                  key={i}
                  className="group relative rounded-2xl border border-white/10 bg-[#1A1A24] overflow-hidden hover:border-purple-500/40 hover:scale-[1.02] transition-all duration-300"
                >
                  <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
                    <Image
                      src={course.image}
                      alt={course.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-purple-500/90 flex items-center justify-center">
                        <PlayCircle size={28} className="text-white ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">{course.partner}</p>
                    <h3 className="font-bold text-white text-base mb-3 line-clamp-2 group-hover:text-purple-300 transition-colors">{course.title}</h3>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <div className="flex">
                          {[...Array(5)].map((_, idx) => (
                            <Star key={idx} size={14} className={idx < Math.floor(parseFloat(course.rating)) ? "text-yellow-400 fill-yellow-400" : "text-gray-600"} />
                          ))}
                        </div>
                        <span className="text-gray-400 text-xs ml-1">{course.rating}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                        <Users size={12} />
                        <span>{course.students}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{course.duration}</span>
                      </div>
                      <span className="text-purple-400 font-semibold">Get Started →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. BENEFITS SECTION ── */}
        <section className="bg-gradient-to-b from-purple-500/5 to-transparent py-24 border-y border-purple-500/10">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                Invest In Your Career
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Join millions who've transformed their careers with our platform
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {benefits.map((benefit, i) => (
                <div key={i} className="text-center p-6 rounded-2xl bg-gradient-to-br from-white/5 to-purple-500/5 border border-white/10 hover:border-transparent hover:bg-gradient-to-br hover:from-purple-500/20 hover:to-pink-500/20 transition-all group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                      <benefit.icon size={28} className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{benefit.title}</h3>
                    <p className="text-gray-400">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. PRICING ── */}
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              Plans
            </h2>
            <p className="text-gray-400 text-lg">Choose the path that fits your goals</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="h-full p-8 rounded-2xl bg-[#1A1A24] border border-white/10 hover:border-purple-500/40 hover:scale-105 transition-all duration-300">
              <h3 className="text-2xl font-bold text-white mb-2">Free Starter</h3>
              <p className="text-5xl font-bold text-white mb-6">$0<span className="text-lg text-gray-400">/mo</span></p>
              <ul className="space-y-3 mb-8">
                <li className="flex gap-2 text-gray-300"><CheckCircle2 size={18} className="text-purple-400 shrink-0" /> Audit 5,000+ courses</li>
                <li className="flex gap-2 text-gray-300"><CheckCircle2 size={18} className="text-purple-400 shrink-0" /> Community Forums</li>
                <li className="flex gap-2 text-gray-300"><CheckCircle2 size={18} className="text-purple-400 shrink-0" /> Basic certificates</li>
              </ul>
              <Link href="/register" className="flex w-full items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white border border-white/20 hover:border-purple-500/40 hover:bg-purple-500/10 transition-all">
                Get Started
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="relative h-full p-8 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-violet-700 text-white shadow-2xl shadow-purple-500/30 hover:scale-105 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-white/10 to-purple-500/0 -translate-x-full animate-shimmer" />
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 backdrop-blur-sm text-xs font-bold text-white shadow-lg">
                🔥 Most Popular
              </div>
              <h3 className="text-2xl font-bold mb-2">Educatorio Plus</h3>
              <p className="text-5xl font-black mb-6">$49<span className="text-lg opacity-80">/mo</span></p>
              <ul className="space-y-3 mb-8">
                <li className="flex gap-2"><CheckCircle2 size={18} className="shrink-0" /> Unlimited professional certs</li>
                <li className="flex gap-2"><CheckCircle2 size={18} className="shrink-0" /> Job matching assistance</li>
                <li className="flex gap-2"><CheckCircle2 size={18} className="shrink-0" /> Offline viewing</li>
              </ul>
              <Link href="/register" className="flex w-full items-center justify-center gap-2 py-3 rounded-xl bg-white text-purple-600 font-bold hover:bg-gray-100 transition-all">
                Start Free Trial
              </Link>
              <p className="text-center text-xs opacity-80 mt-4">Cancel anytime • 14-day free trial</p>
            </div>
          </div>
        </section>

        {/* ── 7. FAQ SECTION ── */}
        <section className="mx-auto max-w-4xl px-6 py-24 border-t border-white/10">
          <h2 className="text-4xl font-bold text-center mb-12 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {[
              { q: "Can I earn a certificate for free?", a: "Most courses can be audited for free, but certificates are part of our Plus subscription or one-time payments." },
              { q: "How does organization billing work?", a: "We offer per-seat licensing for teams starting at 5 members. Contact our sales team for custom enterprise quotes." },
              { q: "Is there a mobile app?", a: "Yes! Educatorio is available on iOS and Android, so you can learn on the go at your own pace." },
              { q: "Can I cancel my subscription anytime?", a: "Absolutely. You can cancel your subscription at any time with no questions asked." },
            ].map((item, i) => (
              <details key={i} className="group rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all">
                <summary className="font-semibold text-white flex justify-between items-center cursor-pointer list-none">
                  <span className="group-hover:text-purple-300 transition-colors">{item.q}</span>
                  <ChevronRight size={18} className="group-open:rotate-90 transition-transform text-purple-400" />
                </summary>
                <p className="text-gray-400 mt-4 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <Link
              href="/faq"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all duration-300 group"
            >
              <span>View more</span>
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/10 bg-black/40 pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
            
            <div className="col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <span className="font-black text-white text-sm">E</span>
                </div>
                <span className="text-lg font-bold text-white">Educatorio</span>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Transform your future through learning
              </p>
              <div className="flex gap-3">
                <a href="#" className="w-8 h-8 rounded-full bg-white/5 hover:bg-purple-500/20 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-white/5 hover:bg-purple-500/20 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 0021.928-11.5c0-.213-.005-.425-.015-.636A10.04 10.04 0 0024 4.59z"/></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-white/5 hover:bg-purple-500/20 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451c.979 0 1.771-.773 1.771-1.729V1.729C24 .774 23.204 0 22.225 0z"/></svg>
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Resources</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/contact" className="hover:text-purple-400 transition">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/privacy" className="hover:text-purple-400 transition">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-purple-400 transition">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span>© {new Date().getFullYear()} Educatorio, Inc.</span>
              <span className="hidden md:inline">•</span>
              <span>All rights reserved</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}