import React, { useState, useEffect, useCallback } from 'react';
import { 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  VolumeX,
  UserMinus,
  Ban,
  Flag,
  ShieldAlert,
  ShieldCheck,
  BellOff,
  Trash2,
  Pin,
  Lock,
  Megaphone,
  LogOut,
  History
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import { mockUsers, mockCourses, mockDMSessions, mockCourseSessions, mockMessages, currentUser } from '../data/mockData';
import { ChatSession, Message, UserRole } from '../types/chat';
import { cn } from '@/lib/utils';
import { useSocket } from '../hooks/useSocket';

// Modular Components
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatWindow } from '../components/chat/ChatWindow';
import { MessageList } from '../components/chat/MessageList';
import { MessageInput } from '../components/chat/MessageInput';

export default function ChatPage() {
  const [activeTab, setActiveTab] = useState<'dm' | 'course'>('dm');
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(mockDMSessions?.[0] || null);
  const [messageInput, setMessageInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>(mockMessages);

  // ===== TEST MODE ONLY (REMOVE IN PRODUCTION) =====
  const [currentRole, setCurrentRole] = useState<UserRole>(currentUser.role);
  const cycleRole = () => {
    const roles: UserRole[] = ['org_admin', 'teacher', 'student'];
    const currentIndex = roles.indexOf(currentRole);
    const nextIndex = (currentIndex + 1) % roles.length;
    setCurrentRole(roles[nextIndex]);
  };
  // =================================================

  // Socket Integration
  const { isConnected, emit, on } = useSocket('mock-token');

  useEffect(() => {
    if (selectedSession) {
      const roomId = parseInt(selectedSession.id);
      if (!isNaN(roomId)) {
        emit('join_room', { room_id: roomId });
        emit('get_messages', { room_id: roomId });
      }
    }

    const cleanup = on('receive_message', (msg: any) => {
      const roomId = msg.room_id.toString();
      setLocalMessages(prev => ({
        ...prev,
        [roomId]: [...(prev[roomId] || []), {
          id: msg.id.toString(),
          senderId: msg.senderId,
          text: msg.text,
          timestamp: msg.timestamp,
          isMe: msg.senderId === 'me'
        }]
      }));
    });

    const historyCleanup = on('messages_history', (data: { room_id: number, messages: any[] }) => {
      const roomId = data.room_id.toString();
      setLocalMessages(prev => ({
        ...prev,
        [roomId]: data.messages.map(m => ({
          id: m.id.toString(),
          senderId: m.senderId,
          text: m.text,
          timestamp: m.timestamp,
          isMe: m.senderId === 'me'
        }))
      }));
    });

    return () => {
      cleanup();
      historyCleanup();
    };
  }, [selectedSession, emit, on]);

  const currentSessions = activeTab === 'dm' ? mockDMSessions : mockCourseSessions;
  const messages = selectedSession ? (localMessages[selectedSession.id] || []) : [];

  const getTargetInfo = (session: ChatSession) => {
    if (session.type === 'dm') {
      const user = mockUsers.find(u => u.id === session.targetId);
      return { name: user?.name || 'Unknown', avatar: user?.avatar, status: user?.status };
    } else {
      const course = mockCourses.find(c => c.id === session.targetId);
      return { name: course?.name || 'Unknown', avatar: course?.image, memberCount: course?.memberCount };
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedSession) return;
    
    const roomId = parseInt(selectedSession.id);
    if (isNaN(roomId)) return;

    const newMessage = {
      room_id: roomId,
      content: messageInput
    };

    emit('send_message', newMessage);
    
    // Optimistic update for UI
    const optimisticMsg: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      text: messageInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    };

    setLocalMessages(prev => ({
      ...prev,
      [selectedSession.id]: [...(prev[selectedSession.id] || []), optimisticMsg]
    }));

    setMessageInput('');
  };

  const renderSettings = (role: UserRole) => {
    switch (role) {
      case 'student':
        return (
          <>
            <DropdownMenuItem><BellOff className="mr-2 h-4 w-4" /> Mute Chat</DropdownMenuItem>
            {selectedSession?.type === 'dm' && (
              <DropdownMenuItem><Ban className="mr-2 h-4 w-4" /> Block User</DropdownMenuItem>
            )}
            <DropdownMenuItem><Flag className="mr-2 h-4 w-4" /> Report Message</DropdownMenuItem>
            <DropdownMenuItem className="text-red-500"><LogOut className="mr-2 h-4 w-4" /> Leave Chat</DropdownMenuItem>
          </>
        );
      case 'teacher':
        return (
          <>
            <DropdownMenuItem><VolumeX className="mr-2 h-4 w-4" /> Mute Student</DropdownMenuItem>
            <DropdownMenuItem><Trash2 className="mr-2 h-4 w-4" /> Delete Message</DropdownMenuItem>
            <DropdownMenuItem><Pin className="mr-2 h-4 w-4" /> Pin Message</DropdownMenuItem>
            <DropdownMenuItem><Megaphone className="mr-2 h-4 w-4" /> Send Announcement</DropdownMenuItem>
          </>
        );
      case 'org_admin':
        return (
          <>
            <DropdownMenuItem><VolumeX className="mr-2 h-4 w-4" /> Mute User</DropdownMenuItem>
            <DropdownMenuItem><UserMinus className="mr-2 h-4 w-4" /> Remove User</DropdownMenuItem>
            <DropdownMenuItem><Trash2 className="mr-2 h-4 w-4" /> Delete Message</DropdownMenuItem>
            <DropdownMenuItem><Pin className="mr-2 h-4 w-4" /> Pin Message</DropdownMenuItem>
            <DropdownMenuItem><Lock className="mr-2 h-4 w-4" /> Lock Chat</DropdownMenuItem>
          </>
        );
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      <ChatSidebar 
        activeTab={activeTab} 
        onTabChange={(tab) => {
          setActiveTab(tab);
          const firstSession = tab === 'dm' ? mockDMSessions[0] : mockCourseSessions[0];
          setSelectedSession(firstSession);
        }}
        currentRole={currentRole}
        onCycleRole={cycleRole}
        renderSettings={renderSettings}
      >
        <ScrollArea className="h-full">
          <div className="p-2 space-y-1">
            {currentSessions.map((session) => {
              const info = getTargetInfo(session);
              const isActive = selectedSession?.id === session.id;
              
              return (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                    isActive 
                      ? "bg-zinc-100 dark:bg-zinc-800" 
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12 border border-zinc-200 dark:border-zinc-700">
                      <AvatarImage src={info.avatar} alt={info.name} />
                      <AvatarFallback>{info.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {info.status === 'online' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-semibold text-sm truncate">{info.name}</h3>
                      <span className="text-[10px] text-zinc-400">10:30 AM</span>
                    </div>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">
                      {session.lastMessage}
                    </p>
                  </div>
                  {session.unreadCount > 0 && (
                    <Badge variant="default" className="h-5 min-w-5 flex items-center justify-center rounded-full p-0 text-[10px]">
                      {session.unreadCount}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </ChatSidebar>

      <ChatWindow 
        selectedSession={selectedSession}
        targetInfo={selectedSession ? getTargetInfo(selectedSession) : { name: '' }}
        inputArea={
          <MessageInput 
            value={messageInput} 
            onChange={setMessageInput} 
            onSend={handleSendMessage} 
          />
        }
      >
        {selectedSession && (
          <MessageList 
            messages={messages} 
            selectedSession={selectedSession} 
          />
        )}
      </ChatWindow>
    </div>
  );
}
