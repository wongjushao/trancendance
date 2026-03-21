"use client";

import { Camera, Mail, MapPin, Link as LinkIcon, Calendar, Edit, Award, CheckCircle } from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

const userData = {
  name: "John Doe",
  email: "john.doe@example.com",
  avatar: "JD",
  role: "Student",
  location: "San Francisco, CA",
  website: "johndoe.com",
  bio: "Passionate learner focused on web development and design. Always looking to expand my skills and knowledge.",
  joinDate: "January 2024",
  coursesCompleted: 8,
  currentCourses: 3,
  certificates: 5,
};

const recentActivity = [
  { id: 1, type: "completed", text: "Completed Advanced React Development", date: "Mar 1, 2026", icon: CheckCircle },
  { id: 2, type: "enrolled", text: "Enrolled in Python for Data Science", date: "Feb 28, 2026", icon: LinkIcon },
  { id: 3, type: "achievement", text: "Earned Course Master badge", date: "Feb 25, 2026", icon: Award },
  { id: 4, type: "grade", text: "Scored 95% on UI/UX Case Study", date: "Feb 20, 2026", icon: Edit },
];

const certificates = [
  { id: 1, course: "Advanced React Development", issueDate: "Mar 1, 2026", instructor: "Sarah Johnson" },
  { id: 2, course: "UI/UX Design Fundamentals", issueDate: "Feb 15, 2026", instructor: "Emily Rodriguez" },
  { id: 3, course: "Backend with Node.js", issueDate: "Jan 28, 2026", instructor: "Michael Chen" },
];

export default function ProfilePage() {
  return (
    <div className="space-y-8 pb-12">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlowCard className="overflow-hidden border-white/5 bg-white/[0.02]">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 transition-transform duration-500 group-hover:scale-105">
                <span className="text-white font-black text-4xl tracking-tighter">{userData.avatar}</span>
              </div>
              <button className="absolute -bottom-2 -right-2 w-11 h-11 bg-[#1A1A24] border border-white/10 text-purple-400 rounded-2xl flex items-center justify-center shadow-xl hover:bg-purple-500 hover:text-white transition-all duration-300">
                <Camera className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">{userData.name}</h1>
                  <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-[#A0A0B5]">
                    <span className="flex items-center gap-2 text-sm bg-white/5 px-3 py-1 rounded-lg">
                      <Mail className="w-4 h-4 text-purple-400" />
                      {userData.email}
                    </span>
                    <span className="flex items-center gap-2 text-sm bg-white/5 px-3 py-1 rounded-lg">
                      <MapPin className="w-4 h-4 text-purple-400" />
                      {userData.location}
                    </span>
                  </div>
                </div>
                <GlowButton variant="secondary" className="px-6 h-12">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </GlowButton>
              </div>
              
              <p className="text-[#A0A0B5] mb-6 leading-relaxed max-w-2xl text-lg">
                {userData.bio}
              </p>
              
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-4">
                <div className="px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-bold uppercase tracking-widest">
                  {userData.role}
                </div>
                <span className="text-[#6B6B80] text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Joined {userData.joinDate}
                </span>
              </div>
            </div>
          </div>
        </GlowCard>
      </motion.div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard icon={CheckCircle} label="Courses Completed" value={userData.coursesCompleted.toString()} />
        <StatCard icon={LinkIcon} label="Current Enrollment" value={userData.currentCourses.toString()} />
        <StatCard icon={Award} label="Certificates Earned" value={userData.certificates.toString()} />
      </div>
      
      {/* Content Tabs */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="bg-[#12121A] border border-white/5 p-1.5 rounded-2xl mb-8 inline-flex">
          <TabsTrigger value="activity" className="rounded-xl px-8 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">
            Activity
          </TabsTrigger>
          <TabsTrigger value="certificates" className="rounded-xl px-8 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">
            Certificates
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl px-8 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">
            Settings
          </TabsTrigger>
        </TabsList>
        
        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-0 outline-none">
          <GlowCard className="border-white/5">
            <h2 className="text-2xl font-bold text-white mb-8 tracking-tight">Recent Learning Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <motion.div 
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-5 p-5 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.03] transition-all group"
                >
                  <div className="p-3 bg-[#12121A] rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                    <activity.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium group-hover:text-purple-400 transition-colors">{activity.text}</p>
                    <p className="text-[#6B6B80] text-xs font-mono uppercase mt-1">{activity.date}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlowCard>
        </TabsContent>
        
        {/* Certificates Tab */}
        <TabsContent value="certificates" className="mt-0 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((cert) => (
              <GlowCard key={cert.id} className="group border-white/5 hover:border-purple-500/30 transition-all">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-4 bg-purple-500/10 rounded-2xl">
                    <Award className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="text-right">
                    <p className="text-[#6B6B80] text-xs uppercase font-bold tracking-tighter">Verified</p>
                    <p className="text-purple-400 text-xs font-mono">{cert.id.toString().padStart(4, '0')}</p>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-purple-400 transition-colors">{cert.course}</h3>
                <p className="text-[#6B6B80] text-sm mb-6">Instructor: {cert.instructor}</p>
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <span className="text-[#A0A0B5] text-xs">{cert.issueDate}</span>
                  <GlowButton variant="outline" className="text-xs h-9">Download PDF</GlowButton>
                </div>
              </GlowCard>
            ))}
          </div>
        </TabsContent>
        
        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-0 outline-none">
          <GlowCard className="border-white/5">
            <h2 className="text-2xl font-bold text-white mb-8 tracking-tight">Public Presence</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#A0A0B5] ml-1">Full Name</label>
                <Input defaultValue={userData.name} className="h-12 bg-[#12121A] border-white/10 text-white rounded-xl focus:ring-purple-500/20" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#A0A0B5] ml-1">Email Address</label>
                <Input defaultValue={userData.email} className="h-12 bg-[#12121A] border-white/10 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#A0A0B5] ml-1">Geographic Location</label>
                <Input defaultValue={userData.location} className="h-12 bg-[#12121A] border-white/10 text-white rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#A0A0B5] ml-1">Personal Website</label>
                <Input defaultValue={userData.website} className="h-12 bg-[#12121A] border-white/10 text-white rounded-xl" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-[#A0A0B5] ml-1">Professional Bio</label>
                <textarea
                  defaultValue={userData.bio}
                  rows={4}
                  className="w-full px-5 py-4 bg-[#12121A] border border-white/10 rounded-2xl text-white focus:border-purple-500/50 outline-none transition-all resize-none"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <GlowButton variant="primary" className="px-8 h-12">Save Profile</GlowButton>
              <GlowButton variant="ghost" className="px-8 h-12 text-[#6B6B80]">Revert Changes</GlowButton>
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}