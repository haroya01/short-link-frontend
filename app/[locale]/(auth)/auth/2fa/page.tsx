"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { setToken, verifyTwoFactor } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TwoFactorChallengePage() {
  const router = useRouter();
  const t = useTranslations("auth.twofa");
  const errorMessage = useApiErrorMessage();
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      setError(t("missingChallenge"));
      return;
    }
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const c = params.get("challenge");
    if (!c) {
      setError(t("missingChallenge"));
      return;
    }
    setChallenge(c);
    window.history.replaceState(null, "", "/auth/2fa");
  }, [t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await verifyTwoFactor(challenge, code.trim(), recovery);
      setToken(result.accessToken);
      router.replace("/links");
    } catch (err) {
      setError(errorMessage(err, t("verifyFailed")));
      setSubmitting(false);
    }
  }

  if (!challenge && error) {
    return (
      <div className="container max-w-md py-20 text-center">
        <h1 className="text-xl font-semibold tracking-headline text-slate-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <Link href="/login" className="mt-6 inline-block">
          <Button variant="outline">{t("backToLogin")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-md py-16">
      <h1 className="text-xl font-semibold tracking-headline text-slate-900">{t("title")}</h1>
      <p className="mt-2 text-sm text-slate-500">
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
        {error && <p className="text-xs text-red-600">{error}</p>}
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
          className="block w-full text-center text-xs text-slate-500 underline hover:text-slate-900"
        >
          {recovery ? t("toggleToCode") : t("toggleToRecovery")}
        </button>
      </form>
    </div>
  );
}
