// frontend/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css"; // ← IMPORTANT: This loads all styles
import { NotificationToast } from "@/components/lms/NotificationToast";
import { RoleProvider } from "@/components/providers/RoleProvider";

export const metadata: Metadata = {
  title: "Educatorio",
  description: "Learning Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <RoleProvider>
          {children}
          <NotificationToast />
        </RoleProvider>
      </body>
    </html>
  );
}