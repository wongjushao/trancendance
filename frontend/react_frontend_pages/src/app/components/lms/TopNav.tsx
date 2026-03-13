import { Bell, Search } from "lucide-react";
import { Input } from "../ui/input";

export function TopNav() {
  return (
    <header className="h-20 border-b border-white/5 bg-[#0B0B0F]/80 backdrop-blur-xl sticky top-0 z-10">
      <div className="h-full px-8 flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B80]" />
            <Input
              type="text"
              placeholder="Search courses, assignments, messages..."
              className="pl-12 pr-4 py-3 w-full bg-[#12121A] border-white/10 rounded-xl text-white placeholder:text-[#6B6B80] focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-4 ml-8">
          <button className="relative p-3 rounded-xl bg-[#12121A] hover:bg-white/5 transition-colors border border-white/5">
            <Bell className="w-5 h-5 text-[#A0A0B5]" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  );
}
