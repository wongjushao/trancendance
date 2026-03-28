// frontend/app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import { NotificationToast } from "@/components/lms/NotificationToast";
import { RoleProvider } from "@/components/providers/RoleProvider";
import { RoleSwitcher } from "@/components/dev/RoleSwitcher"; // Add this import

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
        <RoleProvider>
          <div className="min-h-screen bg-[#0B0B0F] relative selection:bg-purple-500/30">
            {/* Global background gradient blobs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
              <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10">
              {children}
            </div>

            <NotificationToast />
            <RoleSwitcher /> {/* Add this */}
          </div>
        </RoleProvider>
      </body>
    </html>
  );
}