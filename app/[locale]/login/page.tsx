"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/google-icon";

const LOGIN_NEXT_KEY = "kurl:login-next";

/**
 * Whitelist of redirect destinations allowed via {@code ?next=}. Restricting to known internal
 * paths blocks open-redirect attacks where an external attacker crafts a /login?next=evil.com
 * link that hijacks the post-OAuth navigation. Any callback wanting to deep-link here must add
 * its target to this list.
 */
const ALLOWED_NEXT_PATHS = new Set<string>([
  "/profile/auto",
  "/profile/edit",
  "/dashboard",
  "/settings",
]);

function sanitizeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/")) return null;
  return ALLOWED_NEXT_PATHS.has(raw) ? raw : null;
}

/**
 * The page-default export. Wraps the inner component (which calls {@code useSearchParams}) in a
 * Suspense boundary — Next.js 15 requires this for any page that reads search params, otherwise
 * prerender bails out with a CSR-fallback error.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const searchParams = useSearchParams();

  // OAuth flow (window.location.href → external Google → redirect back to /auth/callback) loses
  // the URL query string. Stash the intended destination in sessionStorage at page load; the
  // callback page reads + clears it after the token lands.
  useEffect(() => {
    const next = sanitizeNext(searchParams.get("next"));
    if (next) sessionStorage.setItem(LOGIN_NEXT_KEY, next);
  }, [searchParams]);

  return <LoginShell />;
}

function LoginShell() {
  const t = useTranslations("login");
  const { signInWithGoogle } = useAuth();
  return (
    <div className="grid-bg">
      <div className="container flex min-h-[calc(100vh-3.5rem-3rem)] max-w-md flex-col justify-center py-16">
        <div className="rounded-lg border border-slate-200 bg-white p-8">
          <h1 className="font-mono text-xl font-semibold tracking-tight text-slate-900">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>

          <Button
            variant="outline"
            className="mt-6 h-11 w-full justify-center"
            onClick={signInWithGoogle}
          >
            <GoogleIcon className="h-4 w-4" />
            {t("google")}
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          {t.rich("anonymousAlt", {
            shorten: (chunks) => (
              <Link href="/" className="text-slate-700 underline underline-offset-4">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </div>
  );
}
