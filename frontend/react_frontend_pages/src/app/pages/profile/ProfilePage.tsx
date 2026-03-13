import { Camera, Mail, MapPin, Link as LinkIcon, Calendar, Edit } from "lucide-react";
import { GlowCard, StatCard } from "../../components/lms/Cards";
import { GlowButton } from "../../components/lms/GlowButton";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

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
  { id: 1, type: "completed", text: "Completed Advanced React Development", date: "Mar 1, 2026" },
  { id: 2, type: "enrolled", text: "Enrolled in Python for Data Science", date: "Feb 28, 2026" },
  { id: 3, type: "achievement", text: "Earned Course Master badge", date: "Feb 25, 2026" },
  { id: 4, type: "grade", text: "Scored 95% on UI/UX Case Study", date: "Feb 20, 2026" },
];

const certificates = [
  { id: 1, course: "Advanced React Development", issueDate: "Mar 1, 2026", instructor: "Sarah Johnson" },
  { id: 2, course: "UI/UX Design Fundamentals", issueDate: "Feb 15, 2026", instructor: "Emily Rodriguez" },
  { id: 3, course: "Backend with Node.js", issueDate: "Jan 28, 2026", instructor: "Michael Chen" },
];

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <GlowCard>
        <div className="flex items-start gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <span className="text-white font-bold text-3xl">{userData.avatar}</span>
            </div>
            <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg hover:bg-purple-600 transition-colors">
              <Camera className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{userData.name}</h1>
                <div className="flex items-center gap-4 text-[#A0A0B5]">
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {userData.email}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {userData.location}
                  </span>
                </div>
              </div>
              <GlowButton variant="primary">
                <Edit className="w-5 h-5" />
                Edit Profile
              </GlowButton>
            </div>
            
            <p className="text-[#A0A0B5] mb-4">{userData.bio}</p>
            
            <div className="flex items-center gap-4">
              <div className="inline-block px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-400 text-sm">
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
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={Calendar}
          label="Courses Completed"
          value={userData.coursesCompleted}
        />
        <StatCard
          icon={LinkIcon}
          label="Current Courses"
          value={userData.currentCourses}
        />
        <StatCard
          icon={Calendar}
          label="Certificates"
          value={userData.certificates}
        />
      </div>
      
      {/* Content Tabs */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="bg-[#12121A] border border-white/10 p-1 rounded-xl">
          <TabsTrigger value="activity" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            Activity
          </TabsTrigger>
          <TabsTrigger value="certificates" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            Certificates
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600">
            Settings
          </TabsTrigger>
        </TabsList>
        
        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 bg-[#12121A] rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
                  <div className="flex-1">
                    <p className="text-white mb-1">{activity.text}</p>
                    <p className="text-[#6B6B80] text-sm">{activity.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>
        </TabsContent>
        
        {/* Certificates Tab */}
        <TabsContent value="certificates" className="mt-6">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white mb-6">Certificates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <div key={cert.id} className="p-6 bg-[#12121A] rounded-xl border border-white/5">
                  <div className="text-4xl mb-4">🏆</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{cert.course}</h3>
                  <p className="text-[#6B6B80] text-sm mb-1">by {cert.instructor}</p>
                  <p className="text-[#A0A0B5] text-sm mb-4">Issued: {cert.issueDate}</p>
                  <GlowButton variant="outline" fullWidth>
                    Download Certificate
                  </GlowButton>
                </div>
              ))}
            </div>
          </GlowCard>
        </TabsContent>
        
        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white mb-6">Account Settings</h2>
            <div className="space-y-6">
              <div>
                <label className="text-white font-medium mb-2 block">Full Name</label>
                <Input
                  type="text"
                  defaultValue={userData.name}
                  className="bg-[#12121A] border-white/10 text-white rounded-xl"
                />
              </div>
              
              <div>
                <label className="text-white font-medium mb-2 block">Email</label>
                <Input
                  type="email"
                  defaultValue={userData.email}
                  className="bg-[#12121A] border-white/10 text-white rounded-xl"
                />
              </div>
              
              <div>
                <label className="text-white font-medium mb-2 block">Location</label>
                <Input
                  type="text"
                  defaultValue={userData.location}
                  className="bg-[#12121A] border-white/10 text-white rounded-xl"
                />
              </div>
              
              <div>
                <label className="text-white font-medium mb-2 block">Website</label>
                <Input
                  type="url"
                  defaultValue={userData.website}
                  className="bg-[#12121A] border-white/10 text-white rounded-xl"
                />
              </div>
              
              <div>
                <label className="text-white font-medium mb-2 block">Bio</label>
                <textarea
                  defaultValue={userData.bio}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#12121A] border border-white/10 rounded-xl text-white"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <GlowButton variant="primary">Save Changes</GlowButton>
                <GlowButton variant="outline">Cancel</GlowButton>
              </div>
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
