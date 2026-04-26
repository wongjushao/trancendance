export type UserRole = 'student' | 'teacher' | 'org_admin';

export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline';
  role: UserRole;
}

export interface Course {
  id: string;
  name: string;
  image: string;
  memberCount: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  text: string;
  timestamp: string;
  isMe: boolean;
}

export interface ChatSession {
  id: string;
  type: 'dm' | 'course';
  targetId: string; // userId or courseId
  lastMessage?: string;
  unreadCount: number;
}
