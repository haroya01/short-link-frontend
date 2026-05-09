"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { setToken } from "@/lib/api";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

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
    sessionStorage.setItem("kurl:just-signed-in", "1");
    window.history.replaceState(null, "", "/auth/callback");
    router.replace("/dashboard");
  }, [router, t]);

  if (error) {
    return (
      <div className="container max-w-md py-20 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{t("callbackFailed")}</h1>
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
