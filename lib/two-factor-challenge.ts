import { readStorageString, removeStorageItem, writeStorageString } from "@/lib/storage-json";

// Apple's web sign-in returns the 2FA challenge in a response body. It reaches /auth/2fa through
// this tab's sessionStorage rather than the URL, and is read once so an abandoned attempt can't
// leak into a later Google sign-in (which carries its challenge in a cookie).
const KEY = "kurl:2fa-challenge";

export function handOverTwoFactorChallenge(challenge: string) {
  writeStorageString(KEY, challenge, { session: true });
}

export function takeTwoFactorChallenge(): string | null {
  const challenge = readStorageString(KEY, { session: true });
  removeStorageItem(KEY, { session: true });
  return challenge;
}
