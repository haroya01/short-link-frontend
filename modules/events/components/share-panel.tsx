"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { CreatedLine } from "@/modules/events/components/created-line";
import type { EventLink, MyEvent } from "@/modules/events/api/events";
import { createAliasLink } from "@/modules/events/api/events";
import { shortUrlOf } from "@/lib/short-url";
import { cn } from "@/lib/utils";

const ROW_BUTTON =
  "focus-ring min-h-11 shrink-0 rounded-md px-2.5 text-[14px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100";

/**
 * 배포 도구 — 채널별 별칭 링크가 곧 유입 분석의 축. "단톡용 링크는 단톡에만" 이 지켜질수록
 * 대시보드의 채널 분해가 정확해진다.
 */
export function SharePanel({
  event,
  onLinksChange,
  freshFrom,
}: {
  event: MyEvent;
  onLinksChange: () => void;
  freshFrom?: string;
}) {
  const t = useTranslations("events.share");
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(shortUrlOf(code));
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const downloadQr = async (link: EventLink) => {
    if (!link.shortCode) return;
    const QRCode = (await import("qrcode")).default;
    // ?src=qr — 스캔 유입이 클릭 분석에서 'qr' 채널로 갈린다 (기존 규약).
    const url = await QRCode.toDataURL(`${shortUrlOf(link.shortCode)}?src=qr`, {
      width: 512,
      margin: 2,
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = `kurl-event-${event.slug}-${link.label}.png`;
    a.click();
  };

  const addAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || busy) return;
    setBusy(true);
    try {
      await createAliasLink(event.id, label.trim());
      setLabel("");
      onLinksChange();
      toast(t("aliasCreated"), "success");
    } catch {
      toast(t("aliasFailed"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-t border-slate-200 pt-6 dark:border-slate-800">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h2>
      <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{t("subtitle")}</p>

      <ul className="mt-3 flex flex-col divide-y divide-slate-100 dark:divide-slate-800/60">
        {event.links.map((link, index) => {
          const qrButton = (
            <button type="button" onClick={() => downloadQr(link)} className={ROW_BUTTON}>
              {t("qr")}
            </button>
          );
          if (index === 0 && freshFrom != null && link.shortCode != null) {
            return (
              <CreatedLine key={link.linkId} label={link.label} longUrl={freshFrom} shortUrl={shortUrlOf(link.shortCode)}>
                {qrButton}
              </CreatedLine>
            );
          }
          return (
            <li key={link.linkId} className="flex items-center gap-2 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-slate-900 dark:text-slate-100">
                  {link.label}
                </span>
                <span className="mt-0.5 block truncate font-mono text-[13px] text-slate-500 dark:text-slate-400">
                  {link.shortCode ? shortUrlOf(link.shortCode).replace(/^https?:\/\//, "") : "—"}
                </span>
              </span>
              {link.shortCode ? (
                <>
                  <button type="button" onClick={() => copy(link.shortCode!)} className={ROW_BUTTON}>
                    {copiedCode === link.shortCode ? t("copied") : t("copy")}
                  </button>
                  {qrButton}
                </>
              ) : null}
            </li>
          );
        })}
      </ul>

      <form onSubmit={addAlias} className="mt-3 flex items-center gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={50}
          placeholder={t("aliasPlaceholder")}
          aria-label={t("aliasLabel")}
        />
        <button type="submit" disabled={busy || !label.trim()} className={cn(ROW_BUTTON, "disabled:opacity-40")}>
          {t("addAlias")}
        </button>
      </form>
    </section>
  );
}
