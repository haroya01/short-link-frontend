"use client";

import { useEffect, useState } from "react";
import { BookOpen, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { usePresence } from "@/hooks/use-presence";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";

const KEY_PREFIX = "kurl:read-pos:";
const MIN_SAVE_Y = 600; // 이만큼도 안 내렸으면 "읽다 만" 게 아니다
const DONE_RATIO = 0.92; // 여기까지 갔으면 완독 — 기록 삭제
const MAX_KEYS = 50; // localStorage 위생: 가장 오래된 기록부터 정리
const SAVE_THROTTLE_MS = 800; // 스크롤 중 스토리지 쓰기 상한(마지막 위치만 트레일링으로 반영)

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

export function ReadingResume({ postKey }: { postKey: string }) {
  const t = useTranslations("publicPost");
  const [resumeY, setResumeY] = useState<number | null>(null);
  // Portal gate: only mount the fixed chip on the client (avoids SSR document access + hydration skew).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { mounted: present, closing } = usePresence(resumeY != null, 160);

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

  // localStorage 쓰기는 트레일링 스로틀: 매 프레임 동기 setItem 을 피하고, 탭이 숨거나 떠날 때 한 번 더 남긴다.
  useEffect(() => {
    let raf = 0;
    let timer = 0;
    const pending: { current: Saved | "done" | null } = { current: null };

    const flush = () => {
      const p = pending.current;
      if (p == null) return;
      pending.current = null;
      try {
        if (p === "done") localStorage.removeItem(storageKey(postKey));
        else localStorage.setItem(storageKey(postKey), JSON.stringify(p));
      } catch {
        /* noop */
      }
    };
    const flushNow = () => {
      if (timer) {
        clearTimeout(timer);
        timer = 0;
      }
      flush();
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        if (max <= 0) return;
        const y = window.scrollY;
        const ratio = y / max;
        if (ratio >= DONE_RATIO) pending.current = "done";
        else if (y > MIN_SAVE_Y) pending.current = { y, ratio, at: Date.now() };
        else return; // 상단 근처 — 기록 대상 아님
        if (!timer)
          timer = window.setTimeout(() => {
            timer = 0;
            flush();
          }, SAVE_THROTTLE_MS);
      });
    };
    // 탭을 숨기거나 떠날 때는 스로틀 창을 기다리지 않고 즉시 마지막 위치를 남긴다.
    const onHide = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    pruneOld();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushNow);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushNow);
      if (raf) cancelAnimationFrame(raf);
      flushNow(); // 언마운트(SPA 이탈) 시 마지막 위치 보존
    };
  }, [postKey]);

  if (!present || !mounted) return null;

  // Portal to <body>: the post page's `.post-enter` article is a containing block for fixed
  // descendants, which would otherwise pin this chip to the reading column instead of the viewport.
  return createPortal(
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 z-30 -translate-x-1/2 sm:bottom-6">
      <div
        className={`flex items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-1.5 pr-1 shadow-float motion-reduce:animate-none dark:border-slate-700 dark:bg-slate-850 ${
          closing ? "animate-fade-out" : "animate-fade-in"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            const reduce = prefersReducedMotion();
            if (resumeY != null) window.scrollTo({ top: resumeY, behavior: reduce ? "auto" : "smooth" });
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
