"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { requestBlob } from "@/lib/api/client";

/**
 * 내 글 전부를 마크다운 zip 한 방으로 — 가져오기(ImportMdButton)의 짝. "언제든 들고 나갈 수
 * 있다"가 글 단위(.md)만이 아니라 계정 단위로도 참이 되게 하는 문. 서버가 frontmatter 포함
 * slug.md 들을 zip 으로 조립한다(초안·예약·내림 포함 — 내 데이터 전부).
 */
export function ExportMdButton() {
  const t = useTranslations("postEditor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function exportAll() {
    setBusy(true);
    setError(false);
    try {
      const { blob, filename } = await requestBlob("/api/v1/posts/export");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename ?? "kurl-export.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void exportAll()}
        disabled={busy}
        title={t("exportAllHint")}
        aria-label={t("exportAll")}
        className="focus-ring inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/50 sm:px-3.5"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {/* 헤더에 버튼 셋이 서는 폭이라 모바일에선 아이콘만 — 라벨은 sm↑ */}
        <span className="hidden sm:inline">{t("exportAll")}</span>
      </button>
      {error && (
        <p role="alert" className="text-[12px] text-red-600 dark:text-red-400">
          {t("exportAllFailed")}
        </p>
      )}
    </>
  );
}
