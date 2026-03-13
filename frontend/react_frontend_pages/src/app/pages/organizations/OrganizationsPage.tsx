import { Link } from "react-router";
import { Building2, Users, Plus, TrendingUp } from "lucide-react";
import { GlowCard, StatCard } from "../../components/lms/Cards";
import { GlowButton } from "../../components/lms/GlowButton";

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
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Organizations</h1>
          <p className="text-[#A0A0B5]">Manage your organizations and memberships</p>
        </div>
        <GlowButton variant="primary">
          <Plus className="w-5 h-5" />
          Create Organization
        </GlowButton>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={Building2}
          label="Organizations"
          value={organizations.length}
        />
        <StatCard
          icon={Users}
          label="Total Members"
          value={organizations.reduce((acc, org) => acc + org.members, 0).toLocaleString()}
        />
        <StatCard
          icon={TrendingUp}
          label="Active Courses"
          value={organizations.reduce((acc, org) => acc + org.courses, 0)}
        />
      </div>
      
      {/* Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {organizations.map((org) => (
          <Link key={org.id} to={`/organizations/${org.id}`}>
            <GlowCard className="h-full hover:scale-[1.02] transition-all cursor-pointer group">
              <div className="text-center mb-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30 text-4xl">
                  {org.logo}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                  {org.name}
                </h3>
                <p className="text-[#A0A0B5] text-sm mb-4">{org.description}</p>
                
                <div className="inline-block px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-400 text-sm mb-4">
                  {org.role}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{org.members.toLocaleString()}</p>
                  <p className="text-[#6B6B80] text-sm">Members</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{org.courses}</p>
                  <p className="text-[#6B6B80] text-sm">Courses</p>
                </div>
              </div>
            </GlowCard>
          </Link>
        ))}
        
        {/* Create New Organization Card */}
        <GlowCard className="h-full hover:scale-[1.02] transition-all cursor-pointer group border-2 border-dashed border-white/10 hover:border-purple-500/50">
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#12121A] flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
              <Plus className="w-8 h-8 text-[#6B6B80] group-hover:text-purple-400 transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Create New Organization</h3>
            <p className="text-[#A0A0B5] text-sm">Start your own learning community</p>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}
