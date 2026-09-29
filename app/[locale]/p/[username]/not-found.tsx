import { getLocale, getTranslations } from "next-intl/server";
import { Mark } from "@/components/common/logo";
import { blogHref } from "@/lib/host";
import { blogCta } from "@/modules/blog/components/blog-cta";
import { listPublicFeed, type PublicFeedItem } from "@/modules/blog/api/public-posts";
import { FeedCard, FeedList } from "@/modules/blog/components/feed-card";
import { RailHeading } from "@/modules/blog/components/rail-heading";

/**
 * 404 그래머는 전면 404([locale]/not-found)와 공유: 마크 → 모노 아이브로 "404" → 제목 → 설명 →
 * CTA. 종전엔 두 404 의 숫자 위계·CTA 스타일이 정반대라 한 서비스에 404 문법이 두 개였다(적대
 * 검증 r4). 카피는 글 표면 전용("단축 링크 만료" 오진 제거), 아래 트렌딩 3장은 404 를 이탈
 * 지점이 아니라 다음 읽을거리 진열대로 바꾸는 회유 장치(Ghost 문법).
 */
export default async function PublishingNotFound() {
  const locale = await getLocale();
  const t = await getTranslations("notFound");

  // 에러 표면 안에서 또 에러를 내지 않는다 — 추천 로드 실패는 조용히 생략.
  let picks: PublicFeedItem[] = [];
  try {
    const res = await listPublicFeed("trending", 0, 3);
    if (res.ok) picks = res.data.items.slice(0, 3);
  } catch {
    /* quiet */
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <div className="text-center">
        <Mark className="mx-auto h-5 w-auto text-accent-600" />
        <p className="mt-6 font-mono text-[11px] uppercase tracking-tagline text-slate-500 dark:text-slate-400">
          404
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-headline text-slate-900 dark:text-slate-100">
          {t("postTitle")}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t("postDescription")}
        </p>
        <div className="mt-8 flex justify-center">
          <a href={blogHref("/")} className={blogCta({ variant: "secondary" })}>
            {t("cta")}
          </a>
        </div>
      </div>

      {picks.length > 0 && (
        <div className="mt-16">
          <RailHeading className="mb-3">{t("postTrending")}</RailHeading>
          <FeedList>
            {picks.map((item) => (
              <FeedCard key={`${item.author.username}/${item.slug}`} item={item} locale={locale} />
            ))}
          </FeedList>
        </div>
      )}
    </main>
  );
}
