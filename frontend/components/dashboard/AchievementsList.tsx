// frontend/components/dashboard/AchievementsList.tsx
"use client";

import { Trophy, Star, Zap, Award, Flame, Target } from "lucide-react";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  dateEarned?: string;
  progress?: number;
  isEarned: boolean;
}

const mockAchievements: Achievement[] = [
  {
    id: "1",
    title: "First Course",
    description: "Completed your first course",
    icon: Trophy,
    dateEarned: "2024-03-15",
    isEarned: true,
  },
  {
    id: "2",
    title: "7-Day Streak",
    description: "Learned for 7 consecutive days",
    icon: Flame,
    dateEarned: "2024-03-10",
    isEarned: true,
  },
  {
    id: "3",
    title: "Quiz Master",
    description: "Scored 100% on 5 quizzes",
    icon: Star,
    progress: 60,
    isEarned: false,
  },
  {
    id: "4",
    title: "Assignment Ace",
    description: "Submitted 10 assignments on time",
    icon: Target,
    progress: 40,
    isEarned: false,
  },
  {
    id: "5",
    title: "Course Creator",
    description: "Published your first course",
    icon: Award,
    progress: 0,
    isEarned: false,
  },
];

export function AchievementsList() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Achievements</h3>
        <span className="text-xs text-[#6B6B80]">
          {mockAchievements.filter(a => a.isEarned).length}/{mockAchievements.length}
        </span>
      </div>
      
      <div className="space-y-2">
        {mockAchievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              achievement.isEarned
                ? "bg-gradient-to-r from-purple-500/10 to-violet-600/10 border border-purple-500/20"
                : "bg-[#12121A] border border-white/5"
            }`}
          >
            <div className={`p-2 rounded-lg ${
              achievement.isEarned
                ? "bg-purple-500/20"
                : "bg-[#1A1A24]"
            }`}>
              <achievement.icon className={`w-5 h-5 ${
                achievement.isEarned ? "text-purple-400" : "text-[#6B6B80]"
              }`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${
                achievement.isEarned ? "text-white" : "text-[#A0A0B5]"
              }`}>
                {achievement.title}
              </p>
              <p className="text-xs text-[#6B6B80] truncate">{achievement.description}</p>
            </div>
            
            {achievement.progress !== undefined && !achievement.isEarned && (
              <div className="text-right">
                <span className="text-xs text-purple-400">{achievement.progress}%</span>
                <div className="w-12 h-1 bg-[#1A1A24] rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${achievement.progress}%` }}
                  />
                </div>
              </div>
            )}
            
            {achievement.isEarned && achievement.dateEarned && (
              <span className="text-[10px] text-[#6B6B80]">
                {new Date(achievement.dateEarned).toLocaleDateString()}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}