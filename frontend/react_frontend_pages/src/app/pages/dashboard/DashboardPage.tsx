import { BookOpen, Clock, Trophy, Target, Calendar, TrendingUp } from "lucide-react";
import { GlowCard, StatCard } from "../../components/lms/Cards";
import { GlowButton } from "../../components/lms/GlowButton";
import { Link } from "react-router";

const upcomingAssignments = [
  { id: 1, title: "React Hooks Deep Dive", course: "Advanced React", dueDate: "2026-03-08", status: "pending" },
  { id: 2, title: "Database Design Project", course: "Backend Development", dueDate: "2026-03-10", status: "pending" },
  { id: 3, title: "UI/UX Case Study", course: "Design Principles", dueDate: "2026-03-12", status: "in-progress" },
];

const recentActivity = [
  { id: 1, type: "completed", text: "Completed lesson: Authentication in Node.js", time: "2 hours ago" },
  { id: 2, type: "comment", text: "New comment on your submission", time: "5 hours ago" },
  { id: 3, type: "grade", text: "Assignment graded: REST API Design", time: "1 day ago" },
  { id: 4, type: "enrolled", text: "Enrolled in Advanced TypeScript", time: "2 days ago" },
];

const activeCourses = [
  { 
    id: 1, 
    title: "Advanced React Development", 
    instructor: "Sarah Johnson",
    progress: 65, 
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400",
    students: 1234,
    lessons: 24
  },
  { 
    id: 2, 
    title: "Backend with Node.js", 
    instructor: "Michael Chen",
    progress: 45, 
    thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400",
    students: 892,
    lessons: 18
  },
  { 
    id: 3, 
    title: "UI/UX Design Fundamentals", 
    instructor: "Emily Rodriguez",
    progress: 80, 
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400",
    students: 2341,
    lessons: 32
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Welcome back, John! 👋</h1>
        <p className="text-[#A0A0B5]">Continue your learning journey</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={BookOpen}
          label="Active Courses"
          value={3}
          trend="+2 this month"
          trendUp={true}
        />
        <StatCard
          icon={Target}
          label="Completed Lessons"
          value={48}
          trend="+12 this week"
          trendUp={true}
        />
        <StatCard
          icon={Trophy}
          label="Achievements"
          value={15}
          trend="+3 new"
          trendUp={true}
        />
        <StatCard
          icon={TrendingUp}
          label="Learning Streak"
          value="12 days"
          trend="Keep going!"
          trendUp={true}
        />
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Courses */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">Continue Learning</h2>
            <Link to="/app/courses">
              <GlowButton variant="ghost">View All</GlowButton>
            </Link>
          </div>
          
          <div className="space-y-4">
            {activeCourses.map((course) => (
              <Link key={course.id} to={`/courses/${course.id}`}>
                <GlowCard className="hover:scale-[1.02] transition-transform cursor-pointer">
                  <div className="flex gap-4">
                    <img 
                      src={course.thumbnail} 
                      alt={course.title}
                      className="w-32 h-32 rounded-xl object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">{course.title}</h3>
                      <p className="text-[#A0A0B5] text-sm mb-3">by {course.instructor}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-[#6B6B80] mb-3">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {course.lessons} lessons
                        </span>
                        <span>{course.students.toLocaleString()} students</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#A0A0B5]">Progress</span>
                          <span className="text-purple-400 font-medium">{course.progress}%</span>
                        </div>
                        <div className="h-2 bg-[#12121A] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-violet-600 rounded-full transition-all duration-500"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </GlowCard>
              </Link>
            ))}
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Assignments */}
          <GlowCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Upcoming</h3>
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            
            <div className="space-y-3">
              {upcomingAssignments.map((assignment) => (
                <Link key={assignment.id} to={`/assignments/${assignment.id}`}>
                  <div className="p-3 bg-[#12121A] rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                    <p className="text-white font-medium text-sm mb-1">{assignment.title}</p>
                    <p className="text-[#6B6B80] text-xs mb-2">{assignment.course}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#A0A0B5] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {assignment.dueDate}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        assignment.status === "pending" 
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {assignment.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            <Link to="/assignments">
              <GlowButton variant="outline" fullWidth className="mt-4">
                View All Assignments
              </GlowButton>
            </Link>
          </GlowCard>
          
          {/* Recent Activity */}
          <GlowCard>
            <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
            
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
                  <div className="flex-1">
                    <p className="text-white text-sm">{activity.text}</p>
                    <p className="text-[#6B6B80] text-xs mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}