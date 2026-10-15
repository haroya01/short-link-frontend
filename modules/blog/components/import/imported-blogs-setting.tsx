"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { ErrorState } from "@/components/common/error-state";
import { ApiError } from "@/lib/api/client";
import { blogPath } from "@/lib/host";
import { cn } from "@/lib/utils";
import {
  deleteImportSource,
  listImportSources,
  updateImportSource,
  type ImportSource,
  type ImportSourcePatch,
} from "@/modules/blog/api/imports";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { syncErrorKey, syncedAt } from "@/modules/blog/lib/import-flow";

const ABSENT = new Set([404, 405, 501]);
const POLL_MS = 4000;

const textLink =
  "focus-ring rounded text-[13px] font-medium text-accent-700 underline-offset-4 hover:underline dark:text-accent-400";

type Load = "loading" | "ready" | "absent" | "error";

export function ImportedBlogsSetting() {
  const t = useTranslations("blogImport");
  const { toast } = useToast();
  const [sources, setSources] = useState<ImportSource[]>([]);
  const [load, setLoad] = useState<Load>("loading");
  const [leaving, setLeaving] = useState<ImportSource | null>(null);

  const fetchList = useCallback(() => {
    return listImportSources()
      .then((list) => {
        setSources(list);
        setLoad("ready");
      })
      .catch((e) => setLoad(e instanceof ApiError && ABSENT.has(e.status) ? "absent" : "error"));
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const importing = sources.some((s) => s.status === "IMPORTING");
  useEffect(() => {
    if (!importing) return;
    const timer = window.setInterval(() => void fetchList(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [importing, fetchList]);

  async function patch(source: ImportSource, change: ImportSourcePatch) {
    setSources((list) => list.map((s) => (s.id === source.id ? { ...s, ...change } : s)));
    try {
      const saved = await updateImportSource(source.id, change);
      setSources((list) => list.map((s) => (s.id === saved.id ? saved : s)));
    } catch {
      setSources((list) => list.map((s) => (s.id === source.id ? source : s)));
      toast(t("saveFailed"), "error");
    }
  }

  async function disconnect(source: ImportSource, keepPosts: boolean) {
    try {
      await deleteImportSource(source.id, keepPosts);
      setSources((list) => list.filter((s) => s.id !== source.id));
      toast(t("disconnected"));
    } catch {
      toast(t("disconnectFailed"), "error");
    }
  }

  if (load === "absent") return null;

  return (
    <section id="imports" className="mt-8 scroll-mt-24" aria-labelledby="imports-title">
      <h2 id="imports-title" className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t("sectionTitle")}
      </h2>
      {load === "loading" && (
        <div className="h-24 animate-pulse rounded-2xl border border-slate-200 dark:border-slate-800" aria-hidden />
      )}
      {load === "error" && <ErrorState onRetry={() => void fetchList()} />}
      {load === "ready" && sources.length === 0 && (
        <div className="rounded-2xl border border-slate-200 px-4 py-4 dark:border-slate-800">
          <p className="text-[14px] text-slate-700 dark:text-slate-200">{t("sectionEmpty")}</p>
          <BlogLink href={blogPath("/import")} className={cn(textLink, "mt-2 inline-block")}>
            {t("connect")}
          </BlogLink>
        </div>
      )}
      {load === "ready" && sources.length > 0 && (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {sources.map((source) => (
            <SourceRow
              key={source.id}
              source={source}
              onPatch={(change) => void patch(source, change)}
              onDisconnect={() => setLeaving(source)}
            />
          ))}
          <div className="px-4 py-3">
            <BlogLink href={blogPath("/import")} className={textLink}>
              {t("connect")}
            </BlogLink>
          </div>
        </div>
      )}
      {leaving && (
        <DisconnectDialog
          source={leaving}
          onClose={() => setLeaving(null)}
          onConfirm={(keepPosts) => disconnect(leaving, keepPosts)}
        />
      )}
    </section>
  );
}

function SourceRow({
  source,
  onPatch,
  onDisconnect,
}: {
  source: ImportSource;
  onPatch: (change: ImportSourcePatch) => void;
  onDisconnect: () => void;
}) {
  const t = useTranslations("blogImport");
  const locale = useLocale();
  const titleId = `import-source-${source.id}`;
  const progress = source.progress;
  return (
    <div className="px-4 py-4" role="group" aria-labelledby={titleId} data-testid={titleId}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p id={titleId} className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
            {source.blogTitle}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-slate-500 dark:text-slate-400">
            {t(`platform.${source.platform}`)} · {source.blogUrl.replace(/^https?:\/\//, "")}
          </p>
        </div>
        <span className="shrink-0 text-[12px] font-medium text-slate-600 dark:text-slate-300">
          {t(`status.${source.status}`)}
        </span>
      </div>

      <p className="mt-2 flex flex-wrap gap-x-2 text-[13px] text-slate-600 dark:text-slate-300">
        <span>{t("importedCount", { count: source.importedCount })}</span>
        {source.lastSyncedAt && (
          <>
            <span aria-hidden>·</span>
            <span>{t("lastSynced", { time: syncedAt(source.lastSyncedAt, locale) })}</span>
          </>
        )}
        {source.status === "IMPORTING" && progress && (
          <>
            <span aria-hidden>·</span>
            <span className="tabular-nums">{t("progressCount", { done: progress.done, total: progress.total })}</span>
          </>
        )}
      </p>
      {source.status === "ERROR" && (
        <p className="mt-1 text-[13px] text-red-700 dark:text-red-400">{t(syncErrorKey(source.lastError))}</p>
      )}
      {source.status === "PENDING_VERIFICATION" && (
        <BlogLink href={`${blogPath("/import")}?source=${source.id}`} className={cn(textLink, "mt-2 inline-block")}>
          {t("continueVerify")}
        </BlogLink>
      )}

      {source.status !== "PENDING_VERIFICATION" && (
        <div className="mt-3 divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3 py-3">
            <span className="text-[14px] text-slate-700 dark:text-slate-200">{t("announceLabel")}</span>
            <Switch
              checked={source.announceNewPosts}
              aria-label={t("announceLabel")}
              onCheckedChange={(next) => onPatch({ announceNewPosts: next })}
            />
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <span className="flex flex-col text-[14px] text-slate-700 dark:text-slate-200">
              {t("discoverLabel")}
              <span className="text-[12px] text-slate-500 dark:text-slate-400">{t("discoverHint")}</span>
            </span>
            <Switch
              checked={source.showInDiscover}
              aria-label={t("discoverLabel")}
              onCheckedChange={(next) => onPatch({ showInDiscover: next })}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onDisconnect}
        className="focus-ring mt-2 rounded text-[13px] font-medium text-red-700 underline-offset-4 hover:underline dark:text-red-400"
      >
        {t("disconnect")}
      </button>
    </div>
  );
}

function DisconnectDialog({
  source,
  onClose,
  onConfirm,
}: {
  source: ImportSource;
  onClose: () => void;
  onConfirm: (keepPosts: boolean) => Promise<void>;
}) {
  const t = useTranslations("blogImport");
  const [keepPosts, setKeepPosts] = useState(true);
  const option =
    "flex cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2.5 text-[14px] text-slate-700 transition-colors hover:bg-slate-50 has-[:checked]:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:has-[:checked]:bg-slate-800";
  return (
    <ConfirmDialog
      open
      compact
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t("disconnectTitle", { blog: source.blogTitle })}
      description={t("disconnectBody")}
      confirmLabel={t("disconnect")}
      destructive={!keepPosts}
      onConfirm={() => onConfirm(keepPosts)}
    >
      <fieldset className="mt-1 space-y-1">
        <legend className="sr-only">{t("disconnectChoice")}</legend>
        <label className={option}>
          <input
            type="radio"
            name="import-keep-posts"
            checked={keepPosts}
            onChange={() => setKeepPosts(true)}
            className="mt-1 h-3.5 w-3.5"
          />
          {t("keepPosts")}
        </label>
        <label className={option}>
          <input
            type="radio"
            name="import-keep-posts"
            checked={!keepPosts}
            onChange={() => setKeepPosts(false)}
            className="mt-1 h-3.5 w-3.5"
          />
          {t("deletePosts", { count: source.importedCount })}
        </label>
      </fieldset>
    </ConfirmDialog>
  );
}
