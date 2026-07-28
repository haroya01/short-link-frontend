"use client";

import { useLocale, useTranslations } from "next-intl";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn, formatNumber } from "@/lib/utils";
import type { ChannelDepth } from "@/types";

/**
 * 채널을 막대 하나가 아니라 시간축 위에서 읽는 표. 같은 100클릭이라도 "네 시간 만에 타고
 * 끝난 채널"과 "사흘째 사람을 남기는 채널"은 다른 이야기라, 클릭 옆에 첫 등장 시각과 재방문율을
 * 같이 세운다.
 *
 * <p>표 문법은 {@link CountryTable} 그대로 — 같은 화면에 두 표가 서면 하나의 언어로 읽혀야 한다.
 * 다만 하이라이트는 클릭 1등이 아니라 <b>재방문율</b> 1등에 준다. 이 표를 읽는 이유가 "어디에
 * 다음 글을 올릴까"이기 때문이다.
 */
export function ChannelDepthTable({
  data,
  timezone,
}: {
  data: ChannelDepth[];
  timezone: string;
}) {
  const t = useTranslations("stats");
  const locale = useLocale();
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">{t("noData")}</p>
    );
  }
  const formatFirstSeen = firstSeenFormatter(locale, timezone);
  const topRatio = data.reduce((m, c) => Math.max(m, c.returnRatio), 0);

  return (
    <Table>
      <THead>
        <TR>
          {/* 채널 열이 남는 폭을 전부 먹는다(w-full) — 안 그러면 넷이 균등 분배되며 수치 셋이
              표 한가운데 흩어져, 클릭·재방문을 나란히 훑기 어려워진다.
              좁은 화면에선 '처음' 열을 접고 채널 이름 밑줄로 내린다: 가로 스크롤에 밀려 사라지는
              게 하필 이 표를 만든 이유(재방문율)면 표가 아무 말도 안 하는 것과 같다. */}
          <TH className="w-full px-3 sm:px-4">{t("channelDepth.channel")}</TH>
          <TH className="w-[60px] px-2 text-right sm:w-[76px] sm:px-4">
            {t("channelDepth.clicks")}
          </TH>
          <TH className="hidden w-[128px] whitespace-nowrap text-right sm:table-cell">
            {t("channelDepth.firstSeen")}
          </TH>
          <TH className="w-[112px] px-3 text-right sm:w-[164px] sm:px-4">
            {t("channelDepth.returning")}
          </TH>
        </TR>
      </THead>
      <TBody>
        {data.map((c, i) => {
          const ratio = Math.max(0, Math.min(1, c.returnRatio));
          const pct = (ratio * 100).toFixed(0);
          const isLeader = c.returnRatio === topRatio && topRatio > 0;
          return (
            <TR key={c.host}>
              <TD className="px-3 sm:px-4">
                <span
                  className="block min-w-0 truncate font-medium text-slate-900 dark:text-slate-100"
                  title={c.host}
                >
                  {c.host}
                </span>
                <span className="mt-0.5 block whitespace-nowrap font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400 sm:hidden">
                  {formatFirstSeen(c.firstSeenAt)}
                </span>
              </TD>
              <TD className="px-2 text-right font-mono text-[12px] tabular-nums sm:px-4 sm:text-sm">
                {formatNumber(c.count)}
              </TD>
              <TD className="hidden whitespace-nowrap text-right font-mono text-[12px] tabular-nums text-slate-500 dark:text-slate-400 sm:table-cell">
                {formatFirstSeen(c.firstSeenAt)}
              </TD>
              <TD className="px-3 text-right sm:px-4">
                <span className="ml-auto flex w-[88px] items-center gap-2 sm:w-[128px]">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <span
                      className={cn(
                        "cd-bar block h-full rounded-full",
                        isLeader ? "bg-accent-700" : "bg-accent-600",
                      )}
                      style={{
                        width: `${pct}%`,
                        animation: `cdGrow 600ms ${i * 50}ms ease-out backwards`,
                      }}
                    />
                  </span>
                  <span
                    className={cn(
                      "w-8 text-right font-mono text-[11px] tabular-nums sm:w-9",
                      isLeader
                        ? "font-medium text-slate-900 dark:text-slate-100"
                        : "text-slate-500 dark:text-slate-400",
                    )}
                  >
                    {pct}%
                  </span>
                </span>
              </TD>
            </TR>
          );
        })}
      </TBody>
      {/* 막대 자람은 스태거 지연이 행마다 달라 인라인 style 로 걸린다. 그래서 끄는 쪽은
          !important 로 이긴다 — 저자 !important 는 인라인 선언보다 우선한다. */}
      <style jsx>{`
        @keyframes cdGrow {
          from {
            width: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .cd-bar {
            animation: none !important;
          }
        }
      `}</style>
    </Table>
  );
}

/**
 * 첫 등장 시각은 링크의 타임존으로 고정 포맷한다 — 뷰어의 시계(`Date.now()` / 로컬 TZ)에
 * 기대면 SSR 과 하이드레이션이 다른 문자열을 그려 화면이 깜빡인다(#425 와 같은 함정).
 * 잘못된 타임존 문자열이 오면 Intl 이 던지므로 UTC 로 물러선다.
 */
function firstSeenFormatter(locale: string, timezone: string) {
  const options: Intl.DateTimeFormatOptions = {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat(locale, { ...options, timeZone: timezone });
  } catch {
    fmt = new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" });
  }
  return (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : fmt.format(date);
  };
}
