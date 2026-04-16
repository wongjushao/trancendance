// frontend/components/settings/MFADisableModal.tsx
'use client';

import { useState } from 'react';
import { X, Shield, AlertTriangle } from 'lucide-react';
import { GlowButton } from '@/components/lms/GlowButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { disableMFA } from '@/lib/mfa-api';
import { toast } from 'sonner';

interface MFADisableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMFASuccessfullyDisabled: () => void;
}

export function MFADisableModal({ isOpen, onClose, onMFASuccessfullyDisabled }: MFADisableModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDisable = async () => {
    if (confirmText !== 'DISABLE MFA') {
      toast.error('Please type "DISABLE MFA" to confirm');
      return;
    }

    setIsLoading(true);
    try {
      await disableMFA();
      toast.success('MFA has been disabled');
      onMFASuccessfullyDisabled();
      onClose();
      setConfirmText('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disable MFA');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl w-full max-w-md p-6 border border-red-500/20 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-500/20 rounded-xl">
            <Shield className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Disable Two-Factor Authentication</h2>
            <p className="text-sm text-gray-400">This will remove an extra layer of security</p>
          </div>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-400 font-medium mb-1">Warning</p>
              <p className="text-xs text-gray-300">
                Disabling MFA will make your account less secure. You will no longer need to enter
                a verification code when logging in from new devices.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <Label htmlFor="confirm">Type <span className="text-red-400">DISABLE MFA</span> to confirm</Label>
          <Input
            id="confirm"
            type="text"
            placeholder="DISABLE MFA"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="flex gap-3">
          <GlowButton variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </GlowButton>
          <GlowButton
            onClick={handleDisable}
            isLoading={isLoading}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            Disable MFA
          </GlowButton>
        </div>
      </div>
    </div>
  );
}