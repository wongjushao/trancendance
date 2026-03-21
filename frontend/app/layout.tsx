import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/lms/Sidebar";
import { TopNav } from "@/components/lms/TopNav";
import { NotificationToast } from "@/components/lms/NotificationToast";

export const metadata: Metadata = {
  title: "Educatorio",
  description: "Learning Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-[#0B0B0F] relative selection:bg-purple-500/30">
          {/* Background Gradient Blobs */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
          </div>

          <div className="relative z-10 flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
              <TopNav />
              <main className="flex-1 p-4 md:p-8 max-w-[1600px] mx-auto w-full">
                {children}
              </main>
            </div>
          </div>

          <NotificationToast />
        </div>
      </body>
    </html>
  );
}