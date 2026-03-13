import { useParams } from "react-router";
import { Users, BookOpen, Settings, UserPlus, Crown } from "lucide-react";
import { GlowCard, StatCard } from "../../components/lms/Cards";
import { GlowButton } from "../../components/lms/GlowButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

const orgData = {
  id: 1,
  name: "Tech University",
  logo: "🎓",
  description: "Leading technology education institution focused on practical learning",
  members: 2847,
  courses: 45,
  role: "Student",
  createdDate: "2024-01-15",
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

export default function OrganizationDetailPage() {
  const { id } = useParams();
  
  return (
    <div className="space-y-8">
      {/* Organization Header */}
      <GlowCard>
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-5xl shadow-lg shadow-purple-500/30">
            {orgData.logo}
          </div>
          
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{orgData.name}</h1>
                <p className="text-[#A0A0B5] mb-4">{orgData.description}</p>
                <div className="inline-block px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-400 text-sm">
                  Your role: {orgData.role}
                </div>
              </div>
              
              <div className="flex gap-3">
                <GlowButton variant="primary">
                  <UserPlus className="w-5 h-5" />
                  Invite Members
                </GlowButton>
                <GlowButton variant="secondary">
                  <Settings className="w-5 h-5" />
                </GlowButton>
              </div>
            </div>
          </div>
        </div>
      </GlowCard>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Users} label="Total Members" value={orgData.members.toLocaleString()} />
        <StatCard icon={BookOpen} label="Active Courses" value={orgData.courses} />
        <StatCard icon={Crown} label="Active Since" value={orgData.createdDate} />
      </div>
      
      {/* Content Tabs */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="bg-[#12121A] border border-white/10 p-1 rounded-xl">
          <TabsTrigger value="members" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            <Users className="w-4 h-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="courses" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            <BookOpen className="w-4 h-4 mr-2" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        {/* Members Tab */}
        <TabsContent value="members" className="mt-6">
          <GlowCard>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">Members ({members.length})</h2>
              <GlowButton variant="primary">
                <UserPlus className="w-5 h-5" />
                Invite
              </GlowButton>
            </div>
            
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-[#12121A] rounded-xl hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                      <span className="text-white font-semibold">{member.avatar}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{member.name}</p>
                      <p className="text-[#6B6B80] text-sm">Joined {member.joinDate}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white text-sm">{member.courses} courses</p>
                      <p className="text-[#6B6B80] text-xs">{member.role}</p>
                    </div>
                    <GlowButton variant="ghost">View</GlowButton>
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>
        </TabsContent>
        
        {/* Courses Tab */}
        <TabsContent value="courses" className="mt-6">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white mb-6">Courses ({courses.length})</h2>
            <div className="space-y-3">
              {courses.map((course) => (
                <div key={course.id} className="flex items-center justify-between p-4 bg-[#12121A] rounded-xl hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-white font-medium mb-1">{course.title}</p>
                    <p className="text-[#6B6B80] text-sm">by {course.instructor}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[#A0A0B5] text-sm">{course.students} students</span>
                    <GlowButton variant="outline">View</GlowButton>
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>
        </TabsContent>
        
        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white mb-6">Organization Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="text-white font-medium mb-2 block">Organization Name</label>
                <input
                  type="text"
                  defaultValue={orgData.name}
                  className="w-full px-4 py-3 bg-[#12121A] border border-white/10 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="text-white font-medium mb-2 block">Description</label>
                <textarea
                  defaultValue={orgData.description}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#12121A] border border-white/10 rounded-xl text-white"
                />
              </div>
              <GlowButton variant="primary">Save Changes</GlowButton>
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
