"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { writeStorageString } from "@/lib/storage-json";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/common/google-icon";
import { AppleSignInButton } from "@/components/auth/apple-sign-in-button";

const LOGIN_NEXT_KEY = "kurl:login-next";

// Whitelist post-OAuth destinations so /login?next=evil.com cannot hijack the redirect.
const ALLOWED_NEXT_PATHS = new Set<string>([
  "/profile/auto",
  "/settings/profile",
  "/dashboard",
  "/analytics",
  "/settings",
  "/campaigns",
  "/campaigns/new",
  "/events",
  "/events/new",
]);

function sanitizeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/")) return null;
  return ALLOWED_NEXT_PATHS.has(raw) ? raw : null;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const searchParams = useSearchParams();
  const next = sanitizeNext(searchParams.get("next"));

  // OAuth round-trip drops the query string, so stash `next` here for the callback to read.
  useEffect(() => {
    if (next) writeStorageString(LOGIN_NEXT_KEY, next, { session: true });
  }, [next]);

  return <LoginShell next={next} />;
}

function LoginShell({ next = null }: { next?: string | null }) {
  const t = useTranslations("login");
  const { signInWithGoogle } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-900 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="hero-stagger flex flex-col items-center space-y-5 text-center">
          <div
            className="relative mark-draw-in"
            style={{ ["--hi" as string]: 0 } as React.CSSProperties}
          >
            <BrandMark className="h-10 w-auto" />
          </div>

          <h1
            className="text-2xl font-semibold tracking-headline text-slate-900 dark:text-slate-100"
            style={{ ["--hi" as string]: 1 } as React.CSSProperties}
          >
            {t("heading")}
          </h1>

          <p
            className="!mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400"
            style={{ ["--hi" as string]: 2 } as React.CSSProperties}
          >
            {t("subtitle")}
          </p>
        </div>

        <div
          className="profile-fade mt-8 space-y-3 px-4 sm:px-0"
          style={{ ["--idx" as string]: 4 } as React.CSSProperties}
        >
          <Button
            variant="outline"
            className="h-11 w-full justify-center rounded-lg"
            onClick={signInWithGoogle}
          >
            <GoogleIcon className="h-4 w-4" />
            {t("google")}
          </Button>
          <AppleSignInButton successHref={next ?? "/dashboard"} />
          <p
            className="px-2 pt-1 text-center text-[12px] leading-relaxed text-slate-500 dark:text-slate-400"
          >
            {t.rich("consent", {
              terms: (c) => (
                <Link
                  href="/terms"
                  className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {c}
                </Link>
              ),
              privacy: (c) => (
                <Link
                  href="/privacy"
                  className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {c}
                </Link>
              ),
            })}
          </p>
        </div>

        <div
          className="profile-fade mt-8 text-center"
          style={{ ["--idx" as string]: 6 } as React.CSSProperties}
        >
          <Link
            href="/"
            className="text-[13px] text-slate-500 dark:text-slate-400 underline-offset-4 hover:text-slate-900 dark:hover:text-slate-100 hover:underline"
          >
            {t("anonymousButton")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 18" aria-hidden className={className}>
      <defs>
        <linearGradient id="kurl-login-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      <g fill="url(#kurl-login-mark)">
        <rect className="mark-line mark-line-1" x="6" y="1" width="20" height="3.4" rx="1" />
        <rect className="mark-line mark-line-2" x="0" y="7.3" width="28" height="3.4" rx="1" />
        <rect className="mark-line mark-line-3" x="9" y="13.6" width="17" height="3.4" rx="1" />
      </g>
    </svg>
  );
}
