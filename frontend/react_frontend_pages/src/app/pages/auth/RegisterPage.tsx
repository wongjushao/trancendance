import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, User, Github } from "lucide-react";
import { GlowButton } from "../../components/lms/GlowButton";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate registration
    setTimeout(() => {
      navigate("/onboarding");
    }, 1500);
  };
  
  return (
    <div className="w-full max-w-md">
      <div className="bg-[#16161F] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
            <span className="text-3xl">🚀</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-[#A0A0B5]">Start your learning journey today</p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <Label htmlFor="name" className="text-white mb-2 block">Full Name</Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                className="pl-12 bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="email" className="text-white mb-2 block">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                className="pl-12 bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="password" className="text-white mb-2 block">Password</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="pl-12 bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="confirmPassword" className="text-white mb-2 block">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className="pl-12 bg-[#12121A] border-white/10 text-white rounded-xl h-12"
                required
              />
            </div>
          </div>
          
          <label className="flex items-start gap-2 text-sm text-[#A0A0B5] cursor-pointer">
            <input type="checkbox" className="mt-1 rounded border-white/10" required />
            <span>I agree to the Terms of Service and Privacy Policy</span>
          </label>
          
          <GlowButton type="submit" variant="primary" fullWidth isLoading={isLoading}>
            Create Account
          </GlowButton>
        </form>
        
        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="text-[#6B6B80] text-sm">or sign up with</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>
        
        {/* OAuth */}
        <div className="grid grid-cols-2 gap-3">
          <GlowButton variant="secondary">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </GlowButton>
          <GlowButton variant="secondary">
            <Github className="w-5 h-5" />
            GitHub
          </GlowButton>
        </div>
        
        {/* Footer */}
        <p className="text-center text-[#A0A0B5] mt-6">
          Already have an account?{" "}
          <Link to="/auth/login" className="text-purple-400 hover:text-purple-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
