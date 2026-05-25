"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/common/google-icon";
import { cn } from "@/lib/utils";

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
        <div className="hero-stagger flex flex-col items-center space-y-5 text-center">
          <h1
            className="flex items-center justify-center gap-3"
            style={{ ["--hi" as string]: 0 } as React.CSSProperties}
          >
            <span aria-hidden className="hidden h-px w-10 bg-accent-300/70 sm:block" />
            <span className="font-mono text-[11px] uppercase tracking-tagline text-accent-700">
              {t("title")}
            </span>
            <span aria-hidden className="hidden h-px w-10 bg-accent-300/70 sm:block" />
          </h1>

          <div
            className="relative"
            style={{ ["--hi" as string]: 1 } as React.CSSProperties}
          >
            <div
              aria-hidden
              className="absolute -inset-8 -z-10 rounded-full bg-accent-200/55 blur-3xl"
            />
            <BrandMark className="h-14 w-auto" />
          </div>

          <BrandRotator
            style={{ ["--hi" as string]: 2 } as React.CSSProperties}
          />

          <p
            className="text-[13px] leading-relaxed text-slate-500"
            style={{ ["--hi" as string]: 3 } as React.CSSProperties}
          >
            {t("subtitle")}
          </p>
        </div>

        <div
          className="profile-fade mt-10"
          style={{ ["--idx" as string]: 4 } as React.CSSProperties}
        >
          <Button
            variant="outline"
            className="h-11 w-full justify-center rounded-xl"
            onClick={signInWithGoogle}
          >
            <GoogleIcon className="h-4 w-4" />
            {t("google")}
          </Button>
        </div>

        <div
          className="profile-fade mt-8 text-center"
          style={{ ["--idx" as string]: 5 } as React.CSSProperties}
        >
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

const ROTATION_HOLD_MS = 1500;
const ROTATED_KEY = "kurl:login-rotated";

function BrandRotator({ style }: { style?: React.CSSProperties }) {
  const t = useTranslations("login");
  const phrases = (() => {
    try {
      const raw = t.raw("rotation");
      return Array.isArray(raw) ? (raw as string[]) : [];
    } catch {
      return [];
    }
  })();

  // SSR / no-JS / reduced-motion / 세션 재방문은 모두 settled 상태로 떨어져야 해서 초기값은 끝.
  const [idx, setIdx] = useState<number>(phrases.length);

  useEffect(() => {
    if (phrases.length === 0) return;
    const seen = sessionStorage.getItem(ROTATED_KEY) === "1";
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduced) return;
    setIdx(0);
  }, [phrases.length]);

  useEffect(() => {
    if (phrases.length === 0) return;
    if (idx >= phrases.length) {
      sessionStorage.setItem(ROTATED_KEY, "1");
      return;
    }
    const timer = setTimeout(() => setIdx((i) => i + 1), ROTATION_HOLD_MS);
    return () => clearTimeout(timer);
  }, [idx, phrases.length]);

  const settled = phrases.length === 0 || idx >= phrases.length;
  const current = phrases[Math.min(idx, Math.max(phrases.length - 1, 0))] ?? "";

  return (
    <div
      className="relative flex h-12 w-full items-center justify-center"
      style={style}
      aria-hidden
    >
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center text-[34px] font-bold leading-none text-slate-900 transition-all duration-500 ease-out",
          settled ? "scale-100 opacity-100" : "scale-90 opacity-0",
        )}
        style={{ letterSpacing: "-0.04em" }}
      >
        kurl<span className="text-slate-400">.me</span>
      </span>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center whitespace-nowrap text-[20px] font-medium leading-none text-slate-700 transition-opacity duration-300",
          settled ? "opacity-0" : "opacity-100",
        )}
      >
        <span
          key={idx}
          className="inline-block animate-[hero-fade-in_280ms_ease-out]"
        >
          {renderPhraseWithMeAccent(current)}
        </span>
      </span>
    </div>
  );
}

function renderPhraseWithMeAccent(phrase: string) {
  // ".me" 는 워드마크의 slate-400 처리와 시각 운(韻)을 맞추려 분리 렌더.
  const parts = phrase.split(/(\.me)/g);
  return parts.map((part, i) =>
    part === ".me" ? (
      <span key={i} className="text-slate-400">
        .me
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 18" aria-hidden className={className}>
      <defs>
        <linearGradient id="kurl-login-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      <g fill="url(#kurl-login-mark)">
        <rect x="6" y="1" width="20" height="3.4" rx="1.7" />
        <rect x="0" y="7.3" width="28" height="3.4" rx="1.7" />
        <rect x="9" y="13.6" width="17" height="3.4" rx="1.7" />
      </g>
    </svg>
  );
}
