"use client";

import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { listAccountImports, startAccountImport, type AccountImport } from "@/modules/blog/api/account-imports";

const KINDS: { kind: string; labelKey: string }[] = [
  { kind: "following", labelKey: "exportFollowing" },
  { kind: "blocks", labelKey: "exportBlocks" },
  { kind: "mutes", labelKey: "exportMutes" },
  { kind: "domain-blocks", labelKey: "exportDomainBlocks" },
  { kind: "bookmarks", labelKey: "exportBookmarks" },
  { kind: "lists", labelKey: "exportLists" },
];

const LABEL_OF: Record<string, string> = {
  FOLLOWING: "exportFollowing",
  BLOCKS: "exportBlocks",
  MUTES: "exportMutes",
  DOMAIN_BLOCKS: "exportDomainBlocks",
  BOOKMARKS: "exportBookmarks",
  LISTS: "exportLists",
};

/**
 * 블로그 설정 > 데이터 가져오기 — 다른 마스토돈 서버에서 내보낸 CSV를 올리면 지금 것에 더한다(합치기). 서버가 뒤에서
 * 한 줄씩 적용하므로 최근 가져오기의 진행을 보여 주고, 진행 중인 동안 3초마다 다시 읽는다.
 */
export function DataImportSetting() {
  const t = useTranslations("blogWorkspace");
  const { toast } = useToast();
  const [kind, setKind] = useState("following");
  const [busy, setBusy] = useState(false);
  const [imports, setImports] = useState<AccountImport[]>([]);
  const file = useRef<HTMLInputElement>(null);
  const running = imports.some((i) => !i.finished);

  useEffect(() => {
    let alive = true;
    const load = () =>
      listAccountImports()
        .then((list) => alive && setImports(list))
        .catch(() => undefined);
    void load();
    if (!running) return () => void (alive = false);
    const timer = window.setInterval(() => void load(), 3000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [running]);

  async function upload(chosen: File) {
    setBusy(true);
    try {
      const started = await startAccountImport(kind, await chosen.text());
      setImports((list) => [started, ...list]);
      toast(t("importStarted", { count: started.total }));
    } catch (e) {
      toast(t(e instanceof ApiError && e.status === 409 ? "importRunning" : "importError"), "error");
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }

  return (
    <section className="mt-8" aria-labelledby="data-import">
      <h2 id="data-import" className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t("importTitle")}
      </h2>
      <p className="mb-3 text-[12px] text-slate-500 dark:text-slate-400">{t("importSubtitle")}</p>
      <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label={t("importKind")}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="h-10 w-auto min-w-40"
            data-testid="import-kind"
          >
            {KINDS.map((k) => (
              <option key={k.kind} value={k.kind}>
                {t(k.labelKey)}
              </option>
            ))}
          </Select>
          <input
            ref={file}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="sr-only"
            data-testid="import-file"
            onChange={(e) => {
              const chosen = e.target.files?.[0];
              if (chosen) void upload(chosen);
            }}
          />
          <button
            type="button"
            onClick={() => file.current?.click()}
            disabled={busy || running}
            className="focus-ring inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-400 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
          >
            <Upload aria-hidden className="h-4 w-4" />
            {t("importChoose")}
          </button>
        </div>
        {imports.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800" data-testid="import-list">
            {imports.map((i) => (
              <li key={i.id} className="py-2.5 text-[13px]" data-testid={`import-${i.id}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{t(LABEL_OF[i.kind] ?? "exportLists")}</span>
                  {i.finished && <span className="text-[12px] text-slate-500 dark:text-slate-400">{t("importDone")}</span>}
                </div>
                {!i.finished && (
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-accent-600 transition-[width] duration-500"
                      style={{ width: `${Math.round((100 * i.processed) / Math.max(i.total, 1))}%` }}
                    />
                  </div>
                )}
                <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                  {t("importProgress", { total: i.total, imported: i.imported, failed: Math.max(i.processed - i.imported, 0) })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
