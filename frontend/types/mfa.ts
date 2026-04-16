// frontend/types/mfa.ts
export interface MFAApiResponse {
  enabled_mfa: boolean;
  totp_configured: boolean;
  backup_codes_configured: boolean;
  updated_at: string | null;
}

export interface MFASetupResponse {
  secret: string;
  provisioning_uri: string;
  issuer: string;
  account_name: string;
}

export interface MFASetupRequest {
  totp_secret?: string;
  backup_codes?: string[];
}

export interface MFAVerifyRequest {
  code: string;
}

export interface MFALoginVerifyRequest {
  code: string;
}

export interface MFALoginVerifyResponse {
  success: boolean;
  message: string;
}

export interface MFADisableResponse {
  success: boolean;
  message: string;
}