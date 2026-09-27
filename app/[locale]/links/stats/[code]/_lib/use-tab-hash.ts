"use client";

import { useEffect, useState } from "react";

export type TabKey = "overview" | "who" | "when" | "where" | "settings";

const VALID: ReadonlyArray<TabKey> = ["overview", "who", "when", "where", "settings"];

function readHash(): TabKey {
  if (typeof window === "undefined") return "overview";
  const h = window.location.hash.replace("#", "") as TabKey;
  return VALID.includes(h) ? h : "overview";
}

/**
 * View state synced to {@code window.location.hash}. Refresh / share preserves the active view,
 * and back / forward updates it via the {@code hashchange} event.
 *
 * 뎁스 계약: 개요→챕터 진입은 {@code pushState} 로 스택에 쌓아 **브라우저 뒤로가기 = 개요 복귀**가
 * 되게 한다(2층 뷰의 예측 가능한 탈출구). 개요/같은 값으로의 이동만 {@code replaceState}.
 */
export function useTabHash(): [TabKey, (next: TabKey) => void] {
  const [tab, setTab] = useState<TabKey>(() => readHash());
  useEffect(() => {
    const onHash = () => setTab(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return [
    tab,
    (next: TabKey) => {
      setTab((current) => {
        if (typeof window !== "undefined" && next !== current) {
          if (next === "overview") {
            history.replaceState(null, "", window.location.pathname + window.location.search);
          } else {
            history.pushState(null, "", `#${next}`);
          }
        }
        return next;
      });
    },
  ];
}
