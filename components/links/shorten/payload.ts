import type { CreateLinkRequest } from "@/types";

type ShortenInput = {
  url: string;
  authenticated: boolean;
  customCode: string;
  expiresAt: string;
  lockOn: boolean;
  password: string;
};

export function shortenPayload(input: ShortenInput): CreateLinkRequest {
  const { url, authenticated, customCode, expiresAt, lockOn } = input;
  const password = input.password.trim();
  return {
    url,
    customCode: authenticated && customCode.trim() ? customCode.trim() : undefined,
    expiresAt: authenticated && expiresAt ? new Date(expiresAt).toISOString() : undefined,
    password: authenticated && lockOn && password ? password : undefined,
  };
}
