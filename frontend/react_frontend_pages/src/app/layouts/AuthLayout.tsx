import { Outlet } from "react-router";

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#0B0B0F] relative overflow-hidden">
      {/* Background Gradient Blobs */}
      <div className="absolute top-20 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px]" />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Outlet />
      </div>
    </div>
  );
}
