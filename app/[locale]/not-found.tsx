import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Mark } from "@/components/common/logo";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div data-testid="not-found" className="container max-w-md py-24 text-center">
      {/* 이 화면의 주 방문자는 만료 단축링크를 밟고 온, kurl 을 처음 보는 사람이다 — 브랜드 0픽셀
          이던 것(적대 검증 r4)에 마크 하나로 최소한의 발신자 서명을 남긴다. 404 그래머(마크→모노
          아이브로→제목→설명→CTA)는 블로그 글 404 와 공유. */}
      <Mark className="mx-auto h-5 w-auto text-accent-600" />
      <p className="mt-6 font-mono text-[11px] uppercase tracking-tagline text-slate-500">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-headline text-slate-900">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{t("description")}</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        {t("cta")}
      </Link>
    </div>
  );
}
