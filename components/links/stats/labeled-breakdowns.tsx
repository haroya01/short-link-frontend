"use client";

import { useTranslations } from "next-intl";
import { BreakdownList } from "@/components/links/stats/breakdown-list";
import { CLIENT_APPS, FETCH_SITE_KEYS } from "@/lib/stats-labels";
import type { ClientAppClick, FetchSiteClick } from "@/types";

/**
 * 원값을 사람 말로 바꿔 {@link BreakdownList} 에 넘기는 두 분해. 상세의 다른 분해(레퍼러·기기·
 * 국가)와 같은 막대 문법을 쓰고, 다른 점은 라벨을 카탈로그에서 끌어온다는 것뿐이다 —
 * {@code kakaotalk} / {@code cross-site} 같은 저장값이 화면에 그대로 나가지 않게.
 *
 * <p>두 컴포넌트가 한 파일에 있는 건 일지의 근거 펼침과 챕터 상세가 같은 렌더를 공유해야 하기
 * 때문이다(문장 따로 근거 따로 ❌).
 */
export function ClientAppBreakdown({ items }: { items: ClientAppClick[] }) {
  const t = useTranslations("stats");
  return (
    <BreakdownList
      items={items.map((a) => ({
        label: CLIENT_APPS.has(a.app) ? t(`clientApp.${a.app}`) : a.app,
        count: a.count,
      }))}
    />
  );
}

export function FetchSiteBreakdown({ items }: { items: FetchSiteClick[] }) {
  const t = useTranslations("stats");
  return (
    <BreakdownList
      items={items.map((f) => {
        const key = FETCH_SITE_KEYS[f.fetchSite];
        return { label: key ? t(`fetchSite.${key}`) : f.fetchSite, count: f.count };
      })}
    />
  );
}
