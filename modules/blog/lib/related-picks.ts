import type { PublicFeedItem } from "@/modules/blog/api/public-posts";

// 시리즈 회차 제목의 말미 회차 표기("(3)"·"(3화)"·"③" 아님 — 괄호 숫자만)를 벗긴 줄기.
// 피드 아이템에 시리즈 id 가 없어, 같은 시리즈 회차가 태그 피드에서 (3)(2)(1) 로 3연타되던 것을
// 제목 휴리스틱으로 접는다(적대 검증 r4 — 3슬롯이 사실상 1개 아이템이었다).
export function titleStem(title: string): string {
  return title.replace(/\s*[(（]\d+[)）]\s*$/, "").trim();
}

/**
 * "다음 읽을 글" 후보를 받아 담는 그릇 — 현재 글은 빼고, 같은 제목 줄기는 1슬롯만.
 * 시리즈에 든 글은 자기 줄기도 미리 막아, 같은 시리즈의 다른 회차(SeriesNav/SeriesNext 가 담당)가
 * 추천 슬롯을 다시 먹지 않게 한다. 시리즈로 묶이지 않은 "(1)·(3)" 글은 그 동선이 없으므로 줄기를
 * 막지 않는다 — 같은 줄기의 다른 편이 유일한 다음 글일 수 있다.
 */
export function relatedPicker({
  currentKey,
  currentTitle,
  inSeries,
  count,
}: {
  /** `username/slug` of the post being read. */
  currentKey: string;
  currentTitle: string;
  inSeries: boolean;
  count: number;
}) {
  const seen = new Set<string>([currentKey]);
  const seenStems = new Set<string>(inSeries ? [titleStem(currentTitle)] : []);
  const picks: PublicFeedItem[] = [];
  return {
    picks,
    /** Takes the item if it is new; returns true once the picker is full. */
    offer(item: PublicFeedItem): boolean {
      const key = `${item.author.username}/${item.slug}`;
      const stem = titleStem(item.title);
      if (picks.length < count && !seen.has(key) && !seenStems.has(stem)) {
        seen.add(key);
        seenStems.add(stem);
        picks.push(item);
      }
      return picks.length >= count;
    },
  };
}
