"use client";

import { Fragment, useEffect, useId, useReducer, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { STATUS_STYLES } from "@/components/admin/link-browser";
import { Section } from "@/components/common/section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  creatorSummary,
  destinationRows,
  historySummary,
  initialPreview,
  pageState,
  pageText,
  previewReducer,
  reportSummary,
  type DestinationRow,
} from "@/lib/admin-evidence";
import { getAdminLinkPreviewImage } from "@/lib/api";
import { cn, countryName } from "@/lib/utils";
import { useViewerTimes } from "@/lib/viewer-times";
import type { AdminLinkEvidence } from "@/types";

const CREATOR_STATUS_STYLES = {
  ACTIVE: STATUS_STYLES.ACTIVE,
  SUSPENDED: STATUS_STYLES.LIMIT_REACHED,
  BANNED: STATUS_STYLES.DISABLED,
  DELETED: STATUS_STYLES.EXPIRED,
};

const MUTED = "text-slate-500 dark:text-slate-400";
const HOST = "break-all font-mono text-[13px] text-slate-900 dark:text-slate-100";
const UNTRUSTED_TEXT = "[overflow-wrap:anywhere] ![word-break:normal]";

export function LinkEvidenceCard({ code, evidence }: { code: string; evidence: AdminLinkEvidence }) {
  const t = useTranslations("admin");
  return (
    <Section title={t("evidence.title")} description={t("evidence.desc")}>
      <dl data-testid="link-evidence" className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        <Group label={t("evidence.page.label")}>
          <PageText page={evidence.page} />
        </Group>
        <Group label={t("evidence.image.label")}>
          <PreviewImage
            code={code}
            hasImage={evidence.page.hasImage}
            imageWithheld={evidence.page.imageWithheld}
          />
        </Group>
        <Group label={t("evidence.destinations.label")}>
          <Destinations destinations={evidence.destinations} />
        </Group>
        <Group label={t("evidence.history.label")}>
          <History history={evidence.history} />
        </Group>
        <Group label={t("evidence.creator.label")}>
          <Creator creator={evidence.creator} />
        </Group>
        <Group label={t("evidence.reports.label")}>
          <Reports reports={evidence.reports} />
        </Group>
      </dl>
    </Section>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300">{children}</dd>
    </div>
  );
}

function Facts({ items }: { items: (string | null | false)[] }) {
  const shown = items.filter((item): item is string => Boolean(item));
  return (
    <>
      {shown.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && " · "}
          <span className="whitespace-nowrap">{item}</span>
        </Fragment>
      ))}
    </>
  );
}

function PageText({ page }: { page: AdminLinkEvidence["page"] }) {
  const t = useTranslations("admin");
  const { time } = useViewerTimes();
  const state = pageState(page);
  const { title, description } = pageText(page);
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (open) return;
    const blocks = [titleRef.current, descriptionRef.current].filter((el) => el != null);
    const measure = () => setClamped(blocks.some((el) => el.scrollHeight > el.clientHeight + 1));
    measure();
    const observer = new ResizeObserver(measure);
    for (const el of blocks) observer.observe(el);
    return () => observer.disconnect();
  }, [open, title, description]);

  return (
    <div className="space-y-1">
      {title && (
        <p
          ref={titleRef}
          dir="auto"
          data-testid="evidence-page-title"
          className={cn(UNTRUSTED_TEXT, "font-medium text-slate-900 dark:text-slate-100", !open && "line-clamp-2")}
        >
          {title}
        </p>
      )}
      {description && (
        <p
          ref={descriptionRef}
          dir="auto"
          data-testid="evidence-page-description"
          className={cn(UNTRUSTED_TEXT, !open && "line-clamp-3")}
        >
          {description}
        </p>
      )}
      {(clamped || open) && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="focus-ring -mx-1 rounded-md px-1 text-xs font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900 dark:text-slate-100 dark:decoration-slate-600 dark:hover:decoration-slate-100"
        >
          {open ? t("evidence.page.less") : t("evidence.page.more")}
        </button>
      )}
      {state === "ok" && !title && !description && <p>{t("evidence.page.blank")}</p>}
      {state !== "ok" && <p>{t(`evidence.page.${state}`)}</p>}
      {page.fetchedAt && (
        <p className={cn("text-xs", MUTED)}>
          {t(state === "ok" ? "evidence.page.fetchedAt" : "evidence.page.triedAt", { time: time(page.fetchedAt) })}
        </p>
      )}
    </div>
  );
}

function PreviewImage({
  code,
  hasImage,
  imageWithheld,
}: {
  code: string;
  hasImage: boolean;
  imageWithheld: boolean;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [state, dispatch] = useReducer(previewReducer, { hasImage, imageWithheld }, initialPreview);
  const [blurred, setBlurred] = useState<string | null>(null);
  const [sharp, setSharp] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const session = useRef<{ ended: boolean; urls: Set<string> } | null>(null);
  const noteId = useId();

  useEffect(() => {
    const mine = { ended: false, urls: new Set<string>() };
    session.current = mine;
    dispatch({ type: "reset", page: { hasImage, imageWithheld } });
    setBlurred(null);
    setSharp(null);
    if (hasImage && !imageWithheld) {
      getAdminLinkPreviewImage(code, false)
        .then((blob) => {
          if (mine.ended) return;
          const url = URL.createObjectURL(blob);
          mine.urls.add(url);
          setBlurred(url);
          dispatch({ type: "blurred-loaded" });
        })
        .catch((error) => {
          if (!mine.ended) dispatch({ type: "request-failed", error });
        });
    }
    return () => {
      mine.ended = true;
      for (const url of mine.urls) URL.revokeObjectURL(url);
    };
  }, [code, hasImage, imageWithheld, attempt]);

  const holdsImage = state.kind === "loading" || state.kind === "blurred" || state.kind === "sharp";
  useEffect(() => {
    const mine = session.current;
    if (holdsImage || !mine) return;
    for (const url of mine.urls) URL.revokeObjectURL(url);
    mine.urls.clear();
    setBlurred(null);
    setSharp(null);
  }, [holdsImage]);

  function reveal() {
    const mine = session.current;
    if (!mine || state.kind !== "blurred" || state.sharp === "loading") return;
    dispatch({ type: "sharp-requested" });
    getAdminLinkPreviewImage(code, true)
      .then((blob) => {
        if (mine.ended) return;
        const url = URL.createObjectURL(blob);
        mine.urls.add(url);
        setSharp(url);
        dispatch({ type: "sharp-loaded" });
      })
      .catch((error) => {
        if (!mine.ended) dispatch({ type: "request-failed", error });
      });
  }

  function dropSharp() {
    if (sharp) {
      URL.revokeObjectURL(sharp);
      session.current?.urls.delete(sharp);
    }
    setSharp(null);
  }

  function hide() {
    dropSharp();
    dispatch({ type: "sharp-hidden" });
  }

  if (state.kind === "none") return <p className={MUTED}>{t("evidence.image.none")}</p>;
  if (state.kind === "withheld") return <p data-testid="evidence-preview-withheld">{t("evidence.image.withheld")}</p>;
  if (state.kind === "unavailable") {
    return <p className={MUTED}>{t(`evidence.image.unavailable.${state.reason}`)}</p>;
  }
  if (state.kind === "failed") {
    return (
      <div className="space-y-1">
        <p>{t("evidence.image.failed")}</p>
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="focus-ring -mx-1 rounded-md px-1 text-xs font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900 dark:text-slate-100 dark:decoration-slate-600 dark:hover:decoration-slate-100"
        >
          {tc("retry")}
        </button>
      </div>
    );
  }

  const frame = "relative aspect-[1200/630] w-full max-w-xs overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800";
  if (state.kind === "loading" || !blurred) return <Skeleton className={frame} />;

  const showingSharp = state.kind === "sharp" && sharp != null;
  return (
    <div className="space-y-2">
      <div data-testid="evidence-preview" data-view={showingSharp ? "sharp" : "blurred"} className={frame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={blurred}
          alt={t("evidence.image.altBlurred")}
          draggable={false}
          aria-hidden={showingSharp}
          onError={() => dispatch({ type: "undecodable", view: "blurred" })}
          className="h-full w-full object-contain"
        />
        {showingSharp && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sharp}
            alt={t("evidence.image.altSharp")}
            draggable={false}
            onError={() => {
              dropSharp();
              dispatch({ type: "undecodable", view: "sharp" });
            }}
            className="absolute inset-0 h-full w-full animate-fade-in object-contain"
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {showingSharp ? (
          <Button type="button" size="sm" variant="outline" onClick={hide}>
            {t("evidence.image.hide")}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-describedby={noteId}
            disabled={state.kind === "blurred" && state.sharp === "loading"}
            onClick={reveal}
          >
            {state.kind === "blurred" && state.sharp === "loading" ? tc("loading") : t("evidence.image.reveal")}
          </Button>
        )}
        <span id={noteId} className={cn("text-xs", MUTED)}>
          {showingSharp
            ? t("evidence.image.recorded")
            : state.kind === "blurred" && state.sharp === "failed"
              ? t("evidence.image.revealFailed")
              : t("evidence.image.recordNote")}
        </span>
      </div>
    </div>
  );
}

function Destinations({ destinations }: { destinations: AdminLinkEvidence["destinations"] }) {
  const t = useTranslations("admin");
  const { rows, showKinds } = destinationRows(destinations);
  const describe = useConditions();
  return (
    <ul className="space-y-1.5">
      {rows.map((row, i) => {
        const notes = [showKinds && row.kind ? t(`evidence.destinations.kind.${row.kind}`) : null, ...describe(row)];
        return (
          <li key={i} data-testid="evidence-destination">
            {row.host ? (
              <span className={HOST}>{row.host}</span>
            ) : (
              <span className={MUTED}>{t("evidence.destinations.unknownHost")}</span>
            )}
            {notes.some(Boolean) && (
              <span className={cn("block text-xs", MUTED)}>
                <Facts items={notes} />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function useConditions() {
  const t = useTranslations("admin");
  const tStats = useTranslations("stats");
  const locale = useLocale();
  const named = (group: "device" | "os", value: string) =>
    tStats.has(`destinations.${group}.${value}`) ? tStats(`destinations.${group}.${value}`) : value;
  return (row: DestinationRow) => [
    row.countryCode ? countryName(row.countryCode, locale) : null,
    row.device ? named("device", row.device) : null,
    row.os ? named("os", row.os) : null,
    row.weight != null ? t("evidence.destinations.weight", { weight: row.weight }) : null,
  ];
}

function History({ history }: { history: AdminLinkEvidence["history"] }) {
  const t = useTranslations("admin");
  const { time } = useViewerTimes();
  const summary = historySummary(history);
  if (!summary) return <p className={MUTED}>{t("evidence.history.none", { days: history.retentionDays })}</p>;
  const nothing = <span className={MUTED}>{t("evidence.history.nothing")}</span>;
  return (
    <div className="space-y-1">
      <p>
        <Facts
          items={[
            t("evidence.history.within", { days: summary.days }),
            summary.urlChanges > 0 && t("evidence.history.urlChanges", { count: summary.urlChanges }),
            summary.destinationChanges > 0 &&
              t("evidence.history.destinationChanges", { count: summary.destinationChanges }),
          ]}
        />
      </p>
      {summary.latest && (
        <>
          <p data-testid="evidence-latest-change" className="flex flex-wrap items-baseline gap-x-1.5">
            <span className={cn("text-xs", MUTED)}>{t(`evidence.history.target.${summary.latest.target}`)}</span>
            {summary.latest.from ? <span className={HOST}>{summary.latest.from}</span> : nothing}
            <span aria-hidden className={MUTED}>
              →
            </span>
            {summary.latest.to ? <span className={HOST}>{summary.latest.to}</span> : nothing}
          </p>
          <p className={cn("text-xs", MUTED)}>{t("evidence.history.latest", { time: time(summary.latest.at) })}</p>
        </>
      )}
    </div>
  );
}

function Creator({ creator }: { creator: AdminLinkEvidence["creator"] }) {
  const t = useTranslations("admin");
  const { date } = useViewerTimes();
  const summary = creatorSummary(creator);
  if (summary.anonymous) return <p className={MUTED}>{t("evidence.creator.anonymous")}</p>;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {summary.status && (
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
            CREATOR_STATUS_STYLES[summary.status],
          )}
        >
          {summary.suspendedUntil
            ? t("evidence.creator.suspendedUntil", { date: date(summary.suspendedUntil) })
            : t(`evidence.creator.status.${summary.status}`)}
        </span>
      )}
      <span>
        <Facts
          items={[
            summary.joinedAt && t("evidence.creator.joined", { date: date(summary.joinedAt) }),
            summary.links != null && t("evidence.creator.links", { count: summary.links }),
            summary.disabledLinks > 0 && t("evidence.creator.disabledLinks", { count: summary.disabledLinks }),
          ]}
        />
      </span>
    </p>
  );
}

function Reports({ reports }: { reports: AdminLinkEvidence["reports"] }) {
  const t = useTranslations("admin");
  const tReports = useTranslations("abuseReports");
  const summary = reportSummary(reports);
  if (!summary) return <p className={MUTED}>{t("evidence.reports.none")}</p>;
  const reasonLabel = (reason: string | null) => {
    if (!reason) return t("evidence.reports.noReason");
    return tReports.has(`reasons.${reason}`) ? tReports(`reasons.${reason}`) : reason;
  };
  return (
    <div className="space-y-1">
      <p>
        <span className={cn(summary.open > 0 && "font-medium text-slate-900 dark:text-slate-100")}>
          {summary.open > 0
            ? t("evidence.reports.open", { count: summary.open })
            : t("evidence.reports.noOpen")}
        </span>
        <span className={MUTED}> · {t("evidence.reports.total", { count: summary.total })}</span>
      </p>
      {summary.reasons.length > 0 && (
        <p data-testid="evidence-report-reasons" className={cn("text-xs", MUTED)}>
          <Facts items={summary.reasons.map((r) => `${reasonLabel(r.reason)} ${r.count}`)} />
        </p>
      )}
    </div>
  );
}
