import { getTranslations } from "next-intl/server";
import {
  listFeedByTag,
  listPublicPosts,
  type PublicAuthor,
  type PublicFeedItem,
} from "@/modules/blog/api/public-posts";
import { FeedCard, FeedList } from "@/modules/blog/components/feed-card";
import { RailHeading } from "@/modules/blog/components/rail-heading";

const COUNT = 3;

/**
 * 글 끝의 "다음 읽을 글" — 시리즈가 아닌 글은 다 읽고 나면 동선이 끊겼다(시리즈만 next 가 있었음).
 * 1순위: 같은 대표 태그의 최신 글, 모자라면 같은 작가의 다른 글로 채운다. 서버 컴포넌트라 추가
 * 클라이언트 JS 없음; 추천이 0개면 섹션 자체를 렌더하지 않는다(빈 헤딩 금지).
 */
export async function RelatedPosts({
  locale,
  author,
  currentSlug,
  tags,
}: {
  locale: string;
  author: PublicAuthor;
  currentSlug: string;
  tags: string[];
}) {
  const t = await getTranslations({ locale, namespace: "publicPost" });
  const seen = new Set<string>([`${author.username}/${currentSlug}`]);
  const picks: PublicFeedItem[] = [];

  const tag = tags[0];
  if (tag) {
    const byTag = await listFeedByTag(tag, "recent", 0, COUNT + 2);
    if (byTag.ok) {
      for (const item of byTag.data.items) {
        const key = `${item.author.username}/${item.slug}`;
        if (seen.has(key)) continue;
        seen.add(key);
        picks.push(item);
        if (picks.length >= COUNT) break;
      }
    }
  }

  if (picks.length < COUNT) {
    // 같은 작가의 최근 글로 채움 — 목록 응답에는 author/viewCount 가 없어 페이지가 가진 author 로
    // FeedCard 가 기대하는 피드 아이템 모양을 만든다(조회수는 카드에서 안 쓰므로 0 고정).
    const byAuthor = await listPublicPosts(author.username);
    if (byAuthor.ok) {
      for (const post of byAuthor.data.posts) {
        const key = `${author.username}/${post.slug}`;
        if (seen.has(key)) continue;
        seen.add(key);
        picks.push({ ...post, author, viewCount: 0, followReason: null });
        if (picks.length >= COUNT) break;
      }
    }
  }

  if (picks.length === 0) return null;

  return (
    <section aria-label={t("relatedHeading")} className="mt-14 border-t border-slate-100 pt-8 dark:border-slate-800">
      <RailHeading className="mb-2">{t("relatedHeading")}</RailHeading>
      <FeedList>
        {picks.map((item) => (
          <FeedCard key={`${item.author.username}/${item.slug}`} item={item} locale={locale} />
        ))}
      </FeedList>
    </section>
  );
}
