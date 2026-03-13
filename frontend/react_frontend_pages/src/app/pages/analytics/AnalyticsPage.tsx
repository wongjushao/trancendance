import { TrendingUp, Users, BookOpen, Target, Calendar } from "lucide-react";
import { GlowCard, StatCard } from "../../components/lms/Cards";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

const learningProgressData = [
  { month: "Jan", hours: 12 },
  { month: "Feb", hours: 18 },
  { month: "Mar", hours: 25 },
  { month: "Apr", hours: 32 },
  { month: "May", hours: 28 },
  { month: "Jun", hours: 35 },
];

const courseCompletionData = [
  { course: "React", completion: 85 },
  { course: "Node.js", completion: 65 },
  { course: "UI/UX", completion: 92 },
  { course: "Python", completion: 45 },
  { course: "AWS", completion: 70 },
];

const categoryDistribution = [
  { name: "Web Development", value: 45, color: "#6A5CFF" },
  { name: "Design", value: 25, color: "#9B6CFF" },
  { name: "Backend", value: 20, color: "#5CFF9B" },
  { name: "Other", value: 10, color: "#FFD75C" },
];

const activityHeatmap = [
  { day: "Mon", hours: 4 },
  { day: "Tue", hours: 6 },
  { day: "Wed", hours: 3 },
  { day: "Thu", hours: 8 },
  { day: "Fri", hours: 5 },
  { day: "Sat", hours: 2 },
  { day: "Sun", hours: 1 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-[#A0A0B5]">Track your learning progress and performance</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={TrendingUp}
          label="Learning Hours"
          value="158"
          trend="+12% from last month"
          trendUp={true}
        />
        <StatCard
          icon={Target}
          label="Avg. Score"
          value="87%"
          trend="+5% improvement"
          trendUp={true}
        />
        <StatCard
          icon={BookOpen}
          label="Courses Completed"
          value="8"
          trend="+3 this quarter"
          trendUp={true}
        />
        <StatCard
          icon={Users}
          label="Study Streak"
          value="23 days"
          trend="Personal best!"
          trendUp={true}
        />
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Learning Progress Over Time */}
        <GlowCard>
          <h2 className="text-xl font-semibold text-white mb-6">Learning Hours Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={learningProgressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#16161F" />
              <XAxis dataKey="month" stroke="#6B6B80" />
              <YAxis stroke="#6B6B80" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#16161F", 
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "#fff"
                }}
              />
              <Line 
                type="monotone" 
                dataKey="hours" 
                stroke="#6A5CFF" 
                strokeWidth={3}
                dot={{ fill: "#6A5CFF", r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </GlowCard>
        
        {/* Course Completion Rates */}
        <GlowCard>
          <h2 className="text-xl font-semibold text-white mb-6">Course Completion Progress</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={courseCompletionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#16161F" />
              <XAxis dataKey="course" stroke="#6B6B80" />
              <YAxis stroke="#6B6B80" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#16161F", 
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "#fff"
                }}
              />
              <Bar dataKey="completion" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6A5CFF" />
                  <stop offset="100%" stopColor="#9B6CFF" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </GlowCard>
        
        {/* Category Distribution */}
        <GlowCard>
          <h2 className="text-xl font-semibold text-white mb-6">Learning Category Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#16161F", 
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "#fff"
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {categoryDistribution.map((cat) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-[#A0A0B5] text-sm">{cat.name}</span>
              </div>
            ))}
          </div>
        </GlowCard>
        
        {/* Weekly Activity */}
        <GlowCard>
          <h2 className="text-xl font-semibold text-white mb-6">Weekly Activity</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityHeatmap}>
              <CartesianGrid strokeDasharray="3 3" stroke="#16161F" />
              <XAxis dataKey="day" stroke="#6B6B80" />
              <YAxis stroke="#6B6B80" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#16161F", 
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "#fff"
                }}
              />
              <Bar dataKey="hours" fill="#6A5CFF" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlowCard>
      </div>
      
      {/* Achievements */}
      <GlowCard>
        <h2 className="text-xl font-semibold text-white mb-6">Recent Achievements</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: "🏆", title: "Course Master", desc: "Completed 5 courses" },
            { icon: "🔥", title: "On Fire!", desc: "20-day learning streak" },
            { icon: "⭐", title: "Top Performer", desc: "90%+ average score" },
          ].map((achievement, index) => (
            <div key={index} className="p-6 bg-[#12121A] rounded-xl text-center">
              <div className="text-4xl mb-3">{achievement.icon}</div>
              <h3 className="text-white font-semibold mb-1">{achievement.title}</h3>
              <p className="text-[#6B6B80] text-sm">{achievement.desc}</p>
            </div>
          ))}
        </div>
      </GlowCard>
    </div>
  );
}
