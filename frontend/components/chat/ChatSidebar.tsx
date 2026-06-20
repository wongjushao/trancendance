import React from 'react';
import { Search, Settings, FlaskConical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ChatTabs } from './ChatTabs';
import { UserRole } from '../../types/chat';

interface ChatSidebarProps {
  activeTab: 'dm' | 'course';
  onTabChange: (tab: 'dm' | 'course') => void;
  currentRole: UserRole;
  onCycleRole: () => void;
  renderSettings: (role: UserRole) => React.ReactNode;
  children: React.ReactNode;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  activeTab,
  onTabChange,
  currentRole,
  onCycleRole,
  renderSettings,
  children
}) => {
  return (
    <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-900">
      <div className="p-4 border-bottom border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold tracking-tight">Messages</h1>
          <div className="flex items-center gap-1">
            {/* ===== TEST MODE ONLY (REMOVE IN PRODUCTION) ===== */}
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2 text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 gap-1.5"
              onClick={onCycleRole}
              title={`Current Role: ${currentRole}. Click to cycle.`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {currentRole === 'org_admin' ? 'Admin' : currentRole}
              </span>
            </Button>
            {/* ================================================= */}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Moderation Tools ({currentRole})</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {renderSettings(currentRole)}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-500">Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input placeholder="Search chats..." className="pl-10 bg-zinc-100 dark:bg-zinc-800 border-none" />
        </div>
        
        <ChatTabs activeTab={activeTab} onTabChange={onTabChange} />
      </div>

      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
