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
        {/* Next dev: RSC profiling can throw on redirect(); see vercel/next.js#86060 */}
        {process.env.NODE_ENV === "development" ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var p=globalThis.performance;if(!p||typeof p.measure!="function"||p.__nextDevPerfMeasurePatch)return;var o=p.measure.bind(p);p.__nextDevPerfMeasurePatch=!0;p.measure=function(){try{return o.apply(p,arguments)}catch(e){var m=(e&&e.message)||"",n=(e&&e.name)||"";if(typeof m=="string"&&m.indexOf("negative time stamp")!==-1||n==="InvalidAccessError")return;throw e}};}catch(_){}})();`,
            }}
          />
        ) : null}
        <RoleProvider>
          {children}
          <NotificationToast />
        </RoleProvider>
      </body>
    </html>
  );
}