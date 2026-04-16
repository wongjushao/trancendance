// frontend/components/settings/MFASetupModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Shield, 
  Smartphone, 
  Key, 
  Copy, 
  Check,
  AlertCircle,
  Download,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { GlowButton } from '@/components/lms/GlowButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setupMFA, verifyAndEnableMFA } from '@/lib/mfa-api';
import { toast } from 'sonner';

interface MFASetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMFASuccessfullyEnabled: () => void;
}

export function MFASetupModal({ isOpen, onClose, onMFASuccessfullyEnabled }: MFASetupModalProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [secret, setSecret] = useState<string>('');
  const [provisioningUri, setProvisioningUri] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize MFA setup when modal opens
  useEffect(() => {
    if (isOpen && step === 'setup') {
      initializeSetup();
    }
  }, [isOpen]);

  const initializeSetup = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await setupMFA();
      setSecret(response.secret);
      setProvisioningUri(response.provisioning_uri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup MFA');
      toast.error('Failed to initialize MFA setup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }

    setIsVerifying(true);
    setError(null);
    try {
      const response = await verifyAndEnableMFA(verificationCode);
      if (response.success && response.backup_codes) {
        setBackupCodes(response.backup_codes);
        setStep('backup');
        toast.success('MFA has been enabled successfully!');
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
      toast.error('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBackupCodes = () => {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trancendance-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleComplete = () => {
    onMFASuccessfullyEnabled();
    onClose();
    // Reset state for next time
    setStep('setup');
    setVerificationCode('');
    setBackupCodes([]);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl w-full max-w-md p-6 border border-purple-500/20 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/20 rounded-xl">
            <Shield className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Set Up Two-Factor Authentication</h2>
            <p className="text-sm text-gray-400">Add an extra layer of security to your account</p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Step 1: Setup - Display Secret and QR Code */}
        {step === 'setup' && (
        <div className="space-y-4">
            {isLoading ? (
            <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
            ) : (
            <>
                <div className="text-center">
                <div className="inline-block p-3 bg-gray-800 rounded-xl mb-3">
                    <Smartphone className="w-8 h-8 text-purple-400" />
                </div>
                <p className="text-sm text-gray-300">
                    Scan the QR code with Google Authenticator or any TOTP app
                </p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl">
                    {provisioningUri ? (
                    <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(provisioningUri)}`}
                        alt="Scan this QR code with Google Authenticator"
                        className="w-48 h-48"
                    />
                    ) : (
                    <div className="w-48 h-48 bg-gray-200 flex items-center justify-center rounded">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
                    </div>
                    )}
                </div>
                </div>

                {/* Manual Secret Entry - keep as is */}
                <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm text-gray-300">Manual Entry Code</Label>
                    <button
                    onClick={() => copyToClipboard(secret)}
                    className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
                    >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
                <code className="text-sm font-mono bg-gray-900 p-2 rounded block text-center break-all">
                    {secret}
                </code>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-xs text-yellow-400">
                    <strong>Important:</strong> Save this secret key. You'll need it if you lose access to your authenticator app.
                </p>
                </div>

                <GlowButton
                onClick={() => setStep('verify')}
                fullWidth
                className="mt-4"
                >
                Continue to Verification
                </GlowButton>
            </>
            )}
        </div>
        )}

        {/* Step 2: Verify Code */}
        {step === 'verify' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Enter the 6-digit code from your authenticator app to verify setup
            </p>

            <div>
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(value);
                  setError(null);
                }}
                className="text-center text-2xl tracking-widest"
                maxLength={6}
              />
            </div>

            <GlowButton
              onClick={handleVerify}
              isLoading={isVerifying}
              fullWidth
            >
              Verify and Enable
            </GlowButton>

            <button
              onClick={() => setStep('setup')}
              className="text-sm text-purple-400 hover:text-purple-300 text-center w-full"
            >
              ← Back to setup
            </button>
          </div>
        )}

        {/* Step 3: Backup Codes */}
        {step === 'backup' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-block p-2 bg-green-500/20 rounded-full mb-3">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-sm text-gray-300">
                MFA has been enabled! Save these backup codes in a secure place.
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-sm text-gray-300">Backup Codes</Label>
                <button
                  onClick={() => setShowBackupCodes(!showBackupCodes)}
                  className="text-gray-400 hover:text-white"
                >
                  {showBackupCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <code
                    key={index}
                    className={`text-sm font-mono bg-gray-900 p-2 rounded text-center ${
                      !showBackupCodes ? 'blur-sm select-none' : ''
                    }`}
                  >
                    {showBackupCodes ? code : '••••••••'}
                  </code>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <GlowButton
                variant="secondary"
                onClick={downloadBackupCodes}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </GlowButton>
              <GlowButton
                onClick={() => copyToClipboard(backupCodes.join('\n'))}
                variant="secondary"
                className="flex-1"
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                Copy All
              </GlowButton>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-xs text-red-400">
                <strong>Warning:</strong> Each backup code can only be used once. Store them securely.
                If you lose access to your authenticator app, these codes are your only way to recover your account.
              </p>
            </div>

            <GlowButton onClick={handleComplete} fullWidth>
              Done
            </GlowButton>
          </div>
        )}
      </div>
    </div>
  );
}