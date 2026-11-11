import { ApiError } from "@/lib/api/client";
import type { AdminLinkEvidence } from "@/types";

type Page = AdminLinkEvidence["page"];
type Destination = AdminLinkEvidence["destinations"][number];
type History = AdminLinkEvidence["history"];
type Creator = AdminLinkEvidence["creator"];
type Reports = AdminLinkEvidence["reports"];

const UNAVAILABLE = ["NO_IMAGE", "FETCH_REFUSED", "TOO_MANY_PIXELS", "UNDECODABLE"] as const;

type PreviewUnavailable = (typeof UNAVAILABLE)[number] | "OTHER";

export type PreviewState =
  | { kind: "none" }
  | { kind: "withheld" }
  | { kind: "loading" }
  | { kind: "blurred"; sharp: "idle" | "loading" | "failed" }
  | { kind: "sharp" }
  | { kind: "unavailable"; reason: PreviewUnavailable }
  | { kind: "failed" };

export type PreviewEvent =
  | { type: "reset"; page: Pick<Page, "hasImage" | "imageWithheld"> }
  | { type: "blurred-loaded" }
  | { type: "sharp-requested" }
  | { type: "sharp-loaded" }
  | { type: "sharp-hidden" }
  | { type: "request-failed"; error: unknown }
  | { type: "undecodable"; view: "blurred" | "sharp" };

export function initialPreview(page: Pick<Page, "hasImage" | "imageWithheld">): PreviewState {
  if (!page.hasImage) return { kind: "none" };
  return page.imageWithheld ? { kind: "withheld" } : { kind: "loading" };
}

function refusal(error: unknown): PreviewState | null {
  if (!(error instanceof ApiError)) return null;
  if (error.detail.code === "LINK_PREVIEW_WITHHELD") return { kind: "withheld" };
  if (error.detail.code !== "LINK_PREVIEW_UNAVAILABLE") return null;
  const reason = (error.detail as { reason?: unknown }).reason;
  const known = UNAVAILABLE.find((value) => value === reason);
  return { kind: "unavailable", reason: known ?? "OTHER" };
}

export function previewReducer(state: PreviewState, event: PreviewEvent): PreviewState {
  switch (event.type) {
    case "reset":
      return initialPreview(event.page);
    case "blurred-loaded":
      return state.kind === "loading" ? { kind: "blurred", sharp: "idle" } : state;
    case "sharp-requested":
      return state.kind === "blurred" && state.sharp !== "loading" ? { kind: "blurred", sharp: "loading" } : state;
    case "sharp-loaded":
      return state.kind === "blurred" && state.sharp === "loading" ? { kind: "sharp" } : state;
    case "sharp-hidden":
      return state.kind === "sharp" ? { kind: "blurred", sharp: "idle" } : state;
    case "request-failed": {
      const awaitingBlurred = state.kind === "loading";
      const awaitingSharp = state.kind === "blurred" && state.sharp === "loading";
      if (!awaitingBlurred && !awaitingSharp) return state;
      return refusal(event.error) ?? (awaitingSharp ? { kind: "blurred", sharp: "failed" } : { kind: "failed" });
    }
    case "undecodable":
      if (state.kind === "sharp" && event.view === "sharp") return { kind: "blurred", sharp: "failed" };
      return state.kind === "blurred" || state.kind === "sharp" ? { kind: "failed" } : state;
  }
}

type PageState = "ok" | "pending" | "retrying" | "failed";

export function pageState(page: Pick<Page, "fetchStatus">): PageState {
  if (page.fetchStatus === "OK") return "ok";
  if (page.fetchStatus === "RETRYABLE") return "retrying";
  return page.fetchStatus === "ERROR" ? "failed" : "pending";
}

const text = (value: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export function pageText(page: Pick<Page, "title" | "description">): { title: string | null; description: string | null } {
  return { title: text(page.title), description: text(page.description) };
}

const KINDS = ["ORIGINAL", "BRANCH", "AFTER_EXPIRY"] as const;

export type DestinationRow = {
  host: string | null;
  kind: (typeof KINDS)[number] | null;
  weight: number | null;
  countryCode: string | null;
  device: string | null;
  os: string | null;
};

export function destinationRows(destinations: readonly Destination[]): { rows: DestinationRow[]; showKinds: boolean } {
  const rows = destinations.map((d) => ({
    host: text(d.host),
    kind: KINDS.find((kind) => kind === d.kind) ?? null,
    weight: d.kind === "BRANCH" ? d.weight : null,
    countryCode: text(d.countryCode)?.toUpperCase() ?? null,
    device: text(d.deviceClass)?.toLowerCase() ?? null,
    os: text(d.os)?.toLowerCase() ?? null,
  }));
  return { rows, showKinds: rows.length > 1 };
}

type HistorySummary = {
  days: number;
  urlChanges: number;
  destinationChanges: number;
  latest: { target: "url" | "destination"; at: string; from: string | null; to: string | null } | null;
};

export function historySummary(history: History): HistorySummary | null {
  if (history.urlChanges + history.destinationChanges === 0 && !history.latest) return null;
  return {
    days: history.retentionDays,
    urlChanges: history.urlChanges,
    destinationChanges: history.destinationChanges,
    latest: history.latest && {
      target: history.latest.action === "LINK_UPDATED" ? "url" : "destination",
      at: history.latest.at,
      from: text(history.latest.fromHost),
      to: text(history.latest.toHost),
    },
  };
}

const STATUSES = ["ACTIVE", "SUSPENDED", "BANNED", "DELETED"] as const;

type CreatorSummary =
  | { anonymous: true }
  | {
      anonymous: false;
      joinedAt: string | null;
      status: (typeof STATUSES)[number] | null;
      suspendedUntil: string | null;
      links: number | null;
      disabledLinks: number;
    };

export function creatorSummary(creator: Creator): CreatorSummary {
  if (creator.anonymous) return { anonymous: true };
  const status = STATUSES.find((value) => value === creator.status) ?? null;
  return {
    anonymous: false,
    joinedAt: creator.joinedAt,
    status,
    suspendedUntil: status === "SUSPENDED" ? creator.suspendedUntil : null,
    links: creator.links,
    disabledLinks: creator.disabledLinks ?? 0,
  };
}

type ReportSummary = { open: number; total: number; reasons: { reason: string | null; count: number }[] };

export function reportSummary(reports: Reports): ReportSummary | null {
  if (reports.total === 0) return null;
  return {
    open: reports.open,
    total: reports.total,
    reasons: reports.reasons.filter((r) => r.count > 0),
  };
}
