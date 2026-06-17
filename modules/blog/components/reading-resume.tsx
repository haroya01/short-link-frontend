"use client";

import { useEffect, useState } from "react";
import { BookOpen, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";

const KEY_PREFIX = "kurl:read-pos:";
const MIN_SAVE_Y = 600; // 이만큼도 안 내렸으면 "읽다 만" 게 아니다
const DONE_RATIO = 0.92; // 여기까지 갔으면 완독 — 기록 삭제
const MAX_KEYS = 50; // localStorage 위생: 가장 오래된 기록부터 정리

type Saved = { y: number; ratio: number; at: number };

function storageKey(postKey: string) {
  return `${KEY_PREFIX}${postKey}`;
}

function pruneOld() {
  try {
    const keys: { k: string; at: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(KEY_PREFIX)) continue;
      const at = (JSON.parse(localStorage.getItem(k) ?? "{}") as Saved).at ?? 0;
      keys.push({ k, at });
    }
    if (keys.length <= MAX_KEYS) return;
    keys.sort((a, b) => a.at - b.at);
    for (const { k } of keys.slice(0, keys.length - MAX_KEYS)) localStorage.removeItem(k);
  } catch {
    /* storage 접근 불가(시크릿 모드 등) — 기능 자체가 조용히 비활성 */
  }
}

/**
 * 읽기 이어가기 — 긴 글을 읽다 떠난 독자가 돌아왔을 때 "이어서 읽기" 칩으로 마지막 위치로 점프.
 * 전부 localStorage(기기 로컬): 서버도 계정도 필요 없고, 92% 이상 읽었으면 완독으로 보고 지운다.
 * 칩은 한 번 닫으면 그 방문에선 다시 안 뜬다(강요하지 않는 제안).
 */
export function ReadingResume({ postKey }: { postKey: string }) {
  const t = useTranslations("publicPost");
  const [resumeY, setResumeY] = useState<number | null>(null);
  // Portal gate: only mount the fixed chip on the client (avoids SSR document access + hydration skew).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 복원 제안: 마운트 시 저장된 위치가 있고, 지금 막 위에서 시작했다면 칩을 띄운다.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(postKey));
      if (!raw) return;
      const saved = JSON.parse(raw) as Saved;
      if (saved.y > MIN_SAVE_Y && saved.ratio < DONE_RATIO && window.scrollY < 200) {
        setResumeY(saved.y);
      }
    } catch {
      /* noop */
    }
  }, [postKey]);

  // 위치 기록: 스크롤을 rAF 스로틀로 관찰해 저장. 끝까지 가면 완독 처리(삭제).
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        if (max <= 0) return;
        const y = window.scrollY;
        const ratio = y / max;
        try {
          if (ratio >= DONE_RATIO) {
            localStorage.removeItem(storageKey(postKey));
          } else if (y > MIN_SAVE_Y) {
            localStorage.setItem(storageKey(postKey), JSON.stringify({ y, ratio, at: Date.now() } satisfies Saved));
          }
        } catch {
          /* noop */
        }
      });
    };
    pruneOld();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [postKey]);

  if (resumeY == null || !mounted) return null;

  // Portal to <body>: the post page's `.post-enter` article is a containing block for fixed
  // descendants, which would otherwise pin this chip to the reading column instead of the viewport.
  return createPortal(
    <div className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 sm:bottom-6">
      <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 py-1 pl-1.5 pr-1 shadow-[0_6px_20px_-8px_rgba(15,23,42,0.3)] backdrop-blur animate-fade-in dark:border-slate-700 dark:bg-slate-900/95">
        <button
          type="button"
          onClick={() => {
            const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            window.scrollTo({ top: resumeY, behavior: reduce ? "auto" : "smooth" });
            setResumeY(null);
          }}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <BookOpen className="h-4 w-4 text-accent-600 dark:text-accent-400" />
          {t("resumeReading")}
        </button>
        <button
          type="button"
          onClick={() => setResumeY(null)}
          aria-label={t("resumeDismiss")}
          className="focus-ring grid h-7 w-7 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
