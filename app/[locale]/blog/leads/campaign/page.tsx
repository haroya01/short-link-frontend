"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Loader2, Send, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { useApiErrorMessage } from "@/lib/error-messages";
import { shortenUrl } from "@/lib/api";
import { blogPath } from "@/lib/host";
import {
  appendUtmParams,
  extractUrls,
  replaceUrls,
  slugifyCampaign,
} from "@/lib/campaign-builder";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

/**
 * Campaign builder. The owner pastes a draft message, names the campaign, and we transform every
 * http(s) link inside the body: shorten via kurl + attach utm_source/utm_campaign/utm_medium so
 * the click dashboard can split this campaign from organic clicks. The owner copies the result
 * into Gmail / Mailchimp / their tool of choice — sending stays out-of-platform.
 *
 * Why a separate page rather than a modal: the build step can take several seconds when a body
 * has 5+ links, and a stand-alone view gives room for the original → kurl translation table that
 * users want to spot-check before sending.
 */
export default function ProfileLeadsCampaignPage() {
  const t = useTranslations("settings.profile.leads.campaign");
  const router = useRouter();
  const locale = useLocale();
  const { authenticated, ready } = useAuth();
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();

  const [campaignName, setCampaignName] = useState("");
  const [body, setBody] = useState("");
  const [output, setOutput] = useState<CampaignOutput | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && !authenticated) router.replace(`/${locale}/login`);
  }, [ready, authenticated, locale, router]);

  const slug = useMemo(() => slugifyCampaign(campaignName), [campaignName]);
  const detectedUrls = useMemo(() => extractUrls(body), [body]);
  const canBuild = slug.length > 0 && body.trim().length > 0 && !busy;

  async function handleBuild() {
    if (!canBuild) return;
    setBusy(true);
    setOutput(null);
    try {
      // Each unique URL is tagged + shortened once and reused via map so repeated occurrences in
      // the body collapse to the same short link (and same analytics row).
      const mapping = new Map<string, string>();
      for (const original of detectedUrls) {
        const tagged = appendUtmParams(original, { source: "email", campaign: slug });
        const { shortUrl } = await shortenUrl({ url: tagged });
        mapping.set(original, shortUrl);
      }
      const transformed = replaceUrls(body, (original) => mapping.get(original) ?? original);
      const rows: ReplacementRow[] = detectedUrls.map((u) => ({
        original: u,
        shortUrl: mapping.get(u) ?? u,
      }));
      setOutput({ body: transformed, rows });
    } catch (err) {
      toast(errorMessage(err, t("buildFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output.body);
      toast(t("copied"), "success");
    } catch {
      toast(t("copyFailed"), "error");
    }
  }

  if (!ready || !authenticated) {
    return <div className="container max-w-3xl py-16 text-sm text-slate-500 dark:text-slate-400">…</div>;
  }

  return (
    <div className="container max-w-3xl space-y-6 py-12">
      <div>
        <Link
          href={blogPath("/leads")}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("back")}
        </Link>
        <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[30px] dark:text-slate-100">
          {t("title")}
        </h1>
        <p className="mt-1 text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">{t("intro")}</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label htmlFor="campaign-name" className="text-xs font-medium text-slate-700 dark:text-slate-200">
            {t("nameLabel")}
          </label>
          <input
            id="campaign-name"
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            maxLength={60}
          />
          {slug && (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {t("nameSlugHint", { slug })}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="campaign-body" className="text-xs font-medium text-slate-700 dark:text-slate-200">
            {t("bodyLabel")}
          </label>
          <textarea
            id="campaign-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("bodyPlaceholder")}
            rows={10}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm leading-relaxed focus:border-slate-400 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {detectedUrls.length === 0
              ? t("bodyNoLinks")
              : t("bodyDetected", { count: detectedUrls.length })}
          </p>
        </div>

        <Button onClick={handleBuild} disabled={!canBuild} className="w-full">
          {busy ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              {t("building")}
            </>
          ) : (
            <>
              <Sparkles className="mr-1.5 h-4 w-4" />
              {t("buildCta")}
            </>
          )}
        </Button>
      </div>

      {output && (
        <div className="space-y-4 rounded-2xl border border-accent-200 bg-accent-50/40 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("outputTitle")}</h2>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{t("outputHint")}</p>
            </div>
            <Button variant="outline" onClick={copyOutput}>
              <Copy className="mr-1 h-3.5 w-3.5" />
              {t("copy")}
            </Button>
          </div>

          <textarea
            readOnly
            value={output.body}
            rows={10}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          />

          {output.rows.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {t("mappingTitle")}
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {output.rows.map((row) => (
                  <li key={row.original} className="px-3 py-2 text-[11px]">
                    <div className="truncate text-slate-400 dark:text-slate-500">{row.original}</div>
                    <div className="truncate font-medium text-slate-700 dark:text-slate-200">{row.shortUrl}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-md bg-white/60 px-3 py-2 text-[11px] text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
            <Send className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>{t("sendHint")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

type ReplacementRow = { original: string; shortUrl: string };
type CampaignOutput = { body: string; rows: ReplacementRow[] };
