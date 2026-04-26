import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, Video, Info, MoreVertical, Search } from 'lucide-react';
import { ChatSession } from '../../types/chat';

interface ChatWindowProps {
  selectedSession: ChatSession | null;
  targetInfo: { name: string; avatar?: string; status?: string; memberCount?: number };
  children: React.ReactNode;
  inputArea: React.ReactNode;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  selectedSession,
  targetInfo,
  children,
  inputArea
}) => {
  if (!selectedSession) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 flex-col gap-4">
        <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <Search className="w-8 h-8 opacity-20" />
        </div>
        <p className="text-sm">Select a conversation to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Chat Header */}
      <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={targetInfo.avatar} />
            <AvatarFallback>{targetInfo.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-sm">{targetInfo.name}</h2>
            <p className="text-xs text-zinc-500">
              {selectedSession.type === 'dm' 
                ? (targetInfo.status === 'online' ? 'Online' : 'Offline')
                : `${targetInfo.memberCount} members`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-zinc-500"><Phone className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="text-zinc-500"><Video className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="text-zinc-500"><Info className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="text-zinc-500"><MoreVertical className="w-4 h-4" /></Button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {/* Input Area */}
      {inputArea}
    </div>
  );
};
