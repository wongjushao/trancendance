"use client";

import { use } from "react";
import { Users, BookOpen, Settings, UserPlus, Crown } from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// In a real app, you'd fetch this from Supabase based on the ID
const orgData = {
  id: 1,
  name: "Tech University",
  logo: "🎓",
  description: "Leading technology education institution focused on practical learning",
  members: 2847,
  courses: 45,
  role: "Student",
  createdDate: "Jan 15, 2024",
};

const members = [
  { id: 1, name: "Alice Johnson", avatar: "AJ", role: "Admin", joinDate: "2024-01-15", courses: 12 },
  { id: 2, name: "Bob Smith", avatar: "BS", role: "Instructor", joinDate: "2024-02-20", courses: 8 },
  { id: 3, name: "Carol White", avatar: "CW", role: "Student", joinDate: "2024-03-10", courses: 5 },
  { id: 4, name: "David Brown", avatar: "DB", role: "Student", joinDate: "2024-03-15", courses: 3 },
];

const courses = [
  { id: 1, title: "Advanced React", instructor: "Sarah Johnson", students: 234 },
  { id: 2, title: "Backend Development", instructor: "Michael Chen", students: 189 },
  { id: 3, title: "UI/UX Design", instructor: "Emily Rodriguez", students: 312 },
];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrganizationDetailPage({ params }: PageProps) {
  const { id } = use(params);
  
  return (
    <div className="space-y-8 pb-10">
      {/* Organization Header */}
      <GlowCard className="bg-white/[0.02]">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-5xl sm:text-6xl shadow-2xl shadow-purple-500/20 shrink-0">
            {orgData.logo}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 mb-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
                  {orgData.name}
                </h1>
                <p className="text-[#A0A0B5] max-w-xl mb-4 leading-relaxed">
                  {orgData.description}
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-sm font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  Your role: {orgData.role}
                </div>
              </div>
              
              <div className="flex gap-3 shrink-0">
                <GlowButton variant="primary" className="h-11">
                  <UserPlus className="w-4 h-4" />
                  Invite
                </GlowButton>
                <GlowButton variant="secondary" className="px-3 h-11">
                  <Settings className="w-4 h-4" />
                </GlowButton>
              </div>
            </div>
          </div>
        </div>
      </GlowCard>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard icon={Users} label="Total Members" value={orgData.members.toLocaleString()} />
        <StatCard icon={BookOpen} label="Active Courses" value={orgData.courses.toString()} />
        <StatCard icon={Crown} label="Active Since" value={orgData.createdDate} />
      </div>
      
      {/* Content Tabs */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="bg-[#12121A] border border-white/5 p-1 rounded-2xl mb-8">
          <TabsTrigger 
            value="members" 
            className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all"
          >
            <Users className="w-4 h-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger 
            value="courses" 
            className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Courses
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="rounded-xl px-6 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        {/* Members Tab */}
        <TabsContent value="members" className="outline-none focus:ring-0">
          <GlowCard className="border-white/5">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight">Community</h2>
              <span className="text-sm text-[#6B6B80] bg-white/5 px-3 py-1 rounded-lg">
                {members.length} members
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-5 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.03] hover:border-white/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold group-hover:scale-105 transition-transform">
                      {member.avatar}
                    </div>
                    <div>
                      <p className="text-white font-semibold group-hover:text-purple-400 transition-colors">{member.name}</p>
                      <p className="text-[#6B6B80] text-xs">Joined {member.joinDate}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="hidden sm:block text-right">
                      <p className="text-white text-sm font-medium">{member.courses} courses</p>
                      <p className="text-[#6B6B80] text-xs uppercase tracking-wider">{member.role}</p>
                    </div>
                    <GlowButton variant="ghost" className="text-xs">Profile</GlowButton>
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>
        </TabsContent>
        
        {/* Courses Tab */}
        <TabsContent value="courses" className="outline-none focus:ring-0">
          <GlowCard className="border-white/5">
            <h2 className="text-2xl font-bold text-white mb-8 tracking-tight">Active Curriculum</h2>
            <div className="grid grid-cols-1 gap-4">
              {courses.map((course) => (
                <div key={course.id} className="flex items-center justify-between p-5 bg-white/[0.01] border border-white/5 rounded-2xl hover:border-purple-500/30 transition-all group">
                  <div>
                    <p className="text-lg font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">{course.title}</p>
                    <p className="text-[#6B6B80] text-sm">Lead Instructor: <span className="text-[#A0A0B5]">{course.instructor}</span></p>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="hidden sm:inline-block text-[#6B6B80] text-sm">{course.students} enrolled</span>
                    <GlowButton variant="outline" className="text-xs">Course Details</GlowButton>
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>
        </TabsContent>
        
        {/* Settings Tab */}
        <TabsContent value="settings" className="outline-none focus:ring-0">
          <GlowCard className="border-white/5">
            <h2 className="text-2xl font-bold text-white mb-8 tracking-tight">Organization Identity</h2>
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#A0A0B5] ml-1">Official Name</label>
                <input
                  type="text"
                  defaultValue={orgData.name}
                  className="w-full px-5 py-3.5 bg-[#12121A] border border-white/10 rounded-2xl text-white focus:border-purple-500/50 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#A0A0B5] ml-1">About the Institution</label>
                <textarea
                  defaultValue={orgData.description}
                  rows={4}
                  className="w-full px-5 py-3.5 bg-[#12121A] border border-white/10 rounded-2xl text-white focus:border-purple-500/50 outline-none transition-all resize-none"
                />
              </div>
              <div className="pt-4 flex gap-4">
                <GlowButton variant="primary">Save Identity</GlowButton>
                <GlowButton variant="ghost" className="text-red-400 hover:text-red-300">Leave Organization</GlowButton>
              </div>
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}