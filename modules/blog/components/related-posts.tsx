import { getTranslations } from "next-intl/server";
import { listFeedByTag, listPublicPosts, type PublicAuthor } from "@/modules/blog/api/public-posts";
import { RelatedPicksList } from "@/modules/blog/components/related-picks-list";
import { relatedPicker } from "@/modules/blog/lib/related-picks";

const COUNT = 3;

/**
 * 글 끝의 "다음 읽을 글" — 시리즈가 아닌 글은 다 읽고 나면 동선이 끊겼다(시리즈만 next 가 있었음).
 * 1순위: 같은 대표 태그의 최신 글, 모자라면 같은 작가의 다른 글로 채운다. 서버는 익명으로 고르고,
 * 로그인 독자에겐 그 독자의 태그 피드로 다시 고른다(RelatedPicksList). 추천이 0개면 섹션 자체를
 * 렌더하지 않는다(빈 헤딩 금지).
 */
export async function RelatedPosts({
  locale,
  author,
  currentSlug,
  currentTitle,
  tags,
  seriesSize = 0,
}: {
  locale: string;
  author: PublicAuthor;
  currentSlug: string;
  currentTitle: string;
  tags: string[];
  /** Episodes in the series this post belongs to; 0 when it is in none. */
  seriesSize?: number;
}) {
  const t = await getTranslations({ locale, namespace: "publicPost" });
  const pick = {
    currentKey: `${author.username}/${currentSlug}`,
    currentTitle,
    inSeries: seriesSize > 0,
    count: COUNT,
  };
  const picker = relatedPicker(pick);

  const tag = tags[0];
  // 태그 피드 머리를 같은 시리즈 회차가 채우고 있으면 그만큼은 버려지는 후보다.
  const tagSize = COUNT + Math.max(2, seriesSize);
  if (tag) {
    const byTag = await listFeedByTag(tag, "recent", 0, tagSize);
    if (byTag.ok) {
      for (const item of byTag.data.items) {
        if (picker.offer(item)) break;
      }
    }
  }

  if (picker.picks.length < COUNT) {
    // 같은 작가의 최근 글로 채움 — 목록 응답에는 author/viewCount 가 없어 페이지가 가진 author 로
    // FeedCard 가 기대하는 피드 아이템 모양을 만든다(조회수는 카드에서 안 쓰므로 0 고정).
    const byAuthor = await listPublicPosts(author.username);
    if (byAuthor.ok) {
      for (const post of byAuthor.data.posts) {
        if (picker.offer({ ...post, author, viewCount: 0, followReason: null })) break;
      }
    }
  }

  if (picker.picks.length === 0) return null;

  return (
    <RelatedPicksList
      locale={locale}
      heading={t("relatedHeading")}
      initial={picker.picks}
      refresh={tag ? { tag, tagSize, author, pick } : null}
    />
  );
}
