import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (e: React.FormEvent) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ value, onChange, onSend }) => {
  return (
    <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
      <form onSubmit={onSend} className="max-w-4xl mx-auto flex items-center gap-2">
        <Input 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a message..." 
          className="flex-1 bg-zinc-100 dark:bg-zinc-800 border-none focus-visible:ring-1 focus-visible:ring-zinc-400"
        />
        <Button type="submit" size="icon" className="rounded-full bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};
