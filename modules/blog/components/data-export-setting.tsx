"use client";

import { useState } from "react";
import { Bookmark, Download, Hand, List, Loader2, Server, Users, VolumeX } from "lucide-react";
import type { ComponentType } from "react";
import { useTranslations } from "next-intl";
import { requestBlob } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

const KINDS: { kind: string; file: string; labelKey: string; icon: ComponentType<{ className?: string }> }[] = [
  { kind: "following", file: "following_accounts.csv", labelKey: "exportFollowing", icon: Users },
  { kind: "blocks", file: "blocked_accounts.csv", labelKey: "exportBlocks", icon: Hand },
  { kind: "mutes", file: "muted_accounts.csv", labelKey: "exportMutes", icon: VolumeX },
  { kind: "domain-blocks", file: "blocked_domains.csv", labelKey: "exportDomainBlocks", icon: Server },
  { kind: "bookmarks", file: "bookmarks.csv", labelKey: "exportBookmarks", icon: Bookmark },
  { kind: "lists", file: "lists.csv", labelKey: "exportLists", icon: List },
];

const MOCK_CSV: Record<string, string> = {
  following: "Account address,Show boosts,Notify on new posts,Languages\nminji@kurl.me,true,true,\n",
  blocks: "",
  mutes: "Account address,Hide notifications\n",
  "domain-blocks": "spam.example\n",
  bookmarks: "https://kurl.me/ap/notes/2\n",
  lists: "\"friends, close\",minji@kurl.me\n",
};

/**
 * 블로그 설정 > 데이터 내보내기 — 마스토돈과 같은 CSV 여섯 개. 이름·형식이 같아 다른 마스토돈 서버의
 * 가져오기에 그대로 올릴 수 있다. 누르면 그 파일을 내려받는다.
 */
export function DataExportSetting() {
  const t = useTranslations("blogWorkspace");
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function download(kind: string, file: string) {
    if (busy) return;
    setBusy(kind);
    try {
      const blob = USE_MOCKS
        ? new Blob([MOCK_CSV[kind] ?? ""], { type: "text/csv" })
        : (await requestBlob(`/api/v1/users/me/exports/${kind}`, { method: "GET" })).blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast(t("exportError"), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-8" aria-labelledby="data-export">
      <h2 id="data-export" className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t("exportTitle")}
      </h2>
      <p className="mb-3 text-[12px] text-slate-500 dark:text-slate-400">{t("exportSubtitle")}</p>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 p-2 dark:divide-slate-800 dark:border-slate-800">
        {KINDS.map(({ kind, file, labelKey, icon: Icon }) => (
          <button
            key={kind}
            type="button"
            onClick={() => void download(kind, file)}
            disabled={busy !== null}
            data-testid={`export-${kind}`}
            className="focus-ring flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-slate-900"
          >
            <span className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
              <Icon className="h-4 w-4 text-slate-400" />
              <span className="flex flex-col">
                {t(labelKey)}
                <span className="font-mono text-[12px] text-slate-500 dark:text-slate-400">{file}</span>
              </span>
            </span>
            {busy === kind ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin text-slate-400" />
            ) : (
              <Download aria-hidden className="h-4 w-4 text-slate-400" />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
