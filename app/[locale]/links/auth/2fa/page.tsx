"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ApiError, setToken, verifyTwoFactor } from "@/lib/api";
import { takeTwoFactorChallenge } from "@/lib/two-factor-challenge";
import { useApiErrorMessage } from "@/lib/error-messages";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthFrame } from "@/components/auth/auth-frame";

export default function TwoFactorChallengePage() {
  const router = useRouter();
  const t = useTranslations("auth.twofa");
  const tAuth = useTranslations("auth");
  const errorMessage = useApiErrorMessage();
  // Null means the server reads the challenge from the cookie a Google sign-in set.
  const [challenge, setChallenge] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const challengeRead = useRef(false);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (challengeRead.current) return;
    challengeRead.current = true;
    // An older backend put the challenge in the fragment; take it and clear the address bar.
    const fromFragment = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("challenge");
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    setChallenge(takeTwoFactorChallenge() ?? fromFragment);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await verifyTwoFactor(challenge, code.trim(), recovery);
      setToken(result.accessToken);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.detail.code === "INVALID_REFRESH_TOKEN") {
        setExpired(true);
        return;
      }
      setError(errorMessage(err, t("verifyFailed")));
      setSubmitting(false);
    }
  }

  const home = (mark: ReactNode) => (
    <Link href="/" aria-label="kurl" className="focus-ring block rounded-md">
      {mark}
    </Link>
  );

  if (expired) {
    return (
      <AuthFrame home={home} title={t("title")} description={t("expired")}>
        <Link href="/login" className={buttonVariants({ variant: "outline", className: "h-11 w-full" })}>
          {tAuth("backToLogin")}
        </Link>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      home={home}
      title={t("title")}
      description={recovery ? t("descRecovery") : t("desc")}
      footer={
        <button
          type="button"
          onClick={() => {
            setRecovery((v) => !v);
            setCode("");
            setError(null);
          }}
          className="text-[13px] text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-slate-900 dark:text-slate-400 dark:decoration-slate-600 dark:hover:text-slate-100"
        >
          {recovery ? t("toggleToCode") : t("toggleToRecovery")}
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          autoFocus
          type="text"
          inputMode={recovery ? "text" : "numeric"}
          autoComplete="one-time-code"
          pattern={recovery ? undefined : "[0-9]*"}
          maxLength={recovery ? 16 : 6}
          placeholder={recovery ? t("placeholderRecovery") : t("placeholderCode")}
          value={code}
          onChange={(e) =>
            setCode(recovery ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ""))
          }
          className="h-11 text-center font-mono text-[17px] tracking-[0.2em]"
          required
        />
        {error && (
          <p role="alert" className="text-center text-[13px] text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <Button
          type="submit"
          variant="accent"
          className="h-11 w-full"
          disabled={submitting || code.length === 0}
        >
          {submitting ? t("verifying") : t("verifyButton")}
        </Button>
      </form>
    </AuthFrame>
  );
}
