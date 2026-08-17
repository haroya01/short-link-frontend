"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquareWarning, ShieldBan, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { blockDomain, getBlockedDomains, warnUser } from "@/lib/api";
import { hostOf, isDomainCovered } from "@/lib/blocked-domains";
import { Section } from "@/components/common/section";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AdminLinkRow } from "@/types";

/**
 * Enforcement actions for one link — block its destination domain (kills every link to it,
 * new and existing) and send the owner a terms-§7 warning through the notification inbox.
 */
export function EnforcementCard({ meta }: { meta: AdminLinkRow }) {
  const t = useTranslations("admin");
  const host = useMemo(() => hostOf(meta.originalUrl), [meta.originalUrl]);

  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [warnedOwners, setWarnedOwners] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!host) return;
    let cancelled = false;
    getBlockedDomains()
      .then((list) => {
        if (!cancelled) setBlocked(isDomainCovered(host, list.map((d) => d.domain)));
      })
      .catch(() => {
        if (!cancelled) setBlocked(false);
      });
    return () => {
      cancelled = true;
    };
  }, [host]);

  async function handleBlock() {
    if (!host || blocking) return;
    if (!window.confirm(t("enforce.blockConfirm", { domain: host }))) return;
    setBlocking(true);
    setError(null);
    try {
      const res = await blockDomain(host, `/${meta.shortCode}`);
      setBlocked(true);
      setWarnedOwners(res.warnedOwners ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("enforce.failed"));
    } finally {
      setBlocking(false);
    }
  }

  async function handleWarn() {
    const text = message.trim();
    if (!text || meta.ownerId == null || sending) return;
    setSending(true);
    setError(null);
    try {
      await warnUser(meta.ownerId, text, meta.shortCode);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("enforce.failed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <Section title={t("enforce.title")} description={t("enforce.subtitle")}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          {host ? (
            blocked ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("enforce.domainBlocked", { domain: host })}
              </span>
            ) : (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => void handleBlock()}
                disabled={blocking || blocked == null}
              >
                <ShieldBan className="h-4 w-4" />
                {t("enforce.blockDomain", { domain: host })}
              </Button>
            )
          ) : null}
          {warnedOwners != null && warnedOwners > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t("blocked.warned", { count: warnedOwners })}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-100">
            <MessageSquareWarning className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            {t("enforce.warnTitle")}
          </p>
          {meta.ownerId == null ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("enforce.warnAnonymous")}
            </p>
          ) : sent ? (
            <p className="text-sm font-medium text-accent-700 dark:text-accent-400">
              {t("enforce.warnSent")}
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("enforce.warnHint")}</p>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("enforce.warnPlaceholder")}
                maxLength={500}
                rows={3}
              />
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => void handleWarn()}
                disabled={sending || !message.trim()}
              >
                {t("enforce.warnSend")}
              </Button>
            </>
          )}
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Section>
  );
}
