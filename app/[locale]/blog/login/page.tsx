"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PenSquare } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/common/google-icon";

const LOGIN_NEXT_KEY = "kurl:login-next";

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
    // signInWithGoogle 은 /login 경로에서는 현재 경로를 stash 하지 않으므로, 돌아갈 목적지를
    // 여기서 직접 넣어 OAuth 왕복 뒤 callback 이 honor 하게 한다.
    if (next) sessionStorage.setItem(LOGIN_NEXT_KEY, next);
    signInWithGoogle();
  };

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem-3rem)] items-center justify-center overflow-hidden bg-gradient-to-b from-accent-50/50 to-white px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="hero-stagger flex flex-col items-center space-y-6 text-center">
          <span
            aria-hidden
            className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-600 text-white shadow-[0_12px_32px_-10px_rgba(5,150,105,0.6)]"
            style={{ ["--hi" as string]: 0 } as React.CSSProperties}
          >
            <PenSquare className="h-7 w-7" />
          </span>

          <div className="space-y-2" style={{ ["--hi" as string]: 1 } as React.CSSProperties}>
            <p className="font-mono text-[11px] uppercase tracking-tagline text-accent-700">
              {t("eyebrow")}
            </p>
            <h1 className="text-[26px] font-bold leading-tight tracking-headline text-slate-900">
              {t("title")}
            </h1>
            <p className="mx-auto max-w-xs text-[14px] leading-relaxed text-slate-500">
              {t("subtitle")}
            </p>
          </div>
        </div>

        <div className="profile-fade mt-10" style={{ ["--idx" as string]: 2 } as React.CSSProperties}>
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
          style={{ ["--idx" as string]: 3 } as React.CSSProperties}
        >
          <a
            href={blogHref("/")}
            className="text-[13px] text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
          >
            {t("browse")}
          </a>
        </div>
      </div>
    </div>
  );
}
