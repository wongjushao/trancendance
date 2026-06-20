import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message, ChatSession } from '../../types/chat';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: Message[];
  selectedSession: ChatSession;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, selectedSession }) => {
  return (
    <ScrollArea className="h-full p-6">
      <div className="space-y-6 max-w-4xl mx-auto">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={cn(
              "flex gap-3 max-w-[80%]",
              msg.isMe ? "ml-auto flex-row-reverse items-end" : "mr-auto items-start"
            )}
          >
            {/* Show avatar in course chats for others */}
            {selectedSession.type === 'course' && !msg.isMe && (
              <Avatar className="h-8 w-8 mt-1 shrink-0">
                <AvatarImage src={msg.senderAvatar} />
                <AvatarFallback>{msg.senderName?.charAt(0)}</AvatarFallback>
              </Avatar>
            )}
            
            <div className={cn("flex flex-col", msg.isMe ? "items-end" : "items-start")}>
              {selectedSession.type === 'course' && !msg.isMe && (
                <span className="text-[10px] font-medium text-zinc-500 mb-1 ml-1">
                  {msg.senderName}
                </span>
              )}
              <div className={cn(
                "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                msg.isMe 
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-tr-none" 
                  : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-100 dark:border-zinc-700"
              )}>
                {msg.text}
              </div>
              <span className="text-[10px] text-zinc-400 mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
