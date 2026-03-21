"use client";

import { useState } from "react";
import Link from "next/link"; // Updated from react-router
import { Mail, ArrowLeft } from "lucide-react";
import { GlowButton } from "@/components/lms/GlowButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSent(true);
    }, 1500);
  };
  
  return (
    <div className="w-full max-w-md">
      <div className="bg-[#16161F] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-[#A0A0B5]">
            {isSent 
              ? "Check your email for reset instructions"
              : "Enter your email to receive a password reset link"
            }
          </p>
        </div>
        
        {!isSent ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-white mb-2 block">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-12 bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                  required
                />
              </div>
            </div>
            
            <GlowButton type="submit" variant="primary" fullWidth isLoading={isLoading}>
              Send Reset Link
            </GlowButton>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-green-400">Reset link sent to {email}</p>
            </div>
            <GlowButton variant="primary" fullWidth onClick={() => setIsSent(false)}>
              Send Again
            </GlowButton>
          </div>
        )}
        
        {/* Footer - Updated to next/link */}
        <Link 
          href="/auth/login" 
          className="flex items-center justify-center gap-2 text-[#A0A0B5] hover:text-white mt-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </div>
    </div>
  );
}