"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { writeStorageString } from "@/lib/storage-json";
import { LoginPanel } from "@/components/auth/login-panel";

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
    <LoginPanel
      renderHome={(mark) => (
        <Link href="/" aria-label="kurl" className="focus-ring block rounded-md">
          {mark}
        </Link>
      )}
      title={t("heading")}
      subtitle={t("subtitle")}
      googleLabel={t("google")}
      onGoogle={signInWithGoogle}
      appleSuccessHref={next ?? "/dashboard"}
      consent={t.rich("consent", {
        terms: (c) => (
          <Link href="/terms" className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-300">
            {c}
          </Link>
        ),
        privacy: (c) => (
          <Link href="/privacy" className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-300">
            {c}
          </Link>
        ),
      })}
      footer={
        <Link
          href="/"
          className="text-[13px] text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
        >
          {t("anonymousButton")}
        </Link>
      }
    />
  );
}
