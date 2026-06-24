"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { setToken } from "@/lib/api/client";
import { appleWebLogin } from "@/lib/api/apple-login";
import { writeStorageString } from "@/lib/storage-json";

const APPLE_SDK_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

// Web Services ID + redirect URI from Apple Developer. Absent → the button doesn't render, so the
// whole feature stays inert until the console setup is done.
const SERVICE_ID = process.env.NEXT_PUBLIC_APPLE_SERVICE_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI;

type AppleAuth = {
  init: (opts: {
    clientId: string;
    scope: string;
    redirectURI: string;
    usePopup: boolean;
    nonce: string;
  }) => void;
  signIn: () => Promise<{ authorization: { id_token: string } }>;
};

declare global {
  interface Window {
    AppleID?: { auth: AppleAuth };
  }
}

function loadAppleSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.AppleID) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${APPLE_SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("apple sdk failed")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = APPLE_SDK_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("apple sdk failed"));
    document.head.appendChild(s);
  });
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * "Sign in with Apple" on the web. Reuses the backend's existing Apple id-token verifier (the same
 * one the iOS app uses) via Apple JS: hand Apple a hashed nonce, get an identity token back, and
 * POST it (with the raw nonce) to /api/v1/auth/apple, which sets the refresh cookie.
 *
 * @param successHref where to go once the session is set (the login page's `next` destination).
 */
export function AppleSignInButton({ successHref }: { successHref: string }) {
  const t = useTranslations("auth");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!SERVICE_ID || !REDIRECT_URI) return null;

  const onClick = async () => {
    setError(null);
    setBusy(true);
    try {
      await loadAppleSdk();
      const rawNonce = crypto.randomUUID();
      // The verifier checks token.nonce === sha256(rawNonce). Apple JS echoes the init nonce into
      // the token verbatim, so we give it the hash and send the raw value to the server.
      const hashedNonce = await sha256Hex(rawNonce);
      window.AppleID!.auth.init({
        clientId: SERVICE_ID!,
        scope: "name email",
        redirectURI: REDIRECT_URI!,
        usePopup: true,
        nonce: hashedNonce,
      });
      const data = await window.AppleID!.auth.signIn();
      const result = await appleWebLogin(data.authorization.id_token, rawNonce);
      if (result.challenge) {
        window.location.assign("/auth/2fa#challenge=" + encodeURIComponent(result.challenge));
        return;
      }
      if (result.accessToken) {
        setToken(result.accessToken);
        writeStorageString("kurl:just-signed-in", "1", { session: true });
        window.location.assign(successHref);
        return;
      }
      setError(t("appleFailed"));
    } catch (e) {
      // Closing the Apple popup rejects — that's a user cancel, not an error to surface.
      const msg = e instanceof Error ? e.message : "";
      if (!/popup_closed|cancel/i.test(msg)) setError(t("appleFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Button
        variant="outline"
        className="h-11 w-full justify-center rounded-xl"
        onClick={onClick}
        disabled={busy}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AppleIcon className="h-4 w-4" />}
        {t("apple")}
      </Button>
      {error && (
        <p className="mt-2 text-center text-[12px] text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 384 512" className={className} fill="currentColor" aria-hidden>
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}
