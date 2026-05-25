"use client";

import { Suspense, useEffect } from "react";
import type { ComponentType } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/common/google-icon";
import { BarChart3, Link2, ShieldCheck } from "lucide-react";

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
  "/campaigns",
  "/campaigns/new",
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
      <div className="container relative z-10 flex min-h-[calc(100vh-3.5rem-3rem)] max-w-md flex-col justify-center py-10 sm:py-16">
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

          <div className="mt-6 grid gap-2 border-t border-slate-100 pt-5 text-[12px] text-slate-500">
            <LoginBenefit icon={Link2} label={t("benefits.links")} />
            <LoginBenefit icon={BarChart3} label={t("benefits.stats")} />
            <LoginBenefit icon={ShieldCheck} label={t("benefits.keep")} />
          </div>
        </div>

        {/* 익명 사용자 옵션 — 이전엔 작은 underline link 였는데 visual weight 약해서 사용자가
            "로그인만 가능한 페이지" 로 오해. ghost button + 위 link 와 명확히 분리. */}
        <div className="mt-6 flex flex-col items-center gap-1.5">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-600">
              {t("anonymousButton")}
            </Button>
          </Link>
          <p className="text-[11px] text-slate-400">{t("anonymousNote")}</p>
        </div>
      </div>
    </div>
  );
}

function LoginBenefit({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-accent-50 text-accent-700">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span>{label}</span>
    </div>
  );
}
