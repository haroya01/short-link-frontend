"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldBan } from "lucide-react";
import { useTranslations } from "next-intl";
import { blockServer, getServerBlocks, unblockServer } from "@/lib/api";
import { ErrorState } from "@/components/common/error-state";
import { Section } from "@/components/common/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn, formatDate } from "@/lib/utils";
import type { ServerBlock, ServerBlockSeverity } from "@/types";

const SEVERITIES: ServerBlockSeverity[] = ["LIMIT", "SUSPEND"];

const select =
  "focus-ring h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

/**
 * Whole servers this one has limited or suspended (Mastodon's admin domain blocks). Suspending also
 * ends follows both ways and clears that server's notices, which lifting the block does not undo,
 * so it asks first.
 */
export function ServerBlockManager() {
  const t = useTranslations("admin.servers");
  const [items, setItems] = useState<ServerBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domain, setDomain] = useState("");
  const [severity, setSeverity] = useState<ServerBlockSeverity>("LIMIT");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await getServerBlocks());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("failed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function apply(target: string, level: ServerBlockSeverity, note?: string): Promise<boolean> {
    if (level === "SUSPEND" && !window.confirm(t("suspendConfirm", { domain: target }))) return false;
    setActionError(null);
    try {
      const saved = await blockServer(target, level, note);
      setItems((prev) =>
        [saved, ...prev.filter((s) => s.domain !== saved.domain)].sort((a, b) => a.domain.localeCompare(b.domain)),
      );
      return true;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t("failed"));
      return false;
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = domain.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    if (await apply(value, severity, reason.trim() || undefined)) {
      setDomain("");
      setReason("");
    }
    setSubmitting(false);
  }

  async function remove(entry: ServerBlock) {
    if (!window.confirm(t("unblockConfirm", { domain: entry.domain }))) return;
    setActionError(null);
    try {
      await unblockServer(entry.domain);
      setItems((prev) => prev.filter((s) => s.domain !== entry.domain));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t("failed"));
    }
  }

  return (
    <Section title={t("title")} description={t("subtitle")}>
      <div className="space-y-4" data-testid="server-blocks">
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder={t("addPlaceholder")}
            aria-label={t("col.domain")}
            className="sm:max-w-xs"
          />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as ServerBlockSeverity)}
            aria-label={t("col.severity")}
            className={cn(select, "h-11 px-3")}
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {t(`severity.${s}`)}
              </option>
            ))}
          </select>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("reasonPlaceholder")}
            aria-label={t("col.reason")}
            className="sm:max-w-xs"
          />
          <Button type="submit" variant="destructive" size="md" disabled={submitting || !domain.trim()}>
            <ShieldBan className="h-4 w-4" />
            {t("add")}
          </Button>
        </form>

        {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}

        {error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>{t("col.domain")}</TH>
                  <TH>{t("col.severity")}</TH>
                  <TH>{t("col.reason")}</TH>
                  <TH>{t("col.createdAt")}</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {items.map((s) => (
                  <TR key={s.domain}>
                    <TD className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">{s.domain}</TD>
                    <TD>
                      <select
                        value={s.severity}
                        onChange={(e) => void apply(s.domain, e.target.value as ServerBlockSeverity, s.reason ?? undefined)}
                        aria-label={t("changeLabel", { domain: s.domain })}
                        className={cn(
                          select,
                          s.severity === "SUSPEND"
                            ? "text-red-700 dark:text-red-300"
                            : "text-amber-700 dark:text-amber-300",
                        )}
                      >
                        {SEVERITIES.map((level) => (
                          <option key={level} value={level}>
                            {t(`severity.${level}`)}
                          </option>
                        ))}
                      </select>
                    </TD>
                    <TD className="max-w-[20rem] text-xs text-slate-500 dark:text-slate-400">{s.reason || "—"}</TD>
                    <TD className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(s.createdAt)}
                    </TD>
                    <TD className="text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => void remove(s)}>
                        {t("unblock")}
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </div>
    </Section>
  );
}
