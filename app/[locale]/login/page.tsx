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
    /*
     * Login is a single-purpose conversion surface — most visitors just hit Google and bounce.
     * Flat white background with the same Pretendard / accent typography so the page reads as
     * one with the rest of the app, without the decorative mesh / noise / accent halo that the
     * earlier hero treatment piled on.
     */
    <div className="relative isolate overflow-hidden bg-white">
      <div className="container relative z-10 flex min-h-[calc(100vh-3.5rem-3rem)] max-w-md flex-col justify-center py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700">
            {t("title")}
          </p>
          <h1 className="mt-3 text-balance text-[26px] font-semibold leading-tight tracking-headline text-slate-900">
            {t("subtitle")}
          </h1>

          <Button
            variant="outline"
            className="mt-7 h-11 w-full justify-center"
            onClick={signInWithGoogle}
          >
            <GoogleIcon className="h-4 w-4" />
            {t("google")}
          </Button>
        </div>

        <p className="mt-6 text-center text-[12px] text-slate-500">
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
