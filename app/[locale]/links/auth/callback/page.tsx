"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { completeSignIn } from "@/lib/api";
import { Link, useRouter } from "@/i18n/navigation";
import { writeStorageString } from "@/lib/storage-json";
import { readSafeLoginNext } from "@/lib/login-next-cookie";
import { buttonVariants } from "@/components/ui/button";
import { AuthFrame } from "@/components/auth/auth-frame";

export default function AuthCallbackPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryError = new URLSearchParams(window.location.search).get("error");
    if (queryError) {
      setError(t("oauthFailed"));
      return;
    }
    // Sign-in leaves only an HttpOnly refresh cookie. An older backend also put the access token in
    // the fragment — clear it from the address bar and history without reading it.
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    let cancelled = false;
    completeSignIn().then((signedIn) => {
      if (cancelled) return;
      if (!signedIn) {
        setError(t("signInIncomplete"));
        return;
      }
      // Drop a flag the dashboard reads on first render and clears, so the welcome toast appears
      // *after* navigation completes — putting it here would flash and disappear with the redirect.
      writeStorageString("kurl:just-signed-in", "1", { session: true });

      // Return to the page login started from (blog, profile, …). signInWithGoogle stashes the FULL
      // url in a `.kurl.me` cookie that survives the cross-host blog → apex callback hop;
      // readSafeLoginNext validates the origin (same-origin or on-platform .kurl.me) so it can't
      // open-redirect off-site and clears the cookie as it reads. Navigate with the browser — the
      // destination may be a different host (blog.kurl.me / {author}.kurl.me) than this apex
      // callback. Falls back to /dashboard.
      const next = readSafeLoginNext();
      if (next) {
        window.location.replace(next);
      } else {
        router.replace("/dashboard");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router, t]);

  const home = (mark: ReactNode) => (
    <Link href="/" aria-label="kurl" className="focus-ring block rounded-md">
      {mark}
    </Link>
  );

  if (error) {
    return (
      <AuthFrame home={home} title={t("callbackFailed")} description={error}>
        <Link href="/login" className={buttonVariants({ variant: "outline", className: "h-11 w-full" })}>
          {t("backToLogin")}
        </Link>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame home={home} title={t("callbackProcessing")}>
      <Loader2 aria-hidden className="mx-auto h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
    </AuthFrame>
  );
}
