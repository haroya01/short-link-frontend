import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { AdminLinkEvidence } from "@/types";
import {
  creatorSummary,
  destinationRows,
  historySummary,
  initialPreview,
  pageState,
  pageText,
  previewReducer,
  reportSummary,
  type PreviewEvent,
  type PreviewState,
} from "./admin-evidence";

const run = (start: PreviewState, ...events: PreviewEvent[]) => events.reduce(previewReducer, start);
const unavailable = (reason?: string) =>
  new ApiError(404, { status: 404, code: "LINK_PREVIEW_UNAVAILABLE", ...(reason ? { reason } : {}) });
const withheld = new ApiError(451, { status: 451, code: "LINK_PREVIEW_WITHHELD" });
const LOADING: PreviewState = { kind: "loading" };
const BLURRED: PreviewState = { kind: "blurred", sharp: "idle" };

describe("where the preview image starts", () => {
  it("asks for the blurred image only when there is one and it is not withheld", () => {
    expect(initialPreview({ hasImage: true, imageWithheld: false })).toEqual({ kind: "loading" });
  });

  it("a withheld image never starts loading", () => {
    expect(initialPreview({ hasImage: true, imageWithheld: true })).toEqual({ kind: "withheld" });
  });

  it("a link without an image says so, withheld or not", () => {
    expect(initialPreview({ hasImage: false, imageWithheld: false })).toEqual({ kind: "none" });
    expect(initialPreview({ hasImage: false, imageWithheld: true })).toEqual({ kind: "none" });
  });
});

describe("the preview image states", () => {
  it("goes blurred, then sharp only after it was asked for and arrived", () => {
    expect(run(LOADING, { type: "blurred-loaded" })).toEqual(BLURRED);
    expect(run(BLURRED, { type: "sharp-loaded" })).toEqual(BLURRED);
    expect(run(BLURRED, { type: "sharp-requested" })).toEqual({ kind: "blurred", sharp: "loading" });
    expect(run(BLURRED, { type: "sharp-requested" }, { type: "sharp-loaded" })).toEqual({ kind: "sharp" });
  });

  it("blurring again returns to the blurred image, ready to ask once more", () => {
    expect(run({ kind: "sharp" }, { type: "sharp-hidden" })).toEqual(BLURRED);
  });

  it.each(["NO_IMAGE", "FETCH_REFUSED", "TOO_MANY_PIXELS", "UNDECODABLE"] as const)(
    "names the server's reason %s instead of showing an image",
    (reason) => {
      expect(run(LOADING, { type: "request-failed", error: unavailable(reason) })).toEqual({
        kind: "unavailable",
        reason,
      });
    },
  );

  it("a reason this version does not know is still an unavailable image, not a retry", () => {
    expect(run(LOADING, { type: "request-failed", error: unavailable("QUARANTINED") })).toEqual({
      kind: "unavailable",
      reason: "OTHER",
    });
    expect(run(LOADING, { type: "request-failed", error: unavailable() })).toEqual({
      kind: "unavailable",
      reason: "OTHER",
    });
  });

  it("a report that arrives after the page loaded withholds the image at either step", () => {
    expect(run(LOADING, { type: "request-failed", error: withheld })).toEqual({ kind: "withheld" });
    expect(run(BLURRED, { type: "sharp-requested" }, { type: "request-failed", error: withheld })).toEqual({
      kind: "withheld",
    });
  });

  it("any other failure of the blurred request can be retried", () => {
    expect(run(LOADING, { type: "request-failed", error: new Error("network") })).toEqual({ kind: "failed" });
    expect(run(LOADING, { type: "request-failed", error: new ApiError(500, { status: 500 }) })).toEqual({
      kind: "failed",
    });
  });

  it("a failed sharp request keeps the blurred image", () => {
    expect(run(BLURRED, { type: "sharp-requested" }, { type: "request-failed", error: new Error("network") })).toEqual({
      kind: "blurred",
      sharp: "failed",
    });
    expect(
      run(BLURRED, { type: "sharp-requested" }, { type: "request-failed", error: new Error("x") }, { type: "sharp-requested" }),
    ).toEqual({ kind: "blurred", sharp: "loading" });
  });

  it("an answer nobody is waiting for changes nothing", () => {
    for (const settled of [{ kind: "none" }, { kind: "withheld" }, { kind: "sharp" }, BLURRED] as PreviewState[]) {
      expect(run(settled, { type: "request-failed", error: withheld })).toEqual(settled);
      expect(run(settled, { type: "blurred-loaded" })).toEqual(settled);
    }
    expect(run({ kind: "withheld" }, { type: "sharp-requested" }, { type: "sharp-loaded" })).toEqual({ kind: "withheld" });
  });

  it("bytes the browser cannot draw never stay on screen as a broken image", () => {
    expect(run(BLURRED, { type: "undecodable", view: "blurred" })).toEqual({ kind: "failed" });
    expect(run({ kind: "sharp" }, { type: "undecodable", view: "sharp" })).toEqual({ kind: "blurred", sharp: "failed" });
    expect(run({ kind: "sharp" }, { type: "undecodable", view: "blurred" })).toEqual({ kind: "failed" });
  });

  it("a reset starts over from what the evidence says now", () => {
    expect(run({ kind: "sharp" }, { type: "reset", page: { hasImage: true, imageWithheld: true } })).toEqual({
      kind: "withheld",
    });
    expect(run({ kind: "failed" }, { type: "reset", page: { hasImage: true, imageWithheld: false } })).toEqual(LOADING);
  });
});

describe("what the destination says", () => {
  it("reads the fetch status, treating a missing or unknown one as not fetched yet", () => {
    expect(pageState({ fetchStatus: "OK" })).toBe("ok");
    expect(pageState({ fetchStatus: "RETRYABLE" })).toBe("retrying");
    expect(pageState({ fetchStatus: "ERROR" })).toBe("failed");
    expect(pageState({ fetchStatus: "PENDING" })).toBe("pending");
    expect(pageState({ fetchStatus: null })).toBe("pending");
    expect(pageState({ fetchStatus: "SOMETHING_NEW" })).toBe("pending");
  });

  it("keeps the text as it came and drops what is only whitespace", () => {
    expect(pageText({ title: "  <b>Claim</b> your prize ", description: " \n " })).toEqual({
      title: "<b>Claim</b> your prize",
      description: null,
    });
    expect(pageText({ title: null, description: null })).toEqual({ title: null, description: null });
  });
});

type Destination = AdminLinkEvidence["destinations"][number];
const destination = (over: Partial<Destination>): Destination => ({
  host: "prize.example",
  kind: "ORIGINAL",
  weight: null,
  countryCode: null,
  deviceClass: null,
  os: null,
  ...over,
});

describe("where the link sends people", () => {
  it("a single destination is just its host, with no kind to tell apart", () => {
    expect(destinationRows([destination({})])).toEqual({
      rows: [{ host: "prize.example", kind: "ORIGINAL", weight: null, countryCode: null, device: null, os: null }],
      showKinds: false,
    });
  });

  it("several destinations carry their kind and routing condition", () => {
    const { rows, showKinds } = destinationRows([
      destination({}),
      destination({ host: "ios.prize.example", kind: "BRANCH", weight: 3, countryCode: "kr", deviceClass: "Mobile", os: "iOS" }),
      destination({ host: "after.example", kind: "AFTER_EXPIRY" }),
    ]);
    expect(showKinds).toBe(true);
    expect(rows[1]).toEqual({
      host: "ios.prize.example",
      kind: "BRANCH",
      weight: 3,
      countryCode: "KR",
      device: "mobile",
      os: "ios",
    });
    expect(rows[2].kind).toBe("AFTER_EXPIRY");
  });

  it("weight belongs to a branch only, and an unreadable host or unknown kind stays empty", () => {
    const { rows } = destinationRows([
      destination({ weight: 5 }),
      destination({ host: null, kind: "SOMETHING_NEW" }),
      destination({ host: "  " }),
    ]);
    expect(rows[0].weight).toBeNull();
    expect(rows[1]).toMatchObject({ host: null, kind: null });
    expect(rows[2].host).toBeNull();
  });
});

describe("destination changes", () => {
  const quiet = { retentionDays: 180, urlChanges: 0, destinationChanges: 0, latest: null };

  it("a link that never changed has nothing to list", () => {
    expect(historySummary(quiet)).toBeNull();
  });

  it("counts both kinds of change and reads the latest as from host to host", () => {
    expect(
      historySummary({
        retentionDays: 180,
        urlChanges: 2,
        destinationChanges: 1,
        latest: { action: "LINK_UPDATED", at: "2026-11-09T12:14:00Z", fromHost: "safe.example", toHost: "prize.example" },
      }),
    ).toEqual({
      days: 180,
      urlChanges: 2,
      destinationChanges: 1,
      latest: { target: "url", at: "2026-11-09T12:14:00Z", from: "safe.example", to: "prize.example" },
    });
  });

  it.each([
    ["LINK_DESTINATION_ADDED", null, "ios.prize.example"],
    ["LINK_DESTINATION_UPDATED", "a.example", "b.example"],
    ["LINK_DESTINATION_DELETED", "ios.prize.example", null],
  ])("%s is a branch change and keeps a missing side empty", (action, fromHost, toHost) => {
    const summary = historySummary({ ...quiet, destinationChanges: 1, latest: { action, at: "2026-11-09T12:14:00Z", fromHost, toHost } });
    expect(summary?.latest).toEqual({ target: "destination", at: "2026-11-09T12:14:00Z", from: fromHost, to: toHost });
  });
});

describe("who made the link", () => {
  const account = {
    anonymous: false,
    userId: 7,
    joinedAt: "2026-03-02T00:00:00Z",
    status: "ACTIVE",
    suspendedUntil: null,
    links: 12,
    disabledLinks: 0,
  };

  it("an anonymous link has no account facts", () => {
    expect(
      creatorSummary({ anonymous: true, userId: null, joinedAt: null, status: null, suspendedUntil: null, links: null, disabledLinks: null }),
    ).toEqual({ anonymous: true });
  });

  it("an account carries its join date, status and link counts", () => {
    expect(creatorSummary({ ...account, disabledLinks: 3 })).toEqual({
      anonymous: false,
      joinedAt: "2026-03-02T00:00:00Z",
      status: "ACTIVE",
      suspendedUntil: null,
      links: 12,
      disabledLinks: 3,
    });
  });

  it("the suspension end shows only while the account is suspended", () => {
    const until = "2026-12-01T00:00:00Z";
    expect(creatorSummary({ ...account, status: "SUSPENDED", suspendedUntil: until })).toMatchObject({
      status: "SUSPENDED",
      suspendedUntil: until,
    });
    expect(creatorSummary({ ...account, status: "ACTIVE", suspendedUntil: until })).toMatchObject({ suspendedUntil: null });
  });

  it("an account whose standing is missing or unknown shows no status", () => {
    expect(creatorSummary({ ...account, status: null, joinedAt: null, disabledLinks: null })).toMatchObject({
      status: null,
      joinedAt: null,
      disabledLinks: 0,
    });
    expect(creatorSummary({ ...account, status: "SOMETHING_NEW" })).toMatchObject({ status: null });
  });
});

describe("reports", () => {
  it("a link nobody reported has nothing to list", () => {
    expect(reportSummary({ total: 0, open: 0, reasons: [] })).toBeNull();
  });

  it("keeps unresolved and total apart and lists reasons with their counts", () => {
    expect(
      reportSummary({
        total: 5,
        open: 2,
        reasons: [
          { reason: "PHISHING", count: 3 },
          { reason: null, count: 2 },
          { reason: "SPAM", count: 0 },
        ],
      }),
    ).toEqual({
      open: 2,
      total: 5,
      reasons: [
        { reason: "PHISHING", count: 3 },
        { reason: null, count: 2 },
      ],
    });
  });
});
