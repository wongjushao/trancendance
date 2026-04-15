import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ChatTabsProps {
  activeTab: 'dm' | 'course';
  onTabChange: (tab: 'dm' | 'course') => void;
}

export const ChatTabs: React.FC<ChatTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as 'dm' | 'course')}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="dm">DMs</TabsTrigger>
        <TabsTrigger value="course">Courses</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
