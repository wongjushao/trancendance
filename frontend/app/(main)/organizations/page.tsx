// frontend/app/(main)/organizations/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Users, Plus, TrendingUp, Home } from "lucide-react";
import { GlowCard, StatCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { motion } from "framer-motion";

const organizations = [
  {
    id: 1,
    name: "Tech University",
    logo: "🎓",
    members: 2847,
    courses: 45,
    role: "Student",
    description: "Leading technology education institution",
  },
  {
    id: 2,
    name: "DevCorp Training",
    logo: "💻",
    members: 1523,
    courses: 28,
    role: "Admin",
    description: "Corporate development training platform",
  },
  {
    id: 3,
    name: "Design Academy",
    logo: "🎨",
    members: 892,
    courses: 32,
    role: "Instructor",
    description: "Creative design and UX courses",
  },
];

export default function OrganizationsPage() {
  const router = useRouter();
  const totalMembers = organizations.reduce((acc, org) => acc + org.members, 0);
  const totalCourses = organizations.reduce((acc, org) => acc + org.courses, 0);

  const handleCreateOrganization = () => {
    router.push('/organizations/propose');
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Organizations</h1>
          <p className="text-[#A0A0B5] text-lg">Manage your learning communities and institutional roles</p>
        </motion.div>
        
        <GlowButton 
          variant="primary" 
          className="shadow-lg shadow-purple-500/20"
          onClick={handleCreateOrganization}
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Organization
        </GlowButton>
      </div>
      
      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={Building2}
          label="Total Organizations"
          value={organizations.length.toString()}
        />
        <StatCard
          icon={Users}
          label="Community Size"
          value={totalMembers.toLocaleString()}
        />
        <StatCard
          icon={TrendingUp}
          label="Global Courses"
          value={totalCourses.toString()}
        />
      </div>
      
      {/* Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Personal Space Card - Separate from the map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Link href="/dashboard">
            <div className="group cursor-pointer h-full">
              <GlowCard className="p-6 hover:border-purple-500/50 transition-all duration-300 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Personal Space</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Your personal learning environment. Access public courses and track your individual progress.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-purple-400 group-hover:text-purple-300 transition-colors">
                    View Dashboard →
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400">Student Role</span>
                </div>
              </GlowCard>
            </div>
          </Link>
        </motion.div>

        {/* Organization Cards */}
        {organizations.map((org, index) => (
          <motion.div
            key={org.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index + 1) * 0.1 }}
          >
            <Link href={`/organizations/${org.id}`} className="block h-full">
              <GlowCard className="h-full hover:border-purple-500/50 transition-all duration-300 group relative overflow-hidden bg-white/[0.02]">
                {/* Subtle Hover Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative z-10">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-purple-500/20 text-4xl group-hover:scale-110 transition-transform duration-500">
                      {org.logo}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                      {org.name}
                    </h3>
                    <p className="text-[#A0A0B5] text-sm leading-relaxed mb-5 min-h-[40px]">
                      {org.description}
                    </p>
                    
                    <div className="inline-flex items-center px-4 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-bold uppercase tracking-widest">
                      {org.role}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5 mt-auto">
                    <div className="text-center">
                      <p className="text-xl font-bold text-white">{org.members.toLocaleString()}</p>
                      <p className="text-[#6B6B80] text-xs uppercase font-medium">Members</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-white">{org.courses}</p>
                      <p className="text-[#6B6B80] text-xs uppercase font-medium">Courses</p>
                    </div>
                  </div>
                </div>
              </GlowCard>
            </Link>
          </motion.div>
        ))}
        
        {/* Create New Organization Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: (organizations.length + 1) * 0.1 }}
          onClick={handleCreateOrganization}
        >
          <div className="cursor-pointer h-full">
            <GlowCard className="h-full border-2 border-dashed border-white/10 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-[#12121A] flex items-center justify-center mb-5 group-hover:bg-purple-500/20 group-hover:rotate-90 transition-all duration-500">
                <Plus className="w-8 h-8 text-[#6B6B80] group-hover:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">New Campus</h3>
              <p className="text-[#A0A0B5] text-sm max-w-[200px] text-center">
                Scale your impact by starting a new community
              </p>
            </GlowCard>
          </div>
        </motion.div>
      </div>
    </div>
  );
}