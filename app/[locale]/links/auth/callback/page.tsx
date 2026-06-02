"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { setToken } from "@/lib/api";
import { Link, useRouter } from "@/i18n/navigation";
import { readStorageString, removeStorageItem, writeStorageString } from "@/lib/storage-json";
import { Button } from "@/components/ui/button";

const LOGIN_NEXT_KEY = "kurl:login-next";

export default function AuthCallbackPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryError = new URLSearchParams(window.location.search).get("error");
    if (queryError) {
      setError(t("oauthFailed", { reason: queryError }));
      return;
    }
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token=")) {
      setError(t("tokenMissing"));
      return;
    }
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const token = params.get("access_token");
    if (!token) {
      setError(t("tokenInvalid"));
      return;
    }
    setToken(token);
    // Drop a flag the dashboard reads on first render and clears, so the welcome toast appears
    // *after* navigation completes — putting it here would flash and disappear with the redirect.
    writeStorageString("kurl:just-signed-in", "1", { session: true });
    window.history.replaceState(null, "", "/auth/callback");

    // Return to the page login started from (blog, profile, …). Honor any safe internal path —
    // must start with a single "/" (no "//" or scheme) so it can't open-redirect off-origin.
    // signInWithGoogle stashes the full path incl. locale, so navigate with the browser (not the
    // locale-aware router, which would double-prefix). Falls back to /dashboard.
    const next = readStorageString(LOGIN_NEXT_KEY, { session: true });
    removeStorageItem(LOGIN_NEXT_KEY, { session: true });
    if (next && /^\/(?!\/)/.test(next) && !next.includes("\\")) {
      window.location.replace(next);
    } else {
      router.replace("/dashboard");
    }
  }, [router, t]);

  if (error) {
    return (
      <div className="container max-w-md py-20 text-center">
        <h1 className="text-xl font-semibold tracking-headline text-slate-900">{t("callbackFailed")}</h1>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <Link href="/login" className="mt-6 inline-block">
          <Button variant="outline">{t("backToLogin")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-md py-20 text-center">
      <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-500" />
      <p className="mt-3 text-sm text-slate-500">{t("callbackProcessing")}</p>
    </div>
  );
}
