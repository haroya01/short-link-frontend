import { request } from "@/lib/api/client";

/**
 * Web "Sign in with Apple" result. On success the refresh token is in an HTTP-only cookie set by the
 * response, so only the access token comes back; with 2FA enabled only {@code challenge} is set and
 * the caller finishes through the shared 2FA page.
 */
export interface AppleWebLoginResult {
  accessToken?: string;
  challenge?: string;
}

/** Exchange an Apple identity token (from Apple JS) for a kurl web session. */
export function appleWebLogin(
  identityToken: string,
  nonce: string,
): Promise<AppleWebLoginResult> {
  return request<AppleWebLoginResult>("/api/v1/auth/apple", {
    method: "POST",
    body: { identityToken, nonce },
  });
}
