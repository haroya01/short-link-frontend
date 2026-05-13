"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Ban, Download, Sparkles, Trash2, Undo2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { useApiErrorMessage } from "@/lib/error-messages";
import {
  deleteEmailLead,
  emailLeadsExportUrl,
  listEmailLeads,
  setEmailLeadOptedOut,
} from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import type { EmailLead } from "@/types";

const PAGE_SIZE = 50;

/**
 * Owner-only dashboard for emails collected via EMAIL_FORM blocks. Lists newest-first with delete
 * + CSV export. The list is intentionally simple — total at the top, a table, paginate by page
 * index — until per-block filtering becomes a real ask.
 */
export default function ProfileLeadsPage() {
  const t = useTranslations("settings.profile.leads");
  const router = useRouter();
  const locale = useLocale();
  const { authenticated, ready } = useAuth();
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [leads, setLeads] = useState<EmailLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !authenticated) router.replace(`/${locale}/login`);
  }, [ready, authenticated, locale, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listEmailLeads(page, PAGE_SIZE);
      setLeads(data.items);
      setTotal(data.total);
    } catch (err) {
      toast(errorMessage(err, t("loadFailed")), "error");
    } finally {
      setLoading(false);
    }
  }, [page, errorMessage, t, toast]);

  useEffect(() => {
    if (authenticated) void load();
  }, [authenticated, load]);

  async function handleDelete(id: number) {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      await deleteEmailLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setTotal((n) => Math.max(0, n - 1));
    } catch (err) {
      toast(errorMessage(err, t("deleteFailed")), "error");
    }
  }

  // Owner-only opt-out toggle. Opted-out rows stay visible (so the owner can re-include them or
  // tell why a campaign skipped someone) but are excluded from CSV export by default — see
  // `?includeOptedOut=true` on the backend. We optimistically update before the request returns
  // so the toggle feels instant; rollback on error.
  async function handleToggleOptOut(lead: EmailLead) {
    const next = !lead.optedOut;
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, optedOut: next } : l)));
    try {
      await setEmailLeadOptedOut(lead.id, next);
    } catch (err) {
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, optedOut: lead.optedOut } : l)));
      toast(errorMessage(err, t("optOutFailed")), "error");
    }
  }

  if (!ready || !authenticated) {
    return <div className="container max-w-3xl py-16 text-sm text-slate-500">…</div>;
  }

  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <div className="container max-w-3xl space-y-6 py-12">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("intro", { count: total })}</p>
          <p className="mt-1 text-[11px] text-slate-400">{t("csvExcludesOptedOut")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/profile/edit`}
            className="text-xs text-slate-500 hover:text-slate-900"
          >
            {t("backToEditor")}
          </Link>
          <a href={emailLeadsExportUrl()} download>
            <Button variant="outline">
              <Download className="mr-1 h-4 w-4" />
              {t("downloadCsv")}
            </Button>
          </a>
          <Link href={`/${locale}/profile/leads/campaign`}>
            <Button>
              <Sparkles className="mr-1 h-4 w-4" />
              {t("buildCampaign")}
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">{t("loading")}</p>
      ) : leads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-4 py-12 text-center">
          <p className="text-sm font-medium text-slate-700">{t("emptyTitle")}</p>
          <p className="mt-1 text-[11px] text-slate-500">{t("emptyHint")}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">{t("colEmail")}</th>
                <th className="px-4 py-2 font-medium">{t("colBlock")}</th>
                <th className="px-4 py-2 font-medium">{t("colSubmittedAt")}</th>
                <th className="w-20 px-4 py-2"></th>
                <th className="w-12 px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <tr key={lead.id} className={lead.optedOut ? "bg-slate-50/60" : undefined}>
                  <td
                    className={
                      lead.optedOut
                        ? "truncate px-4 py-2 font-medium text-slate-400 line-through"
                        : "truncate px-4 py-2 font-medium text-slate-900"
                    }
                  >
                    {lead.email}
                  </td>
                  <td className="px-4 py-2 text-[11px] text-slate-500">#{lead.blockId}</td>
                  <td className="px-4 py-2 text-[11px] text-slate-500">
                    {new Date(lead.submittedAt).toLocaleString(locale)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleOptOut(lead)}
                      className={
                        lead.optedOut
                          ? "inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-100"
                          : "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-slate-50"
                      }
                      aria-label={lead.optedOut ? t("undoOptOut") : t("optOut")}
                    >
                      {lead.optedOut ? (
                        <>
                          <Undo2 className="h-3 w-3" />
                          {t("optedOut")}
                        </>
                      ) : (
                        <>
                          <Ban className="h-3 w-3" />
                          {t("optOut")}
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(lead.id)}
                      className="text-slate-400 hover:text-red-600"
                      aria-label={t("delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
          >
            {t("prev")}
          </button>
          <span>
            {t("pageLabel", { page: page + 1, total: lastPage + 1 })}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page >= lastPage}
            className="rounded border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
          >
            {t("next")}
          </button>
        </div>
      )}
    </div>
  );
}
