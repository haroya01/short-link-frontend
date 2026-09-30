"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { linksHref } from "@/lib/host";
import { clearLoginNextCookie, writeLoginNextCookie } from "@/lib/login-next-cookie";
import { LoginPanel } from "@/components/auth/login-panel";

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
  return <LoginShell next={sanitizeNext(searchParams.get("next"))} />;
}

function LoginShell({ next = null }: { next?: string | null }) {
  const t = useTranslations("login");
  const locale = useLocale();
  const { signInWithGoogle } = useAuth();

  // The OAuth callback reads its destination only from the `.kurl.me` cookie, and signInWithGoogle
  // skips writing it on /login — so the page records where this sign-in should land.
  const onGoogle = () => {
    if (next) writeLoginNextCookie(linksHref(`/${locale}${next}`));
    else clearLoginNextCookie();
    signInWithGoogle();
  };
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
      onGoogle={onGoogle}
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
          className="text-[13px] text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-slate-900 dark:text-slate-400 dark:decoration-slate-600 dark:hover:text-slate-100"
        >
          {t("anonymousButton")}
        </Link>
      }
    />
  );
}
