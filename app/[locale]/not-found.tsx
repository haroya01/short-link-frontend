import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { NotFoundThemeSync } from "@/components/common/not-found-theme-sync";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div data-testid="not-found" className="container max-w-md py-24 text-center">
      {/* 동적 페이지의 notFound() 는 클라이언트 렌더라 레이아웃의 no-FOUC 테마 스크립트가
          실행되지 않는다 — hydration 후 쿠키 판정을 한 번 더 적용. */}
      <NotFoundThemeSync />
      <p className="font-mono text-[11px] uppercase tracking-tagline text-slate-500 dark:text-slate-400">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-headline text-slate-900 dark:text-slate-100">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t("description")}</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-md bg-accent-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-800 dark:bg-accent-500 dark:text-slate-950 dark:hover:bg-accent-400"
      >
        {t("cta")}
      </Link>
    </div>
  );
}
