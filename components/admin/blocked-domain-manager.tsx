"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldBan } from "lucide-react";
import { useTranslations } from "next-intl";
import { blockDomain, getBlockedDomains, unblockDomain } from "@/lib/api";
import { ErrorState } from "@/components/common/error-state";
import { Section } from "@/components/common/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { BlockedDomain } from "@/types";

/**
 * Operator domain blocklist — a blocked domain rejects new shortens AND kills every existing
 * link's redirect (including subdomains), so this is the primary weapon against spam campaigns.
 */
export function BlockedDomainManager() {
  const t = useTranslations("admin");
  const [items, setItems] = useState<BlockedDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domain, setDomain] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await getBlockedDomains());
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = domain.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const added = await blockDomain(value, reason.trim() || undefined);
      setItems((prev) => [added, ...prev.filter((d) => d.domain !== added.domain)]);
      setDomain("");
      setReason("");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t("blocked.addFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(entry: BlockedDomain) {
    if (!window.confirm(t("blocked.unblockConfirm", { domain: entry.domain }))) return;
    setActionError(null);
    try {
      await unblockDomain(entry.domain);
      setItems((prev) => prev.filter((d) => d.domain !== entry.domain));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t("blocked.addFailed"));
    }
  }

  return (
    <Section title={t("blocked.title")} description={t("blocked.subtitle")}>
      <div className="space-y-4">
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder={t("blocked.addPlaceholder")}
            aria-label={t("blocked.col.domain")}
            className="sm:max-w-xs"
          />
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("blocked.reasonPlaceholder")}
            aria-label={t("blocked.col.reason")}
            className="sm:max-w-xs"
          />
          <Button type="submit" variant="destructive" size="md" disabled={submitting || !domain.trim()}>
            <ShieldBan className="h-4 w-4" />
            {t("blocked.add")}
          </Button>
        </form>

        {actionError && (
          <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
        )}

        {error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {t("blocked.empty")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>{t("blocked.col.domain")}</TH>
                  <TH>{t("blocked.col.reason")}</TH>
                  <TH>{t("blocked.col.blockedAt")}</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {items.map((d) => (
                  <TR key={d.domain}>
                    <TD className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                      {d.domain}
                    </TD>
                    <TD className="max-w-[20rem] text-xs text-slate-500 dark:text-slate-400">
                      {d.reason || "—"}
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(d.blockedAt)}
                    </TD>
                    <TD className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void remove(d)}
                      >
                        {t("blocked.unblock")}
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
