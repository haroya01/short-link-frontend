"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, isValidUrl, shortenUrl } from "@/lib/api";
import { prewarmPowToken } from "@/lib/pow";
import { track } from "@/components/common/posthog-provider";
import type { CreateLinkResponse } from "@/types";

type ShortenedItem = {
  res: CreateLinkResponse;
  originalUrl: string;
};

type Props = {
  authenticated: boolean;
  ready: boolean;
  onShortened: (results: ShortenedItem[]) => void;
  /**
   * 랜딩 폴드의 카드-폼 변형 — 바깥 카드(page.tsx)가 보더·포커스 링을 소유하므로
   * 메인 입력은 무테로 키우고, 버튼은 카드 라운드에 맞춘다. 고급 옵션 필드는 무관.
   */
  hero?: boolean;
};

export function ShortenForm({ authenticated, ready, onShortened, hero = false }: Props) {
  const t = useTranslations("shortenForm");
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 히어로 성공 시 blur 용 — 모바일 키보드를 내려야 결과 카드가 실제 뷰포트에 들어온다. */
  const heroInputRef = useRef<HTMLInputElement>(null);

  // Pre-warm one proof-of-work token while the user is typing so the first POST doesn't pay the
  // mining cost. Authenticated users skip PoW server-side, so don't bother computing. Wait for
  // `ready` — before /me resolves, a logged-in user's first render is authenticated=false, so an
  // unguarded prewarm would fetch a single-use challenge and mine a throwaway token every visit.
  useEffect(() => {
    if (ready && !authenticated) {
      prewarmPowToken();
    }
  }, [ready, authenticated]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await shorten(url.trim());
  }

  /**
   * 히어로의 "붙여넣으면 바로 짧아진다" — 빈 한 줄에 유효한 URL 이 붙으면 제출까지 한 호흡.
   * 고급 옵션(코드·만료)을 만지는 중이거나 이미 타이핑한 내용이 있으면 끼어들지 않는다 —
   * 자동 제출은 의도가 명백한 경우(빈 필드 + 완결된 URL 붙여넣기)에만.
   */
  function handleHeroPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    if (!hero || busy) return;
    if (url.trim() || showAdvanced || customCode.trim() || expiresAt) return;
    const pasted = e.clipboardData.getData("text").trim();
    if (!isValidUrl(pasted)) return;
    e.preventDefault();
    setUrl(pasted);
    void shorten(pasted);
  }

  async function shorten(trimmed: string) {
    setError(null);
    if (!trimmed) {
      setError(t("errors.empty"));
      return;
    }
    if (!isValidUrl(trimmed)) {
      setError(t("errors.invalid"));
      return;
    }

    setBusy(true);
    try {
      const codeForSingle =
        authenticated && customCode.trim() ? customCode.trim() : undefined;
      const expiry =
        authenticated && expiresAt ? new Date(expiresAt).toISOString() : undefined;

      const res = await shortenUrl({
        url: trimmed,
        customCode: codeForSingle,
        expiresAt: expiry,
      });

      track("link_shortened", {
        count: 1,
        authenticated,
        has_custom_code: Boolean(codeForSingle),
        has_expiry: Boolean(expiry),
      });
      onShortened([{ res, originalUrl: trimmed }]);
      setUrl("");
      setCustomCode("");
      setExpiresAt("");
      // 모바일: 키보드가 서 있으면 결과 카드가 가시 뷰포트 밖(키보드 뒤)에 깔린다 —
      // 성공했으니 입력의 소임은 끝, 키보드를 내리고 무대를 결과에 넘긴다(page 가 스크롤 인도).
      if (hero) heroInputRef.current?.blur();
    } catch (err) {
      setError(messageOf(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {hero ? (
        /* 히어로 = 카드가 아니라 진짜 "한 줄" — 헤드라인(단축은 한 줄)과 같은 문장. 밑줄이
           입력의 전부고, 포커스가 오면 밑줄만 초록으로 응답한다(초록=마커라는 kurl 문법).
           버튼도 상자 없이 밑줄 위의 초록 글자 — ↵ 는 엔터로 끝난다는 힌트.
           에러도 같은 줄의 문법 — 밑줄이 빨강으로 갈리고 메시지가 줄 바로 밑에 앉는다.
           (다시 포커스하면 초록이 이겨 "고치는 중"이 보인다. 넛지는 메시지 행에만 —
           입력 줄을 key 로 리마운트하면 타이핑 중 포커스가 날아간다.) */
        <div
          className={
            "flex items-end gap-4 border-b-2 pb-2 transition-colors duration-200 " +
            (error
              ? // 에러 중엔 빨강이 포커스보다 세다 — 제출 직후 포커스가 버튼(줄 안)에 남아
                // focus-within 초록이 이기면 빨간 메시지와 신호가 엇갈린다. 타이핑을 시작하면
                // onChange 가 에러를 걷어 초록 포커스로 자연 복귀("고치는 중").
                "border-red-500 dark:border-red-400"
              : "border-slate-900/80 focus-within:border-accent-600 dark:border-slate-100/80 dark:focus-within:border-accent-500")
          }
        >
          <Input
            ref={heroInputRef}
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              // 고치기 시작하면 에러는 소임을 다했다 — 빨간 줄을 들고 있지 않는다.
              if (error) setError(null);
            }}
            onPaste={handleHeroPaste}
            placeholder={t("placeholder")}
            disabled={busy}
            aria-invalid={!!error}
            className="h-11 flex-1 rounded-none border-0 bg-transparent px-0 text-[16px] shadow-none placeholder:text-slate-400 focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent dark:placeholder:text-slate-500 sm:h-12 sm:text-[19px]"
          />
          <button
            type="submit"
            disabled={busy}
            aria-label={t("submit")}
            className="focus-ring mb-1.5 inline-flex shrink-0 items-baseline gap-1.5 text-[15px] font-extrabold tracking-tight text-accent-700 transition-colors hover:text-accent-800 disabled:opacity-60 dark:text-accent-400 dark:hover:text-accent-300 sm:text-base"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin self-center" />
            ) : (
              <>
                {t("heroSubmit")}
                <span aria-hidden className="text-[13px] font-semibold text-slate-400 dark:text-slate-500">
                  ↵
                </span>
              </>
            )}
          </button>
        </div>
      ) : null}
      {hero && error && (
        /* 메시지는 줄 바로 밑 — 빨간 짧은 바(마커 문법의 에러 판)가 앞장서고, 행 전체가
           옆으로 한 번 살짝 어긋났다 돌아온다(err-nudge 1회). key=문구라 같은 에러 재제출도 재발화. */
        <p
          key={error}
          role="alert"
          className="motion-safe:animate-[err-nudge_240ms_var(--ease)] flex items-center gap-2 text-[13px] font-medium text-red-600 dark:text-red-400"
        >
          <span aria-hidden className="h-[3px] w-3.5 shrink-0 rounded-full bg-red-500 dark:bg-red-400" />
          {error}
        </p>
      )}
      {!hero && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("placeholder")}
            disabled={busy}
            aria-invalid={!!error}
            className="h-12 sm:flex-1"
          />
          <Button
            type="submit"
            size="lg"
            variant="accent"
            disabled={busy}
            className="h-12 w-full sm:h-11 sm:w-auto sm:min-w-32"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("submit")}
          </Button>
        </div>
      )}

      {/* Advanced section is auth-only — customCode + expiresAt require a logged-in account
          server-side, and anonymous visitors no longer have channel chips to expand into, so the
          toggle would reveal an empty panel. Hide it entirely for anonymous to keep the form
          surface honest about what's actually configurable. */}
      {authenticated && (
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            aria-controls="shorten-advanced-section"
            className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-[280ms] ease-[var(--ease)] ${showAdvanced ? "rotate-180" : ""}`}
            />
            {t("advancedToggle")}
          </button>
          {/*
           * Grid-rows trick for "auto height" reveal animations: an outer grid container animates
           * between `grid-rows-[0fr]` (collapsed) and `grid-rows-[1fr]` (expanded), and the inner
           * panel uses `min-h-0 overflow-hidden` so its measured content is clipped during transit.
           * One declarative CSS rule that survives field count changes without JS bookkeeping.
           * Reduce-motion users skip the animation entirely via the media query in the className.
           */}
          <div
            id="shorten-advanced-section"
            aria-hidden={!showAdvanced}
            className={`grid transition-[grid-template-rows,opacity] duration-[280ms] ease-[var(--ease)] motion-reduce:transition-none ${
              showAdvanced
                ? "mt-2 grid-rows-[1fr] opacity-100"
                : "mt-0 grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block min-w-0 space-y-1.5">
                    <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
                      {t("customCodeLabel")}
                    </span>
                    <Input
                      type="text"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      pattern="^[0-9A-Za-z]{3,16}$"
                      placeholder={t("customCodePlaceholder")}
                      className="h-9 font-mono text-sm"
                      disabled={busy}
                    />
                  </label>
                  <label className="block min-w-0 space-y-1.5">
                    <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
                      {t("expiresAtLabel")}
                    </span>
                    <Input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="h-9 text-sm"
                      disabled={busy}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 히어로는 줄 밑에서 이미 말했다 — 여기(폼 꼬리)는 카드형 폼의 자리만. */}
      {!hero && error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function messageOf(err: unknown, t: (key: string) => string): string {
  if (err instanceof ApiError) {
    if (err.detail.code === "MALICIOUS_URL") return t("errors.malicious");
    if (err.detail.code === "DUPLICATE_SHORT_CODE") return t("errors.duplicate");
    if (err.detail.code === "SELF_REFERENCING_URL") return t("errors.selfReferencing");
    if (err.detail.code === "RESERVED_SHORT_CODE") return t("errors.reservedCode");
    if (err.detail.code === "LINK_QUOTA_EXCEEDED") return t("errors.quota");
    if (err.detail.code === "VALIDATION_FAILED") {
      const fields = err.detail.errors?.map((e) => translateValidation(e.field, e.message, t));
      return fields?.join(", ") ?? t("errors.validation");
    }
    // detail 은 서버의 영문 로그 원문 — 사용자 화면엔 매핑된 카피만 내보낸다.
    return t("errors.generic");
  }
  if (err instanceof Error) return err.message;
  return t("errors.generic");
}

function translateValidation(field: string, message: string, t: (key: string) => string): string {
  if (field === "customCode") return t("errors.customCodeFormat");
  if (field === "url") {
    if (message.toLowerCase().includes("http")) return t("errors.urlScheme");
    if (message.toLowerCase().includes("blank")) return t("errors.urlBlank");
    return t("errors.urlGeneric");
  }
  return message;
}
