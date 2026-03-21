import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: "purple" | "violet" | "blue" | "green";
}

export function GlowCard({ children, className = "", glowColor = "purple" }: GlowCardProps) {
  const glowColors = {
    purple: "shadow-purple-500/20",
    violet: "shadow-violet-500/20",
    blue: "shadow-blue-500/20",
    green: "shadow-green-500/20",
  };
  
  return (
    <div className={`
      bg-[#16161F] border border-white/5 rounded-2xl p-6
      hover:border-${glowColor}-500/30 transition-all duration-300
      ${glowColors[glowColor]} shadow-xl
      ${className}
    `}>
      {children}
    </div>
  );
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
}

export function StatCard({ icon: Icon, label, value, trend, trendUp }: StatCardProps) {
  return (
    <GlowCard>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#A0A0B5] text-sm mb-2">{label}</p>
          <p className="text-3xl font-semibold text-white mb-1">{value}</p>
          {trend && (
            <p className={`text-sm ${trendUp ? "text-green-400" : "text-red-400"}`}>
              {trend}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </GlowCard>
  );
}
