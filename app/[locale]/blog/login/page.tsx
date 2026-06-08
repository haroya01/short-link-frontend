"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { writeLoginNextCookie } from "@/lib/login-next-cookie";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/common/logo";
import { GoogleIcon } from "@/components/common/google-icon";

// ?next= 는 같은 오리진 내부 경로만 허용 — callback 의 동일 가드와 맞춰 open-redirect 차단.
function sanitizeNext(raw: string | null): string | null {
  if (!raw || !/^\/(?!\/)/.test(raw) || raw.includes("\\")) return null;
  return raw;
}

export default function BlogLoginPage() {
  // useSearchParams 는 Suspense 경계가 필요(빌드 시 prerender 가드).
  return (
    <Suspense fallback={<BlogLoginShell next={null} />}>
      <BlogLoginInner />
    </Suspense>
  );
}

function BlogLoginInner() {
  const searchParams = useSearchParams();
  return <BlogLoginShell next={sanitizeNext(searchParams.get("next"))} />;
}

function BlogLoginShell({ next }: { next: string | null }) {
  const t = useTranslations("blogLogin");
  const { ready, authenticated, signInWithGoogle } = useAuth();

  // 이미 로그인된 상태로 흘러들어온 경우(만료된 리다이렉트 등) 목적지로 바로 보냄.
  useEffect(() => {
    if (ready && authenticated) {
      window.location.replace(next ?? blogHref("/"));
    }
  }, [ready, authenticated, next]);

  const onSignIn = () => {
    // OAuth 콜백은 apex(kurl.me)로 떨어진다 → blog.kurl.me 에서 저장한 sessionStorage(오리진별)는
    // 콜백에서 못 읽고, 콜백은 readSafeLoginNext() = `.kurl.me` 쿠키만 읽는다. 또 signInWithGoogle 은
    // /login 경로에선 쿠키를 stash 하지 않는다. 그래서 돌아갈 목적지를 여기서 직접 `.kurl.me` 쿠키에
    // **절대 blog URL** 로 넣는다(bare path 면 콜백이 apex origin 기준으로 풀어 엉뚱한 제품으로 감).
    writeLoginNextCookie(blogHref(next ?? "/"));
    signInWithGoogle();
  };

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem-3rem)] items-center justify-center overflow-hidden bg-white px-4 py-16 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        {/* Same entrance as the kurl.me login: a hero-stagger cascade (kicker → mark draws on →
            wordmark → subtitle), then the action block fades up. The 3-bar brand mark sweeps on
            left-to-right (mark-draw-in) as its own reveal, and the blog.kurl wordmark lands under it —
            branded and quiet, no peppy onboarding chrome. */}
        <div className="hero-stagger flex flex-col items-center space-y-5 text-center">
          <p
            className="flex items-center justify-center gap-3"
            style={{ ["--hi" as string]: 0 } as React.CSSProperties}
          >
            <span aria-hidden className="hidden h-px w-10 bg-accent-300/70 dark:bg-accent-500/40 sm:block" />
            <span className="font-mono text-[11px] uppercase tracking-tagline text-accent-700 dark:text-accent-400">
              {t("eyebrow")}
            </span>
            <span aria-hidden className="hidden h-px w-10 bg-accent-300/70 dark:bg-accent-500/40 sm:block" />
          </p>

          {/* The mark IS the reveal — it draws on (mark-draw-in) rather than fading up with the rest. */}
          <div
            className="relative mark-draw-in text-accent-600 dark:text-accent-500"
            style={{ ["--hi" as string]: 1 } as React.CSSProperties}
          >
            <div
              aria-hidden
              className="absolute -inset-8 -z-10 rounded-full bg-accent-200/55 blur-3xl dark:bg-accent-500/20"
            />
            <Mark animated className="h-12 w-auto sm:h-14" />
          </div>

          <span
            className="text-[32px] font-bold leading-none tracking-headline"
            style={{ ["--hi" as string]: 2, letterSpacing: "-0.04em" } as React.CSSProperties}
          >
            <span className="text-slate-400 dark:text-slate-500">blog.</span>
            <span className="text-slate-900 dark:text-slate-100">kurl</span>
          </span>

          <p
            className="mx-auto max-w-xs text-[14px] leading-relaxed text-slate-500 dark:text-slate-400"
            style={{ ["--hi" as string]: 3 } as React.CSSProperties}
          >
            {t("subtitle")}
          </p>
        </div>

        <div className="profile-fade mt-10" style={{ ["--idx" as string]: 4 } as React.CSSProperties}>
          <Button
            variant="outline"
            className="h-11 w-full justify-center rounded-xl"
            onClick={onSignIn}
          >
            <GoogleIcon className="h-4 w-4" />
            {t("google")}
          </Button>
        </div>

        <div
          className="profile-fade mt-8 text-center"
          style={{ ["--idx" as string]: 5 } as React.CSSProperties}
        >
          <a
            href={blogHref("/")}
            className="text-[13px] text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
          >
            {t("browse")}
          </a>
        </div>
      </div>
    </div>
  );
}
