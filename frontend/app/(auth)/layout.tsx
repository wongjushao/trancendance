import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B0B0F] relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Gradient Blobs - Fixed for auth screens */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Container for Login/Register forms. 
          The 'z-10' ensures the form stays above the blur effects.
      */}
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}