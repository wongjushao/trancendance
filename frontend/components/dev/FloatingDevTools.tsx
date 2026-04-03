// frontend/components/dev/FloatingDevTools.tsx
'use client';

import { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { RoleSwitcher } from './RoleSwitcher';
import { EmailSimulator } from './EmailSimulator';

export function FloatingDevTools() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Dev Tools Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 z-50 rounded-full bg-purple-600 p-2.5 text-white shadow-lg hover:bg-purple-700 transition-all group"
        aria-label="Developer tools"
      >
        <Settings className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {/* Dev Tools Panel */}
      {isOpen && (
        <div className="fixed bottom-28 right-4 z-50 flex flex-col gap-2">
          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="self-end rounded-full bg-gray-700 p-1.5 text-white hover:bg-gray-600 transition-all mb-1"
            aria-label="Close developer tools"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          
          {/* Email Simulator - NO positioning classes here */}
          <EmailSimulator />
          
          {/* Role Switcher - NO positioning classes here */}
          <RoleSwitcher />
        </div>
      )}
    </>
  );
}