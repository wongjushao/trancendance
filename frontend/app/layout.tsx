import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import Navbar from "./components/Navbar";
import "./globals.css";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className="bg-[#02050b] antialiased">
        <Navbar user={user} />
        {children}
      </body>
    </html>
  );
}