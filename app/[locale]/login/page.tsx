"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/common/google-icon";
import { Logo } from "@/components/common/logo";

const LOGIN_NEXT_KEY = "kurl:login-next";

// Whitelist post-OAuth destinations so /login?next=evil.com cannot hijack the redirect.
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

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const searchParams = useSearchParams();

  // OAuth round-trip drops the query string, so stash `next` here for the callback to read.
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
    <div className="flex min-h-[calc(100vh-3.5rem-3rem)] items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center">
          <Logo />
          <h1 className="mt-6 text-[15px] font-medium text-slate-600">{t("title")}</h1>
        </div>

        <Button
          variant="outline"
          className="mt-8 h-11 w-full justify-center"
          onClick={signInWithGoogle}
        >
          <GoogleIcon className="h-4 w-4" />
          {t("google")}
        </Button>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-[13px] text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
          >
            {t("anonymousButton")}
          </Link>
        </div>
      </div>
    </div>
  );
}
