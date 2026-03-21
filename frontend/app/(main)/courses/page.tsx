"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Filter, BookOpen, Users, Star } from "lucide-react";
import { GlowCard } from "@/components/lms/Cards";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";

const courses = [
  {
    id: 1,
    title: "Advanced React Development",
    instructor: "Sarah Johnson",
    description: "Master React hooks, context, and advanced patterns",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400",
    students: 1234,
    lessons: 24,
    rating: 4.8,
    level: "Advanced",
    category: "Web Development",
    duration: "8 weeks",
  },
  {
    id: 2,
    title: "Backend with Node.js",
    instructor: "Michael Chen",
    description: "Build scalable backend services with Node.js and Express",
    thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400",
    students: 892,
    lessons: 18,
    rating: 4.6,
    level: "Intermediate",
    category: "Backend",
    duration: "6 weeks",
  },
  {
    id: 3,
    title: "UI/UX Design Fundamentals",
    instructor: "Emily Rodriguez",
    description: "Learn design principles and create stunning user interfaces",
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400",
    students: 2341,
    lessons: 32,
    rating: 4.9,
    level: "Beginner",
    category: "Design",
    duration: "10 weeks",
  },
  {
    id: 4,
    title: "Python for Data Science",
    instructor: "David Park",
    description: "Analyze data and build ML models with Python",
    thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400",
    students: 1567,
    lessons: 28,
    rating: 4.7,
    level: "Intermediate",
    category: "Data Science",
    duration: "9 weeks",
  },
  {
    id: 5,
    title: "Mobile App Development",
    instructor: "Lisa Anderson",
    description: "Create native mobile apps for iOS and Android",
    thumbnail: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400",
    students: 934,
    lessons: 22,
    rating: 4.5,
    level: "Advanced",
    category: "Mobile",
    duration: "7 weeks",
  },
  {
    id: 6,
    title: "Cloud Computing with AWS",
    instructor: "James Wilson",
    description: "Deploy and manage applications on AWS cloud",
    thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400",
    students: 1123,
    lessons: 20,
    rating: 4.8,
    level: "Intermediate",
    category: "Cloud",
    duration: "8 weeks",
  },
];

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === "all" || course.level.toLowerCase() === selectedLevel;
    return matchesSearch && matchesLevel;
  });
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Explore Courses</h1>
          <p className="text-[#A0A0B5]">Discover and enroll in new courses</p>
        </div>
        <GlowButton variant="primary">
          Create Course
        </GlowButton>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
          <Input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 bg-[#12121A] border-white/10 text-white rounded-xl h-12"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-4 py-3 bg-[#12121A] border border-white/10 text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          
          <GlowButton variant="secondary">
            <Filter className="w-5 h-5" />
            Filters
          </GlowButton>
        </div>
      </div>
      
      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <Link key={course.id} href={`/courses/${course.id}`}>
            <GlowCard className="h-full hover:scale-[1.02] transition-all cursor-pointer group">
              <div className="relative overflow-hidden rounded-xl mb-4">
                <img 
                  src={course.thumbnail} 
                  alt={course.title}
                  className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 px-3 py-1 bg-[#0B0B0F]/90 backdrop-blur-sm rounded-full text-xs text-white border border-white/10">
                  {course.level}
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-[#A0A0B5] text-sm line-clamp-2">{course.description}</p>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      {course.instructor.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <span className="text-[#A0A0B5]">{course.instructor}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm text-[#6B6B80] pt-3 border-t border-white/5">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {course.lessons} lessons
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {course.students.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    {course.rating}
                  </span>
                </div>
              </div>
            </GlowCard>
          </Link>
        ))}
      </div>
      
      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-[#6B6B80] mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No courses found</h3>
          <p className="text-[#A0A0B5]">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}