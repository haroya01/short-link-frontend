"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError, setToken, verifyTwoFactor } from "@/lib/api";
import { takeTwoFactorChallenge } from "@/lib/two-factor-challenge";
import { useApiErrorMessage } from "@/lib/error-messages";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  if (expired) {
    return (
      <div className="container max-w-md py-20 text-center">
        <h1 className="text-xl font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("title")}</h1>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{t("expired")}</p>
        <Link href="/login" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
          {tAuth("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-md py-16">
      <h1 className="text-xl font-semibold tracking-headline text-slate-900 dark:text-slate-100">{t("title")}</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {recovery ? t("descRecovery") : t("desc")}
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <Input
          autoFocus
          type="text"
          inputMode={recovery ? "text" : "numeric"}
          pattern={recovery ? undefined : "[0-9]*"}
          maxLength={recovery ? 16 : 6}
          placeholder={recovery ? t("placeholderRecovery") : t("placeholderCode")}
          value={code}
          onChange={(e) =>
            setCode(recovery ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ""))
          }
          className="font-mono"
          required
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <Button
          type="submit"
          variant="accent"
          className="w-full"
          disabled={submitting || code.length === 0}
        >
          {submitting ? t("verifying") : t("verifyButton")}
        </Button>
        <button
          type="button"
          onClick={() => {
            setRecovery((v) => !v);
            setCode("");
            setError(null);
          }}
          className="block w-full text-center text-xs text-slate-500 dark:text-slate-400 underline hover:text-slate-900 dark:hover:text-slate-100"
        >
          {recovery ? t("toggleToCode") : t("toggleToRecovery")}
        </button>
      </form>
    </div>
  );
}
