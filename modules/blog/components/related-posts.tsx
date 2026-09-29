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

// 시리즈 회차 제목의 말미 회차 표기("(3)"·"(3화)"·"③" 아님 — 괄호 숫자만)를 벗긴 줄기.
// 피드 아이템에 시리즈 id 가 없어, 같은 시리즈 회차가 태그 피드에서 (3)(2)(1) 로 3연타되던 것을
// 제목 휴리스틱으로 접는다(적대 검증 r4 — 3슬롯이 사실상 1개 아이템이었다).
function titleStem(title: string): string {
  return title.replace(/\s*[(（]\d+[)）]\s*$/, "").trim();
}

/**
 * 글 끝의 "다음 읽을 글" — 시리즈가 아닌 글은 다 읽고 나면 동선이 끊겼다(시리즈만 next 가 있었음).
 * 1순위: 같은 대표 태그의 최신 글, 모자라면 같은 작가의 다른 글로 채운다. 서버 컴포넌트라 추가
 * 클라이언트 JS 없음; 추천이 0개면 섹션 자체를 렌더하지 않는다(빈 헤딩 금지).
 * 같은 제목 줄기는 1슬롯만 — 현재 글의 줄기도 미리 등록해, 현재 시리즈의 다른 회차(SeriesNav/
 * SeriesNext 가 담당)가 추천 슬롯을 다시 먹지 않게 한다.
 */
export async function RelatedPosts({
  locale,
  author,
  currentSlug,
  currentTitle,
  tags,
}: {
  locale: string;
  author: PublicAuthor;
  currentSlug: string;
  currentTitle: string;
  tags: string[];
}) {
  const t = await getTranslations({ locale, namespace: "publicPost" });
  const seen = new Set<string>([`${author.username}/${currentSlug}`]);
  const seenStems = new Set<string>([titleStem(currentTitle)]);
  const picks: PublicFeedItem[] = [];
  const pick = (item: PublicFeedItem): boolean => {
    const key = `${item.author.username}/${item.slug}`;
    const stem = titleStem(item.title);
    if (seen.has(key) || seenStems.has(stem)) return false;
    seen.add(key);
    seenStems.add(stem);
    picks.push(item);
    return picks.length >= COUNT;
  };

  const tag = tags[0];
  if (tag) {
    const byTag = await listFeedByTag(tag, "recent", 0, COUNT + 2);
    if (byTag.ok) {
      for (const item of byTag.data.items) {
        if (pick(item)) break;
      }
    }
  }

  if (picks.length < COUNT) {
    // 같은 작가의 최근 글로 채움 — 목록 응답에는 author/viewCount 가 없어 페이지가 가진 author 로
    // FeedCard 가 기대하는 피드 아이템 모양을 만든다(조회수는 카드에서 안 쓰므로 0 고정).
    const byAuthor = await listPublicPosts(author.username);
    if (byAuthor.ok) {
      for (const post of byAuthor.data.posts) {
        if (pick({ ...post, author, viewCount: 0, followReason: null })) break;
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
