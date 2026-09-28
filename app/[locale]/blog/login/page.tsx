"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { blogHref, linksHref } from "@/lib/host";
import { writeLoginNextCookie } from "@/lib/login-next-cookie";
import { LoginPanel } from "@/components/auth/login-panel";

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
    <LoginPanel
      renderHome={(mark) => (
        <a href={blogHref("/")} aria-label="kurl log" className="focus-ring block rounded-md">
          {mark}
        </a>
      )}
      title={t("heading")}
      subtitle={t("subtitle")}
      googleLabel={t("google")}
      onGoogle={onSignIn}
      appleSuccessHref={blogHref(next ?? "/")}
      consent={t.rich("consent", {
        terms: (c) => (
          <a href={linksHref("/terms")} className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-300">
            {c}
          </a>
        ),
        privacy: (c) => (
          <a href={linksHref("/privacy")} className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-300">
            {c}
          </a>
        ),
      })}
      footer={
        <a
          href={blogHref("/")}
          className="text-[13px] text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
        >
          {t("browse")}
        </a>
      }
    />
  );
}
