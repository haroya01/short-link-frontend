export type CustomDomain = {
  id: number;
  domain: string;
  verificationToken: string;
  verificationHost: string;
  verified: boolean;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  autoVerifyUntil: string | null;
};

export type TwoFactorStatus = {
  enabled: boolean;
  lastUsedAt: string | null;
};

export type TwoFactorSetup = {
  secret: string;
  provisioningUri: string;
};

export type TwoFactorRecoveryCodes = {
  recoveryCodes: string[];
};

export type ApiKeySummary = {
  id: number;
  prefix: string;
  name: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

export type IssuedApiKey = {
  id: number;
  rawKey: string;
  prefix: string;
  name: string | null;
  createdAt: string;
};
