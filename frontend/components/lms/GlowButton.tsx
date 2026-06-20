import { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm";
  isLoading?: boolean;
  fullWidth?: boolean;
}

export function GlowButton({ 
  children, 
  variant = "primary", 
  size = "default",
  isLoading, 
  fullWidth,
  className = "",
  disabled,
  ...props 
}: GlowButtonProps) {
  const baseClasses = "rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2";
  const sizeClasses = {
    default: "px-6 py-3",
    sm: "px-4 py-2 text-sm",
  };
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105",
    secondary: "bg-[#12121A] text-white border border-white/10 hover:border-purple-500/50 hover:bg-white/5",
    outline: "bg-transparent text-white border border-purple-500/50 hover:bg-purple-500/10",
    ghost: "bg-transparent text-[#A0A0B5] hover:text-white hover:bg-white/5",
  };
  
  return (
    <button
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]} 
        ${fullWidth ? "w-full" : ""}
        ${disabled || isLoading ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
