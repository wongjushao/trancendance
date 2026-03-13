import { Outlet } from "react-router";
import { Sidebar } from "../components/lms/Sidebar";
import { TopNav } from "../components/lms/TopNav";
import { NotificationToast } from "../components/lms/NotificationToast";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[#0B0B0F] relative">
      {/* Background Gradient Blobs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-40 right-40 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[150px]" />
      </div>
      
      <div className="relative z-10 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen ml-64">
          <TopNav />
          <main className="flex-1 p-8">
            <Outlet />
          </main>
        </div>
      </div>
      
      <NotificationToast />
    </div>
  );
}
