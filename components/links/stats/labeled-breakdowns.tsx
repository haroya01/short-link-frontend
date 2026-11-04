"use client";

import { useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import { mergeRegionClicks, regionMessageKey } from "@/lib/regions";
import { FETCH_SITE_KEYS, useStatsLabels } from "@/lib/stats-labels";
import type { ClientAppClick, FetchSiteClick, RegionClick } from "@/types";

/**
 * 원값을 사람 말로 바꿔 {@link BreakdownList} 에 넘기는 두 분해. 상세의 다른 분해(레퍼러·기기·
 * 국가)와 같은 막대 문법을 쓰고, 다른 점은 라벨을 카탈로그에서 끌어온다는 것뿐이다 —
 * {@code kakaotalk} / {@code cross-site} 같은 저장값이 화면에 그대로 나가지 않게.
 *
 * <p>두 컴포넌트가 한 파일에 있는 건 일지의 근거 펼침과 챕터 상세가 같은 렌더를 공유해야 하기
 * 때문이다(문장 따로 근거 따로 ❌).
 */
export function ClientAppBreakdown({
  items,
  maxItems,
  total,
  subgrid,
}: {
  items: ClientAppClick[];
  maxItems?: number;
  total?: number;
  subgrid?: boolean;
}) {
  const labels = useStatsLabels();
  return (
    <BreakdownList
      maxItems={maxItems}
      total={total}
      subgrid={subgrid}
      items={items.map((a) => ({ label: labels.clientApp(a.app), count: a.count }))}
    />
  );
}

export function FetchSiteBreakdown({ items, total, subgrid }: { items: FetchSiteClick[]; total?: number; subgrid?: boolean }) {
  const t = useTranslations("stats");
  return (
    <BreakdownList
      total={total}
      subgrid={subgrid}
      items={items.map((f) => {
        const key = FETCH_SITE_KEYS[f.fetchSite];
        return { label: key ? t(`fetchSite.${key}`) : f.fetchSite, count: f.count };
      })}
    />
  );
}

export function RegionBreakdown({ items, total, subgrid }: { items: RegionClick[]; total?: number; subgrid?: boolean }) {
  const t = useTranslations("stats");
  return (
    <BreakdownList
      total={total}
      subgrid={subgrid}
      items={mergeRegionClicks(items).map((r) => ({
        label: r.code ? t(`regionNames.${regionMessageKey(r.code)}`) : r.region,
        count: r.count,
      }))}
    />
  );
}
