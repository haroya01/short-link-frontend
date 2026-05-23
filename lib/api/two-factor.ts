import type { TwoFactorRecoveryCodes, TwoFactorSetup, TwoFactorStatus } from "@/types";

import { request } from "./client";

export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  return request<TwoFactorStatus>("/api/v1/2fa/status", { method: "GET" });
}

export async function startTwoFactorSetup(): Promise<TwoFactorSetup> {
  return request<TwoFactorSetup>("/api/v1/2fa/setup", { method: "POST" });
}

export async function confirmTwoFactor(code: string): Promise<TwoFactorRecoveryCodes> {
  return request<TwoFactorRecoveryCodes>("/api/v1/2fa/confirm", {
    method: "POST",
    body: { code },
  });
}

export async function disableTwoFactor(code: string): Promise<void> {
  await request("/api/v1/2fa/disable", { method: "POST", body: { code } });
}

export async function regenerateRecoveryCodes(code: string): Promise<TwoFactorRecoveryCodes> {
  return request<TwoFactorRecoveryCodes>("/api/v1/2fa/recovery-codes/regenerate", {
    method: "POST",
    body: { code },
  });
}

export async function verifyTwoFactor(
  challenge: string,
  code: string,
  recovery: boolean,
): Promise<{ accessToken: string }> {
  return request<{ accessToken: string }>("/api/v1/auth/2fa/verify", {
    method: "POST",
    body: { challenge, code, recovery },
  });
}
